import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Settings, X, Sun, Moon, Cloud, Waves, Mountain, Wind,
  Sparkles, Pause, Play, RotateCcw, Maximize2, CloudRain, CloudSnow, Zap,
  Eye, EyeOff, TreePine, Droplets, Layers
} from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL EARTH ENGINE V5.0 — WebGPU / WGSL
// Compute-enhanced ocean FFT, volumetric clouds, raymarched terrain
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// WGSL COMPUTE: 3D Noise Texture Generator (128³)
// ─────────────────────────────────────────────────────────────────────────────
const NOISE_COMPUTE_WGSL = /* wgsl */`
@group(0) @binding(0) var output: texture_storage_3d<rgba8unorm, write>;

fn hash31(p: vec3f) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash33(p: vec3f) -> vec3f {
  let q = vec3f(
    dot(p, vec3f(127.1, 311.7, 74.7)),
    dot(p, vec3f(269.5, 183.3, 246.1)),
    dot(p, vec3f(113.5, 271.9, 124.6))
  );
  return fract(sin(q) * 43758.5453123);
}

fn quintic(t: vec3f) -> vec3f {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

fn gradientNoise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = quintic(f);

  let n000 = dot(hash33(i + vec3f(0.0, 0.0, 0.0)) * 2.0 - 1.0, f - vec3f(0.0, 0.0, 0.0));
  let n100 = dot(hash33(i + vec3f(1.0, 0.0, 0.0)) * 2.0 - 1.0, f - vec3f(1.0, 0.0, 0.0));
  let n010 = dot(hash33(i + vec3f(0.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3f(0.0, 1.0, 0.0));
  let n110 = dot(hash33(i + vec3f(1.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3f(1.0, 1.0, 0.0));
  let n001 = dot(hash33(i + vec3f(0.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3f(0.0, 0.0, 1.0));
  let n101 = dot(hash33(i + vec3f(1.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3f(1.0, 0.0, 1.0));
  let n011 = dot(hash33(i + vec3f(0.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3f(0.0, 1.0, 1.0));
  let n111 = dot(hash33(i + vec3f(1.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3f(1.0, 1.0, 1.0));

  let mix_x0 = mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y);
  let mix_x1 = mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y);
  return mix(mix_x0, mix_x1, u.z);
}

fn worleyNoise(p: vec3f) -> f32 {
  let n = floor(p);
  let f = fract(p);
  var d = 1.0;
  for (var k = -1; k <= 1; k++) {
    for (var j = -1; j <= 1; j++) {
      for (var i = -1; i <= 1; i++) {
        let g = vec3f(f32(i), f32(j), f32(k));
        let o = hash33(n + g);
        let r = g + o - f;
        d = min(d, dot(r, r));
      }
    }
  }
  return 1.0 - sqrt(d);
}

fn fbm(p: vec3f) -> f32 {
  var value = 0.0;
  var amp = 0.5;
  var freq = 1.0;
  var pos = p;
  for (var i = 0; i < 6; i++) {
    value += amp * gradientNoise(pos * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let size = 128u;
  if (id.x >= size || id.y >= size || id.z >= size) { return; }

  let p = vec3f(id) / f32(size) * 8.0;

  let perlin = fbm(p) * 0.5 + 0.5;
  let worley = worleyNoise(p * 2.0);
  let ridged = 1.0 - abs(gradientNoise(p * 1.5));
  let detail = worleyNoise(p * 4.0);

  textureStore(output, id, vec4f(perlin, worley, ridged, detail));
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// WGSL MAIN RENDER SHADER — Full-screen fragment with all systems
// ─────────────────────────────────────────────────────────────────────────────
const RENDER_WGSL = /* wgsl */`
// ═══ UNIFORM STRUCTURES ═══
struct FrameUniforms {
  time: f32,
  frame: u32,
  resolution: vec2f,
  mouse: vec2f,
  _pad0: vec2f,
};

struct CameraUniforms {
  position: vec3f,
  fov: f32,
  yaw: f32,
  pitch: f32,
  _pad: vec2f,
};

struct SunUniforms {
  azimuth: f32,
  elevation: f32,
  intensity: f32,
  moonIntensity: f32,
  color: vec3f,
  starIntensity: f32,
  autoTime: u32,
  cycleSpeed: f32,
  _pad: vec2f,
};

struct AtmosphereUniforms {
  zenithColor: vec3f,
  atmosphereDensity: f32,
  horizonColor: vec3f,
  rayleighStrength: f32,
  mieStrength: f32,
  mieG: f32,
  _pad: vec2f,
};

struct CloudUniforms {
  coverage: f32,
  density: f32,
  scale: f32,
  detailScale: f32,
  speed: f32,
  height: f32,
  thickness: f32,
  lightAbsorption: f32,
  ambient: f32,
  silverLining: f32,
  powder: f32,
  steps: u32,
};

struct TerrainUniforms {
  scale: f32,
  height: f32,
  mountainHeight: f32,
  mountainSharpness: f32,
  snowLine: f32,
  treeLine: f32,
  beachWidth: f32,
  erosionStrength: f32,
  grassColor: vec3f,
  _pad0: f32,
  rockColor: vec3f,
  _pad1: f32,
  snowColor: vec3f,
  _pad2: f32,
  sandColor: vec3f,
  _pad3: f32,
};

struct OceanUniforms {
  level: f32,
  waveHeight: f32,
  waveFrequency: f32,
  waveSpeed: f32,
  roughness: f32,
  fresnel: f32,
  foamIntensity: f32,
  causticsIntensity: f32,
  sssIntensity: f32,
  bubbleIntensity: f32,
  _pad: vec2f,
  color: vec3f,
  _pad2: f32,
  deepColor: vec3f,
  _pad3: f32,
};

struct WeatherUniforms {
  weatherType: u32,
  intensity: f32,
  windSpeed: f32,
  windDirection: f32,
  lightningIntensity: f32,
  lightningTime: f32,
  _pad: vec2f,
};

struct FogUniforms {
  density: f32,
  height: f32,
  _pad0: vec2f,
  color: vec3f,
  _pad1: f32,
};

struct PostUniforms {
  bloomIntensity: f32,
  bloomThreshold: f32,
  exposure: f32,
  saturation: f32,
  vignetteStrength: f32,
  godRayIntensity: f32,
  godRayDecay: f32,
  godRaySteps: u32,
};

struct LayerFlags {
  sky: u32,
  clouds: u32,
  terrain: u32,
  ocean: u32,
  vegetation: u32,
  weather: u32,
  fog: u32,
  godRays: u32,
};

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<uniform> camera: CameraUniforms;
@group(0) @binding(2) var<uniform> sun: SunUniforms;
@group(0) @binding(3) var<uniform> atmosphere: AtmosphereUniforms;
@group(0) @binding(4) var<uniform> cloud: CloudUniforms;
@group(0) @binding(5) var<uniform> terrain: TerrainUniforms;
@group(0) @binding(6) var<uniform> ocean: OceanUniforms;
@group(0) @binding(7) var<uniform> weather: WeatherUniforms;
@group(0) @binding(8) var<uniform> fog: FogUniforms;
@group(0) @binding(9) var<uniform> post: PostUniforms;
@group(0) @binding(10) var<uniform> layers: LayerFlags;
@group(1) @binding(0) var noiseTex: texture_3d<f32>;
@group(1) @binding(1) var noiseSampler: sampler;

// ═══ CONSTANTS ═══
const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;
const CLOUD_EXTENT: f32 = 50000.0;

// ═══ VERTEX ═══
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOutput {
  // Full-screen triangle
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var uv = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0)
  );
  var out: VertexOutput;
  out.position = vec4f(pos[vid], 0.0, 1.0);
  out.uv = uv[vid];
  return out;
}

