import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

interface DiagnosticsOverlayProps {
  renderer: THREE.WebGLRenderer | null;
  visible: boolean;
  onToggle: () => void;
  shaderSource?: string;
  renderScale?: number;
}

interface FrameStats {
  fps: number;
  frameTime: number;
  gpuTime: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  programs: number;
}

const HISTORY_SIZE = 120;

interface DisjointTimerQueryExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

type RendererRenderFn = THREE.WebGLRenderer['render'];

// ─────────────────────────────────────────────────────────────────────────────
// GPU TIMER QUERY (EXT_disjoint_timer_query_webgl2)
// ─────────────────────────────────────────────────────────────────────────────
class GPUTimer {
  private gl: WebGL2RenderingContext | null;
  private ext: DisjointTimerQueryExt | null;
  private queries: WebGLQuery[] = [];
  private active = false;
  private lastNs = 0;

  constructor(renderer: THREE.WebGLRenderer | null) {
    this.gl = null;
    this.ext = null;
    if (!renderer) return;
    const gl = renderer.getContext();
    if (!(gl instanceof WebGL2RenderingContext)) return;
    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as DisjointTimerQueryExt | null;
  }

  begin() {
    if (!this.gl || !this.ext || this.active) return;
    const q = this.gl.createQuery();
    if (!q) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.queries.push(q);
    this.active = true;
  }

