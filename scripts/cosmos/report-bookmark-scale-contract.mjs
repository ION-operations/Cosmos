#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, process.env.COSMOS_SCALE_CONTRACT_DIR ?? 'docs/cosmos/validation/scale/R0011');
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
function lod(alt) {
  if (alt < 1000) return 'surface';
  if (alt < 12000) return 'low-altitude';
  if (alt < 60000) return 'high-altitude';
  if (alt < 800000) return 'near-space';
  return 'orbital';
}
function scaleState(alt) {
  const safeAlt = Math.max(alt, -100);
  return {
    altitudeMeters: safeAlt,
    lod: lod(safeAlt),
    lod01: smoothstep(4000, 900000, safeAlt),
    oceanAlpha: 1 - smoothstep(35000, 80000, safeAlt),
    cloudAlpha: 1 - smoothstep(38000, 95000, safeAlt),
    planetAlpha: smoothstep(42000, 95000, safeAlt),
    localAtmosphereAlpha: 1 - smoothstep(650000, 2000000, safeAlt),
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
    scaleState: scaleState(alt),
  };
});

const rows = records.map((record) => {
  const s = record.scaleState;
  return `| ${record.bookmarkId} | ${s.lod} | ${(s.altitudeMeters / 1000).toFixed(3)} | ${s.oceanAlpha.toFixed(3)} | ${s.cloudAlpha.toFixed(3)} | ${s.planetAlpha.toFixed(3)} | ${s.localAtmosphereAlpha.toFixed(3)} |`;
});
const markdown = [
  '# Cosmos R-0010 bookmark scale contract',
  '',
  'This report is computed without screenshots. It validates that every review bookmark is classified against one fixed Earth center rather than camera-following planet coordinates.',
  '',
  '| Bookmark | LOD | Alt km | Ocean α | Cloud α | Planet α | Local atmosphere α |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...rows,
  '',
  'Expected transition: surface/low-altitude bookmarks retain local ocean and cloud passes; orbital bookmarks suppress local ocean/cloud passes and use the fixed-center planet pass.',
].join('\n');

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'bookmark-scale-contract.json'), JSON.stringify({ earthRadiusMeters: R, planetCenter: C, records }, null, 2));
await writeFile(resolve(outputDir, 'bookmark-scale-contract.md'), markdown);
console.log(markdown);
