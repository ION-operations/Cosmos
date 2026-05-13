#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const outputDir = resolve(process.env.COSMOS_ATMOSPHERE_LUT_EXPORT_DIR ?? 'docs/cosmos/validation/atmosphere/R0012/lut-textures');
const spec = {
  transmittance: { width: 320, height: 80 },
  multiScattering: { width: 96, height: 48 },
  skyView: { width: 240, height: 135 },
  aerialPerspective: { width: 128, height: 72 },
};
const defaults = {
  strength: 0.90,
  rayleighScale: 1.04,
  mieScale: 0.58,
  ozoneScale: 0.94,
  multiScatteringStrength: 0.68,
  aerialPerspectiveStrength: 0.62,
  skyViewStrength: 0.90,
  opticalDepthDebug: 0.10,
};

const R = 6371000;
const atmosphereTop = 100000;
const AR = R + atmosphereTop;
const HR = 8500;
const HM = 1200;
const rayleighRgb = [5.802, 13.558, 33.1];
const ozoneRgb = [2.1, 1.18, 0.38];
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const lerp = (a, b, t) => a + (b - a) * t;
function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / Math.max(edge1 - edge0, 1e-6));
  return t * t * (3 - 2 * t);
}
function raySphere(radius, mu, sphereRadius) {
  const b = radius * Math.max(-1, Math.min(1, mu));
  const c = radius * radius - sphereRadius * sphereRadius;
  const d = b * b - c;
  if (d < 0) return undefined;
  const h = Math.sqrt(d);
  return [-b - h, -b + h];
}
function ozoneDensity01(altitude) {
  const h = Math.max(0, altitude);
  return clamp01(Math.exp(-Math.pow((h - 25000) / 15000, 2)) * smoothstep(9000, 18000, h) * (1 - smoothstep(49000, 76000, h)));
}
function integrate(altitudeMeters, directionMu, maxDistanceMeters, steps = 16) {
  const altitude = Math.max(0, altitudeMeters);
  const mu = Math.max(-1, Math.min(1, directionMu));
  const startRadius = R + altitude;
  const hit = raySphere(startRadius, mu, AR);
  if (!hit) return { r: 0, m: 0, o: 0, path: 0 };
  let t0 = Math.max(0, hit[0]);
  let t1 = hit[1];
  const ground = raySphere(startRadius, mu, R);
  if (ground && ground[0] > 0 && ground[0] < t1) t1 = ground[0];
  if (maxDistanceMeters !== undefined) t1 = Math.min(t1, Math.max(0, maxDistanceMeters));
  if (t1 <= t0) return { r: 0, m: 0, o: 0, path: 0 };
  const dt = (t1 - t0) / steps;
  let r = 0; let m = 0; let o = 0;
  for (let i = 0; i < steps; i += 1) {
    const t = t0 + (i + 0.5) * dt;
    const radius = Math.sqrt(Math.max(0, startRadius * startRadius + t * t + 2 * startRadius * mu * t));
    const h = Math.max(0, radius - R);
    r += Math.exp(-h / HR) * dt;
    m += Math.exp(-h / HM) * dt;
    o += ozoneDensity01(h) * dt;
  }
  return { r: r / HR, m: m / HM, o: o / 18000, path: t1 - t0 };
}
function phaseRayleigh(mu) { return 0.05968310365946075 * (1 + mu * mu); }
function phaseMie(mu) {
  const g = 0.76;
  const g2 = g * g;
  return 0.1193662073189215 * (1 - g2) / Math.pow(Math.max(1 + g2 - 2 * g * mu, 1e-4), 1.5);
}
function sample(input) {
  const c = { ...defaults, ...(input.controls ?? {}) };
  const altitude = Math.max(0, input.altitudeMeters);
  const sunMu = Math.max(-1, Math.min(1, input.sunMu));
  const viewMu = Math.max(-1, Math.min(1, input.viewMu ?? input.sunMu));
  const distance = Math.max(0, input.distanceMeters ?? 120000);
  const v = integrate(altitude, viewMu, distance, 16);
  const s = integrate(altitude, sunMu, undefined, 12);
  const rayleigh = (v.r * 0.68 + s.r * 0.32) * c.rayleighScale;
  const mie = (v.m * 0.72 + s.m * 0.28) * c.mieScale;
  const ozone = (v.o * 0.42 + s.o * 0.58) * c.ozoneScale;
  const opticalRaw = rayleigh * 0.020 + mie * 0.028 + ozone * 0.016;
  const opticalDepth = clamp01((1 - Math.exp(-opticalRaw)) * c.strength * 1.35);
  const transmittance = [
    Math.exp(-(rayleighRgb[0] * rayleigh * 0.018 + 1.35 * mie * 0.030 + ozoneRgb[0] * ozone * 0.018) * c.strength),
    Math.exp(-(rayleighRgb[1] * rayleigh * 0.018 + 1.35 * mie * 0.030 + ozoneRgb[1] * ozone * 0.018) * c.strength),
    Math.exp(-(rayleighRgb[2] * rayleigh * 0.018 + 1.35 * mie * 0.030 + ozoneRgb[2] * ozone * 0.018) * c.strength),
  ].map(clamp01);
  const night = smoothstep(-0.24, 0.05, sunMu);
  const horizon = 1 - smoothstep(0.04, 0.58, Math.abs(viewMu));
  const rayleighBlue = smoothstep(-0.08, 0.75, sunMu) * clamp01(rayleigh * 0.18);
  const mieGold = smoothstep(-0.34, 0.16, sunMu) * (1 - smoothstep(0.20, 0.74, sunMu));
  const multiple = c.multiScatteringStrength * (0.18 + 0.82 * (1 - transmittance[2]));
  const phaseBoost = clamp01((phaseRayleigh(sunMu) * 3.2 + phaseMie(sunMu) * 0.18) * 0.9 + 0.12);
  const inscatter = [
    (0.13 * rayleighBlue + 0.82 * mieGold * horizon + multiple * 0.32) * night * phaseBoost,
    (0.29 * rayleighBlue + 0.46 * mieGold * horizon + multiple * 0.50) * night * phaseBoost,
    (0.78 * rayleighBlue + 0.14 * mieGold * horizon + multiple * 0.92) * night * phaseBoost,
  ].map(clamp01);
  const aerialPerspective = clamp01((1 - Math.exp(-distance * distance * 2.7e-10 * Math.exp(-altitude / HR))) * c.aerialPerspectiveStrength);
  return { transmittance, inscatter, opticalDepth, aerialPerspective };
}
const toByte = (value) => Math.round(clamp01(value) * 255);
function buildTransmittanceBytes() {
  const { width, height } = spec.transmittance;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const altitude = (y / Math.max(height - 1, 1)) ** 1.65 * 100000;
    for (let x = 0; x < width; x += 1) {
      const sunMu = lerp(-0.35, 1.0, x / Math.max(width - 1, 1));
      const s = sample({ altitudeMeters: altitude, sunMu, viewMu: sunMu, distanceMeters: 140000 });
      const i = (y * width + x) * 4;
      data[i] = toByte(s.transmittance[0]); data[i + 1] = toByte(s.transmittance[1]); data[i + 2] = toByte(s.transmittance[2]); data[i + 3] = toByte(s.opticalDepth);
    }
  }
  return data;
}
function buildMultiScatteringBytes() {
  const { width, height } = spec.multiScattering;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const altitude = (y / Math.max(height - 1, 1)) ** 1.35 * 100000;
    for (let x = 0; x < width; x += 1) {
      const sunMu = lerp(-0.42, 1.0, x / Math.max(width - 1, 1));
      const s = sample({ altitudeMeters: altitude, sunMu, viewMu: 0.18, distanceMeters: 220000 });
      const energy = clamp01((1 - (s.transmittance[0] + s.transmittance[1] + s.transmittance[2]) / 3) * defaults.multiScatteringStrength * 1.8);
      const i = (y * width + x) * 4;
      data[i] = toByte(s.inscatter[0] + energy * 0.20); data[i + 1] = toByte(s.inscatter[1] + energy * 0.32); data[i + 2] = toByte(s.inscatter[2] + energy * 0.52); data[i + 3] = toByte(energy);
    }
  }
  return data;
}
function buildSkyViewBytes() {
  const { width, height } = spec.skyView;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sunMu = lerp(-0.45, 1.0, y / Math.max(height - 1, 1));
    for (let x = 0; x < width; x += 1) {
      const viewMu = lerp(-0.08, 1.0, x / Math.max(width - 1, 1));
      const horizon = 1 - smoothstep(0.02, 0.42, Math.abs(viewMu));
      const s = sample({ altitudeMeters: 30, sunMu, viewMu, distanceMeters: lerp(60000, 460000, horizon) });
      const i = (y * width + x) * 4;
      data[i] = toByte(s.inscatter[0] * defaults.skyViewStrength + horizon * 0.11); data[i + 1] = toByte(s.inscatter[1] * defaults.skyViewStrength + horizon * 0.07); data[i + 2] = toByte(s.inscatter[2] * defaults.skyViewStrength + horizon * 0.04); data[i + 3] = toByte(horizon * smoothstep(-0.35, 0.12, sunMu));
    }
  }
  return data;
}
function buildAerialPerspectiveBytes() {
  const { width, height } = spec.aerialPerspective;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const altitude = (y / Math.max(height - 1, 1)) ** 1.8 * 100000;
    for (let x = 0; x < width; x += 1) {
      const distance = (x / Math.max(width - 1, 1)) ** 1.45 * 1000000;
      const s = sample({ altitudeMeters: altitude, sunMu: 0.38, viewMu: 0.08, distanceMeters: distance });
      const density = s.aerialPerspective;
      const i = (y * width + x) * 4;
      data[i] = toByte(0.34 * density + s.inscatter[0] * 0.38); data[i + 1] = toByte(0.52 * density + s.inscatter[1] * 0.38); data[i + 2] = toByte(0.88 * density + s.inscatter[2] * 0.38); data[i + 3] = toByte(density);
    }
  }
  return data;
}
function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}
function encodePngRgba(rgba, w, h) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const builders = {
  transmittance: buildTransmittanceBytes,
  multiScattering: buildMultiScatteringBytes,
  skyView: buildSkyViewBytes,
  aerialPerspective: buildAerialPerspectiveBytes,
};
const outputs = [];
await mkdir(outputDir, { recursive: true });
for (const [key, dimensions] of Object.entries(spec)) {
  const bytes = builders[key]();
  const filename = `${key}.png`;
  const outPath = resolve(outputDir, filename);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, encodePngRgba(bytes, dimensions.width, dimensions.height));
  outputs.push({ key, filename, width: dimensions.width, height: dimensions.height, bytes: bytes.length });
  console.log(`Wrote ${outPath}`);
}
const manifest = {
  release: 'R-0012',
  model: 'higher-fidelity-curved-path-lut-solver',
  generatedAtUtc: new Date().toISOString(),
  controls: defaults,
  outputs,
  notes: [
    'These PNGs are validation/debug exports of the CPU fallback atmosphere LUTs.',
    'They are intended for lead-eyes inspection and shader/runtime diagnostics, not as final science-grade LUT precomputation.',
  ],
};
await writeFile(resolve(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
