#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const baseUrl = process.env.COSMOS_REVIEW_BASE_URL ?? 'http://127.0.0.1:8080';
const shouldStartServer = process.env.COSMOS_REVIEW_START_SERVER !== '0';
const outputDir = resolve(root, process.env.COSMOS_REVIEW_SCALE_DIR ?? 'docs/cosmos/validation/scale/R0011');
const viewportWidth = Number(process.env.COSMOS_REVIEW_WIDTH ?? 1280);
const viewportHeight = Number(process.env.COSMOS_REVIEW_HEIGHT ?? 720);
const settleMs = Number(process.env.COSMOS_REVIEW_SETTLE_MS ?? 1200);

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch (error) {
    console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
    throw error;
  }
}

async function readBookmarkIds() {
  const source = await readFile(resolve(root, 'src/cosmos/orbital/WorldEngine.ts'), 'utf8');
  return [...source.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
}

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function markdownReport(records) {
  const rows = records.map((record) => {
    const s = record.scaleState ?? {};
    return [
      record.bookmarkId,
      s.lod ?? 'n/a',
      Number.isFinite(s.altitudeMeters) ? (s.altitudeMeters / 1000).toFixed(2) : 'n/a',
      Number.isFinite(s.oceanAlpha) ? s.oceanAlpha.toFixed(3) : 'n/a',
      Number.isFinite(s.cloudAlpha) ? s.cloudAlpha.toFixed(3) : 'n/a',
      Number.isFinite(s.planetAlpha) ? s.planetAlpha.toFixed(3) : 'n/a',
      record.gibsState?.state ?? 'n/a',
      record.bathymetryState?.state ?? 'n/a',
    ];
  });
  return [
    '# Cosmos R-0010 scale-state diagnostics',
    '',
    '| Bookmark | LOD | Alt km | Ocean α | Cloud α | Planet α | GIBS | Bathymetry |',
    '|---|---:|---:|---:|---:|---:|---|---|',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
    'The alpha columns are the non-image diagnostic for cross-fade consistency across ocean, cloud, and orbital planet passes.',
  ].join('\n');
}

let server;
if (shouldStartServer) {
  server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '8080'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  await waitForServer(baseUrl);
}

try {
  const { chromium } = await loadPlaywright();
  const bookmarkIds = await readBookmarkIds();
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight }, deviceScaleFactor: 1 });

  const records = [];
  for (const bookmarkId of bookmarkIds) {
    const targetUrl = `${baseUrl}/cosmos-review?bookmark=${encodeURIComponent(bookmarkId)}&panel=0`;
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      (id) => window.__COSMOS_REVIEW_READY__ === true && window.__COSMOS_ACTIVE_BOOKMARK__ === id,
      bookmarkId,
      { timeout: 15000 },
    );
    await page.waitForTimeout(settleMs);
    const record = await page.evaluate(() => ({
      bookmarkId: window.__COSMOS_ACTIVE_BOOKMARK__,
      scaleState: window.__COSMOS_SCALE_STATE__ ?? null,
      gibsState: window.__COSMOS_GIBS_SURFACE_OVERLAY_STATE__ ?? null,
      bathymetryState: window.__COSMOS_BATHYMETRY_OVERLAY_STATE__ ?? null,
      canvas: (() => {
        const canvas = document.querySelector('canvas');
        return canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null;
      })(),
    }));
    records.push(record);
  }

  await browser.close();
  await writeFile(resolve(outputDir, 'scale-state.json'), JSON.stringify({ baseUrl, records }, null, 2));
  await writeFile(resolve(outputDir, 'scale-state.md'), markdownReport(records));
  console.log(JSON.stringify({ outputDir, count: records.length, records }, null, 2));
} finally {
  if (server) server.kill('SIGTERM');
}
