import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

interface DiagnosticsOverlayProps {
  renderer: THREE.WebGLRenderer | null;
  visible: boolean;
  onToggle: () => void;
}

interface FrameStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  programs: number;
}

const HISTORY_SIZE = 120;

const DiagnosticsOverlay: React.FC<DiagnosticsOverlayProps> = ({ renderer, visible, onToggle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameTimesRef = useRef<number[]>(new Array(HISTORY_SIZE).fill(16.67));
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const fpsRef = useRef(60);
  const [stats, setStats] = useState<FrameStats>({
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    programs: 0,
  });

  const updateStats = useCallback(() => {
    if (!renderer || !visible) return;

    const now = performance.now();
    const dt = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Update frame time history
    const frameTimes = frameTimesRef.current;
    frameTimes.push(dt);
    if (frameTimes.length > HISTORY_SIZE) frameTimes.shift();

    frameCountRef.current++;

    // Update FPS every 30 frames
    if (frameCountRef.current % 30 === 0) {
      const avgFrameTime = frameTimes.slice(-30).reduce((a, b) => a + b, 0) / 30;
      fpsRef.current = 1000 / avgFrameTime;

      const info = renderer.info;
      setStats({
        fps: fpsRef.current,
        frameTime: avgFrameTime,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        textures: info.memory.textures,
        geometries: info.memory.geometries,
        programs: info.programs?.length ?? 0,
      });
    }

    // Draw frame time graph
    drawGraph();
  }, [renderer, visible]);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const frameTimes = frameTimesRef.current;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    // 16.67ms target line
    const targetY = h - (16.67 / 50) * h;
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(w, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 33.33ms line (30fps)
    const target30Y = h - (33.33 / 50) * h;
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, target30Y);
    ctx.lineTo(w, target30Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Frame time bars
    const barWidth = w / HISTORY_SIZE;
    for (let i = 0; i < frameTimes.length; i++) {
      const ft = frameTimes[i];
      const barH = Math.min((ft / 50) * h, h);
      const x = i * barWidth;

      if (ft > 33.33) {
        ctx.fillStyle = '#ff4444';
      } else if (ft > 16.67) {
        ctx.fillStyle = '#ffaa00';
      } else {
        ctx.fillStyle = '#44ff88';
      }

      ctx.fillRect(x, h - barH, barWidth - 1, barH);
    }

    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.fillText('60fps', 2, targetY - 2);
    ctx.fillText('30fps', 2, target30Y - 2);
  }, []);

  useEffect(() => {
    if (!visible || !renderer) return;

    let animId: number;
    const loop = () => {
      updateStats();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [visible, renderer, updateStats]);

  if (!visible) return null;

  const fpsColor = stats.fps >= 55 ? 'text-green-400' : stats.fps >= 30 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="absolute top-5 left-5 z-50 select-none pointer-events-auto">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-border/30 p-3 space-y-2 min-w-[240px]">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Diagnostics</h3>
          <button onClick={onToggle} className="text-muted-foreground hover:text-primary text-xs">✕</button>
        </div>

        {/* FPS */}
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-muted-foreground">FPS</span>
          <span className={`text-lg font-mono font-bold ${fpsColor}`}>
            {stats.fps.toFixed(0)}
          </span>
        </div>

        {/* Frame Time */}
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-muted-foreground">Frame Time</span>
          <span className="text-sm font-mono text-foreground">
            {stats.frameTime.toFixed(2)}ms
          </span>
        </div>

        {/* Frame Time Graph */}
        <canvas
          ref={canvasRef}
          width={220}
          height={50}
          className="w-full rounded"
        />

        {/* GPU Stats */}
        <div className="space-y-1 pt-1 border-t border-border/20">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Draw Calls</span>
            <span className="font-mono text-foreground">{stats.drawCalls}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Triangles</span>
            <span className="font-mono text-foreground">{stats.triangles.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Textures</span>
            <span className="font-mono text-foreground">{stats.textures}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Geometries</span>
            <span className="font-mono text-foreground">{stats.geometries}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Programs</span>
            <span className="font-mono text-foreground">{stats.programs}</span>
          </div>
        </div>

        {/* Memory Estimate */}
        <div className="pt-1 border-t border-border/20">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Est. VRAM</span>
            <span className="font-mono text-foreground">
              {renderer ? `~${Math.round((stats.textures * 0.5 + stats.geometries * 0.1) * 10) / 10}MB` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsOverlay;