// ═══ UTILITY ═══
fn saturateF(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn saturate3(x: vec3f) -> vec3f { return clamp(x, vec3f(0.0), vec3f(1.0)); }

fn remap(x: f32, a: f32, b: f32, c: f32, d: f32) -> f32 {
  return c + (x - a) * (d - c) / (b - a);
}

fn smootherstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

fn rot2D(angle: f32) -> mat2x2f {
  let c = cos(angle);
  let s = sin(angle);
  return mat2x2f(c, -s, s, c);
}

// ═══ HASH ═══
fn hash11(p_in: f32) -> f32 {
  var p = fract(p_in * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

fn hash12(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash13(p: vec3f) -> f32 {
  var q = fract(p * 0.1031);
  q += dot(q, q.zyx + 31.32);
  return fract((q.x + q.y) * q.z);
}

fn hash22(p: vec2f) -> vec2f {
  let p3 = fract(vec3f(p.x, p.y, p.x) * vec3f(0.1031, 0.1030, 0.0973));
  let p3b = p3 + dot(p3, p3.yzx + 33.33);
  return fract((vec2f(p3b.x, p3b.x) + p3b.yz) * p3b.zy);
}

fn hash33(p: vec3f) -> vec3f {
  let q = vec3f(
    dot(p, vec3f(127.1, 311.7, 74.7)),
    dot(p, vec3f(269.5, 183.3, 246.1)),
    dot(p, vec3f(113.5, 271.9, 124.6))
  );
  return fract(sin(q) * 43758.5453123);
}

// ═══ NOISE (procedural, no texture lookup for core) ═══
fn gradientNoise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  let n000 = dot(hash33(i) * 2.0 - 1.0, f);
  let n100 = dot(hash33(i + vec3f(1.0, 0.0, 0.0)) * 2.0 - 1.0, f - vec3f(1.0, 0.0, 0.0));
  let n010 = dot(hash33(i + vec3f(0.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3f(0.0, 1.0, 0.0));
  let n110 = dot(hash33(i + vec3f(1.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3f(1.0, 1.0, 0.0));
  let n001 = dot(hash33(i + vec3f(0.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3f(0.0, 0.0, 1.0));
  let n101 = dot(hash33(i + vec3f(1.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3f(1.0, 0.0, 1.0));
  let n011 = dot(hash33(i + vec3f(0.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3f(0.0, 1.0, 1.0));
  let n111 = dot(hash33(i + vec3f(1.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3f(1.0, 1.0, 1.0));

  let mix_x0 = mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y);
  let mix_x1 = mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y);
  return mix(mix_x0, mix_x1, u.z);
}

fn worleyNoise(p: vec3f) -> f32 {
  let n = floor(p);
  let f = fract(p);
  var d = 1.0;
  for (var k = -1; k <= 1; k++) {
    for (var j = -1; j <= 1; j++) {
      for (var i = -1; i <= 1; i++) {
        let g = vec3f(f32(i), f32(j), f32(k));
        let o = hash33(n + g);
        let r = g + o - f;
        d = min(d, dot(r, r));
      }
    }
  }
  return 1.0 - sqrt(d);
}

fn fbm(p: vec3f, octaves: i32) -> f32 {
  var value = 0.0;
  var amp = 0.5;
  var freq = 1.0;
  for (var i = 0; i < 8; i++) {
    if (i >= octaves) { break; }
    value += amp * gradientNoise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

fn ridgedFbm(p: vec3f, octaves: i32) -> f32 {
  var value = 0.0;
  var amp = 0.5;
  var freq = 1.0;
  var prev = 1.0;
  for (var i = 0; i < 8; i++) {
    if (i >= octaves) { break; }
    var n = abs(gradientNoise(p * freq));
    n = 1.0 - n;
    n = n * n;
    value += amp * n * prev;
    prev = n;
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

fn perlinWorley(p: vec3f, octaves: i32) -> f32 {
  let perlin = fbm(p, octaves);
  let worley = worleyNoise(p * 4.0);
  return remap(perlin, worley - 1.0, 1.0, 0.0, 1.0);
}

fn warpedNoise(p: vec3f, strength: f32, octaves: i32) -> f32 {
  let q = vec3f(
    fbm(p, 3),
    fbm(p + vec3f(5.2, 1.3, 2.8), 3),
    fbm(p + vec3f(1.7, 9.2, 3.1), 3)
  );
  return fbm(p + strength * q, octaves);
}

fn curlNoise(p: vec3f) -> vec3f {
  let e = 0.1;
  let px0 = gradientNoise(p - vec3f(e, 0.0, 0.0));
  let px1 = gradientNoise(p + vec3f(e, 0.0, 0.0));
  let py0 = gradientNoise(p - vec3f(0.0, e, 0.0));
  let py1 = gradientNoise(p + vec3f(0.0, e, 0.0));
  let pz0 = gradientNoise(p - vec3f(0.0, 0.0, e));
  let pz1 = gradientNoise(p + vec3f(0.0, 0.0, e));
  return vec3f(
    py1 - py0 - (pz1 - pz0),
    pz1 - pz0 - (px1 - px0),
    px1 - px0 - (py1 - py0)
  ) / (2.0 * e);
}

// Sample precomputed 3D noise texture for cheap cloud lookups
fn sampleNoise3D(p: vec3f) -> vec4f {
  return textureSampleLevel(noiseTex, noiseSampler, fract(p / 8.0), 0.0);
}

// ═══ RAY UTILITIES ═══
fn getRayDirection(uv: vec2f, camPos: vec3f, lookAt: vec3f, fov: f32) -> vec3f {
  let forward = normalize(lookAt - camPos);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
  let up = cross(forward, right);
  let aspectRatio = frame.resolution.x / frame.resolution.y;
  let fovScale = tan(radians(fov) * 0.5);
  let screenPos = (uv * 2.0 - 1.0) * vec2f(aspectRatio, 1.0) * fovScale;
  return normalize(forward + right * screenPos.x + up * screenPos.y);
}

fn rayBoxIntersect(ro: vec3f, rd: vec3f, boxMin: vec3f, boxMax: vec3f) -> vec2f {
  let invRd = 1.0 / rd;
  let t0 = (boxMin - ro) * invRd;
  let t1 = (boxMax - ro) * invRd;
  let tmin = min(t0, t1);
  let tmax = max(t0, t1);
  let dstA = max(max(tmin.x, tmin.y), tmin.z);
  let dstB = min(min(tmax.x, tmax.y), tmax.z);
  let dstToBox = max(0.0, dstA);
  let dstInsideBox = max(0.0, dstB - dstToBox);
  return vec2f(dstToBox, dstInsideBox);
}

// ═══ CELESTIAL ═══
fn getAutoSunElevation() -> f32 {
  if (sun.autoTime == 0u) { return sun.elevation; }
  let cycleTime = frame.time * sun.cycleSpeed * 0.01;
  return sin(cycleTime) * 0.5 + 0.1;
}

fn getAutoSunAzimuth() -> f32 {
  if (sun.autoTime == 0u) { return sun.azimuth; }
  let cycleTime = frame.time * sun.cycleSpeed * 0.01;
  return (cycleTime * 0.3) % TAU;
}

fn getSunDirection() -> vec3f {
  let az = getAutoSunAzimuth();
  let el = getAutoSunElevation();
  return normalize(vec3f(cos(el) * sin(az), sin(el), cos(el) * cos(az)));
}

fn getMoonDirection() -> vec3f {
  return normalize(-getSunDirection() + vec3f(0.2, 0.3, 0.1));
}

fn getStars(rd: vec3f) -> f32 {
  if (rd.y < 0.0) { return 0.0; }
  let sunElev = getAutoSunElevation();
  let starVis = smoothstep(0.1, -0.1, sunElev);
  if (starVis <= 0.0) { return 0.0; }

  // Simplified starfield
  let dir = rd.xzy;
  let theta = acos(clamp(dir.z, -1.0, 1.0));
  var stars = 0.0;
  for (var l = -5.0; l <= 5.0; l += 1.0) {
    let level = clamp(floor((theta / PI) * 10000.0) + l, 0.0, 9999.0);
    let width = PI / 10000.0;
    let theta_ = (level + 0.5) * width;
    if (sin(theta_) < hash12(vec2f(theta_, 0.0))) { continue; }
    let rnd = hash11(PI + theta_);
    let phi_ = TAU * hash11(level);
    let starPos = vec3f(sin(theta_) * cos(phi_), sin(theta_) * sin(phi_), cos(theta_));
    let d = 0.5 + 0.5 * dot(starPos, dir);
    let glow = pow(rnd * 8e-7 / max(1.0 - d, 5e-7), 2.9 + sin(rnd * 6.0 * frame.time));
    stars += glow;
  }
  return stars * 0.05 * sun.starIntensity * starVis;
}

fn getSunDisk(rd: vec3f, sunDir: vec3f) -> vec3f {
  let sunDot = dot(rd, sunDir);
  let disk = smoothstep(0.9997, 0.9999, sunDot);
  let corona = pow(saturateF(sunDot), 256.0) * 2.0 + pow(saturateF(sunDot), 8.0) * 0.5;
  return sun.color * (disk * 50.0 + corona) * sun.intensity;
}

fn getMoonDisk(rd: vec3f, moonDir: vec3f) -> vec3f {
  let moonDot = dot(rd, moonDir);
  if (moonDot < 0.999) { return vec3f(0.0); }
  let localPos = rd - moonDir * moonDot;
  let craters = 1.0 - worleyNoise(localPos * 500.0) * 0.3;
  let disk = smoothstep(0.999, 0.9995, moonDot);
  return vec3f(0.9, 0.9, 0.85) * disk * craters * sun.moonIntensity;
}

// ═══ ATMOSPHERIC SCATTERING ═══
fn rayleighPhase(cosTheta: f32) -> f32 {
  return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}

fn miePhase(cosTheta: f32, g: f32) -> f32 {
  let g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

fn dualLobePhase(cosTheta: f32, g1: f32, g2: f32, blend: f32) -> f32 {
  return mix(miePhase(cosTheta, g1), miePhase(cosTheta, g2), blend);
}

fn getSkyColor(rd: vec3f, sunDir: vec3f) -> vec3f {
  let sunDot = dot(rd, sunDir);
  let horizonFactor = 1.0 - pow(saturateF(rd.y), 0.4);
  let sunElev = getAutoSunElevation();

  var zenith = atmosphere.zenithColor;
  var horizon = atmosphere.horizonColor;

  if (sunElev < 0.1) {
    let t = smoothstep(-0.2, 0.1, sunElev);
    zenith = mix(vec3f(0.02, 0.03, 0.08), zenith, t);
    horizon = mix(vec3f(0.1, 0.05, 0.15), horizon, t);
    if (sunElev > -0.1 && sunElev < 0.1) {
      let sunsetColor = vec3f(1.0, 0.4, 0.1);
      let sunsetBlend = 1.0 - abs(sunElev) * 10.0;
      horizon = mix(horizon, sunsetColor, sunsetBlend * 0.7);
    }
  }

  var skyColor = mix(zenith, horizon, horizonFactor);
  let rayleigh = rayleighPhase(sunDot) * atmosphere.rayleighStrength;
  skyColor += vec3f(0.2, 0.4, 0.8) * rayleigh;
  let mie = miePhase(sunDot, atmosphere.mieG) * atmosphere.mieStrength;
  skyColor += sun.color * mie;

  if (weather.weatherType > 0u) {
    let darkening = weather.intensity * 0.5;
    skyColor *= (1.0 - darkening);
    skyColor = mix(skyColor, vec3f(0.4, 0.45, 0.5), weather.intensity * 0.3);
  }
  return skyColor;
}

// ═══ VOLUMETRIC CLOUDS ═══
fn getCloudHeightGradient(y: f32, cloudBase: f32, cloudTop: f32) -> f32 {
  let h = (y - cloudBase) / (cloudTop - cloudBase);
  if (h < 0.0 || h > 1.0) { return 0.0; }
  let bottomFade = smoothstep(0.0, 0.1, h);
  let topFade = smoothstep(1.0, 0.85, h);
  return pow(bottomFade, 0.5) * topFade * (1.0 - pow(h, 2.0) * 0.5);
}

fn getCloudEdgeFade(p: vec3f) -> f32 {
  let edgeCoord = (p.xz + CLOUD_EXTENT) / (CLOUD_EXTENT * 2.0);
  return smoothstep(0.0, 0.1, edgeCoord.x) * smoothstep(1.0, 0.9, edgeCoord.x) *
         smoothstep(0.0, 0.1, edgeCoord.y) * smoothstep(1.0, 0.9, edgeCoord.y);
}

fn sampleCloudDensity(p: vec3f, cheap: bool) -> f32 {
  let cloudBase = cloud.height;
  let cloudTop = cloud.height + cloud.thickness;
  let heightGrad = getCloudHeightGradient(p.y, cloudBase, cloudTop);
  if (heightGrad <= 0.0) { return 0.0; }
  let edgeFade = getCloudEdgeFade(p);
  if (edgeFade <= 0.0) { return 0.0; }

  let windOffset = vec3f(
    cos(weather.windDirection) * weather.windSpeed * frame.time * 10.0,
    0.0,
    sin(weather.windDirection) * weather.windSpeed * frame.time * 10.0
  );
  let shapeCoord = (p + windOffset) * cloud.scale * 0.0001 + vec3f(frame.time * cloud.speed * 0.002, 0.0, 0.0);

  // Use precomputed noise texture for cheap cloud shape
  let noiseVal = sampleNoise3D(shapeCoord * 16.0);
  let shape = remap(noiseVal.x, noiseVal.y - 1.0, 1.0, 0.0, 1.0);

  var weatherCoverage = cloud.coverage;
  if (weather.weatherType > 0u) {
    weatherCoverage = mix(cloud.coverage, 0.9, weather.intensity);
  }

  var density = remap(shape * heightGrad, 1.0 - weatherCoverage, 1.0, 0.0, 1.0);
  density = saturateF(density);

  if (cheap || density <= 0.0) {
    return density * edgeFade * cloud.density;
  }

  let detailCoord = (p + windOffset) * cloud.detailScale * 0.001 + vec3f(frame.time * cloud.speed * 0.004, 0.0, 0.0);
  let detail = fbm(detailCoord, 3) * 0.3;
  density = remap(density, detail, 1.0, 0.0, 1.0);
  density = saturateF(density);
  return density * edgeFade * cloud.density;
}

fn cloudLightMarch(pos: vec3f, lightDir: vec3f) -> f32 {
  let stepSize = cloud.thickness * 0.5 / 8.0;
  var totalDensity = 0.0;
  var rayPos = pos;
  for (var i = 0; i < 8; i++) {
    rayPos += lightDir * stepSize;
    totalDensity += sampleCloudDensity(rayPos, true) * stepSize;
  }
  return exp(-totalDensity * cloud.lightAbsorption);
}

fn cloudScattering(pos: vec3f, rd: vec3f, density: f32, sunDir: vec3f, lightColor: vec3f) -> vec3f {
  let lightTransmit = cloudLightMarch(pos, sunDir);
  let cosTheta = dot(rd, sunDir);
  let phase = dualLobePhase(cosTheta, 0.8, -0.5, 0.2);
  var ambient = vec3f(0.5, 0.6, 0.7) * cloud.ambient;
  let direct = lightColor * lightTransmit * phase;
  let silverLining = pow(1.0 - abs(cosTheta), 8.0) * cloud.silverLining;
  let silver = lightColor * silverLining * lightTransmit;

  if (weather.weatherType == 3u && weather.lightningIntensity > 0.0) {
    let lightning = weather.lightningIntensity * exp(-abs(frame.time - weather.lightningTime) * 10.0);
    ambient += vec3f(1.0) * lightning * 5.0;
  }
  return ambient + direct + silver;
}

fn raymarchClouds(ro: vec3f, rd: vec3f, sunDir: vec3f, lightColor: vec3f) -> vec4f {
  if (layers.clouds == 0u) { return vec4f(0.0); }
  let cloudBase = cloud.height;
  let cloudTop = cloud.height + cloud.thickness;
  let cloudMin = vec3f(-CLOUD_EXTENT, cloudBase, -CLOUD_EXTENT);
  let cloudMax = vec3f(CLOUD_EXTENT, cloudTop, CLOUD_EXTENT);
  let boxHit = rayBoxIntersect(ro, rd, cloudMin, cloudMax);
  if (boxHit.y <= 0.0) { return vec4f(0.0); }

  let goldenRatio = 1.61803398875;
  let noise = fract(hash12(vec2f(f32(frame.frame % 100u), 0.0)) + goldenRatio * f32(frame.frame % 100u));

  let steps = min(i32(cloud.steps), 64);
  let stepSize = boxHit.y / f32(steps);
  var t = boxHit.x + stepSize * noise;
  var totalLight = vec3f(0.0);
  var totalTransmittance = 1.0;

  for (var i = 0; i < 64; i++) {
    if (i >= steps) { break; }
    if (totalTransmittance < 0.01) { break; }
    let pos = ro + rd * t;
    if (pos.y >= cloudBase && pos.y <= cloudTop) {
      let density = sampleCloudDensity(pos, false);
      if (density > 0.001) {
        let luminance = cloudScattering(pos, rd, density, sunDir, lightColor);
        let stepTransmit = exp(-density * stepSize);
        totalLight += totalTransmittance * luminance * (1.0 - stepTransmit);
        totalTransmittance *= stepTransmit;
      }
    }
    t += stepSize;
    if (t > boxHit.x + boxHit.y) { break; }
  }
  return vec4f(totalLight, 1.0 - totalTransmittance);
}

fn sampleCloudShadow(worldPos: vec3f, sunDir: vec3f) -> f32 {
  if (layers.clouds == 0u) { return 1.0; }
  let cloudBase = cloud.height;
  let cloudTop = cloud.height + cloud.thickness;
  let boxHit = rayBoxIntersect(worldPos, sunDir, vec3f(-CLOUD_EXTENT, cloudBase, -CLOUD_EXTENT), vec3f(CLOUD_EXTENT, cloudTop, CLOUD_EXTENT));
  if (boxHit.y <= 0.0) { return 1.0; }
  let stepSize = boxHit.y / 8.0;
  var t = boxHit.x;
  var totalDensity = 0.0;
  for (var i = 0; i < 8; i++) {
    let pos = worldPos + sunDir * t;
    totalDensity += sampleCloudDensity(pos, true) * stepSize;
    t += stepSize;
  }
  return exp(-totalDensity * 0.5);
}

// ═══ TERRAIN ═══
fn getTerrainHeight(p: vec2f) -> f32 {
  let pos = p * terrain.scale * 0.001;
  let continent = smoothstep(0.25, 0.65, fbm(vec3f(pos * 0.3 + 7.3, 0.0), 3) * 0.5 + 0.5);
  let mountains = pow(ridgedFbm(vec3f(pos * 1.5 + 3.7, 0.5), 5), terrain.mountainSharpness) * terrain.mountainHeight;
  let hills = fbm(vec3f(pos * 3.0 + 11.1, 1.0), 4) * terrain.height * 0.4;
  let detail = fbm(vec3f(pos * 12.0 + 5.5, 2.0), 3) * terrain.height * 0.08;
  let warp = warpedNoise(vec3f(pos * 2.0, 0.3), 0.5, 3) * terrain.height * 0.2;

  var erosion = 0.0;
  if (terrain.erosionStrength > 0.0) {
    let erosionNoise = curlNoise(vec3f(pos * 5.0, 0.0));
    erosion = (erosionNoise.x + erosionNoise.y) * terrain.erosionStrength * 80.0;
    let valleys = pow(1.0 - abs(gradientNoise(vec3f(pos * 2.0, 0.5))), 3.0);
    erosion += valleys * terrain.erosionStrength * 150.0;
  }
  return continent * (mountains + hills + detail + warp - erosion) + ocean.level;
}

fn getTerrainNormal(p: vec2f, height: f32) -> vec3f {
  let e = 10.0;
  let hL = getTerrainHeight(p - vec2f(e, 0.0));
  let hR = getTerrainHeight(p + vec2f(e, 0.0));
  let hD = getTerrainHeight(p - vec2f(0.0, e));
  let hU = getTerrainHeight(p + vec2f(0.0, e));
  return normalize(vec3f(hL - hR, 2.0 * e, hD - hU));
}

fn getTerrainMaterial(worldPos: vec3f, normal: vec3f, height: f32) -> vec3f {
  let slope = 1.0 - normal.y;
  let relativeHeight = height - ocean.level;
  let beachFactor = smoothstep(0.0, terrain.beachWidth, relativeHeight) *
                    smoothstep(terrain.beachWidth * 2.0, terrain.beachWidth, relativeHeight);
  let grassFactor = smoothstep(terrain.beachWidth, terrain.beachWidth * 2.0, relativeHeight) *
                    smoothstep(terrain.treeLine, terrain.treeLine * 0.8, relativeHeight) *
                    smoothstep(0.5, 0.3, slope);
  var rockFactor = smoothstep(0.3, 0.6, slope) + smoothstep(terrain.treeLine * 0.8, terrain.treeLine, relativeHeight);
  rockFactor = saturateF(rockFactor);
  var snowFactor = smoothstep(terrain.snowLine * 0.9, terrain.snowLine, relativeHeight) * smoothstep(0.7, 0.4, slope);
  if (weather.weatherType == 2u) {
    snowFactor = mix(snowFactor, 1.0, weather.intensity * (1.0 - slope));
  }

  var color = terrain.sandColor * beachFactor;
  color = mix(color, terrain.grassColor, grassFactor);
  color = mix(color, terrain.rockColor, rockFactor);
  color = mix(color, terrain.snowColor, snowFactor);
  let variation = fbm(worldPos * 0.1, 3) * 0.2 + 0.9;
  color *= variation;
  return color;
}

fn raymarchTerrain(ro: vec3f, rd: vec3f, sunDir: vec3f, lightColor: vec3f) -> vec4f {
  if (layers.terrain == 0u) { return vec4f(0.0, 0.0, 0.0, -1.0); }
  var t = 1.0;
  let maxDist = 80000.0;
  var lastH = 0.0;
  var lastY = 0.0;
  for (var i = 0; i < 200; i++) {
    let pos = ro + rd * t;
    let terrainHeight = getTerrainHeight(pos.xz);
    let distToTerrain = pos.y - terrainHeight;
    if (distToTerrain < 0.5) {
      var tLow = t - max(1.0, abs(lastY - lastH) * 0.3);
      var tHigh = t;
      for (var j = 0; j < 6; j++) {
        let tMid = (tLow + tHigh) * 0.5;
        let midPos = ro + rd * tMid;
        let midH = getTerrainHeight(midPos.xz);
        if (midPos.y < midH) { tHigh = tMid; } else { tLow = tMid; }
      }
      t = (tLow + tHigh) * 0.5;
      let hitPos = ro + rd * t;
      let finalH = getTerrainHeight(hitPos.xz);
      let normal = getTerrainNormal(hitPos.xz, finalH);
      let material = getTerrainMaterial(hitPos, normal, finalH);
      let NdotL = max(0.0, dot(normal, sunDir));
      let cloudShadow = sampleCloudShadow(hitPos, sunDir);
      var lightningFlash = 0.0;
      if (weather.weatherType == 3u && weather.lightningIntensity > 0.0) {
        lightningFlash = weather.lightningIntensity * exp(-abs(frame.time - weather.lightningTime) * 10.0);
      }
      let ambient = material * 0.25;
      let diffuse = material * lightColor * NdotL * cloudShadow;
      let lightning = material * lightningFlash * 3.0;
      let color = ambient + diffuse + lightning;
      return vec4f(color, t);
    }
    lastH = terrainHeight;
    lastY = pos.y;
    let stepScale = max(0.3, distToTerrain * 0.4);
    t += max(0.5, min(stepScale, 200.0 + t * 0.01));
    if (t > maxDist) { break; }
  }
  return vec4f(0.0, 0.0, 0.0, -1.0);
}

// ═══ OCEAN — TDM SEASCAPE METHODOLOGY ═══
const octave_m: mat2x2f = mat2x2f(1.6, 1.2, -1.2, 1.6);

fn oceanNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i + vec2f(0.0, 0.0)), hash12(i + vec2f(1.0, 0.0)), u.x),
    mix(hash12(i + vec2f(0.0, 1.0)), hash12(i + vec2f(1.0, 1.0)), u.x),
    u.y
  ) * 2.0 - 1.0;
}

fn sea_octave(uv_in: vec2f, choppy: f32) -> f32 {
  let uv = uv_in + vec2f(oceanNoise(uv_in), oceanNoise(uv_in + 7.3));
  let wv = 1.0 - abs(sin(uv));
  let swv = abs(cos(uv));
  let blended = mix(wv, swv, wv);
  return pow(1.0 - pow(blended.x * blended.y, 0.65), choppy);
}

fn oceanMap(p: vec3f, iterations: i32) -> f32 {
  let SEA_FREQ = ocean.waveFrequency * 0.16;
  let SEA_HEIGHT = ocean.waveHeight * 0.6;
  let SEA_CHOPPY = 4.0 + ocean.roughness * 4.0;
  let SEA_TIME = frame.time * ocean.waveSpeed * 0.8;

  var freq = SEA_FREQ;
  var amp = SEA_HEIGHT;
  var choppy = SEA_CHOPPY;
  var uv = p.xz;
  uv.x *= 0.75;

  let windAngle = weather.windDirection;
  let windRot = mat2x2f(cos(windAngle), -sin(windAngle), sin(windAngle), cos(windAngle));
  uv = windRot * uv;

  var h = 0.0;
  for (var i = 0; i < 8; i++) {
    if (i >= iterations) { break; }
    var d = sea_octave((uv + SEA_TIME) * freq, choppy);
    d += sea_octave((uv - SEA_TIME) * freq, choppy);
    h += d * amp;
    uv = octave_m * uv;
    freq *= 1.9;
    amp *= 0.22;
    choppy = mix(choppy, 1.0, 0.2);
  }

  if (weather.weatherType == 3u) {
    let stormWave = sea_octave(p.xz * 0.05 + SEA_TIME * 0.5, 2.0);
    h += stormWave * weather.intensity * ocean.waveHeight * 1.5;
  }
  return p.y - h;
}

fn heightMapTracing(ori: vec3f, dir: vec3f) -> vec4f {
  var tm = 0.0;
  var tx = 2000.0;
  let hx = oceanMap(ori + dir * tx, 5);
  if (hx > 0.0) { return vec4f(ori + dir * tx, tx); }
  var hm = oceanMap(ori + dir * tm, 5);
  var tmid = 0.0;
  for (var i = 0; i < 8; i++) {
    tmid = mix(tm, tx, hm / (hm - hx));
    let hmid = oceanMap(ori + dir * tmid, 5);
    if (hmid < 0.0) { tx = tmid; } else { tm = tmid; hm = hmid; }
  }
  return vec4f(ori + dir * tmid, tmid);
}

fn getOceanNormal(p: vec3f, eps: f32) -> vec3f {
  let ny = oceanMap(p, 8);
  let nx = oceanMap(vec3f(p.x + eps, p.y, p.z), 8) - ny;
  let nz = oceanMap(vec3f(p.x, p.y, p.z + eps), 8) - ny;
  return normalize(vec3f(nx, eps, nz));
}

fn getCaustics(worldPos: vec3f, time: f32) -> f32 {
  let uv = worldPos.xz * 0.05;
  var c = 0.0;
  for (var i = 0.0; i < 3.0; i += 1.0) {
    let p = uv * (1.5 + i * 0.5) + vec2f(time * (0.2 + i * 0.1), time * (0.15 - i * 0.05));
    let w = worleyNoise(vec3f(p, i + time * 0.2));
    c += pow(w, 3.0 - i * 0.5) * (1.0 - i * 0.25);
  }
  return saturateF(c * 0.8);
}

fn oceanDiffuse(n: vec3f, l: vec3f, p: f32) -> f32 {
  return pow(dot(n, l) * 0.4 + 0.6, p);
}

fn oceanSpecular(n: vec3f, l: vec3f, e: vec3f, s: f32) -> f32 {
  let nrm = (s + 8.0) / (PI * 8.0);
  return pow(max(dot(reflect(e, n), l), 0.0), s) * nrm;
}

fn getOceanColor(p: vec3f, n: vec3f, sunDir: vec3f, lightColor: vec3f, eye: vec3f, dist: f32) -> vec3f {
  var fresnel = clamp(1.0 - dot(n, -eye), 0.0, 1.0);
  fresnel = pow(fresnel, 3.0) * 0.5;
  let reflected = getSkyColor(reflect(eye, n), sunDir);
  let seaBase = ocean.deepColor;
  let seaWaterColor = ocean.color * 1.5 + vec3f(0.0, 0.1, 0.05);
  let refracted = seaBase + oceanDiffuse(n, sunDir, 80.0) * seaWaterColor * 0.12;
  var color = mix(refracted, reflected, fresnel);

  let waveH = oceanMap(p, 8);
  let heightBoost = max(p.y - waveH, 0.0);
  let atten = max(1.0 - dist * dist * 0.0000015, 0.0);
  color += seaWaterColor * heightBoost * 0.18 * atten;

  let sss = pow(saturateF(dot(-eye, sunDir + n * 0.4)), 3.0);
  color += vec3f(0.0, 0.15, 0.1) * sss * ocean.sssIntensity * atten;

  let spec = oceanSpecular(n, sunDir, eye, 60.0);
  color += vec3f(spec) * lightColor;

  let caustics = getCaustics(p, frame.time) * ocean.causticsIntensity * 0.08;
  color += caustics * lightColor * atten;

  let cloudShadow = sampleCloudShadow(p, sunDir);
  color *= mix(0.6, 1.0, cloudShadow);

  let atmosphereFade = 1.0 - saturateF(dist * 0.0003);
  color = mix(getSkyColor(eye, sunDir) * 0.8, color, atmosphereFade);
  return color;
}

fn renderOcean(ro: vec3f, rd: vec3f, sunDir: vec3f, lightColor: vec3f, terrainDist: f32) -> vec4f {
  if (layers.ocean == 0u) { return vec4f(0.0); }
  if (ro.y < ocean.level) {
    // Underwater simplified
    let t = (ocean.level - ro.y) / max(rd.y, 0.001);
    if (t < 0.0) {
      let depth = ocean.level - ro.y;
      let fogFactor = 1.0 - exp(-depth * 0.005);
      return vec4f(vec3f(0.0, 0.1, 0.2) * (1.0 + 0.5), fogFactor + 0.5, 0.0, 0.0);
    }
    let hitPos = ro + rd * t;
    let normal = -getOceanNormal(hitPos, 0.1);
    let caustics = getCaustics(hitPos, frame.time) * ocean.causticsIntensity;
    let refraction = mix(ocean.color, ocean.deepColor, 0.5) + caustics * lightColor * 0.3;
    return vec4f(refraction, t);
  }

  if (rd.y > 0.3) { return vec4f(0.0); }
  let result = heightMapTracing(ro, rd);
  let t = result.w;
  if (t > 1999.0) { return vec4f(0.0); }
  if (terrainDist > 0.0 && t > terrainDist) { return vec4f(0.0); }
  let hitPoint = result.xyz;
  let eps = max(0.01, t * 0.002);
  let normal = getOceanNormal(hitPoint, eps);
  let oceanColor = getOceanColor(hitPoint, normal, sunDir, lightColor, rd, t);
  return vec4f(oceanColor, t);
}

// ═══ WEATHER PARTICLES ═══
fn renderRain(uv: vec2f, baseColor: vec3f) -> vec3f {
  if (layers.weather == 0u || weather.weatherType != 1u) { return baseColor; }
  var rainAlpha = 0.0;
  for (var layer = 0.0; layer < 3.0; layer += 1.0) {
    let layerScale = 1.0 + layer * 0.5;
    let layerSpeed = 10.0 + layer * 5.0;
    let layerAlpha = (1.0 - layer * 0.3) * 0.5;
    var rainUV = uv * vec2f(100.0 * layerScale, 40.0 * layerScale);
    rainUV.y -= frame.time * layerSpeed;
    rainUV.x += sin(frame.time * 0.5 + layer) * 0.5 + frame.time * weather.windSpeed * 3.0;
    let cellId = floor(rainUV);
    let cellUV = fract(rainUV);
    let rand = hash12(cellId);
    if (rand < weather.intensity * 0.8) {
      let dropX = hash12(cellId + 0.1) * 0.8 + 0.1;
      let dropLen = 0.1 + rand * 0.15;
      let dist = abs(cellUV.x - dropX);
      let drop = smoothstep(0.02, 0.0, dist) * smoothstep(0.0, dropLen, cellUV.y) * smoothstep(dropLen + 0.1, dropLen, cellUV.y);
      rainAlpha += drop * layerAlpha * weather.intensity;
    }
  }
  return mix(baseColor, vec3f(0.7, 0.75, 0.85), saturateF(rainAlpha));
}

fn renderSnow(uv: vec2f, baseColor: vec3f) -> vec3f {
  if (layers.weather == 0u || weather.weatherType != 2u) { return baseColor; }
  var snowAlpha = 0.0;
  for (var layer = 0.0; layer < 4.0; layer += 1.0) {
    let layerScale = 1.0 + layer * 0.3;
    let layerSpeed = 0.5 + layer * 0.2;
    var snowUV = uv * vec2f(50.0 * layerScale);
    snowUV.y -= frame.time * layerSpeed;
    snowUV.x += sin(frame.time * 0.5 + layer) * 0.3 + frame.time * weather.windSpeed * 2.0;
    snowUV.x += sin(snowUV.y * 2.0 + layer * 1.5) * 0.1;
    let cellId = floor(snowUV);
    let cellUV = fract(snowUV);
    let rand = hash12(cellId);
    if (rand < weather.intensity * 0.6) {
      let flakePos = hash22(cellId) * 0.8 + 0.1;
      let dist = length(cellUV - flakePos);
      let size = 0.03 + hash12(cellId + 1.0) * 0.03;
      snowAlpha += smoothstep(size, size * 0.3, dist) * (1.0 - layer * 0.2) * 0.4;
    }
  }
  return mix(baseColor, vec3f(0.95, 0.95, 1.0), saturateF(snowAlpha));
}

fn renderLightning(uv: vec2f, baseColor: vec3f) -> vec3f {
  if (layers.weather == 0u || weather.weatherType != 3u) { return baseColor; }
  let flash = weather.lightningIntensity * exp(-abs(frame.time - weather.lightningTime) * 8.0);
  if (flash < 0.01) { return baseColor; }
  return baseColor + vec3f(0.8, 0.85, 1.0) * flash * 0.5;
}

// ═══ FOG & GOD RAYS ═══
fn applyFog(color: vec3f, ro: vec3f, rd: vec3f, dist: f32, sunDir: vec3f, lightColor: vec3f) -> vec3f {
  if (layers.fog == 0u || fog.density <= 0.0) { return color; }
  var fogAmount = 1.0 - exp(-dist * fog.density * 0.0001);
  if (weather.weatherType > 0u) {
    fogAmount = mix(fogAmount, 0.5, weather.intensity * 0.3);
  }
  let sunAmount = pow(saturateF(dot(rd, sunDir)), 8.0);
  var fogCol = mix(fog.color, lightColor, sunAmount * 0.5);
  if (weather.weatherType == 1u || weather.weatherType == 3u) {
    fogCol = mix(fogCol, vec3f(0.4, 0.45, 0.5), weather.intensity * 0.3);
  }
  return mix(color, fogCol, fogAmount);
}

fn calculateGodRays(ro: vec3f, rd: vec3f, sunDir: vec3f, sceneDepth: f32) -> f32 {
  if (layers.godRays == 0u || post.godRayIntensity <= 0.0) { return 0.0; }
  var godRays = 0.0;
  let steps = min(i32(post.godRaySteps), 16);
  let stepSize = min(sceneDepth, 5000.0) / f32(steps);
  var decay = 1.0;
  for (var i = 0; i < 16; i++) {
    if (i >= steps) { break; }
    let pos = ro + rd * (f32(i) * stepSize);
    let cloudOcclusion = sampleCloudShadow(pos, sunDir);
    let scatter = (1.0 - cloudOcclusion) * decay;
    let sunDot = max(0.0, dot(normalize(pos - ro), sunDir));
    godRays += scatter * pow(sunDot, 4.0);
    decay *= post.godRayDecay;
  }
  return godRays * post.godRayIntensity * 0.1;
}

// ═══ POST-PROCESSING ═══
fn applyColorGrading(color_in: vec3f, uv: vec2f) -> vec3f {
  var color = color_in * post.exposure;
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  color = mix(vec3f(luma), color, post.saturation);
  if (post.vignetteStrength > 0.0) {
    let vigUV = uv * 2.0 - 1.0;
    let vig = 1.0 - dot(vigUV, vigUV) * post.vignetteStrength * 0.5;
    color *= vig;
  }
  // ACES tonemapping
  color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
  return saturate3(color);
}

// ═══ MAIN FRAGMENT ═══
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let ro = camera.position;
  let pitch = clamp(camera.pitch, -PI * 0.45, PI * 0.45);
  let lookDir = vec3f(
    cos(pitch) * sin(camera.yaw),
    sin(pitch),
    cos(pitch) * cos(camera.yaw)
  );
  let rd = getRayDirection(uv, ro, ro + lookDir, camera.fov);
  let sunDir = getSunDirection();
  let moonDir = getMoonDirection();

  let sunElev = getAutoSunElevation();
  var lightColor = sun.color * sun.intensity;
  if (sunElev < 0.0) {
    lightColor = vec3f(0.3, 0.35, 0.5) * sun.moonIntensity;
  } else if (sunElev < 0.1) {
    let t = sunElev / 0.1;
    lightColor = mix(vec3f(0.3, 0.35, 0.5) * sun.moonIntensity, vec3f(1.0, 0.5, 0.2) * sun.intensity, t);
  }
  if (weather.weatherType > 0u) {
    lightColor *= (1.0 - weather.intensity * 0.4);
  }

  let isUnderwater = ro.y < ocean.level;
  var finalColor = vec3f(0.0);
  var sceneDepth = 100000.0;

  // SKY
  if (layers.sky != 0u) {
    var skyColor = getSkyColor(rd, sunDir);
    if (sunElev < 0.1 && weather.weatherType == 0u) {
      skyColor += vec3f(getStars(rd));
    }
    if (weather.weatherType == 0u) {
      skyColor += getSunDisk(rd, sunDir);
      if (sunElev < 0.0) { skyColor += getMoonDisk(rd, moonDir); }
    }
    finalColor = skyColor;
  }

  // TERRAIN
  let terrainResult = raymarchTerrain(ro, rd, sunDir, lightColor);
  let terrainDist = terrainResult.w;
  if (terrainDist > 0.0) {
    finalColor = terrainResult.rgb;
    sceneDepth = terrainDist;
  }

  // OCEAN
  let oceanResult = renderOcean(ro, rd, sunDir, lightColor, terrainDist);
  if (oceanResult.w > 0.0 && (terrainDist < 0.0 || oceanResult.w < terrainDist)) {
    finalColor = oceanResult.rgb;
    sceneDepth = oceanResult.w;
  }

  // CLOUDS
  if (!isUnderwater) {
    let clouds = raymarchClouds(ro, rd, sunDir, lightColor);
    finalColor = mix(finalColor, clouds.rgb, clouds.a);
  }

  // FOG
  if (!isUnderwater) {
    finalColor = applyFog(finalColor, ro, rd, sceneDepth, sunDir, lightColor);
  }

  // GOD RAYS
  if (!isUnderwater) {
    let godRays = calculateGodRays(ro, rd, sunDir, sceneDepth);
    finalColor += lightColor * godRays;
  }

  // WEATHER
  if (!isUnderwater) {
    finalColor = renderRain(uv, finalColor);
    finalColor = renderSnow(uv, finalColor);
    finalColor = renderLightning(uv, finalColor);
  }

  // POST
  finalColor = applyColorGrading(finalColor, uv);
  return vec4f(finalColor, 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
interface EngineSettings {
  timeOfDay: number;
  sunAzimuth: number;
  sunElevation: number;
  autoTimeEnabled: boolean;
  dayNightCycleSpeed: number;
  cameraHeight: number;
  cameraFOV: number;
  cameraSpeed: number;
  skyZenithColor: [number, number, number];
  skyHorizonColor: [number, number, number];
  atmosphereDensity: number;
  rayleighStrength: number;
  mieStrength: number;
  mieG: number;
  moonIntensity: number;
  starIntensity: number;
  cloudCoverage: number;
  cloudDensity: number;
  cloudScale: number;
  cloudDetailScale: number;
  cloudSpeed: number;
  cloudHeight: number;
  cloudThickness: number;
  cloudLightAbsorption: number;
  cloudAmbient: number;
  cloudSilverLining: number;
  cloudPowder: number;
  cloudSteps: number;
  terrainScale: number;
  terrainHeight: number;
  mountainHeight: number;
  mountainSharpness: number;
  snowLine: number;
  treeLine: number;
  beachWidth: number;
  erosionStrength: number;
  grassColor: [number, number, number];
  rockColor: [number, number, number];
  snowColor: [number, number, number];
  sandColor: [number, number, number];
  oceanLevel: number;
  oceanColor: [number, number, number];
  oceanDeepColor: [number, number, number];
  waveHeight: number;
  waveFrequency: number;
  waveSpeed: number;
  oceanRoughness: number;
  oceanFresnel: number;
  foamIntensity: number;
  causticsIntensity: number;
  sssIntensity: number;
  bubbleIntensity: number;
  weatherType: number;
  weatherIntensity: number;
  windSpeed: number;
  windDirection: number;
  lightningIntensity: number;
  fogDensity: number;
  fogHeight: number;
  fogColor: [number, number, number];
  bloomIntensity: number;
  bloomThreshold: number;
  exposure: number;
  saturation: number;
  vignetteStrength: number;
  godRayIntensity: number;
  godRayDecay: number;
  godRaySteps: number;
}

interface LayerVisibility {
  sky: boolean;
  clouds: boolean;
  terrain: boolean;
  ocean: boolean;
  vegetation: boolean;
  weather: boolean;
  fog: boolean;
  godRays: boolean;
}

const DEFAULT_SETTINGS: EngineSettings = {
  timeOfDay: 2,
  sunAzimuth: 0.3,
  sunElevation: 0.4,
  autoTimeEnabled: false,
  dayNightCycleSpeed: 1.0,
  cameraHeight: 200,
  cameraFOV: 75,
  cameraSpeed: 100,
  skyZenithColor: [0.15, 0.35, 0.65],
  skyHorizonColor: [0.5, 0.65, 0.8],
  atmosphereDensity: 1.0,
  rayleighStrength: 1.0,
  mieStrength: 0.5,
  mieG: 0.8,
  moonIntensity: 0.5,
  starIntensity: 1.0,
  cloudCoverage: 0.5,
  cloudDensity: 0.05,
  cloudScale: 1.0,
  cloudDetailScale: 3.0,
  cloudSpeed: 0.5,
  cloudHeight: 1500,
  cloudThickness: 1500,
  cloudLightAbsorption: 0.5,
  cloudAmbient: 0.4,
  cloudSilverLining: 0.3,
  cloudPowder: 0.5,
  cloudSteps: 64,
  terrainScale: 1.0,
  terrainHeight: 500,
  mountainHeight: 3000,
  mountainSharpness: 2.0,
  snowLine: 2500,
  treeLine: 2000,
  beachWidth: 50,
  erosionStrength: 0.3,
  grassColor: [0.2, 0.4, 0.1],
  rockColor: [0.4, 0.35, 0.3],
  snowColor: [0.95, 0.95, 1.0],
  sandColor: [0.8, 0.7, 0.5],
  oceanLevel: 0,
  oceanColor: [0.0, 0.09, 0.18],
  oceanDeepColor: [0.0, 0.04, 0.1],
  waveHeight: 0.6,
  waveFrequency: 1.0,
  waveSpeed: 0.8,
  oceanRoughness: 0.3,
  oceanFresnel: 0.04,
  foamIntensity: 0.3,
  causticsIntensity: 0.3,
  sssIntensity: 0.4,
  bubbleIntensity: 0.15,
  weatherType: 0,
  weatherIntensity: 0,
  windSpeed: 0.5,
  windDirection: 0,
  lightningIntensity: 0.8,
  fogDensity: 0.3,
  fogHeight: 500,
  fogColor: [0.5, 0.55, 0.6],
  bloomIntensity: 0.15,
  bloomThreshold: 0.8,
  exposure: 1.0,
  saturation: 1.1,
  vignetteStrength: 0.2,
  godRayIntensity: 0.3,
  godRayDecay: 0.96,
  godRaySteps: 16,
};

const DEFAULT_LAYERS: LayerVisibility = {
  sky: true,
  clouds: false,
  terrain: false,
  ocean: false,
  vegetation: false,
  weather: false,
  fog: false,
  godRays: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => (
  <div className="space-y-3">
    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
    {children}
  </div>
);

interface SliderSettingProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

const SliderSetting: React.FC<SliderSettingProps> = React.memo(
  ({ label, value, min, max, step, format, onChange }) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs text-muted-foreground font-mono">
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="w-full" />
    </div>
  )
);

interface LayerToggleProps {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const LayerToggle: React.FC<LayerToggleProps> = ({ label, icon, enabled, onChange }) => (
  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <Switch checked={enabled} onCheckedChange={onChange} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// WEBGPU INITIALIZATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function padTo256(size: number): number {
  return Math.ceil(size / 256) * 256;
}

// Build all uniform buffers as Float32Arrays/Uint32Arrays matching WGSL structs
function buildFrameBuffer(time: number, frameNum: number, w: number, h: number, mx: number, my: number): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32));
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  f[0] = time; u[1] = frameNum; f[2] = w; f[3] = h; f[4] = mx; f[5] = my;
  return buf;
}

function buildCameraBuffer(pos: [number, number, number], fov: number, yaw: number, pitch: number): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32));
  const f = new Float32Array(buf);
  f[0] = pos[0]; f[1] = pos[1]; f[2] = pos[2]; f[3] = fov; f[4] = yaw; f[5] = pitch;
  return buf;
}

function buildSunBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(48));
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  f[0] = s.sunAzimuth * Math.PI * 2;
  f[1] = s.sunElevation * Math.PI * 0.5;
  f[2] = 2.0; // intensity
  f[3] = s.moonIntensity;
  f[4] = 1.0; f[5] = 0.95; f[6] = 0.8; // sun color
  f[7] = s.starIntensity;
  u[8] = s.autoTimeEnabled ? 1 : 0;
  f[9] = s.dayNightCycleSpeed;
  return buf;
}

function buildAtmosphereBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(48));
  const f = new Float32Array(buf);
  f[0] = s.skyZenithColor[0]; f[1] = s.skyZenithColor[1]; f[2] = s.skyZenithColor[2]; f[3] = s.atmosphereDensity;
  f[4] = s.skyHorizonColor[0]; f[5] = s.skyHorizonColor[1]; f[6] = s.skyHorizonColor[2]; f[7] = s.rayleighStrength;
  f[8] = s.mieStrength; f[9] = s.mieG;
  return buf;
}

function buildCloudBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(48));
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  f[0] = s.cloudCoverage; f[1] = s.cloudDensity; f[2] = s.cloudScale; f[3] = s.cloudDetailScale;
  f[4] = s.cloudSpeed; f[5] = s.cloudHeight; f[6] = s.cloudThickness; f[7] = s.cloudLightAbsorption;
  f[8] = s.cloudAmbient; f[9] = s.cloudSilverLining; f[10] = s.cloudPowder; u[11] = s.cloudSteps;
  return buf;
}

function buildTerrainBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(128));
  const f = new Float32Array(buf);
  f[0] = s.terrainScale; f[1] = s.terrainHeight; f[2] = s.mountainHeight; f[3] = s.mountainSharpness;
  f[4] = s.snowLine; f[5] = s.treeLine; f[6] = s.beachWidth; f[7] = s.erosionStrength;
  // grassColor + pad
  f[8] = s.grassColor[0]; f[9] = s.grassColor[1]; f[10] = s.grassColor[2]; f[11] = 0;
  // rockColor + pad
  f[12] = s.rockColor[0]; f[13] = s.rockColor[1]; f[14] = s.rockColor[2]; f[15] = 0;
  // snowColor + pad
  f[16] = s.snowColor[0]; f[17] = s.snowColor[1]; f[18] = s.snowColor[2]; f[19] = 0;
  // sandColor + pad
  f[20] = s.sandColor[0]; f[21] = s.sandColor[1]; f[22] = s.sandColor[2]; f[23] = 0;
  return buf;
}

function buildOceanBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(96));
  const f = new Float32Array(buf);
  f[0] = s.oceanLevel; f[1] = s.waveHeight; f[2] = s.waveFrequency; f[3] = s.waveSpeed;
  f[4] = s.oceanRoughness; f[5] = s.oceanFresnel; f[6] = s.foamIntensity; f[7] = s.causticsIntensity;
  f[8] = s.sssIntensity; f[9] = s.bubbleIntensity; f[10] = 0; f[11] = 0;
  f[12] = s.oceanColor[0]; f[13] = s.oceanColor[1]; f[14] = s.oceanColor[2]; f[15] = 0;
  f[16] = s.oceanDeepColor[0]; f[17] = s.oceanDeepColor[1]; f[18] = s.oceanDeepColor[2]; f[19] = 0;
  return buf;
}

