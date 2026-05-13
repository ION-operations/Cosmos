#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, process.env.COSMOS_TWILIGHT_CONTRACT_DIR ?? 'docs/cosmos/validation/atmosphere/R0011');
const source = await readFile(resolve(root, 'src/cosmos/orbital/WorldEngine.ts'), 'utf8');

const targets = [
  {
    bookmarkId: 'cloud-terminator', role: 'orbital-terminator', sunE: 4,
    opticalDepth: [0.18, 0.58], aerialPerspective: [0.00, 0.18], orbitalRimAlpha: [0.92, 1.00], localSkyAlpha: [0.00, 0.04],
  },
  {
    bookmarkId: 'twilight-limb', role: 'orbital-limb', sunE: -1.5,
    opticalDepth: [0.28, 0.72], aerialPerspective: [0.00, 0.15], orbitalRimAlpha: [0.95, 1.00], localSkyAlpha: [0.00, 0.03],
  },
  {
    bookmarkId: 'low-twilight-horizon', role: 'sea-level-horizon', sunE: 1.2,
    opticalDepth: [0.30, 0.86], aerialPerspective: [0.28, 0.92], orbitalRimAlpha: [0.00, 0.10], localSkyAlpha: [0.94, 1.00],
  },
];

const bookmarkIds = [...source.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
const missing = targets.filter((target) => !bookmarkIds.includes(target.bookmarkId));
if (missing.length > 0) {
  throw new Error(`Missing twilight calibration bookmark(s): ${missing.map((target) => target.bookmarkId).join(', ')}`);
}

const rows = targets.map((target) => `| ${target.bookmarkId} | ${target.role} | ${target.sunE.toFixed(1)} | ${target.opticalDepth.join('–')} | ${target.aerialPerspective.join('–')} | ${target.orbitalRimAlpha.join('–')} | ${target.localSkyAlpha.join('–')} |`);
const markdown = [
  '# Cosmos R-0011 twilight/terminator calibration contract',
  '',
  'This static contract defines the review targets used after runtime shader logs are clean.',
  '',
  '| Bookmark | Role | Sun elev ° | Optical depth target | Aerial perspective target | Orbital rim α | Local sky α |',
  '|---|---|---:|---:|---:|---:|---:|',
  ...rows,
  '',
  'Use these bookmarks with mode 0 and mode 6 captures. Do not interpret colour tuning until the R-0011 runtime diagnostics gate reports zero shader/program/page errors.',
].join('\n');

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'twilight-calibration-contract.json'), JSON.stringify({ release: 'R-0011', targets }, null, 2));
await writeFile(resolve(outputDir, 'twilight-calibration-contract.md'), markdown);
console.log(markdown);
