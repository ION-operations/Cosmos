#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const baseUrl = process.env.COSMOS_REVIEW_BASE_URL ?? 'http://127.0.0.1:8080';
const shouldStartServer = process.env.COSMOS_REVIEW_START_SERVER !== '0';
const outputDir = resolve(root, process.env.COSMOS_REVIEW_DEBUG_SCREENSHOT_DIR ?? 'docs/cosmos/validation/screenshots/R0011-debug');
const viewportWidth = Number(process.env.COSMOS_REVIEW_WIDTH ?? 1920);
const viewportHeight = Number(process.env.COSMOS_REVIEW_HEIGHT ?? 1080);
const settleMs = Number(process.env.COSMOS_REVIEW_SETTLE_MS ?? 1600);
const modeCsv = process.env.COSMOS_REVIEW_DEBUG_MODES ?? '1,2,3,4,5,6';
const modes = modeCsv.split(',').map((value) => Number(value.trim())).filter((value) => Number.isFinite(value));

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

  const captures = [];
  for (const bookmarkId of bookmarkIds) {
    for (const mode of modes) {
      const targetUrl = `${baseUrl}/cosmos-review?bookmark=${encodeURIComponent(bookmarkId)}&panel=0`;
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
      await page.waitForFunction(
        (id) => window.__COSMOS_REVIEW_READY__ === true && window.__COSMOS_ACTIVE_BOOKMARK__ === id,
        bookmarkId,
        { timeout: 15000 },
      );
      await page.evaluate((debugMode) => {
        const engine = window.__COSMOS_ENGINE__;
        if (engine && typeof engine.updateSettings === 'function') {
          engine.updateSettings({
            debugOverlayMode: debugMode,
            debugOverlayStrength: 0.82,
            debugShellsEnabled: debugMode === 4 || debugMode === 5,
            debugShellOpacity: 0.72,
          });
        }
      }, mode);
      await page.waitForTimeout(settleMs);
      const path = resolve(outputDir, `${bookmarkId}_mode-${mode}.png`);
      await page.screenshot({ path });
      const state = await page.evaluate(() => window.__COSMOS_DEBUG_OVERLAY_STATE__ ?? null);
      captures.push({ bookmarkId, mode, path, state });
    }
  }

  await browser.close();
  await writeFile(resolve(outputDir, 'debug-overlay-captures.json'), JSON.stringify({ baseUrl, modes, captures }, null, 2));
  console.log(JSON.stringify({ outputDir, count: captures.length }, null, 2));
} finally {
  if (server) server.kill('SIGTERM');
}
