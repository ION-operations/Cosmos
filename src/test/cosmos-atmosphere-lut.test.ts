import { describe, expect, it } from 'vitest';
import {
  COSMOS_ATMOSPHERE_LUT_SPEC,
  createCosmosAtmosphereLutState,
  createCosmosAtmosphereLutTextures,
  disposeCosmosAtmosphereLutTextures,
  sampleAtmosphereOpticalModel,
} from '@/cosmos/atmosphere/atmosphereLut';

describe('cosmos atmosphere LUT interface', () => {
  it('defines the R-0012 higher-fidelity lookup texture resolutions and encodings', () => {
    expect(COSMOS_ATMOSPHERE_LUT_SPEC.transmittance.width).toBe(320);
    expect(COSMOS_ATMOSPHERE_LUT_SPEC.transmittance.height).toBe(80);
    expect(COSMOS_ATMOSPHERE_LUT_SPEC.multiScattering.width).toBeGreaterThanOrEqual(32);
    expect(COSMOS_ATMOSPHERE_LUT_SPEC.skyView.width).toBeGreaterThan(COSMOS_ATMOSPHERE_LUT_SPEC.aerialPerspective.width);
    for (const dimensions of Object.values(COSMOS_ATMOSPHERE_LUT_SPEC)) {
      expect(dimensions.channels).toBe(4);
      expect(dimensions.encoding).toContain('RGBA8');
    }
  });

  it('generates all four CPU fallback textures', () => {
    const luts = createCosmosAtmosphereLutTextures();
    try {
      expect(luts.transmittance.image.width).toBe(COSMOS_ATMOSPHERE_LUT_SPEC.transmittance.width);
      expect(luts.multiScattering.image.height).toBe(COSMOS_ATMOSPHERE_LUT_SPEC.multiScattering.height);
      expect(luts.skyView.version).toBeGreaterThan(0);
      expect(luts.aerialPerspective.image.data.length).toBe(
        COSMOS_ATMOSPHERE_LUT_SPEC.aerialPerspective.width * COSMOS_ATMOSPHERE_LUT_SPEC.aerialPerspective.height * 4,
      );
      expect(luts.state.provider).toBe('cosmos-cpu-lut-fallback');
    } finally {
      disposeCosmosAtmosphereLutTextures(luts);
    }
  });

  it('attenuates more strongly at low altitude and grazing sun angles', () => {
    const surfaceGrazing = sampleAtmosphereOpticalModel({ altitudeMeters: 0, sunMu: -0.05, viewMu: 0.04 });
    const highZenith = sampleAtmosphereOpticalModel({ altitudeMeters: 90_000, sunMu: 0.9, viewMu: 0.9 });
    const surfaceTrans = surfaceGrazing.transmittance.reduce((sum, value) => sum + value, 0);
    const highTrans = highZenith.transmittance.reduce((sum, value) => sum + value, 0);
    expect(surfaceGrazing.opticalDepth).toBeGreaterThan(highZenith.opticalDepth);
    expect(highTrans).toBeGreaterThan(surfaceTrans);
  });

  it('exports a stable state packet for browser diagnostics', () => {
    const state = createCosmosAtmosphereLutState({ strength: 0.5, ozoneScale: 1.2 });
    expect(state.state).toBe('generated');
    expect(state.controls.strength).toBe(0.5);
    expect(state.controls.ozoneScale).toBe(1.2);
    expect(state.spec.transmittance.encoding).toContain('curved');
    expect(state.model).toBe('R0012-higher-fidelity-curved-path-lut');
  });
});
