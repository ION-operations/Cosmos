import { describe, expect, it } from 'vitest';
import {
  COSMOS_R0012_ATMOSPHERE_DEFAULTS,
  COSMOS_TWILIGHT_SAMPLE_PLANS,
  createCosmosAtmosphereCalibrationState,
  evaluateCosmosTwilightCalibrationTarget,
} from '@/cosmos/atmosphere/atmosphereCalibration';

const inRange = (value: number, range: [number, number]) => value >= range[0] && value <= range[1];

describe('Cosmos R-0012 atmosphere calibration', () => {
  it('keeps default atmosphere controls in the curved-path twilight calibration band', () => {
    expect(COSMOS_R0012_ATMOSPHERE_DEFAULTS.strength).toBeGreaterThan(0.8);
    expect(COSMOS_R0012_ATMOSPHERE_DEFAULTS.mieScale).toBeLessThan(COSMOS_R0012_ATMOSPHERE_DEFAULTS.rayleighScale);
    expect(COSMOS_R0012_ATMOSPHERE_DEFAULTS.ozoneScale).toBeGreaterThan(0.7);
    expect(COSMOS_R0012_ATMOSPHERE_DEFAULTS.opticalDepthDebug).toBeGreaterThan(0);
  });

  it('uses atmosphere-path samples instead of raw orbital camera altitude for twilight targets', () => {
    const orbitalPlans = COSMOS_TWILIGHT_SAMPLE_PLANS.filter((plan) => plan.role === 'limb-shell-path');
    expect(orbitalPlans.length).toBe(2);
    for (const plan of orbitalPlans) {
      expect(plan.cameraAltitudeMeters).toBeGreaterThan(20_000_000);
      expect(plan.opticalSampleAltitudeMeters).toBeGreaterThanOrEqual(18_000);
      expect(plan.opticalSampleAltitudeMeters).toBeLessThanOrEqual(25_000);
      expect(plan.note).toContain('altitude');
    }
  });

  it('passes the static twilight target ranges for all calibration bookmarks', () => {
    const state = createCosmosAtmosphereCalibrationState();
    expect(state.pass).toBe(true);
    for (const evaluation of state.evaluations) {
      expect(evaluation.failures).toEqual([]);
      expect(inRange(evaluation.sample.opticalDepth, evaluation.target.opticalDepth)).toBe(true);
      expect(inRange(evaluation.sample.aerialPerspective, evaluation.target.aerialPerspective)).toBe(true);
      expect(inRange(evaluation.continuity.orbitalRimAlpha, evaluation.target.orbitalRimAlpha)).toBe(true);
      expect(inRange(evaluation.continuity.localSkyAlpha, evaluation.target.localSkyAlpha)).toBe(true);
    }
  });

  it('keeps the low twilight horizon local-sky owned and aerial-perspective heavy', () => {
    const low = evaluateCosmosTwilightCalibrationTarget('low-twilight-horizon');
    expect(low.continuity.localSkyAlpha).toBeGreaterThan(0.9);
    expect(low.continuity.orbitalRimAlpha).toBeLessThan(0.1);
    expect(low.sample.aerialPerspective).toBeGreaterThan(0.45);
  });
});
