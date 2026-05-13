import { describe, expect, it } from 'vitest';
import {
  capillaryGravityAngularFrequency,
  deepWaterKinematics,
  selectTopBreakerEvents,
  shallowWaterPhaseSpeed,
} from '@/cosmos/water/waterPhysics';

const closeTo = (actual: number, expected: number, tolerance = 1e-6) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

describe('Cosmos one-water physics helpers', () => {
  it('keeps deep-water dispersion physically ordered', () => {
    const shortWave = deepWaterKinematics(20);
    const longWave = deepWaterKinematics(120);

    expect(longWave.phaseSpeedMetersPerSecond).toBeGreaterThan(shortWave.phaseSpeedMetersPerSecond);
    closeTo(shortWave.groupSpeedMetersPerSecond, shortWave.phaseSpeedMetersPerSecond * 0.5);
    closeTo(longWave.groupSpeedMetersPerSecond, longWave.phaseSpeedMetersPerSecond * 0.5);
  });

  it('keeps shallow-water speed depth-limited', () => {
    expect(shallowWaterPhaseSpeed(20)).toBeGreaterThan(shallowWaterPhaseSpeed(2));
    expect(shallowWaterPhaseSpeed(0)).toBe(0);
  });

  it('includes finite-depth capillary-gravity response', () => {
    const angularFrequency = capillaryGravityAngularFrequency(0.08, 1.4);
    expect(angularFrequency).toBeGreaterThan(0);
    expect(Number.isFinite(angularFrequency)).toBe(true);
  });

  it('selects breaker events by bounded energy rather than spawning everything', () => {
    const selected = selectTopBreakerEvents([
      { id: 'calm', steepness: 0.02, curvature: 0.1, impulse: 0, cameraImportance: 0.2, distanceMeters: 50 },
      { id: 'impact', steepness: 0.13, curvature: 1.0, impulse: 12, cameraImportance: 1, distanceMeters: 8 },
      { id: 'crest', steepness: 0.16, curvature: 1.7, impulse: 3, cameraImportance: 0.8, distanceMeters: 20 },
    ], 2);

    expect(selected).toHaveLength(2);
    expect(selected[0].energy01).toBeGreaterThanOrEqual(selected[1].energy01);
    expect(selected.map((event) => event.id)).not.toContain('calm');
    expect(selected.some((event) => event.mode === 'object-impact')).toBe(true);
  });
});
