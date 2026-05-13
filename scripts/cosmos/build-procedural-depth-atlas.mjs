import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const width = Number.parseInt(process.env.COSMOS_BATHYMETRY_WIDTH ?? '2048', 10);
const height = Number.parseInt(process.env.COSMOS_BATHYMETRY_HEIGHT ?? '1024', 10);
const outPath = resolve(process.env.COSMOS_BATHYMETRY_OUTPUT ?? 'public/cosmos/bathymetry/global-depth.png');
const manifestPath = resolve(process.env.COSMOS_BATHYMETRY_MANIFEST ?? 'public/cosmos/bathymetry/global-depth.manifest.json');

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function fbmLike(lon01, lat01, octaves = 5) {
  let value = 0;
  let amp = 0.5;
  let scale = 1;
  for (let i = 0; i < octaves; i += 1) {
    const x = lon01 * scale * Math.PI * 2;
    const y = lat01 * scale * Math.PI;
    value += amp * Math.sin(x * (1.37 + i * 0.41) + Math.cos(y * (1.91 + i * 0.23)) * 2.0);
    value += amp * 0.55 * Math.cos(y * (2.23 + i * 0.37) + Math.sin(x * 0.7) * 1.5);
    scale *= 2.07;
    amp *= 0.48;
  }
  return value * 0.5 + 0.5;
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePngRgba(rgba, w, h) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const data = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y += 1) {
  const v = y / Math.max(height - 1, 1);
  const lat = (v - 0.5) * Math.PI;
  const absLat = Math.abs(Math.sin(lat));
  for (let x = 0; x < width; x += 1) {
    const u = x / Math.max(width - 1, 1);
    const ridgeA = fbmLike(u, v, 4);
    const ridgeB = fbmLike((u + 0.31) % 1, 1 - v, 5);
    const gyre = 0.5 + 0.5 * Math.sin(u * Math.PI * 10.0 + Math.cos(v * Math.PI * 5.0) * 2.5);
    const islandArc = smoothstep(0.72, 0.94, ridgeA) * smoothstep(0.18, 0.92, ridgeB);
    const polarShelf = smoothstep(0.62, 0.92, absLat) * 0.24;
    const shelf = clamp01(islandArc * 0.68 + smoothstep(0.54, 0.84, gyre) * 0.12 + polarShelf);
    const landMask = smoothstep(0.90, 0.985, ridgeA + islandArc * 0.24 + polarShelf * 0.2);
    const trench = smoothstep(0.82, 0.98, ridgeB) * (1.0 - shelf) * (1.0 - landMask);
    const depth01 = clamp01(0.72 + trench * 0.25 - shelf * 0.62 - landMask * 0.86 + (ridgeB - 0.5) * 0.10);
    const coast = clamp01(shelf * (1.0 - landMask) + smoothstep(0.68, 0.92, ridgeA) * 0.35);
    const idx = (y * width + x) * 4;
    data[idx] = Math.round(depth01 * 255);
    data[idx + 1] = Math.round(shelf * 255);
    data[idx + 2] = Math.round(coast * 255);
    data[idx + 3] = Math.round(landMask * 255);
  }
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, encodePngRgba(data, width, height));
await writeFile(manifestPath, JSON.stringify({
  provider: 'procedural-fallback',
  source: 'Cosmos deterministic procedural bathymetry atlas',
  layer: 'global-depth-fallback',
  width,
  height,
  encoding: 'RGBA: R depth01 0=shore/land 1=abyss, G shelf, B coast, A land',
  verticalDatum: 'synthetic sea-level-relative',
  minElevationMeters: -11000,
  maxElevationMeters: 8500,
  generatedAtUtc: new Date().toISOString(),
  notes: [
    'This is a deterministic fallback atlas for shader and UI validation.',
    'Replace with NOAA ETOPO or GEBCO-derived atlas for final realism.',
  ],
}, null, 2));

console.log(`Wrote procedural bathymetry atlas: ${outPath}`);
console.log(`Wrote manifest: ${manifestPath}`);
