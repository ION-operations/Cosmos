import * as THREE from 'three';

export type CosmosWeatherPreset = 'waterWorldV01' | 'earthLikeV01';

export interface CosmosWeatherAtlasOptions {
  width?: number;
  height?: number;
  seed?: number;
  preset?: CosmosWeatherPreset;
}

export interface CosmosWeatherAtlas {
  width: number;
  height: number;
  preset: CosmosWeatherPreset;
  weatherA: THREE.DataTexture;       // R cloud cover, G cloud liquid, B cloud ice/cirrus, A precipitation/storm energy
  weatherB: THREE.DataTexture;       // R wind U encoded, G wind V encoded, B humidity, A temperature
  terrainForcingA: THREE.DataTexture; // R elevation, G land mask, B coast proximity, A roughness/drag
  terrainForcingB: THREE.DataTexture; // R evaporation potential, G heat capacity, B orographic forcing, A lee shadow
  dispose: () => void;
}

const TAU = Math.PI * 2;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function periodicLonDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function hash2(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 101.3) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  const ab = a + (b - a) * ux;
  const cd = c + (d - c) * ux;
  return ab + (cd - ab) * uy;
}

function fbm2(x: number, y: number, seed: number, octaves = 5): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;

  for (let i = 0; i < octaves; i++) {
    value += valueNoise2(x * frequency, y * frequency, seed + i * 19.17) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }

  return value / norm;
}

function encodeSigned(value: number): number {
  return clamp01(value * 0.5 + 0.5);
}

function writeRGBA(data: Uint8Array, index: number, r: number, g: number, b: number, a: number): void {
  data[index] = Math.round(clamp01(r) * 255);
  data[index + 1] = Math.round(clamp01(g) * 255);
  data[index + 2] = Math.round(clamp01(b) * 255);
  data[index + 3] = Math.round(clamp01(a) * 255);
}

