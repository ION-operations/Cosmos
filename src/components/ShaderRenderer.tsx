import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

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
  
  const cameraRef = useRef({
    pos: new THREE.Vector3(0, 200, 0),
    yaw: 0,
    pitch: 0,
    velocity: new THREE.Vector3(0, 0, 0),
  });
  const keysRef = useRef<Set<string>>(new Set());
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

    // Mouse look
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        cameraRef.current.yaw += e.movementX * 0.002;
        cameraRef.current.pitch -= e.movementY * 0.002;
        cameraRef.current.pitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, cameraRef.current.pitch));
      }
    };

    const handleClick = () => {
      renderer.domElement.requestPointerLock();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const zoomAmount = -e.deltaY * 5;
      const forward = new THREE.Vector3(
        Math.cos(cam.pitch) * Math.sin(cam.yaw),
        Math.sin(cam.pitch),
        Math.cos(cam.pitch) * Math.cos(cam.yaw)
      );
      cam.pos.add(forward.multiplyScalar(zoomAmount));
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
        
        // WASD camera
        const keys = keysRef.current;
        const speed = 100 * deltaTime;
        const cam = cameraRef.current;
        
        const forward = new THREE.Vector3(
          Math.cos(cam.pitch) * Math.sin(cam.yaw),
          Math.sin(cam.pitch),
          Math.cos(cam.pitch) * Math.cos(cam.yaw)
        );
        const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
        const up = new THREE.Vector3(0, 1, 0);
        
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (keys.has('w')) moveDir.add(forward);
        if (keys.has('s')) moveDir.sub(forward);
        if (keys.has('a')) moveDir.sub(right);
        if (keys.has('d')) moveDir.add(right);
        if (keys.has(' ')) moveDir.add(up);
        if (keys.has('shift')) moveDir.sub(up);
        
        if (moveDir.length() > 0) {
          moveDir.normalize();
          cam.velocity.lerp(moveDir.multiplyScalar(speed * 10), 0.1);
        } else {
          cam.velocity.multiplyScalar(0.9);
        }
        
        cam.pos.add(cam.velocity.clone().multiplyScalar(deltaTime));
        
        material.uniforms.uCameraPos.value.copy(cam.pos);
        material.uniforms.uCameraYaw.value = cam.yaw;
        material.uniforms.uCameraPitch.value = cam.pitch;
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
