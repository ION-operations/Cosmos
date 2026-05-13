#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, process.env.COSMOS_DEBUG_CONTRACT_DIR ?? 'docs/cosmos/validation/debug/R0011');
const source = await readFile(resolve(root, 'src/cosmos/orbital/WorldEngine.ts'), 'utf8');

const modes = [
  { id: 0, key: 'off', color: 'none', target: 'normal beauty render' },
  { id: 1, key: 'scale-ownership', color: 'R=ocean G=cloud B=planet', target: 'pass handoff scale coherence' },
  { id: 2, key: 'atmosphere-ownership', color: 'R=local sky G=horizon fog B=orbital rim', target: 'ground-to-space atmosphere handoff' },
  { id: 3, key: 'cloud-lod', color: 'R=micro G=meso B=macro', target: 'cloud detail LOD handoff' },
  { id: 4, key: 'physical-shells', color: 'green=Earth cyan=cloud base magenta=cloud top amber=atmosphere', target: 'fixed physical shell alignment' },
  { id: 5, key: 'composite-diagnostic', color: 'ownership tint plus physical shell line colors', target: 'combined failure localization' },
  { id: 6, key: 'optical-depth-lut', color: 'R=optical depth G=aerial perspective B=multi-scattering/rim', target: 'R-0010 atmosphere LUT diagnostics' },
];

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
function state(alt) {
  const safeAlt = Math.max(alt, -100);
  return {
    altitudeMeters: safeAlt,
    scaleOwnership: {
      ocean: 1 - smoothstep(35000, 80000, safeAlt),
      cloud: 1 - smoothstep(38000, 95000, safeAlt),
      planet: smoothstep(42000, 95000, safeAlt),
    },
    atmosphereOwnership: {
      localSky: 1 - smoothstep(650000, 2000000, safeAlt),
      horizonFog: 1 - smoothstep(120000, 1350000, safeAlt),
      orbitalRim: smoothstep(36000, 220000, safeAlt),
    },
    cloudLod: {
      micro: 1 - smoothstep(4000, 36000, safeAlt),
      meso: 1 - smoothstep(22000, 135000, safeAlt),
      macro: 0.35 + smoothstep(900, 55000, safeAlt) * 0.65,
    },
  };
}

const bookmarkBlocks = [...source.matchAll(/\{\s*id: '([^']+)'[\s\S]*?position: \[([^\]]+)\][\s\S]*?target: \[([^\]]+)\]/g)];
const records = bookmarkBlocks.map((match) => {
  const position = match[2].split(',').map((v) => Number(v.trim()));
  return { bookmarkId: match[1], position, debugState: state(altitude(position)) };
});

const rows = records.map((record) => {
  const s = record.debugState;
  return `| ${record.bookmarkId} | ${(s.altitudeMeters / 1000).toFixed(3)} | ${s.scaleOwnership.ocean.toFixed(2)}/${s.scaleOwnership.cloud.toFixed(2)}/${s.scaleOwnership.planet.toFixed(2)} | ${s.atmosphereOwnership.localSky.toFixed(2)}/${s.atmosphereOwnership.horizonFog.toFixed(2)}/${s.atmosphereOwnership.orbitalRim.toFixed(2)} | ${s.cloudLod.micro.toFixed(2)}/${s.cloudLod.meso.toFixed(2)}/${s.cloudLod.macro.toFixed(2)} |`;
});
const modeRows = modes.map((mode) => `| ${mode.id} | ${mode.key} | ${mode.target} | ${mode.color} |`);
const markdown = [
  '# Cosmos R-0010 visual debug overlay contract',
  '',
  'This report is computed without screenshots. It defines the diagnostic colour contract for lead-eyes reviews where normal beauty renders cannot isolate scale, atmosphere, cloud LOD, or optical-depth LUT failure.',
  '',
  '## Modes',
  '',
  '| Mode | Key | Target | Colour contract |',
  '|---:|---|---|---|',
  ...modeRows,
  '',
  '## Bookmark expected diagnostic values',
  '',
  '| Bookmark | Alt km | Scale RGB ocean/cloud/planet | Atmo RGB local/horizon/rim | Cloud RGB micro/meso/macro |',
  '|---|---:|---:|---:|---:|',
  ...rows,
  '',
  'Physical shell colours: green Earth shell, cyan cloud base, magenta cloud top, amber atmosphere shell.',
].join('\n');

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'debug-overlay-contract.json'), JSON.stringify({ modes, earthRadiusMeters: R, planetCenter: C, records }, null, 2));
await writeFile(resolve(outputDir, 'debug-overlay-contract.md'), markdown);
console.log(markdown);
