import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFlightPhysics, type FlightState, type FlightConfig } from '@/hooks/useFlightPhysics';

// ─────────────────────────────────────────────────────────────────────────────
// BLUE NOISE TEXTURE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function createBlueNoiseTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    
    let value = 0;
    for (let o = 0; o < 4; o++) {
      const freq = Math.pow(2, o);
      value += Math.sin(x * freq * 0.1 + y * freq * 0.13) * 
               Math.cos(y * freq * 0.11 - x * freq * 0.09) / Math.pow(2, o);
    }
    value = (value + 1) * 0.5;
    value = (value + Math.random() * 0.5) * 0.5;
    
    const byte = Math.floor(value * 255);
    data[i * 4] = byte;
    data[i * 4 + 1] = byte;
    data[i * 4 + 2] = byte;
    data[i * 4 + 3] = 255;
  }
  
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  
  return texture;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBGL SUPPORT CHECK
// ─────────────────────────────────────────────────────────────────────────────
export const isWebGLSupported = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SHADER RENDERER HOOK
// ─────────────────────────────────────────────────────────────────────────────
export interface ShaderRendererOptions {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, THREE.IUniform>;
  isPaused?: boolean;
  renderScale?: number;
  flightConfig?: Partial<FlightConfig>;
  initialPosition?: THREE.Vector3;
}

export interface ShaderRendererResult {
  containerRef: React.RefObject<HTMLDivElement>;
  rendererRef: React.RefObject<THREE.WebGLRenderer | null>;
  materialRef: React.RefObject<THREE.ShaderMaterial | null>;
  cameraRef: React.MutableRefObject<{
    pos: THREE.Vector3;
    yaw: number;
    pitch: number;
    velocity: THREE.Vector3;
  }>;
  flightStateRef: React.MutableRefObject<FlightState>;
  flightConfigRef: React.MutableRefObject<FlightConfig>;
  flightControlsRef: React.MutableRefObject<{ freeCam: boolean; mouseSensitivity: number }>;
  resetFlight: () => void;
  frameRef: React.MutableRefObject<number>;
  webglError: string | null;
}

export function useShaderRenderer(options: ShaderRendererOptions): ShaderRendererResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const webglErrorRef = useRef<string | null>(null);

  // Flight physics
  const flight = useFlightPhysics(
    options.flightConfig,
    options.initialPosition ?? new THREE.Vector3(0, 1500, 0),
  );

  // Legacy camera ref (kept for backward compat — mirrors flight state)
  const cameraRef = useRef({
    pos: flight.stateRef.current.position,
    yaw: 0,
    pitch: 0,
    velocity: flight.stateRef.current.velocity,
  });

  const keysRef = useRef<Set<string>>(new Set());
  const mouseDeltaRef = useRef({ x: 0, y: 0 });
  const isPausedRef = useRef(options.isPaused ?? false);
  isPausedRef.current = options.isPaused ?? false;
  const renderScaleRef = useRef(options.renderScale ?? 1.0);
  renderScaleRef.current = options.renderScale ?? 1.0;

  useEffect(() => {
    if (!containerRef.current) return;

    if (!isWebGLSupported()) {
      webglErrorRef.current = 'WebGL is not supported. Try a new browser tab or enable hardware acceleration.';
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        antialias: false, 
        powerPreference: 'high-performance',
        precision: 'highp',
        failIfMajorPerformanceCaveat: false
      });
    } catch (e) {
      webglErrorRef.current = 'Failed to create WebGL context.';
      return;
    }
    
    const baseScale = renderScaleRef.current;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5) * baseScale);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const blueNoise = createBlueNoiseTexture();
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

    // Merge provided uniforms with base uniforms
    const mergedUniforms: Record<string, THREE.IUniform> = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      iMouse: { value: new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.4) },
      iFrame: { value: 0 },
      blueNoise: { value: blueNoise },
      previousFrame: { value: renderTarget.texture },
      uCameraPos: { value: new THREE.Vector3(0, 200, 0) },
      uCameraYaw: { value: 0 },
      uCameraPitch: { value: 0 },
      uCameraFOV: { value: 75 },
      ...options.uniforms,
    };

    const material = new THREE.ShaderMaterial({
      uniforms: mergedUniforms,
      vertexShader: options.vertexShader,
      fragmentShader: options.fragmentShader,
    });
    materialRef.current = material;

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // Mouse look — accumulates deltas, consumed by physics step
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        mouseDeltaRef.current.x += e.movementX;
        mouseDeltaRef.current.y += e.movementY;
      }
    };

    const handleClick = () => {
      renderer.domElement.requestPointerLock();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current.add(k);
      // F toggles free-cam
      if (k === 'f') {
        flight.controlsRef.current.freeCam = !flight.controlsRef.current.freeCam;
      }
      // R resets aircraft
      if (k === 'r') flight.reset();
      // Prevent page scroll on space
      if (k === ' ') e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Wheel adjusts throttle in flight mode
      const delta = -Math.sign(e.deltaY) * 0.05;
      flight.stateRef.current.throttle = THREE.MathUtils.clamp(
        flight.stateRef.current.throttle + delta, 0, 1,
      );
    };

    window.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    const clock = new THREE.Clock();
    let lastTime = 0;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      const deltaTime = time - lastTime;
      lastTime = time;

      if (!isPausedRef.current) {
        frameRef.current++;
        material.uniforms.iTime.value = time;
        material.uniforms.iFrame.value = frameRef.current;

        // ── FLIGHT PHYSICS STEP ────────────────────────────────────────────
        const md = mouseDeltaRef.current;
        flight.step(deltaTime, keysRef.current, { x: md.x, y: md.y });
        // Reset mouse delta accumulator
        md.x = 0;
        md.y = 0;

        // Sync legacy camera ref + shader uniforms
        const fs = flight.stateRef.current;
        cameraRef.current.pos = fs.position;
        cameraRef.current.yaw = fs.yaw;
        cameraRef.current.pitch = fs.pitch;
        cameraRef.current.velocity = fs.velocity;

        material.uniforms.uCameraPos.value.copy(fs.position);
        material.uniforms.uCameraYaw.value = fs.yaw;
        material.uniforms.uCameraPitch.value = fs.pitch;
        if (material.uniforms.uCameraRoll) {
          material.uniforms.uCameraRoll.value = fs.roll;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      material.uniforms.iResolution.value.set(w, h);
      renderTarget.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // React to renderScale prop changes
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const scale = options.renderScale ?? 1.0;
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.5) * scale);
  }, [options.renderScale]);

  return {
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    rendererRef: rendererRef as React.RefObject<THREE.WebGLRenderer | null>,
    materialRef: materialRef as React.RefObject<THREE.ShaderMaterial | null>,
    cameraRef,
    frameRef,
    webglError: webglErrorRef.current,
  };
}
