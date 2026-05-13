import { describe, expect, it } from 'vitest';
import {
  COSMOS_ATMOSPHERE_PHYSICS_MODEL,
  henyeyGreensteinPhase,
  integrateCosmosAtmosphereOpticalDepth,
  ozoneDensity01,
  rayleighPhase,
  sampleCosmosAtmospherePhysicalModel,
} from '@/cosmos/atmosphere/atmospherePhysics';
import { DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS } from '@/cosmos/atmosphere/atmosphereLut';

describe('Cosmos R-0012 atmosphere physics fallback solver', () => {
  it('identifies the curved-path LUT model', () => {
    expect(COSMOS_ATMOSPHERE_PHYSICS_MODEL).toContain('curved-path');
  });

  it('integrates longer optical paths for sea-level grazing views than high-altitude zenith views', () => {
    const seaGrazing = integrateCosmosAtmosphereOpticalDepth({ altitudeMeters: 0, directionMu: 0.035, maxDistanceMeters: 650_000 });
    const highZenith = integrateCosmosAtmosphereOpticalDepth({ altitudeMeters: 90_000, directionMu: 0.9, maxDistanceMeters: 650_000 });
    expect(seaGrazing.atmosphereHit).toBe(true);
    expect(seaGrazing.normalizedRayleighDepth).toBeGreaterThan(highZenith.normalizedRayleighDepth * 1000);
    expect(seaGrazing.normalizedMieDepth).toBeGreaterThan(highZenith.normalizedMieDepth * 1000);
  });

  it('keeps ozone concentrated in the stratospheric band', () => {
    expect(ozoneDensity01(25_000)).toBeGreaterThan(0.85);
    expect(ozoneDensity01(2_000)).toBeLessThan(0.05);
    expect(ozoneDensity01(85_000)).toBeLessThan(0.05);
  });

  it('uses physically shaped Rayleigh and forward-Mie phase functions', () => {
    expect(rayleighPhase(1)).toBeGreaterThan(rayleighPhase(0));
    expect(henyeyGreensteinPhase(0.92)).toBeGreaterThan(henyeyGreensteinPhase(-0.25));
  });

  it('produces stronger attenuation for low twilight horizon than orbital limb samples', () => {
    const low = sampleCosmosAtmospherePhysicalModel({
      altitudeMeters: 25,
      sunMu: Math.sin((1.2 * Math.PI) / 180),
      viewMu: 0.035,
      distanceMeters: 650_000,
      controls: { ...DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS, mieScale: 0.74, aerialPerspectiveStrength: 0.86 },
    });
    const limb = sampleCosmosAtmospherePhysicalModel({
      altitudeMeters: 25_000,
      sunMu: Math.sin((-1.5 * Math.PI) / 180),
      viewMu: 0.01,
      distanceMeters: 180_000,
      controls: { ...DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS, mieScale: 0.46, ozoneScale: 1.08, aerialPerspectiveStrength: 0.22 },
    });
    expect(low.opticalDepth).toBeGreaterThan(limb.opticalDepth);
    expect(low.aerialPerspective).toBeGreaterThan(limb.aerialPerspective);
    expect(low.transmittance[2]).toBeLessThan(limb.transmittance[2]);
  });
});
