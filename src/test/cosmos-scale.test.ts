import { describe, expect, it } from 'vitest';
import {
  COSMOS_EARTH_RADIUS_M,
  COSMOS_PLANET_CENTER,
  cameraAltitudeMeters,
  classifyScaleLod,
  createCosmosScaleState,
} from '@/cosmos/scale/cosmosScale';

describe('cosmos scale model', () => {
  it('computes local sea-level altitude from the fixed planet center', () => {
    const alt = cameraAltitudeMeters({ x: 0, y: 4.2, z: 0 });
    expect(alt).toBeGreaterThan(4.19);
    expect(alt).toBeLessThan(4.21);
  });

  it('does not reset altitude when the camera moves horizontally', () => {
    const low = cameraAltitudeMeters({ x: 0, y: 1_000, z: 0 });
    const far = cameraAltitudeMeters({ x: 0, y: 1_000, z: 185_000 });
    expect(far).toBeGreaterThan(low + 2_000);
  });

  it('classifies the main transition bands', () => {
    expect(classifyScaleLod(4)).toBe('surface');
    expect(classifyScaleLod(8_400)).toBe('low-altitude');
    expect(classifyScaleLod(30_000)).toBe('high-altitude');
    expect(classifyScaleLod(100_000)).toBe('near-space');
    expect(classifyScaleLod(2_000_000)).toBe('orbital');
  });

  it('fades local passes out before orbital planet review takes over', () => {
    const surface = createCosmosScaleState(4);
    const transition = createCosmosScaleState(70_000);
    const orbit = createCosmosScaleState(2_000_000);
    expect(surface.oceanAlpha).toBeGreaterThan(0.99);
    expect(surface.planetAlpha).toBeLessThan(0.01);
    expect(transition.oceanAlpha).toBeGreaterThan(0);
    expect(transition.planetAlpha).toBeGreaterThan(0);
    expect(orbit.oceanAlpha).toBeLessThan(0.01);
    expect(orbit.cloudAlpha).toBeLessThan(0.01);
    expect(orbit.planetAlpha).toBeGreaterThan(0.99);
    expect(surface.horizonFogAlpha).toBeGreaterThan(0.99);
    expect(orbit.horizonFogAlpha).toBeLessThan(0.05);
  });

  it('keeps the Earth constants explicit for shader parity', () => {
    expect(COSMOS_PLANET_CENTER.y).toBe(-COSMOS_EARTH_RADIUS_M);
    expect(COSMOS_EARTH_RADIUS_M).toBe(6_371_000);
  });
});
