#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const root = process.cwd();
let baseUrl = process.env.COSMOS_REVIEW_BASE_URL ?? 'http://127.0.0.1:8080';
const shouldStartServer = process.env.COSMOS_REVIEW_START_SERVER !== '0';
const outputDir = resolve(root, process.env.COSMOS_REVIEW_SCREENSHOT_DIR ?? 'docs/cosmos/validation/screenshots/R0004');
const viewportWidth = Number(process.env.COSMOS_REVIEW_WIDTH ?? 1920);
const viewportHeight = Number(process.env.COSMOS_REVIEW_HEIGHT ?? 1080);
const settleMs = Number(process.env.COSMOS_REVIEW_SETTLE_MS ?? 1800);
const readyTimeoutMs = Number(process.env.COSMOS_REVIEW_READY_TIMEOUT_MS ?? 45000);
const gibsTimeoutMs = Number(process.env.COSMOS_REVIEW_GIBS_TIMEOUT_MS ?? 45000);
const screenshotTimeoutMs = Number(process.env.COSMOS_REVIEW_SCREENSHOT_TIMEOUT_MS ?? 90000);
const captureMode = process.env.COSMOS_REVIEW_CAPTURE_MODE ?? 'canvas';

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
  const bookmarkIds = [...source.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
  const requested = process.env.COSMOS_REVIEW_BOOKMARKS
    ?.split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (!requested?.length) return bookmarkIds;

  const known = new Set(bookmarkIds);
  const unknown = requested.filter((id) => !known.has(id));
  if (unknown.length) throw new Error(`Unknown Cosmos review bookmark id(s): ${unknown.join(', ')}`);
  return requested;
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

async function captureReviewImage(page, path) {
  if (captureMode === 'page') {
    await page.screenshot({ path, timeout: screenshotTimeoutMs });
    return;
  }

  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Review canvas was not found.');
    return canvas.toDataURL('image/png');
  });
  const encoded = dataUrl.replace(/^data:image\/png;base64,/, '');
  await writeFile(path, Buffer.from(encoded, 'base64'));
}

function canListen(host, port) {
  return new Promise((resolvePort) => {
    const testServer = createServer();
    testServer.once('error', () => resolvePort(false));
    testServer.once('listening', () => {
      testServer.close(() => resolvePort(true));
    });
    testServer.listen(port, host);
  });
}

async function findAvailablePort(host, preferredPort) {
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    if (await canListen(host, port)) return port;
  }
  throw new Error(`No available local port found starting at ${preferredPort}`);
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  const signalServer = (signal) => {
    try {
      process.kill(-child.pid, signal);
    } catch {
      child.kill(signal);
    }
  };
  await new Promise((resolveStop) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) signalServer('SIGKILL');
      resolveStop();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolveStop();
    });
    signalServer('SIGTERM');
  });
}

let server;
if (shouldStartServer) {
  const requestedUrl = new URL(baseUrl);
  const host = requestedUrl.hostname || '127.0.0.1';
  const preferredPort = Number(requestedUrl.port || 8080);
  const port = process.env.COSMOS_REVIEW_BASE_URL
    ? preferredPort
    : await findAvailablePort(host, preferredPort);
  requestedUrl.port = String(port);
  baseUrl = requestedUrl.toString().replace(/\/$/, '');

  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: root,
    detached: true,
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

  const captures = [];
  const firstBookmarkId = 'orbit';
  const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight }, deviceScaleFactor: 1 });
  const initialUrl = `${baseUrl}/cosmos-review?bookmark=${encodeURIComponent(firstBookmarkId)}&panel=0`;
  await page.goto(initialUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    (id) => window.__COSMOS_REVIEW_READY__ === true && window.__COSMOS_ACTIVE_BOOKMARK__ === id,
    firstBookmarkId,
    { timeout: readyTimeoutMs },
  );
  await page.waitForFunction(
    () => {
      const state = window.__COSMOS_GIBS_SURFACE_OVERLAY_STATE__?.state;
      return state === 'loaded' || state === 'failed';
    },
    undefined,
    { timeout: gibsTimeoutMs },
  );

  for (const bookmarkId of bookmarkIds) {
    if (bookmarkId !== firstBookmarkId) {
      await page.evaluate((id) => {
        if (!window.__COSMOS_APPLY_BOOKMARK__) throw new Error('Cosmos bookmark control is not available.');
        window.__COSMOS_APPLY_BOOKMARK__(id);
      }, bookmarkId);
      await page.waitForFunction(
        (id) => window.__COSMOS_ACTIVE_BOOKMARK__ === id,
        bookmarkId,
        { timeout: readyTimeoutMs },
      );
    }
    await page.waitForTimeout(settleMs);
    const path = resolve(outputDir, `${bookmarkId}.png`);
    await captureReviewImage(page, path);
    const gibsStatus = await page.evaluate(() => window.__COSMOS_GIBS_SURFACE_OVERLAY_STATE__);
    const capture = { bookmarkId, path, gibsStatus };
    captures.push(capture);
    console.log(JSON.stringify({
      bookmarkId,
      path,
      gibsState: gibsStatus?.state,
      gibsLayer: gibsStatus?.layer,
      gibsTime: gibsStatus?.time,
    }));
  }

  await page.close();
  await browser.close();
  console.log(JSON.stringify({ outputDir, captures }, null, 2));
} finally {
  await stopServer(server);
}
