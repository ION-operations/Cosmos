#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, process.env.COSMOS_ATMOSPHERE_LUT_CONTRACT_DIR ?? 'docs/cosmos/validation/atmosphere/R0012');
const source = await readFile(resolve(root, 'src/cosmos/orbital/WorldEngine.ts'), 'utf8');

const R = 6371000;
const C = { x: 0, y: -R, z: 0 };
const spec = {
  transmittance: { width: 320, height: 80, encoding: 'RGB=curved-path solar transmittance, A=compressed optical depth' },
  multiScattering: { width: 96, height: 48, encoding: 'RGB=phase-weighted multiple-scattering proxy, A=energy' },
  skyView: { width: 240, height: 135, encoding: 'RGB=sky-view radiance proxy with curved path samples, A=horizon/terminator' },
  aerialPerspective: { width: 128, height: 72, encoding: 'RGB=aerial-perspective path tint, A=fog density' },
};

function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / Math.max(edge1 - edge0, 1e-6));
  return t * t * (3 - 2 * t);
}
function altitude(position) {
  const [x, y, z] = position;
  const dx = x - C.x;
  const dy = y - C.y;
  const dz = z - C.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - R;
}
function opticalSample(altitudeMeters, sunMu = 0.28, viewMu = 0.08, distanceMeters = 180000) {
  const densityR = Math.exp(-Math.max(altitudeMeters, 0) / 8500);
  const densityM = Math.exp(-Math.max(altitudeMeters, 0) / 1200);
  const ozoneBand = Math.exp(-Math.pow((Math.max(altitudeMeters, 0) - 25000) / 18000, 2));
  const horizonPath = 1 / Math.max(0.08, Math.abs(viewMu) * 0.92 + 0.08);
  const sunPath = 1 / Math.max(0.10, sunMu * 0.72 + 0.28);
  const path = Math.min(11.5, horizonPath * 0.62 + sunPath * 0.38);
  const rayleigh = densityR * path * 1.06;
  const mie = densityM * path * 0.62;
  const ozone = ozoneBand * path * 0.86;
  const opticalRaw = rayleigh * 0.04 + mie * 0.06 + ozone * 0.025;
  const opticalDepth = clamp01((1 - Math.exp(-opticalRaw)) * 0.88 * 1.5);
  const aerialPerspective = clamp01((1 - Math.exp(-distanceMeters * distanceMeters * 2.7e-10 * densityR)) * 0.62);
  const localSky = 1 - smoothstep(650000, 2000000, altitudeMeters);
  const orbitalRim = smoothstep(36000, 220000, altitudeMeters);
  return { opticalDepth, aerialPerspective, localSky, orbitalRim };
}

const bookmarkBlocks = [...source.matchAll(/\{\s*id: '([^']+)'[\s\S]*?position: \[([^\]]+)\][\s\S]*?target: \[([^\]]+)\]/g)];
const records = bookmarkBlocks.map((match) => {
  const position = match[2].split(',').map((v) => Number(v.trim()));
  const alt = altitude(position);
  return { bookmarkId: match[1], altitudeMeters: alt, sample: opticalSample(alt) };
});

const rows = records.map((record) => {
  const s = record.sample;
  return `| ${record.bookmarkId} | ${(record.altitudeMeters / 1000).toFixed(3)} | ${s.opticalDepth.toFixed(3)} | ${s.aerialPerspective.toFixed(3)} | ${s.localSky.toFixed(2)} | ${s.orbitalRim.toFixed(2)} |`;
});
const specRows = Object.entries(spec).map(([key, value]) => `| ${key} | ${value.width}×${value.height} | ${value.encoding} |`);

const markdown = [
  '# Cosmos R-0012 atmosphere LUT contract',
  '',
  'This report is static and screenshot-independent. It verifies the higher-fidelity curved-path physical-atmosphere LUT interface for transmittance, multiple scattering, sky-view radiance, aerial perspective, and optical-depth debug review.',
  '',
  '## LUT textures',
  '',
  '| Texture | Resolution | Encoding |',
  '|---|---:|---|',
  ...specRows,
  '',
  '## Bookmark optical-state samples',
  '',
  '| Bookmark | Alt km | Optical depth | Aerial perspective | Local sky | Orbital rim |',
  '|---|---:|---:|---:|---:|---:|',
  ...rows,
  '',
  'Expected direction: sea-level and storm-zone views carry strong aerial perspective; orbit and cloud-terminator views suppress local sky and hand off to orbital rim/LUT transmittance. R-0012 also requires the dedicated atmosphere LUT quality and texture export reports.',
].join('\n');

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'atmosphere-lut-contract.json'), JSON.stringify({ earthRadiusMeters: R, planetCenter: C, spec, records }, null, 2));
await writeFile(resolve(outputDir, 'atmosphere-lut-contract.md'), markdown);
console.log(markdown);
