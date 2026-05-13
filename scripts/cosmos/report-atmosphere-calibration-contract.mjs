#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, process.env.COSMOS_ATMOSPHERE_CALIBRATION_DIR ?? 'docs/cosmos/validation/atmosphere/R0012');

const defaults = {
  strength: 0.90,
  rayleighScale: 1.04,
  mieScale: 0.58,
  ozoneScale: 0.94,
  multiScatteringStrength: 0.68,
  aerialPerspectiveStrength: 0.62,
  skyViewStrength: 0.90,
  opticalDepthDebug: 0.10,
  atmosphereContinuityStrength: 0.96,
};
const targets = [
  {
    bookmarkId: 'cloud-terminator', role: 'orbital-terminator', sunElevationDegrees: 4,
    target: { opticalDepth: [0.18, 0.58], aerialPerspective: [0.00, 0.18], orbitalRimAlpha: [0.92, 1.00], localSkyAlpha: [0.00, 0.04] },
    controls: { rayleighScale: 1.10, mieScale: 0.52, ozoneScale: 0.94, multiScatteringStrength: 0.64, aerialPerspectiveStrength: 0.24, skyViewStrength: 0.86 },
    plan: { opticalSampleAltitudeMeters: 18000, cameraAltitudeMeters: 23582892, viewMu: 0.02, distanceMeters: 180000, role: 'limb-shell-path' },
  },
  {
    bookmarkId: 'twilight-limb', role: 'orbital-limb', sunElevationDegrees: -1.5,
    target: { opticalDepth: [0.28, 0.72], aerialPerspective: [0.00, 0.15], orbitalRimAlpha: [0.95, 1.00], localSkyAlpha: [0.00, 0.03] },
    controls: { rayleighScale: 1.12, mieScale: 0.46, ozoneScale: 1.08, multiScatteringStrength: 0.58, aerialPerspectiveStrength: 0.22, skyViewStrength: 0.95 },
    plan: { opticalSampleAltitudeMeters: 25000, cameraAltitudeMeters: 25363291, viewMu: 0.01, distanceMeters: 180000, role: 'limb-shell-path' },
  },
  {
    bookmarkId: 'low-twilight-horizon', role: 'sea-level-horizon', sunElevationDegrees: 1.2,
    target: { opticalDepth: [0.30, 0.86], aerialPerspective: [0.28, 0.92], orbitalRimAlpha: [0.00, 0.10], localSkyAlpha: [0.94, 1.00] },
    controls: { rayleighScale: 1.03, mieScale: 0.74, ozoneScale: 0.78, multiScatteringStrength: 0.70, aerialPerspectiveStrength: 0.86, skyViewStrength: 0.82 },
    plan: { opticalSampleAltitudeMeters: 25, cameraAltitudeMeters: 7.5, viewMu: 0.035, distanceMeters: 650000, role: 'low-horizon-path' },
  },
];
const R = 6371000;
const AR = R + 100000;
const HR = 8500;
const HM = 1200;
function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function smoothstep(edge0, edge1, value) { const t = clamp01((value - edge0) / Math.max(edge1 - edge0, 1e-6)); return t * t * (3 - 2 * t); }
function inRange(value, range) { return value >= range[0] && value <= range[1]; }
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
  if (!hit) return { r: 0, m: 0, o: 0 };
  let t0 = Math.max(0, hit[0]);
  let t1 = hit[1];
  const ground = raySphere(startRadius, mu, R);
  if (ground && ground[0] > 0 && ground[0] < t1) t1 = ground[0];
  if (maxDistanceMeters !== undefined) t1 = Math.min(t1, Math.max(0, maxDistanceMeters));
  if (t1 <= t0) return { r: 0, m: 0, o: 0 };
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
  return { r: r / HR, m: m / HM, o: o / 18000 };
}
function opticalSample(plan, target) {
  const controls = { ...defaults, ...target.controls };
  const altitude = Math.max(0, plan.opticalSampleAltitudeMeters);
  const sunMu = Math.sin((target.sunElevationDegrees * Math.PI) / 180);
  const v = integrate(altitude, plan.viewMu, plan.distanceMeters, 16);
  const s = integrate(altitude, sunMu, undefined, 12);
  const rayleigh = (v.r * 0.68 + s.r * 0.32) * controls.rayleighScale;
  const mie = (v.m * 0.72 + s.m * 0.28) * controls.mieScale;
  const ozone = (v.o * 0.42 + s.o * 0.58) * controls.ozoneScale;
  const opticalDepth = clamp01((1 - Math.exp(-(rayleigh * 0.020 + mie * 0.028 + ozone * 0.016))) * controls.strength * 1.35);
  const aerialPerspective = clamp01((1 - Math.exp(-plan.distanceMeters * plan.distanceMeters * 2.7e-10 * Math.exp(-altitude / HR))) * controls.aerialPerspectiveStrength);
  return { sunMu, rayleigh, mie, ozone, opticalDepth, aerialPerspective };
}
function continuity(cameraAltitudeMeters) {
  const safeAlt = Math.max(cameraAltitudeMeters, -100);
  const s = defaults.atmosphereContinuityStrength;
  return {
    localSkyAlpha: (1 - smoothstep(650000, 2000000, safeAlt)) * s,
    orbitalRimAlpha: smoothstep(36000, 220000, safeAlt) * s,
    horizonFogAlpha: (1 - smoothstep(120000, 1350000, safeAlt)) * s,
    aerialPerspectiveAlpha: (1 - smoothstep(35000, 850000, safeAlt)) * s,
  };
}