function buildWeatherBuffer(s: EngineSettings, lightningTime: number): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32));
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  u[0] = s.weatherType; f[1] = s.weatherIntensity; f[2] = s.windSpeed; f[3] = s.windDirection;
  f[4] = s.lightningIntensity; f[5] = lightningTime;
  return buf;
}

function buildFogBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32));
  const f = new Float32Array(buf);
  f[0] = s.fogDensity; f[1] = s.fogHeight; f[2] = 0; f[3] = 0;
  f[4] = s.fogColor[0]; f[5] = s.fogColor[1]; f[6] = s.fogColor[2]; f[7] = 0;
  return buf;
}

function buildPostBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32));
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  f[0] = s.bloomIntensity; f[1] = s.bloomThreshold; f[2] = s.exposure; f[3] = s.saturation;
  f[4] = s.vignetteStrength; f[5] = s.godRayIntensity; f[6] = s.godRayDecay; u[7] = s.godRaySteps;
  return buf;
}

function buildLayerBuffer(l: LayerVisibility): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32));
  const u = new Uint32Array(buf);
  u[0] = l.sky ? 1 : 0;
  u[1] = l.clouds ? 1 : 0;
  u[2] = l.terrain ? 1 : 0;
  u[3] = l.ocean ? 1 : 0;
  u[4] = l.vegetation ? 1 : 0;
  u[5] = l.weather ? 1 : 0;
  u[6] = l.fog ? 1 : 0;
  u[7] = l.godRays ? 1 : 0;
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ProceduralEarthGPU: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gpuRef = useRef<{
    device: GPUDevice;
    context: GPUCanvasContext;
    pipeline: GPURenderPipeline;
    uniformBuffers: GPUBuffer[];
    bindGroup0: GPUBindGroup;
    bindGroup1: GPUBindGroup;
    noiseTexture: GPUTexture;
  } | null>(null);
  const frameRef = useRef(0);
  const lightningTimeRef = useRef(0);
  const startTimeRef = useRef(0);

  const cameraRef = useRef({
    pos: [0, 200, 0] as [number, number, number],
    yaw: 0,
    pitch: 0,
    velocity: [0, 0, 0] as [number, number, number],
  });
  const keysRef = useRef<Set<string>>(new Set());

  const [showSettings, setShowSettings] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [activeTab, setActiveTab] = useState('atmosphere');
  const [gpuError, setGpuError] = useState<string | null>(null);
  const [gpuReady, setGpuReady] = useState(false);

  const settingsRef = useRef(settings);
  const layersRef = useRef(layers);
  const isPausedRef = useRef(isPaused);
  settingsRef.current = settings;
  layersRef.current = layers;
  isPausedRef.current = isPaused;

  const updateSetting = useCallback(<K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateLayer = useCallback(<K extends keyof LayerVisibility>(key: K, value: boolean) => {
    setLayers(prev => ({ ...prev, [key]: value }));
  }, []);

  const enableAllLayers = useCallback(() => {
    setLayers({ sky: true, clouds: true, terrain: true, ocean: true, vegetation: true, weather: true, fog: true, godRays: true });
  }, []);

  const skyOnlyLayers = useCallback(() => {
    setLayers(DEFAULT_LAYERS);
  }, []);

  // Initialize WebGPU
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const init = async () => {
      if (!navigator.gpu) {
        setGpuError('WebGPU is not supported in this browser. Try Chrome 113+ or Edge 113+ with WebGPU enabled.');
        return;
      }

      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) {
        setGpuError('No WebGPU adapter found. Your GPU may not support WebGPU.');
        return;
      }

      const device = await adapter.requestDevice({
        requiredLimits: {
          maxStorageTexturesPerShaderStage: 1,
        }
      });

      const context = canvas.getContext('webgpu') as GPUCanvasContext | null;
      if (!context) {
        setGpuError('Failed to get WebGPU context.');
        return;
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      (context as GPUCanvasContext).configure({ device, format, alphaMode: 'premultiplied' });

      // Create 3D noise texture
      const noiseSize = 128;
      const noiseTexture = device.createTexture({
        size: [noiseSize, noiseSize, noiseSize],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
      });

      // Run compute shader to fill noise texture
      const computeModule = device.createShaderModule({ code: NOISE_COMPUTE_WGSL });
      const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: computeModule, entryPoint: 'main' },
      });
      const computeBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: noiseTexture.createView() }],
      });
      const computeEncoder = device.createCommandEncoder();
      const computePass = computeEncoder.beginComputePass();
      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, computeBindGroup);
      computePass.dispatchWorkgroups(noiseSize / 4, noiseSize / 4, noiseSize / 4);
      computePass.end();
      device.queue.submit([computeEncoder.finish()]);

      // Create uniform buffers (11 total)
      const bufferSizes = [32, 32, 48, 48, 48, 128, 96, 32, 32, 32, 32];
      const uniformBuffers = bufferSizes.map(size =>
        device.createBuffer({
          size: padTo256(size),
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
      );

      // Create sampler
      const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        addressModeW: 'repeat',
      });

      // Create render pipeline
      const renderModule = device.createShaderModule({ code: RENDER_WGSL });

      // Check for compilation errors
      const compilationInfo = await renderModule.getCompilationInfo();
      const errors = compilationInfo.messages.filter(m => m.type === 'error');
      if (errors.length > 0) {
        console.error('WGSL compilation errors:', errors);
        setGpuError(`WGSL shader compilation failed: ${errors[0].message} (line ${errors[0].lineNum})`);
        return;
      }

      const bindGroupLayout0 = device.createBindGroupLayout({
        entries: Array.from({ length: 11 }, (_, i) => ({
          binding: i,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' as const },
        })),
      });

      const bindGroupLayout1 = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '3d' } },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        ],
      });

      const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout0, bindGroupLayout1],
      });

      const pipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module: renderModule, entryPoint: 'vs_main' },
        fragment: {
          module: renderModule,
          entryPoint: 'fs_main',
          targets: [{ format }],
        },
        primitive: { topology: 'triangle-list' },
      });

      const bindGroup0 = device.createBindGroup({
        layout: bindGroupLayout0,
        entries: uniformBuffers.map((buffer, i) => ({
          binding: i,
          resource: { buffer },
        })),
      });

      const bindGroup1 = device.createBindGroup({
        layout: bindGroupLayout1,
        entries: [
          { binding: 0, resource: noiseTexture.createView({ dimension: '3d' }) },
          { binding: 1, resource: sampler },
        ],
      });

      gpuRef.current = { device, context, pipeline, uniformBuffers, bindGroup0, bindGroup1, noiseTexture };
      startTimeRef.current = performance.now() / 1000;
      setGpuReady(true);
    };

    init().catch(err => {
      console.error('WebGPU init error:', err);
      setGpuError(`WebGPU initialization failed: ${err.message}`);
    });

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (gpuRef.current) {
        gpuRef.current.noiseTexture.destroy();
        gpuRef.current.uniformBuffers.forEach(b => b.destroy());
      }
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!gpuReady || !gpuRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const { device, context, pipeline, uniformBuffers, bindGroup0, bindGroup1 } = gpuRef.current;

    let lastTime = performance.now() / 1000;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const now = performance.now() / 1000;
      const deltaTime = now - lastTime;
      lastTime = now;

      if (isPausedRef.current) return;

      const s = settingsRef.current;
      const l = layersRef.current;
      const cam = cameraRef.current;

      frameRef.current++;
      const time = now - startTimeRef.current;

      // WASD movement
      const keys = keysRef.current;
      const speed = s.cameraSpeed * deltaTime;
      const forward = [
        Math.cos(cam.pitch) * Math.sin(cam.yaw),
        Math.sin(cam.pitch),
        Math.cos(cam.pitch) * Math.cos(cam.yaw),
      ];
      const right = [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)];

      let mx = 0, my = 0, mz = 0;
      if (keys.has('w')) { mx += forward[0]; my += forward[1]; mz += forward[2]; }
      if (keys.has('s')) { mx -= forward[0]; my -= forward[1]; mz -= forward[2]; }
      if (keys.has('a')) { mx -= right[0]; mz -= right[2]; }
      if (keys.has('d')) { mx += right[0]; mz += right[2]; }
      if (keys.has(' ')) { my += 1; }
      if (keys.has('shift')) { my -= 1; }

      const len = Math.sqrt(mx * mx + my * my + mz * mz);
      if (len > 0) {
        mx /= len; my /= len; mz /= len;
        cam.velocity[0] += (mx * speed * 10 - cam.velocity[0]) * 0.1;
        cam.velocity[1] += (my * speed * 10 - cam.velocity[1]) * 0.1;
        cam.velocity[2] += (mz * speed * 10 - cam.velocity[2]) * 0.1;
      } else {
        cam.velocity[0] *= 0.9;
        cam.velocity[1] *= 0.9;
        cam.velocity[2] *= 0.9;
      }
      cam.pos[0] += cam.velocity[0] * deltaTime;
      cam.pos[1] += cam.velocity[1] * deltaTime;
      cam.pos[2] += cam.velocity[2] * deltaTime;

      // Lightning
      if (s.weatherType === 3 && Math.random() < 0.002) {
        lightningTimeRef.current = time;
      }

      // Update canvas size
      const w = canvas.clientWidth * Math.min(devicePixelRatio, 1.5);
      const h = canvas.clientHeight * Math.min(devicePixelRatio, 1.5);
      if (canvas.width !== Math.floor(w) || canvas.height !== Math.floor(h)) {
        canvas.width = Math.floor(w);
        canvas.height = Math.floor(h);
      }

      // Write uniform buffers
      device.queue.writeBuffer(uniformBuffers[0], 0, buildFrameBuffer(time, frameRef.current, canvas.width, canvas.height, 0, 0));
      device.queue.writeBuffer(uniformBuffers[1], 0, buildCameraBuffer(cam.pos, s.cameraFOV, cam.yaw, cam.pitch));
      device.queue.writeBuffer(uniformBuffers[2], 0, buildSunBuffer(s));
      device.queue.writeBuffer(uniformBuffers[3], 0, buildAtmosphereBuffer(s));
      device.queue.writeBuffer(uniformBuffers[4], 0, buildCloudBuffer(s));
      device.queue.writeBuffer(uniformBuffers[5], 0, buildTerrainBuffer(s));
      device.queue.writeBuffer(uniformBuffers[6], 0, buildOceanBuffer(s));
      device.queue.writeBuffer(uniformBuffers[7], 0, buildWeatherBuffer(s, lightningTimeRef.current));
      device.queue.writeBuffer(uniformBuffers[8], 0, buildFogBuffer(s));
      device.queue.writeBuffer(uniformBuffers[9], 0, buildPostBuffer(s));
      device.queue.writeBuffer(uniformBuffers[10], 0, buildLayerBuffer(l));

      // Render
      const encoder = device.createCommandEncoder();
      const textureView = context.getCurrentTexture().createView();
      const renderPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      renderPass.setPipeline(pipeline);
      renderPass.setBindGroup(0, bindGroup0);
      renderPass.setBindGroup(1, bindGroup1);
      renderPass.draw(3); // full-screen triangle
      renderPass.end();
      device.queue.submit([encoder.finish()]);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gpuReady]);

  // Input handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        cameraRef.current.yaw += e.movementX * 0.002;
        cameraRef.current.pitch -= e.movementY * 0.002;
        cameraRef.current.pitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, cameraRef.current.pitch));
      }
    };
    const handleClick = () => { canvas.requestPointerLock(); };
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current.add(e.key.toLowerCase()); };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const setTimePreset = (preset: 'night' | 'sunrise' | 'day' | 'sunset') => {
    switch (preset) {
      case 'night':
        setSettings(prev => ({ ...prev, timeOfDay: 0, sunElevation: -0.2, starIntensity: 1.0, skyZenithColor: [0.02, 0.03, 0.08] as [number, number, number], skyHorizonColor: [0.05, 0.05, 0.1] as [number, number, number] }));
        break;
      case 'sunrise':
        setSettings(prev => ({ ...prev, timeOfDay: 1, sunElevation: 0.08, sunAzimuth: 0.25, starIntensity: 0.2, skyZenithColor: [0.15, 0.25, 0.5] as [number, number, number], skyHorizonColor: [0.9, 0.5, 0.3] as [number, number, number] }));
        break;
      case 'day':
        setSettings(prev => ({ ...prev, timeOfDay: 2, sunElevation: 0.4, starIntensity: 0, skyZenithColor: [0.15, 0.35, 0.65] as [number, number, number], skyHorizonColor: [0.5, 0.65, 0.8] as [number, number, number] }));
        break;
      case 'sunset':
        setSettings(prev => ({ ...prev, timeOfDay: 3, sunElevation: 0.08, sunAzimuth: 0.75, starIntensity: 0.3, skyZenithColor: [0.2, 0.25, 0.45] as [number, number, number], skyHorizonColor: [0.95, 0.4, 0.2] as [number, number, number] }));
        break;
    }
  };

  const setWeatherPreset = (w: 'clear' | 'rain' | 'snow' | 'storm') => {
    switch (w) {
      case 'clear': setSettings(prev => ({ ...prev, weatherType: 0, weatherIntensity: 0 })); break;
      case 'rain': setSettings(prev => ({ ...prev, weatherType: 1, weatherIntensity: 0.7, cloudCoverage: 0.8 })); break;
      case 'snow': setSettings(prev => ({ ...prev, weatherType: 2, weatherIntensity: 0.6, cloudCoverage: 0.7 })); break;
      case 'storm': setSettings(prev => ({ ...prev, weatherType: 3, weatherIntensity: 1.0, cloudCoverage: 0.95, windSpeed: 1.5 })); break;
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setLayers(DEFAULT_LAYERS);
    cameraRef.current = { pos: [0, 200, 0], yaw: 0, pitch: 0, velocity: [0, 0, 0] };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (gpuError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-lg text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Procedural Earth V5 — WebGPU</h1>
          <p className="text-lg text-emerald-400">WebGPU Required</p>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <p className="text-slate-300 text-sm leading-relaxed">{gpuError}</p>
          </div>
          <div className="space-y-3 text-left bg-slate-800/30 rounded-xl p-4">
            <p className="text-slate-400 text-sm font-medium">Requirements:</p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2"><span className="text-emerald-400">1.</span><span>Chrome 113+ or Edge 113+</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400">2.</span><span>Enable <strong className="text-white">chrome://flags/#enable-unsafe-webgpu</strong> if needed</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400">3.</span><span>Open in a <strong className="text-white">new browser tab</strong> (not embedded)</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400">4.</span><span>Hardware acceleration must be enabled</span></li>
            </ul>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
              <RotateCcw className="w-4 h-4 mr-2" /> Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Use WebGL Version
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <AnimatedLogo />

      {/* Header */}
      <div className="absolute top-5 left-20 panel-glow backdrop-blur-xl rounded-xl p-4">
        <h1 className="text-xl font-bold text-primary text-glow">Procedural Earth V5</h1>
        <p className="text-xs text-muted-foreground">WebGPU • Compute Noise • WGSL Shaders</p>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-5 left-5 panel-glow backdrop-blur-xl rounded-xl p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Click</kbd> to enable flight</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">WASD</kbd> Move</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Space/Shift</kbd> Up/Down</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Mouse</kbd> Look</span>
        </div>
      </div>

      {/* Time presets */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-2">
        {(['night', 'sunrise', 'day', 'sunset'] as const).map((preset) => (
          <Button key={preset} size="sm"
            variant={(preset === 'night' && settings.timeOfDay === 0) || (preset === 'sunrise' && settings.timeOfDay === 1) || (preset === 'day' && settings.timeOfDay === 2) || (preset === 'sunset' && settings.timeOfDay === 3) ? 'default' : 'outline'}
            onClick={() => setTimePreset(preset)} className="panel-glow backdrop-blur-sm capitalize">
            {preset === 'night' ? <Moon className="w-4 h-4 mr-1" /> : <Sun className="w-4 h-4 mr-1" />}
            {preset}
          </Button>
        ))}
        <Button size="sm" variant={settings.autoTimeEnabled ? 'default' : 'outline'} onClick={() => updateSetting('autoTimeEnabled', !settings.autoTimeEnabled)} className="panel-glow backdrop-blur-sm">
          <RotateCcw className="w-4 h-4 mr-1" /> Auto
        </Button>
      </div>

      {/* Weather presets */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2">
        <Button size="sm" variant={settings.weatherType === 0 ? 'default' : 'outline'} onClick={() => setWeatherPreset('clear')} className="panel-glow backdrop-blur-sm"><Sun className="w-4 h-4 mr-1" />Clear</Button>
        <Button size="sm" variant={settings.weatherType === 1 ? 'default' : 'outline'} onClick={() => setWeatherPreset('rain')} className="panel-glow backdrop-blur-sm"><CloudRain className="w-4 h-4 mr-1" />Rain</Button>
        <Button size="sm" variant={settings.weatherType === 2 ? 'default' : 'outline'} onClick={() => setWeatherPreset('snow')} className="panel-glow backdrop-blur-sm"><CloudSnow className="w-4 h-4 mr-1" />Snow</Button>
        <Button size="sm" variant={settings.weatherType === 3 ? 'default' : 'outline'} onClick={() => setWeatherPreset('storm')} className="panel-glow backdrop-blur-sm"><Zap className="w-4 h-4 mr-1" />Storm</Button>
      </div>

      {/* Controls */}
      <div className="absolute top-5 right-5 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)} className="panel-glow backdrop-blur-sm">{isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}</Button>
        <Button variant="outline" size="icon" onClick={resetSettings} className="panel-glow backdrop-blur-sm"><RotateCcw className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" onClick={toggleFullscreen} className="panel-glow backdrop-blur-sm"><Maximize2 className="w-4 h-4" /></Button>
        <Button variant={showLayers ? 'default' : 'outline'} size="icon" onClick={() => setShowLayers(!showLayers)} className="panel-glow backdrop-blur-sm"><Layers className="w-4 h-4" /></Button>
        <Button variant={showSettings ? 'default' : 'outline'} size="icon" onClick={() => setShowSettings(!showSettings)} className="panel-glow backdrop-blur-sm"><Settings className="w-4 h-4" /></Button>
      </div>

      {/* Layer Panel */}
      {showLayers && (
        <div className="absolute top-20 right-5 w-64 panel-glow backdrop-blur-xl rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-primary">Layer Visibility</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowLayers(false)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2 mb-4">
            <LayerToggle label="Sky" icon={<Sun className="w-4 h-4 text-primary" />} enabled={layers.sky} onChange={(v) => updateLayer('sky', v)} />
            <LayerToggle label="Clouds" icon={<Cloud className="w-4 h-4 text-primary" />} enabled={layers.clouds} onChange={(v) => updateLayer('clouds', v)} />
            <LayerToggle label="Terrain" icon={<Mountain className="w-4 h-4 text-primary" />} enabled={layers.terrain} onChange={(v) => updateLayer('terrain', v)} />
            <LayerToggle label="Ocean" icon={<Waves className="w-4 h-4 text-primary" />} enabled={layers.ocean} onChange={(v) => updateLayer('ocean', v)} />
            <LayerToggle label="Vegetation" icon={<TreePine className="w-4 h-4 text-primary" />} enabled={layers.vegetation} onChange={(v) => updateLayer('vegetation', v)} />
            <LayerToggle label="Weather" icon={<CloudRain className="w-4 h-4 text-primary" />} enabled={layers.weather} onChange={(v) => updateLayer('weather', v)} />
            <LayerToggle label="Fog" icon={<Wind className="w-4 h-4 text-primary" />} enabled={layers.fog} onChange={(v) => updateLayer('fog', v)} />
            <LayerToggle label="God Rays" icon={<Sparkles className="w-4 h-4 text-primary" />} enabled={layers.godRays} onChange={(v) => updateLayer('godRays', v)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={enableAllLayers}><Eye className="w-4 h-4 mr-1" /> All</Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={skyOnlyLayers}><EyeOff className="w-4 h-4 mr-1" /> Sky Only</Button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-20 right-5 w-80 max-h-[calc(100vh-120px)] panel-glow backdrop-blur-xl rounded-xl">
          <div className="flex justify-between items-center p-4 border-b border-border/30">
            <h3 className="text-sm font-semibold text-primary">Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5 p-1 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="atmosphere" className="text-xs px-2"><Sun className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="clouds" className="text-xs px-2"><Cloud className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="terrain" className="text-xs px-2"><Mountain className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="ocean" className="text-xs px-2"><Waves className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="effects" className="text-xs px-2"><Sparkles className="w-3 h-3" /></TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-4 space-y-4">
                <TabsContent value="atmosphere" className="mt-0 space-y-4">
                  <SettingSection title="Sun Position">
                    <SliderSetting label="Azimuth" value={settings.sunAzimuth} min={0} max={1} step={0.01} format={(v) => `${(v * 360).toFixed(0)}°`} onChange={(v) => updateSetting('sunAzimuth', v)} />
                    <SliderSetting label="Elevation" value={settings.sunElevation} min={-0.3} max={1} step={0.01} format={(v) => `${(v * 90).toFixed(0)}°`} onChange={(v) => updateSetting('sunElevation', v)} />
                  </SettingSection>
                  <SettingSection title="Day/Night Cycle">
                    <SliderSetting label="Cycle Speed" value={settings.dayNightCycleSpeed} min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('dayNightCycleSpeed', v)} />
                  </SettingSection>
                  <SettingSection title="Atmosphere">
                    <SliderSetting label="Rayleigh" value={settings.rayleighStrength} min={0} max={3} step={0.05} onChange={(v) => updateSetting('rayleighStrength', v)} />
                    <SliderSetting label="Mie" value={settings.mieStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('mieStrength', v)} />
                    <SliderSetting label="Mie G" value={settings.mieG} min={0.5} max={0.99} step={0.01} onChange={(v) => updateSetting('mieG', v)} />
                  </SettingSection>
                  <SettingSection title="Camera">
                    <SliderSetting label="FOV" value={settings.cameraFOV} min={30} max={120} step={1} format={(v) => `${v}°`} onChange={(v) => updateSetting('cameraFOV', v)} />
                    <SliderSetting label="Speed" value={settings.cameraSpeed} min={10} max={500} step={10} onChange={(v) => updateSetting('cameraSpeed', v)} />
                  </SettingSection>
                </TabsContent>

                <TabsContent value="clouds" className="mt-0 space-y-4">
                  <SettingSection title="Shape">
                    <SliderSetting label="Coverage" value={settings.cloudCoverage} min={0} max={1} step={0.01} format={(v) => `${(v * 100).toFixed(0)}%`} onChange={(v) => updateSetting('cloudCoverage', v)} />
                    <SliderSetting label="Density" value={settings.cloudDensity} min={0.01} max={0.2} step={0.005} onChange={(v) => updateSetting('cloudDensity', v)} />
                    <SliderSetting label="Scale" value={settings.cloudScale} min={0.2} max={3} step={0.1} onChange={(v) => updateSetting('cloudScale', v)} />
                  </SettingSection>
                  <SettingSection title="Motion">
                    <SliderSetting label="Speed" value={settings.cloudSpeed} min={0} max={5} step={0.1} onChange={(v) => updateSetting('cloudSpeed', v)} />
                    <SliderSetting label="Detail" value={settings.cloudDetailScale} min={0.5} max={10} step={0.5} onChange={(v) => updateSetting('cloudDetailScale', v)} />
                  </SettingSection>
                  <SettingSection title="Layer">
                    <SliderSetting label="Height (m)" value={settings.cloudHeight} min={500} max={5000} step={100} onChange={(v) => updateSetting('cloudHeight', v)} />
                    <SliderSetting label="Thickness (m)" value={settings.cloudThickness} min={500} max={3000} step={100} onChange={(v) => updateSetting('cloudThickness', v)} />
                  </SettingSection>
                  <SettingSection title="Lighting">
                    <SliderSetting label="Silver Lining" value={settings.cloudSilverLining} min={0} max={1} step={0.05} onChange={(v) => updateSetting('cloudSilverLining', v)} />
                    <SliderSetting label="Powder" value={settings.cloudPowder} min={0} max={1} step={0.05} onChange={(v) => updateSetting('cloudPowder', v)} />
                  </SettingSection>
                </TabsContent>

                <TabsContent value="terrain" className="mt-0 space-y-4">
                  <SettingSection title="Shape">
                    <SliderSetting label="Scale" value={settings.terrainScale} min={0.2} max={3} step={0.1} onChange={(v) => updateSetting('terrainScale', v)} />
                    <SliderSetting label="Mountain Height" value={settings.mountainHeight} min={500} max={8000} step={100} onChange={(v) => updateSetting('mountainHeight', v)} />
                    <SliderSetting label="Erosion" value={settings.erosionStrength} min={0} max={1} step={0.05} onChange={(v) => updateSetting('erosionStrength', v)} />
                  </SettingSection>
                  <SettingSection title="Biomes">
                    <SliderSetting label="Snow Line" value={settings.snowLine} min={1000} max={5000} step={100} onChange={(v) => updateSetting('snowLine', v)} />
                    <SliderSetting label="Tree Line" value={settings.treeLine} min={500} max={4000} step={100} onChange={(v) => updateSetting('treeLine', v)} />
                  </SettingSection>
                </TabsContent>

                <TabsContent value="ocean" className="mt-0 space-y-4">
                  <SettingSection title="Surface">
                    <SliderSetting label="Sea Level" value={settings.oceanLevel} min={-500} max={500} step={10} onChange={(v) => updateSetting('oceanLevel', v)} />
                    <SliderSetting label="Wave Height" value={settings.waveHeight} min={0} max={10} step={0.1} onChange={(v) => updateSetting('waveHeight', v)} />
                    <SliderSetting label="Wave Speed" value={settings.waveSpeed} min={0} max={3} step={0.1} onChange={(v) => updateSetting('waveSpeed', v)} />
                    <SliderSetting label="Roughness" value={settings.oceanRoughness} min={0} max={1} step={0.05} onChange={(v) => updateSetting('oceanRoughness', v)} />
                    <SliderSetting label="Foam" value={settings.foamIntensity} min={0} max={2} step={0.05} onChange={(v) => updateSetting('foamIntensity', v)} />
                  </SettingSection>
                  <SettingSection title="Effects">
                    <SliderSetting label="Caustics" value={settings.causticsIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('causticsIntensity', v)} />
                    <SliderSetting label="SSS" value={settings.sssIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('sssIntensity', v)} />
                  </SettingSection>
                </TabsContent>

                <TabsContent value="effects" className="mt-0 space-y-4">
                  <SettingSection title="Post-Processing">
                    <SliderSetting label="Bloom" value={settings.bloomIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('bloomIntensity', v)} />
                    <SliderSetting label="Exposure" value={settings.exposure} min={0.5} max={2} step={0.05} onChange={(v) => updateSetting('exposure', v)} />
                    <SliderSetting label="Saturation" value={settings.saturation} min={0.5} max={1.5} step={0.05} onChange={(v) => updateSetting('saturation', v)} />
                    <SliderSetting label="Vignette" value={settings.vignetteStrength} min={0} max={1} step={0.05} onChange={(v) => updateSetting('vignetteStrength', v)} />
                  </SettingSection>
                  <SettingSection title="God Rays">
                    <SliderSetting label="Intensity" value={settings.godRayIntensity} min={0} max={2} step={0.05} onChange={(v) => updateSetting('godRayIntensity', v)} />
                  </SettingSection>
                  <SettingSection title="Fog">
                    <SliderSetting label="Density" value={settings.fogDensity} min={0} max={2} step={0.05} onChange={(v) => updateSetting('fogDensity', v)} />
                  </SettingSection>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ProceduralEarthGPU;
