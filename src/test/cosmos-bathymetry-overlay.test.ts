import { describe, expect, it } from 'vitest';
import { createProceduralBathymetryTexture } from '@/cosmos/bathymetry/bathymetryOverlay';
import { oceanFS, planetFS } from '@/cosmos/orbital/shaders';

describe('Cosmos bathymetry overlay contract', () => {
  it('creates a safe RGBA bathymetry fallback texture', () => {
    const texture = createProceduralBathymetryTexture(64, 32);
    expect(texture.image.width).toBe(64);
    expect(texture.image.height).toBe(32);
    expect(texture.image.data.length).toBe(64 * 32 * 4);
    texture.dispose();
  });

  it('wires bathymetry into orbital ocean and planet shaders', () => {
    for (const shader of [oceanFS, planetFS]) {
      expect(shader).toContain('uCosmosBathymetryAtlas');
      expect(shader).toContain('cosmosSampleBathymetry');
      expect(shader).toContain('uShallowWaterOptics');
      expect(shader).toContain('uOneWaterOpticsStrength');
    }
  });
});
