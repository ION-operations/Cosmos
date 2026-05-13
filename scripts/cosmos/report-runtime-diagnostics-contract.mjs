#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, process.env.COSMOS_RUNTIME_CONTRACT_DIR ?? 'docs/cosmos/validation/runtime/R0011');
const expectedModes = [0, 2, 6];
const contract = {
  release: 'R-0011',
  purpose: 'browser runtime WebGL shader compile/link and console/page-error capture',
  expectedModes,
  webglProbe: {
    patches: ['shaderSource', 'compileShader', 'attachShader', 'linkProgram'],
    records: ['webgl-shader', 'webgl-program'],
    failGate: 'shaderErrors + programErrors + pageErrors must be zero before visual tuning',
  },
  engineProbe: {
    threeDebugCheckShaderErrors: true,
    callback: 'WebGLRenderer.debug.onShaderError',
    exposedWindowState: 'window.__COSMOS_RUNTIME_DIAGNOSTICS__',
  },
  playwrightCapture: {
    script: 'scripts/cosmos/capture-review-runtime-diagnostics.mjs',
    command: 'npm run cosmos:review:runtime-diagnostics',
    output: 'docs/cosmos/validation/runtime/R0011/runtime-diagnostics.json',
  },
};

const markdown = [
  '# Cosmos R-0011 runtime diagnostics contract',
  '',
  'R-0011 keeps runtime browser/WebGL evidence as the hard gate before twilight and terminator beauty tuning.',
  '',
  '## Required capture modes',
  '',
  '| Mode | Meaning |',
  '|---:|---|',
  '| 0 | beauty render, no overlay |',
  '| 2 | atmosphere-ownership debug overlay |',
  '| 6 | optical-depth-LUT debug overlay |',
  '',
  '## Failure gate',
  '',
  'The runtime packet should report zero shader compile errors, zero program-link errors, and zero page errors before Rayleigh/Mie/ozone/aerial-perspective tuning is treated as reliable.',
  '',
  '## Browser state',
  '',
  'The engine exposes `window.__COSMOS_RUNTIME_DIAGNOSTICS__`; the Playwright init script exposes `window.__COSMOS_WEBGL_PROBE__`.',
].join('\n');

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'runtime-diagnostics-contract.json'), JSON.stringify(contract, null, 2));
await writeFile(resolve(outputDir, 'runtime-diagnostics-contract.md'), markdown);
console.log(markdown);