  end() {
    if (!this.gl || !this.ext || !this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.active = false;
  }

  poll(): number {
    if (!this.gl || !this.ext || this.queries.length === 0) return this.lastNs;
    const q = this.queries[0];
    const available = this.gl.getQueryParameter(q, this.gl.QUERY_RESULT_AVAILABLE);
    const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (available && !disjoint) {
      this.lastNs = this.gl.getQueryParameter(q, this.gl.QUERY_RESULT) as number;
      this.gl.deleteQuery(q);
      this.queries.shift();
    }
    // Drop stale queries
    if (this.queries.length > 4) {
      const stale = this.queries.shift();
      if (stale) this.gl.deleteQuery(stale);
    }
    return this.lastNs;
  }

  get available(): boolean {
    return !!this.ext;
  }
}

const DiagnosticsOverlay: React.FC<DiagnosticsOverlayProps> = ({
  renderer, visible, onToggle, shaderSource, renderScale,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameTimesRef = useRef<number[]>(new Array(HISTORY_SIZE).fill(16.67));
  const gpuTimesRef = useRef<number[]>(new Array(HISTORY_SIZE).fill(0));
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const fpsRef = useRef(60);
  const gpuTimerRef = useRef<GPUTimer | null>(null);

  const [stats, setStats] = useState<FrameStats>({
    fps: 60, frameTime: 16.67, gpuTime: 0,
    drawCalls: 0, triangles: 0, textures: 0, geometries: 0, programs: 0,
  });

  // Initialize GPU timer when renderer becomes available
  useEffect(() => {
    if (!renderer) return;
    gpuTimerRef.current = new GPUTimer(renderer);
  }, [renderer]);

  // Wrap renderer.render to time GPU work
  useEffect(() => {
    if (!renderer || !gpuTimerRef.current?.available) return;
    const originalRender: RendererRenderFn = renderer.render.bind(renderer);
    const timer = gpuTimerRef.current;
    renderer.render = (scene: THREE.Scene, cam: THREE.Camera): void => {
      timer.begin();
      originalRender(scene, cam);
      timer.end();
    };
    return () => {
      renderer.render = originalRender;
    };
  }, [renderer]);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const frameTimes = frameTimesRef.current;
    const gpuTimes = gpuTimesRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, w, h);

    const drawLine = (ms: number, color: string, label: string) => {
      const y = h - (ms / 50) * h;
      ctx.strokeStyle = color;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#aaa';
      ctx.font = '8px monospace';
      ctx.fillText(label, 2, y - 1);
    };
    drawLine(16.67, 'rgba(0, 255, 100, 0.35)', '60');
    drawLine(33.33, 'rgba(255, 200, 0, 0.35)', '30');

    const barWidth = w / HISTORY_SIZE;
    for (let i = 0; i < frameTimes.length; i++) {
      const ft = frameTimes[i];
      const barH = Math.min((ft / 50) * h, h);
      const x = i * barWidth;
      ctx.fillStyle = ft > 33.33 ? '#ff4444' : ft > 16.67 ? '#ffaa00' : '#44ff88';
      ctx.fillRect(x, h - barH, Math.max(barWidth - 0.5, 1), barH);

      // GPU overlay (cyan thin line)
      const gt = gpuTimes[i];
      if (gt > 0) {
        const gh = Math.min((gt / 50) * h, h);
        ctx.fillStyle = 'rgba(100, 220, 255, 0.85)';
        ctx.fillRect(x, h - gh, Math.max(barWidth - 0.5, 1), 1.5);
      }
    }
  }, []);

  const updateStats = useCallback(() => {
    if (!renderer || !visible) return;

    const now = performance.now();
    const dt = now - lastTimeRef.current;
    lastTimeRef.current = now;

    const frameTimes = frameTimesRef.current;
    frameTimes.push(dt);
    if (frameTimes.length > HISTORY_SIZE) frameTimes.shift();

    // Poll GPU timer
    let gpuMs = 0;
    if (gpuTimerRef.current) {
      const ns = gpuTimerRef.current.poll();
      gpuMs = ns / 1_000_000;
    }
    gpuTimesRef.current.push(gpuMs);
    if (gpuTimesRef.current.length > HISTORY_SIZE) gpuTimesRef.current.shift();

    frameCountRef.current++;

    if (frameCountRef.current % 30 === 0) {
      const recent = frameTimes.slice(-30);
      const avgFrameTime = recent.reduce((a, b) => a + b, 0) / recent.length;
      fpsRef.current = 1000 / avgFrameTime;
      const recentGpu = gpuTimesRef.current.slice(-30);
      const avgGpu = recentGpu.reduce((a, b) => a + b, 0) / recentGpu.length;

      const info = renderer.info;
      setStats({
        fps: fpsRef.current,
        frameTime: avgFrameTime,
        gpuTime: avgGpu,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        textures: info.memory.textures,
        geometries: info.memory.geometries,
        programs: info.programs?.length ?? 0,
      });
    }

    drawGraph();
  }, [renderer, visible, drawGraph]);

  useEffect(() => {
    if (!visible || !renderer) return;
    let id: number;
    const loop = () => {
      updateStats();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [visible, renderer, updateStats]);

  if (!visible) return null;

  const fpsColor = stats.fps >= 55 ? 'text-green-400' : stats.fps >= 30 ? 'text-yellow-400' : 'text-red-400';
  const gpuColor = stats.gpuTime <= 8 ? 'text-green-400' : stats.gpuTime <= 16 ? 'text-yellow-400' : 'text-red-400';
  const shaderKB = shaderSource ? (shaderSource.length / 1024).toFixed(1) : null;
  const shaderLines = shaderSource ? shaderSource.split('\n').length : null;

  return (
    <div className="absolute top-5 left-5 z-50 select-none pointer-events-auto">
      <div className="bg-black/85 backdrop-blur-sm rounded-lg border border-border/30 p-3 space-y-2 min-w-[260px]">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Diagnostics</h3>
          <button onClick={onToggle} className="text-muted-foreground hover:text-primary text-xs">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">FPS</div>
            <div className={`text-xl font-mono font-bold leading-none ${fpsColor}`}>{stats.fps.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">CPU ms</div>
            <div className="text-xl font-mono font-bold leading-none text-foreground">{stats.frameTime.toFixed(1)}</div>
          </div>
        </div>

        {gpuTimerRef.current?.available && (
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] text-muted-foreground uppercase">GPU ms</span>
            <span className={`text-sm font-mono ${gpuColor}`}>{stats.gpuTime.toFixed(2)}</span>
          </div>
        )}

        <canvas ref={canvasRef} width={240} height={56} className="w-full rounded" />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>120-frame history</span>
          <span><span className="text-green-400">CPU</span> · <span className="text-cyan-400">GPU</span></span>
        </div>

        <div className="space-y-1 pt-1 border-t border-border/20 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Draw Calls</span><span className="font-mono">{stats.drawCalls}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Triangles</span><span className="font-mono">{stats.triangles.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Programs</span><span className="font-mono">{stats.programs}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Textures</span><span className="font-mono">{stats.textures}</span></div>
        </div>

        {(shaderKB || renderScale !== undefined) && (
          <div className="space-y-1 pt-1 border-t border-border/20 text-xs">
            {shaderKB && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shader Size</span>
                <span className="font-mono">{shaderKB}KB · {shaderLines}L</span>
              </div>
            )}
            {renderScale !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Render Scale</span>
                <span className="font-mono">{(renderScale * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        )}

        {!gpuTimerRef.current?.available && (
          <div className="text-[9px] text-muted-foreground pt-1 border-t border-border/20">
            GPU timing unavailable (no EXT_disjoint_timer_query_webgl2)
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticsOverlay;
