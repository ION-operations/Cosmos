#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_ENDPOINT = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities';
const endpoint = process.env.COSMOS_GIBS_WMTS ?? DEFAULT_ENDPOINT;
const outputPath = resolve(process.cwd(), process.argv[2] ?? 'data/gibs/gibs-wmts-capabilities.xml');

const response = await fetch(endpoint, {
  headers: {
    'User-Agent': 'Cosmos-WaterWorld/0.3 local data bootstrap',
  },
});

if (!response.ok) {
  throw new Error(`GIBS capabilities request failed: ${response.status} ${response.statusText}`);
}

const body = await response.text();
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, body, 'utf8');

console.log(JSON.stringify({
  source: endpoint,
  outputPath,
  bytes: Buffer.byteLength(body, 'utf8'),
}, null, 2));
