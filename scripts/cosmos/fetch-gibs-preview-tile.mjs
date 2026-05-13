#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

const endpoint = process.env.COSMOS_GIBS_WMTS_TILE_ENDPOINT ?? 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi';
const layer = process.env.COSMOS_GIBS_LAYER ?? 'MODIS_Terra_CorrectedReflectance_TrueColor';
const time = process.env.COSMOS_GIBS_TIME ?? '2012-07-09';
const tileMatrixSet = process.env.COSMOS_GIBS_TILEMATRIXSET ?? '250m';
const tileMatrix = process.env.COSMOS_GIBS_TILEMATRIX ?? '6';
const tileCol = process.env.COSMOS_GIBS_TILECOL ?? '36';
const tileRow = process.env.COSMOS_GIBS_TILEROW ?? '13';
const format = process.env.COSMOS_GIBS_FORMAT ?? 'image/jpeg';
const style = process.env.COSMOS_GIBS_STYLE ?? 'default';

const extension = format.includes('png') ? '.png' : '.jpg';
const outputPath = resolve(
  process.cwd(),
  process.argv[2] ?? `data/gibs/tiles/${layer}_${time}_${tileMatrixSet}_z${tileMatrix}_x${tileCol}_y${tileRow}${extension}`,
);
const manifestPath = `${outputPath}.json`;

const url = new URL(endpoint);
url.searchParams.set('Service', 'WMTS');
url.searchParams.set('Request', 'GetTile');
url.searchParams.set('Version', '1.0.0');
url.searchParams.set('layer', layer);
url.searchParams.set('tilematrixset', tileMatrixSet);
url.searchParams.set('TileMatrix', tileMatrix);
url.searchParams.set('TileCol', tileCol);
url.searchParams.set('TileRow', tileRow);
url.searchParams.set('style', style);
url.searchParams.set('TIME', time);
url.searchParams.set('Format', format);

const response = await fetch(url, {
  headers: {
    'User-Agent': 'Cosmos-WaterWorld/0.3 local data bootstrap',
  },
});

if (!response.ok) {
  throw new Error(`GIBS preview tile request failed: ${response.status} ${response.statusText} ${url}`);
}

const bytes = new Uint8Array(await response.arrayBuffer());
if (!extname(outputPath)) {
  throw new Error(`Output path must include an image extension: ${outputPath}`);
}
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, bytes);
await writeFile(
  manifestPath,
  `${JSON.stringify({ source: url.toString(), layer, time, tileMatrixSet, tileMatrix, tileCol, tileRow, format, outputPath, bytes: bytes.byteLength }, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({ source: url.toString(), outputPath, manifestPath, bytes: bytes.byteLength }, null, 2));
