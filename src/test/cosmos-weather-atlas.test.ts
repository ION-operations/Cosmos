import { describe, expect, it } from 'vitest';
import { createCosmosWeatherAtlas } from '@/cosmos/weatherAtlas';
import { cloudFS, oceanFS, planetFS } from '@/cosmos/orbital/shaders';

describe('Cosmos weather atlas renderer contract', () => {
  it('creates the four atlas textures shared by Water World and Cosmos Review', () => {
    const atlas = createCosmosWeatherAtlas({ width: 64, height: 32, preset: 'waterWorldV01', seed: 12052026 });

    expect(atlas.width).toBe(64);
    expect(atlas.height).toBe(32);
    expect(atlas.weatherA.image.width).toBe(64);
    expect(atlas.weatherA.image.height).toBe(32);
    expect(atlas.weatherB.image.width).toBe(64);
    expect(atlas.terrainForcingA.image.width).toBe(64);
    expect(atlas.terrainForcingB.image.height).toBe(32);

    atlas.dispose();
  });

  it('wires the atlas into orbital cloud, planet, and ocean shaders', () => {
    for (const shader of [cloudFS, planetFS, oceanFS]) {
      expect(shader).toContain('uCosmosWeatherAtlasA');
      expect(shader).toContain('uCosmosWeatherAtlasB');
      expect(shader).toContain('cosmosSampleWeather');
      expect(shader).toContain('uWeatherAtlasStrength');
    }
  });
});
