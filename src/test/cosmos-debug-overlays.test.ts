import { describe, expect, it } from 'vitest';
import {
  COSMOS_DEBUG_DEFAULT_SHELL_CONTRACT,
  COSMOS_DEBUG_OVERLAY_MODES,
  createCosmosDebugOverlayState,
  describeCosmosDebugMode,
} from '@/cosmos/debug/cosmosDebug';
import { debugOverlayFS } from '@/cosmos/orbital/shaders';

const requiredModeKeys = [
  'off',
  'scale-ownership',
  'atmosphere-ownership',
  'cloud-lod',
  'physical-shells',
  'composite-diagnostic',
  'optical-depth-lut',
];

describe('Cosmos R-0009 visual debug overlay contract', () => {
  it('defines stable unique debug mode ids and keys', () => {
    const ids = new Set(COSMOS_DEBUG_OVERLAY_MODES.map((mode) => mode.id));
    const keys = new Set(COSMOS_DEBUG_OVERLAY_MODES.map((mode) => mode.key));

    expect(ids.size).toBe(COSMOS_DEBUG_OVERLAY_MODES.length);
    expect(keys.size).toBe(COSMOS_DEBUG_OVERLAY_MODES.length);

    for (const key of requiredModeKeys) {
      expect(keys.has(key)).toBe(true);
    }
  });

  it('creates bounded runtime state with a physical shell contract', () => {
    const state = createCosmosDebugOverlayState({
      mode: 99,
      overlayStrength: 3,
      shellOpacity: -1,
      shellsEnabled: true,
    });

    expect(state.mode).toBe(0);
    expect(state.overlayStrength).toBe(1);
    expect(state.shellOpacity).toBe(0);
    expect(state.shellsEnabled).toBe(true);
    expect(state.shellContract.earthRadiusMeters).toBe(COSMOS_DEBUG_DEFAULT_SHELL_CONTRACT.earthRadiusMeters);
    expect(state.shellContract.cloudBaseRadiusMeters).toBeGreaterThan(state.shellContract.earthRadiusMeters);
    expect(state.shellContract.atmosphereRadiusMeters).toBeGreaterThan(state.shellContract.cloudTopRadiusMeters);
  });

  it('describes diagnostic color meaning for lead-eyes review', () => {
    expect(describeCosmosDebugMode(1).colorMeaning).toContain('red=ocean');
    expect(describeCosmosDebugMode(2).colorMeaning).toContain('blue=orbital rim');
    expect(describeCosmosDebugMode(3).diagnosticTarget).toContain('cloud detail');
  });

  it('wires fullscreen shader diagnostics to fixed scale and shell uniforms', () => {
    expect(debugOverlayFS).toContain('uCosmosDebugOverlayMode');
    expect(debugOverlayFS).toContain('cosmosOwnershipScaleColor');
    expect(debugOverlayFS).toContain('cosmosOwnershipAtmosphereColor');
    expect(debugOverlayFS).toContain('cosmosOwnershipCloudLodColor');
    expect(debugOverlayFS).toContain('cosmosShellTangentLine');
    expect(debugOverlayFS).toContain('uCosmosEarthRadius');
    expect(debugOverlayFS).toContain('uCosmosAtmosphereRadius');
    expect(debugOverlayFS).toContain('cosmosOpticalDepthLutColor');
  });
});
