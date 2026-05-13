#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const baseUrl = process.env.COSMOS_REVIEW_BASE_URL ?? 'http://127.0.0.1:8080';
const shouldStartServer = process.env.COSMOS_REVIEW_START_SERVER !== '0';
const outputDir = resolve(root, process.env.COSMOS_REVIEW_RUNTIME_DIR ?? 'docs/cosmos/validation/runtime/R0011');
const screenshotDir = resolve(outputDir, 'screenshots');
const viewportWidth = Number(process.env.COSMOS_REVIEW_WIDTH ?? 1440);
const viewportHeight = Number(process.env.COSMOS_REVIEW_HEIGHT ?? 900);
const settleMs = Number(process.env.COSMOS_REVIEW_SETTLE_MS ?? 1800);
const modeCsv = process.env.COSMOS_REVIEW_RUNTIME_MODES ?? '0,2,6';
const modes = modeCsv.split(',').map((value) => Number(value.trim())).filter((value) => Number.isFinite(value));
const failOnErrors = process.env.COSMOS_RUNTIME_FAIL_ON_ERRORS === '1';

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

function installWebGlProbe() {
  const win = window;
  const logs = [];
  const stats = {
    installed: true,
    shaderCompiles: 0,
    shaderWarnings: 0,
    shaderErrors: 0,
    programLinks: 0,
    programWarnings: 0,
    programErrors: 0,
    maxShaderLogLength: 0,
    maxProgramLogLength: 0,
  };
  const shaderSources = new WeakMap();
  const shaderTypes = new WeakMap();
  const attachedShaders = new WeakMap();
  const hash = (text) => {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  const push = (entry) => {
    logs.push({ ...entry, timeMs: Date.now() });
    if (logs.length > 300) logs.splice(0, logs.length - 300);
  };
  const install = (Ctor) => {
    if (!Ctor?.prototype || Ctor.prototype.__COSMOS_WEBGL_PROBE_PATCHED__) return;
    const proto = Ctor.prototype;
    Object.defineProperty(proto, '__COSMOS_WEBGL_PROBE_PATCHED__', { value: true });

    const createShader = proto.createShader;
    proto.createShader = function(type) {
      const shader = createShader.call(this, type);
      if (shader) shaderTypes.set(shader, type === this.VERTEX_SHADER ? 'vertex' : type === this.FRAGMENT_SHADER ? 'fragment' : 'unknown');
      return shader;
    };

    const shaderSource = proto.shaderSource;
    proto.shaderSource = function(shader, source) {
      if (shader) shaderSources.set(shader, String(source ?? ''));
      return shaderSource.call(this, shader, source);
    };

    const compileShader = proto.compileShader;
    proto.compileShader = function(shader) {
      const result = compileShader.call(this, shader);
      stats.shaderCompiles++;
      const ok = Boolean(this.getShaderParameter(shader, this.COMPILE_STATUS));
      const log = this.getShaderInfoLog(shader) || '';
      stats.maxShaderLogLength = Math.max(stats.maxShaderLogLength, log.length);
      if (!ok || log.trim().length > 0) {
        if (ok) stats.shaderWarnings++; else stats.shaderErrors++;
        const source = shaderSources.get(shader) || '';
        push({
          kind: 'webgl-shader',
          type: ok ? 'warning' : 'error',
          text: log || 'Shader compile status false with empty info log.',
          shaderType: shaderTypes.get(shader) || 'unknown',
          shaderHash: hash(source),
        });
      }
      return result;
    };

    const attachShader = proto.attachShader;
    proto.attachShader = function(program, shader) {
      const list = attachedShaders.get(program) || [];
      list.push(shader);
      attachedShaders.set(program, list);
      return attachShader.call(this, program, shader);
    };

    const linkProgram = proto.linkProgram;
    proto.linkProgram = function(program) {
      const result = linkProgram.call(this, program);
      stats.programLinks++;
      const ok = Boolean(this.getProgramParameter(program, this.LINK_STATUS));
      const log = this.getProgramInfoLog(program) || '';
      stats.maxProgramLogLength = Math.max(stats.maxProgramLogLength, log.length);
      if (!ok || log.trim().length > 0) {
        if (ok) stats.programWarnings++; else stats.programErrors++;
        const shaders = attachedShaders.get(program) || [];
        const hashes = shaders.map((shader) => hash(shaderSources.get(shader) || '')).join(',');
        push({
          kind: 'webgl-program',
          type: ok ? 'warning' : 'error',
          text: log || 'Program link status false with empty info log.',
          shaderHash: hashes,
        });
      }
      return result;
    };
  };

  install(win.WebGLRenderingContext);
  install(win.WebGL2RenderingContext);
  win.__COSMOS_WEBGL_PROBE__ = { stats, logs, clear: () => { logs.splice(0); } };
}

function markdownReport(payload) {
  const rows = payload.records.map((record) => {
    const r = record.runtimeDiagnostics ?? {};
    const counts = r.counts ?? {};
    const renderer = r.renderer ?? {};
    const probe = r.webglProbe ?? {};
    return `| ${record.bookmarkId} | ${record.mode} | ${r.state ?? 'n/a'} | ${renderer.programCount ?? 0} | ${probe.shaderCompiles ?? 0} | ${counts.shaderErrors ?? 0}/${counts.programErrors ?? 0}/${counts.pageErrors ?? 0} | ${counts.warnings ?? 0} |`;
  });
  return [
    '# Cosmos R-0011 runtime shader diagnostics',
    '',
    'This report is generated inside Chromium for the R-0011 shader-clean twilight calibration gate with a Playwright-injected WebGL prototype probe plus the engine-side Three.js shader-error callback.',
    '',
    '| Bookmark | Mode | State | Programs | Shader compiles | Shader/program/page errors | Warnings |',
    '|---|---:|---|---:|---:|---:|---:|',
    ...rows,
    '',
    `Overall errors: ${payload.summary.errors}`,
    `Overall warnings: ${payload.summary.warnings}`,
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
  await mkdir(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: viewportWidth, height: viewportHeight }, deviceScaleFactor: 1 });
  await context.addInitScript(installWebGlProbe);

  const records = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const bookmarkId of bookmarkIds) {
    for (const mode of modes) {
      const page = await context.newPage();
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', (msg) => {
        const location = msg.location();
        consoleMessages.push({ type: msg.type(), text: msg.text(), location, timeMs: Date.now() });
      });
      page.on('pageerror', (error) => {
        pageErrors.push({ name: error.name, message: error.message, stack: error.stack, timeMs: Date.now() });
      });
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
            debugOverlayStrength: debugMode === 0 ? 0 : 0.82,
            debugShellsEnabled: false,
            opticalDepthDebugStrength: debugMode === 6 ? 0.75 : 0.0,
          });
        }
        if (window.__COSMOS_WEBGL_PROBE__?.clear) window.__COSMOS_WEBGL_PROBE__.clear();
      }, mode);
      await page.waitForTimeout(settleMs);
      const screenshotPath = resolve(screenshotDir, `${bookmarkId}_mode-${mode}.png`);
      await page.screenshot({ path: screenshotPath });
      const browserState = await page.evaluate(() => ({
        bookmarkId: window.__COSMOS_ACTIVE_BOOKMARK__,
        runtimeDiagnostics: window.__COSMOS_RUNTIME_DIAGNOSTICS__ ?? null,
        webglProbe: window.__COSMOS_WEBGL_PROBE__ ?? null,
        scaleState: window.__COSMOS_SCALE_STATE__ ?? null,
        atmosphereLutState: window.__COSMOS_ATMOSPHERE_LUT_STATE__ ?? null,
        debugState: window.__COSMOS_DEBUG_OVERLAY_STATE__ ?? null,
      }));
      const record = { bookmarkId, mode, url: targetUrl, screenshotPath, consoleMessages, pageErrors, ...browserState };
      const counts = browserState.runtimeDiagnostics?.counts ?? { errors: 0, warnings: 0 };
      totalErrors += counts.errors + pageErrors.length;
      totalWarnings += counts.warnings;
      records.push(record);
      await page.close();
    }
  }

  await browser.close();
  const payload = { baseUrl, modes, generatedAtIso: new Date().toISOString(), summary: { errors: totalErrors, warnings: totalWarnings, records: records.length }, records };
  await writeFile(resolve(outputDir, 'runtime-diagnostics.json'), JSON.stringify(payload, null, 2));
  await writeFile(resolve(outputDir, 'runtime-diagnostics.md'), markdownReport(payload));
  console.log(JSON.stringify({ outputDir, records: records.length, errors: totalErrors, warnings: totalWarnings }, null, 2));
  if (failOnErrors && totalErrors > 0) process.exitCode = 1;
} finally {
  if (server) server.kill('SIGTERM');
}