const engineSource = await readFile(resolve(root, 'src/cosmos/orbital/WorldEngine.ts'), 'utf8');
const debugSource = await readFile(resolve(root, 'src/cosmos/orbital/shaders/debugOverlay.ts'), 'utf8');
const physicsSource = await readFile(resolve(root, 'src/cosmos/atmosphere/atmospherePhysics.ts'), 'utf8');
const packageSource = await readFile(resolve(root, 'package.json'), 'utf8');
const bookmarkIds = [...engineSource.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
const records = targets.map((target) => {
  const sample = opticalSample(target.plan, target);
  const c = continuity(target.plan.cameraAltitudeMeters);
  const checks = [
    ['opticalDepth', sample.opticalDepth, target.target.opticalDepth],
    ['aerialPerspective', sample.aerialPerspective, target.target.aerialPerspective],
    ['orbitalRimAlpha', c.orbitalRimAlpha, target.target.orbitalRimAlpha],
    ['localSkyAlpha', c.localSkyAlpha, target.target.localSkyAlpha],
  ];
  const failures = checks.filter(([, value, range]) => !inRange(value, range)).map(([key, value, range]) => `${key}=${value.toFixed(3)} outside ${range[0]}–${range[1]}`);
  return { ...target, sample, continuity: c, pass: failures.length === 0, failures };
});
const staticAssertions = [
  { name: 'debug optical-depth overlay uses actual uSunDir', pass: /uniform vec3 uSunDir/.test(debugSource) && /normalize\(uSunDir\)/.test(debugSource) },
  { name: 'R-0012 curved-path integrator is available', pass: /integrateCosmosAtmosphereOpticalDepth/.test(physicsSource) && /raySphere1D/.test(physicsSource) },
  { name: 'R-0012 LUT quality report is registered', pass: /cosmos:review:atmosphere-lut-quality/.test(packageSource) },
  { name: 'all twilight calibration bookmarks exist', pass: targets.every((target) => bookmarkIds.includes(target.bookmarkId)) },
];
const pass = records.every((record) => record.pass) && staticAssertions.every((assertion) => assertion.pass);
const rows = records.map((record) => `| ${record.bookmarkId} | ${record.role} | ${record.plan.role} | ${record.sample.opticalDepth.toFixed(3)} | ${record.sample.aerialPerspective.toFixed(3)} | ${record.continuity.orbitalRimAlpha.toFixed(3)} | ${record.continuity.localSkyAlpha.toFixed(3)} | ${record.pass ? 'pass' : record.failures.join('; ')} |`);
const assertionRows = staticAssertions.map((assertion) => `| ${assertion.name} | ${assertion.pass ? 'pass' : 'fail'} |`);
const markdown = [
  '# Cosmos R-0012 curved-path twilight calibration contract',
  '',
  'R-0012 keeps the R-0011 camera-vs-optical-path separation, but evaluates the calibration probes with the curved-path optical-depth fallback solver.',
  '',
  '| Bookmark | Role | Sample role | Optical depth | Aerial perspective | Orbital rim α | Local sky α | Status |',
  '|---|---|---|---:|---:|---:|---:|---|',
  ...rows,
  '',
  '## Static shader-clean assertions',
  '',
  '| Assertion | Status |',
  '|---|---|',
  ...assertionRows,
  '',
  `Overall: ${pass ? 'pass' : 'fail'}`,
  '',
  'Local visual gate remains: `COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics`.',
].join('\n');
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'atmosphere-calibration-contract.json'), JSON.stringify({ release: 'R-0012', defaults, pass, staticAssertions, records }, null, 2));
await writeFile(resolve(outputDir, 'atmosphere-calibration-contract.md'), markdown);
console.log(markdown);
if (!pass) process.exitCode = 1;
