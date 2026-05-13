import { describe, expect, it } from 'vitest';
import {
  classifyCosmosRuntimeDiagnostics,
  countCosmosRuntimeMessages,
  createCosmosRuntimeDiagnosticsState,
  createCosmosRuntimeLogEntry,
  hashCosmosRuntimeText,
} from '@/cosmos/runtime/runtimeDiagnostics';

describe('Cosmos runtime shader diagnostics', () => {
  it('classifies shader/program/page failures as blocking runtime errors', () => {
    const messages = [
      createCosmosRuntimeLogEntry({ kind: 'webgl-shader', type: 'error', text: 'ERROR: 0:12: undeclared identifier' }),
      createCosmosRuntimeLogEntry({ kind: 'webgl-program', type: 'warning', text: 'Program linked with precision warning' }),
      createCosmosRuntimeLogEntry({ kind: 'pageerror', type: 'pageerror', text: 'TypeError: cannot read shader uniform' }),
    ];
    const counts = countCosmosRuntimeMessages(messages);
    expect(counts.shaderErrors).toBe(1);
    expect(counts.programWarnings).toBe(1);
    expect(counts.pageErrors).toBe(1);
    expect(classifyCosmosRuntimeDiagnostics(counts, false)).toBe('error');
  });

  it('returns an ok state when runtime message arrays are clean', () => {
    const state = createCosmosRuntimeDiagnosticsState({
      bookmarkId: 'orbit',
      debugMode: 0,
      renderer: { programCount: 7, checkShaderErrors: true },
      webglProbe: { installed: true, shaderCompiles: 12, programLinks: 7 },
      messages: [],
    });
    expect(state.state).toBe('ok');
    expect(state.renderer.programCount).toBe(7);
    expect(state.webglProbe.installed).toBe(true);
    expect(state.bookmarkId).toBe('orbit');
  });

  it('hashes shader text deterministically for stable receipts', () => {
    expect(hashCosmosRuntimeText('void main(){}')).toBe(hashCosmosRuntimeText('void main(){}'));
    expect(hashCosmosRuntimeText('void main(){}')).not.toBe(hashCosmosRuntimeText('void main(){gl_Position=vec4(0.0);}'));
  });
});
