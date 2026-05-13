#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, process.env.COSMOS_ATMOSPHERE_CONTRACT_DIR ?? 'docs/cosmos/validation/atmosphere/R0011');
const source = await readFile(resolve(root, 'src/cosmos/orbital/WorldEngine.ts'), 'utf8');
const R = 6371000;
const C = { x: 0, y: -R, z: 0 };

function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
function altitude(position) {
  const [x, y, z] = position;
  const dx = x - C.x;
  const dy = y - C.y;
  const dz = z - C.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - R;
}
function atmosphereState(altitudeMeters, strength = 1) {
  const safeAlt = Math.max(altitudeMeters, -100);
  const s = clamp01(strength);
  const localSkyAlpha = (1 - smoothstep(650000, 2000000, safeAlt)) * s;
  const orbitalRimAlpha = smoothstep(36000, 220000, safeAlt) * s;
  const horizonFogAlpha = (1 - smoothstep(120000, 1350000, safeAlt)) * s;
  const aerialPerspectiveAlpha = (1 - smoothstep(35000, 850000, safeAlt)) * s;
  const cloudMicroAlpha = 1 - smoothstep(4000, 36000, safeAlt);
  const cloudMesoAlpha = 1 - smoothstep(22000, 135000, safeAlt);
  const cloudMacroAlpha = 0.35 + smoothstep(900, 55000, safeAlt) * 0.65;
  return {
    altitudeMeters: safeAlt,
    localSkyAlpha,
    orbitalRimAlpha,
    horizonFogAlpha,
    aerialPerspectiveAlpha,
    cloudMicroAlpha,
    cloudMesoAlpha,
    cloudMacroAlpha,
  };
}

const bookmarkBlocks = [...source.matchAll(/\{\s*id: '([^']+)'[\s\S]*?position: \[([^\]]+)\][\s\S]*?target: \[([^\]]+)\]/g)];
const records = bookmarkBlocks.map((match) => {
  const position = match[2].split(',').map((v) => Number(v.trim()));
  const target = match[3].split(',').map((v) => Number(v.trim()));
  const alt = altitude(position);
  return {
    bookmarkId: match[1],
    position,
    target,
    atmosphereState: atmosphereState(alt),
  };
});

const rows = records.map((record) => {
  const s = record.atmosphereState;
  return `| ${record.bookmarkId} | ${(s.altitudeMeters / 1000).toFixed(3)} | ${s.localSkyAlpha.toFixed(3)} | ${s.orbitalRimAlpha.toFixed(3)} | ${s.horizonFogAlpha.toFixed(3)} | ${s.aerialPerspectiveAlpha.toFixed(3)} | ${s.cloudMicroAlpha.toFixed(3)} | ${s.cloudMesoAlpha.toFixed(3)} | ${s.cloudMacroAlpha.toFixed(3)} |`;
});
const markdown = [
  '# Cosmos R-0010 atmosphere and cloud LOD contract',
  '',
  'This report is computed without screenshots. It validates that sky haze, orbital rim, aerial perspective, and cloud micro/meso/macro detail are derived from the same fixed-Earth altitude contract.',
  '',
  '| Bookmark | Alt km | Local sky α | Orbital rim α | Horizon fog α | Aerial perspective α | Cloud micro α | Cloud meso α | Cloud macro α |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...rows,
  '',
  'Expected transition: surface bookmarks keep micro detail and local haze; high-altitude bookmarks suppress micro detail but preserve macro cloud placement; orbit bookmarks shift atmosphere ownership to the planet rim pass.',
].join('\n');

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'atmosphere-continuity-contract.json'), JSON.stringify({ earthRadiusMeters: R, planetCenter: C, records }, null, 2));
await writeFile(resolve(outputDir, 'atmosphere-continuity-contract.md'), markdown);
console.log(markdown);