function makeTexture(data: Uint8Array, width: number, height: number, repeatY = false): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = repeatY ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function createCosmosWeatherAtlas(options: CosmosWeatherAtlasOptions = {}): CosmosWeatherAtlas {
  const width = options.width ?? 512;
  const height = options.height ?? 256;
  const seed = options.seed ?? 12052026;
  const preset = options.preset ?? 'waterWorldV01';
  const waterWorldBias = preset === 'waterWorldV01' ? 0.72 : 0.38;

  const weatherA = new Uint8Array(width * height * 4);
  const weatherB = new Uint8Array(width * height * 4);
  const terrainA = new Uint8Array(width * height * 4);
  const terrainB = new Uint8Array(width * height * 4);

  const storms = [
    { lon: -2.55, lat: 0.22, amp: 0.86, radiusLon: 0.42, radiusLat: 0.26 },
    { lon: -0.85, lat: -0.58, amp: 0.74, radiusLon: 0.55, radiusLat: 0.30 },
    { lon: 1.35, lat: 0.68, amp: 0.68, radiusLon: 0.70, radiusLat: 0.32 },
    { lon: 2.75, lat: -0.18, amp: 0.52, radiusLon: 0.38, radiusLat: 0.24 },
  ];

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    const lat = (v - 0.5) * Math.PI;
    const absLat = Math.abs(lat);
    const cosLat = Math.cos(lat);

    const itcz = Math.exp(-Math.pow(lat / 0.17, 2));
    const marineStratus = smoothstep(0.18, 0.55, absLat) * (1 - smoothstep(0.85, 1.2, absLat));
    const midlatitudeStormTrack = smoothstep(0.48, 0.78, absLat) * (1 - smoothstep(1.05, 1.35, absLat));
    const subtropicalDry = smoothstep(0.24, 0.45, absLat) * (1 - smoothstep(0.55, 0.78, absLat));
    const polar = smoothstep(1.05, 1.38, absLat);

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = (u - 0.5) * TAU;
      const i = (y * width + x) * 4;

      const synoptic = fbm2(u * 7.5, v * 4.2, seed, 5);
      const cellular = fbm2(u * 35.0 + 13.1, v * 20.0 - 2.4, seed + 97, 4);
      const streaks = fbm2(u * 18.0 + v * 5.0, v * 7.0, seed + 211, 4);

      const continentNoise = fbm2(u * 4.0 + 0.17, v * 2.4 - 0.31, seed + 503, 6);
      const islandNoise = fbm2(u * 22.0 - 5.0, v * 12.0 + 2.0, seed + 541, 5);
      const rawLand = smoothstep(0.66 + waterWorldBias * 0.18, 0.86, continentNoise + islandNoise * 0.18);
      const landMask = clamp01(rawLand * (preset === 'waterWorldV01' ? 0.55 : 1.0));
      const elevation = clamp01(Math.pow(rawLand, 2.8) * (0.25 + islandNoise * 0.75));
      const coast = clamp01((1 - Math.abs(rawLand - 0.5) * 2) * (0.35 + islandNoise * 0.65));

      let stormEnergy = 0;
      let cycloneCurlU = 0;
      let cycloneCurlV = 0;
      for (const s of storms) {
        const dx = periodicLonDelta(lon, s.lon) / s.radiusLon;
        const dy = (lat - s.lat) / s.radiusLat;
        const dist2 = dx * dx + dy * dy;
        const g = Math.exp(-dist2) * s.amp;
        stormEnergy += g;
        cycloneCurlU += -dy * g * 0.6;
        cycloneCurlV += dx * g * 0.6;
      }
      stormEnergy = clamp01(stormEnergy);

      const humidity = clamp01(
        0.42 + itcz * 0.35 + marineStratus * 0.22 + polar * 0.12 + stormEnergy * 0.35 - subtropicalDry * 0.28 + synoptic * 0.18 - landMask * 0.08,
      );
      const temperature = clamp01(0.14 + cosLat * 0.72 + synoptic * 0.08 - elevation * 0.22);
      const instability = clamp01(humidity * temperature * 1.25 + stormEnergy * 0.45 - subtropicalDry * 0.3);

      const cloudCover = clamp01(
        0.10 + itcz * 0.45 + marineStratus * 0.27 + midlatitudeStormTrack * 0.34 + polar * 0.2 + stormEnergy * 0.62 + synoptic * 0.18 + cellular * 0.10 - subtropicalDry * 0.30,
      );
      const cloudLiquid = clamp01(cloudCover * (0.55 + humidity * 0.55) + marineStratus * 0.2 + stormEnergy * 0.22);
      const cloudIce = clamp01(midlatitudeStormTrack * 0.35 + stormEnergy * 0.65 + streaks * 0.22 + polar * 0.18);
      const precipitation = clamp01(stormEnergy * 0.85 + cloudCover * instability * 0.55 + itcz * humidity * 0.18);

      const trades = Math.sign(lat || 1) * -0.32 * smoothstep(0.05, 0.42, absLat) * (1 - smoothstep(0.47, 0.72, absLat));
      const westerlies = 0.55 * Math.sign(lat || 1) * smoothstep(0.42, 0.72, absLat) * (1 - smoothstep(1.0, 1.25, absLat));
      const polarEasterlies = -0.35 * Math.sign(lat || 1) * smoothstep(1.02, 1.32, absLat);
      const jetWave = (synoptic - 0.5) * 0.34 + cycloneCurlU;
      const windU = clamp01(0.5 + trades + westerlies + polarEasterlies + jetWave) * 2 - 1;
      const windV = clamp01(0.5 + (cellular - 0.5) * 0.36 + cycloneCurlV + Math.sin(lon * 2.0 + lat * 3.0) * 0.05) * 2 - 1;

      const evaporation = clamp01((1 - landMask) * (0.45 + temperature * 0.45 + humidity * 0.2));
      const heatCapacity = clamp01((1 - landMask) * 0.85 + landMask * 0.42);
      const roughnessDrag = clamp01(landMask * (0.35 + elevation * 0.55) + coast * 0.2);
      const orographic = clamp01(elevation * landMask * (0.35 + humidity * 0.65));
      const leeShadow = clamp01(elevation * landMask * (0.3 + Math.max(0, windU) * 0.5));

      writeRGBA(weatherA, i, cloudCover, cloudLiquid, cloudIce, precipitation);
      writeRGBA(weatherB, i, encodeSigned(windU), encodeSigned(windV), humidity, temperature);
      writeRGBA(terrainA, i, elevation, landMask, coast, roughnessDrag);
      writeRGBA(terrainB, i, evaporation, heatCapacity, orographic, leeShadow);
    }
  }

  const weatherATex = makeTexture(weatherA, width, height);
  const weatherBTex = makeTexture(weatherB, width, height);
  const terrainATex = makeTexture(terrainA, width, height);
  const terrainBTex = makeTexture(terrainB, width, height);

  return {
    width,
    height,
    preset,
    weatherA: weatherATex,
    weatherB: weatherBTex,
    terrainForcingA: terrainATex,
    terrainForcingB: terrainBTex,
    dispose: () => {
      weatherATex.dispose();
      weatherBTex.dispose();
      terrainATex.dispose();
      terrainBTex.dispose();
    },
  };
}
