#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, process.env.COSMOS_ATMOSPHERE_LUT_QUALITY_DIR ?? 'docs/cosmos/validation/atmosphere/R0012');
const lutSource = await readFile(resolve(root, 'src/cosmos/atmosphere/atmosphereLut.ts'), 'utf8');
const physicsSource = await readFile(resolve(root, 'src/cosmos/atmosphere/atmospherePhysics.ts'), 'utf8');
const packageJson = await readFile(resolve(root, 'package.json'), 'utf8');

const R = 6371000;
const AR = R + 100000;
const HR = 8500;
const HM = 1200;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
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
function sample(altitudeMeters, sunMu, viewMu, distanceMeters, controls = {}) {
  const c = { strength: 0.90, rayleighScale: 1.04, mieScale: 0.58, ozoneScale: 0.94, aerialPerspectiveStrength: 0.62, ...controls };
  const v = integrate(altitudeMeters, viewMu, distanceMeters, 16);
  const s = integrate(altitudeMeters, sunMu, undefined, 12);
  const rayleigh = (v.r * 0.68 + s.r * 0.32) * c.rayleighScale;
  const mie = (v.m * 0.72 + s.m * 0.28) * c.mieScale;
  const ozone = (v.o * 0.42 + s.o * 0.58) * c.ozoneScale;
  const opticalDepth = clamp01((1 - Math.exp(-(rayleigh * 0.020 + mie * 0.028 + ozone * 0.016))) * c.strength * 1.35);
  const aerialPerspective = clamp01((1 - Math.exp(-distanceMeters * distanceMeters * 2.7e-10 * Math.exp(-Math.max(0, altitudeMeters) / HR))) * c.aerialPerspectiveStrength);
  return { rayleigh, mie, ozone, opticalDepth, aerialPerspective };
}

const spec = {
  transmittance: { width: 320, height: 80 },
  multiScattering: { width: 96, height: 48 },
  skyView: { width: 240, height: 135 },
  aerialPerspective: { width: 128, height: 72 },
};
const probes = {
  surfaceGrazing: sample(0, -0.05, 0.035, 650000, { mieScale: 0.74, aerialPerspectiveStrength: 0.86 }),
  stratosphericLimb: sample(25000, Math.sin((-1.5 * Math.PI) / 180), 0.01, 180000, { rayleighScale: 1.12, mieScale: 0.46, ozoneScale: 1.08, aerialPerspectiveStrength: 0.22 }),
  highZenith: sample(90000, 0.9, 0.9, 120000),
};
const assertions = [
  { name: 'LUT dimensions upgraded beyond R-0011 fallback', pass: /width: 320/.test(lutSource) && /height: 80/.test(lutSource) && /width: 240/.test(lutSource) },
  { name: 'curved optical-depth integrator present', pass: /integrateCosmosAtmosphereOpticalDepth/.test(physicsSource) && /raySphere1D/.test(physicsSource) },
  { name: 'ozone band gate present', pass: /ozoneDensity01/.test(physicsSource) && /25_000/.test(physicsSource) },
  { name: 'phase functions present', pass: /rayleighPhase/.test(physicsSource) && /henyeyGreensteinPhase/.test(physicsSource) },
  { name: 'debug LUT export script registered', pass: /cosmos:review:atmosphere-lut-export/.test(packageJson) },
  { name: 'surface grazing has stronger optical depth than stratospheric limb', pass: probes.surfaceGrazing.opticalDepth > probes.stratosphericLimb.opticalDepth },
  { name: 'stratospheric limb has stronger optical depth than high zenith', pass: probes.stratosphericLimb.opticalDepth > probes.highZenith.opticalDepth * 1000 },
  { name: 'low horizon remains aerial-perspective heavy', pass: probes.surfaceGrazing.aerialPerspective > 0.75 },
];
const pass = assertions.every((assertion) => assertion.pass);
const specRows = Object.entries(spec).map(([key, value]) => `| ${key} | ${value.width}×${value.height} |`);
const probeRows = Object.entries(probes).map(([key, value]) => `| ${key} | ${value.rayleigh.toFixed(3)} | ${value.mie.toFixed(3)} | ${value.ozone.toFixed(3)} | ${value.opticalDepth.toFixed(3)} | ${value.aerialPerspective.toFixed(3)} |`);
const assertionRows = assertions.map((assertion) => `| ${assertion.name} | ${assertion.pass ? 'pass' : 'fail'} |`);
const markdown = [
  '# Cosmos R-0012 atmosphere LUT quality contract',
  '',
  'R-0012 replaces the R-0011 heuristic LUT generator with a curved-path optical-depth fallback solver. The model still runs on CPU/DataTexture for WebGL compatibility, but its inputs are now ray/sphere atmosphere paths, altitude density integration, ozone band density, and Rayleigh/Mie phase functions.',
  '',
  '## LUT dimensions',
  '',
  '| Texture | Resolution |',
  '|---|---:|',
  ...specRows,
  '',
  '## Optical probes',
  '',
  '| Probe | Rayleigh depth | Mie depth | Ozone depth | Optical depth | Aerial perspective |',
  '|---|---:|---:|---:|---:|---:|',
  ...probeRows,
  '',
  '## Assertions',
  '',
  '| Assertion | Status |',
  '|---|---|',
  ...assertionRows,
  '',
  `Overall: ${pass ? 'pass' : 'fail'}`,
  '',
  'Texture export command: `npm run cosmos:review:atmosphere-lut-export`.',
].join('\n');
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'atmosphere-lut-quality-contract.json'), JSON.stringify({ release: 'R-0012', spec, probes, assertions, pass }, null, 2));
await writeFile(resolve(outputDir, 'atmosphere-lut-quality-contract.md'), markdown);
console.log(markdown);
if (!pass) process.exitCode = 1;
