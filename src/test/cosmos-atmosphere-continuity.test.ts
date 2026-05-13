import { describe, expect, it } from 'vitest';
import { createCosmosAtmosphereContinuityState } from '@/cosmos/atmosphere/atmosphereContinuity';
import { cloudFS, oceanFS, planetFS, skyFS } from '@/cosmos/orbital/shaders';
import { createCosmosScaleState } from '@/cosmos/scale/cosmosScale';

describe('Cosmos R-0007 atmosphere/cloud continuity contract', () => {
  it('keeps local sky strong near sea level and shifts rim ownership to orbit', () => {
    const seaLevel = createCosmosAtmosphereContinuityState(4);
    const nearSpace = createCosmosAtmosphereContinuityState(120_000);
    const orbit = createCosmosAtmosphereContinuityState(2_000_000);

    expect(seaLevel.localSkyAlpha).toBeGreaterThan(0.99);
    expect(seaLevel.orbitalRimAlpha).toBeLessThan(0.01);
    expect(nearSpace.orbitalRimAlpha).toBeGreaterThan(0.3);
    expect(orbit.localSkyAlpha).toBeLessThan(0.01);
    expect(orbit.orbitalRimAlpha).toBeGreaterThan(0.99);
  });

  it('drops micro cloud detail before macro cloud placement fades', () => {
    const surface = createCosmosScaleState(4);
    const highAltitude = createCosmosScaleState(45_000);
    const nearSpace = createCosmosScaleState(120_000);

    expect(surface.cloudMicroAlpha).toBeGreaterThan(0.99);
    expect(surface.cloudMacroAlpha).toBeGreaterThan(0.34);
    expect(highAltitude.cloudMicroAlpha).toBeLessThan(0.05);
    expect(highAltitude.cloudMacroAlpha).toBeGreaterThan(0.8);
    expect(nearSpace.cloudMesoAlpha).toBeLessThan(0.5);
  });

  it('wires atmosphere continuity helpers into all active visual passes', () => {
    for (const shader of [skyFS, oceanFS, cloudFS, planetFS]) {
      expect(shader).toContain('uAtmosphereContinuityStrength');
      expect(shader).toContain('cosmosAtmosphereContinuityColor');
    }
    expect(cloudFS).toContain('cosmosCloudMicroDetailAlpha');
    expect(oceanFS).toContain('cosmosAerialPerspectiveFactor');
    expect(planetFS).toContain('uCosmosOrbitalRimAlpha');
  });
});
