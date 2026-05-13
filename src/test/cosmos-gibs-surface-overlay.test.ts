import { describe, expect, it } from 'vitest';
import {
  COSMOS_GIBS_SURFACE_DEFAULT_MANIFEST_URL,
  COSMOS_GIBS_SURFACE_DEFAULT_TEXTURE_URL,
  createNeutralGibsSurfaceTexture,
  resolveCosmosGibsSurfaceOverlayUrls,
} from '@/cosmos/gibs/gibsSurfaceOverlay';

describe('Cosmos GIBS surface overlay runtime contract', () => {
  it('uses stable default public URLs for local runtime data', () => {
    expect(COSMOS_GIBS_SURFACE_DEFAULT_TEXTURE_URL).toBe('/cosmos/gibs/global-truecolor.jpg');
    expect(COSMOS_GIBS_SURFACE_DEFAULT_MANIFEST_URL).toBe('/cosmos/gibs/global-truecolor.manifest.json');
    expect(resolveCosmosGibsSurfaceOverlayUrls()).toEqual({
      textureUrl: COSMOS_GIBS_SURFACE_DEFAULT_TEXTURE_URL,
      manifestUrl: COSMOS_GIBS_SURFACE_DEFAULT_MANIFEST_URL,
    });
  });

  it('creates a safe neutral texture fallback', () => {
    const texture = createNeutralGibsSurfaceTexture();
    expect(texture.image.width).toBe(1);
    expect(texture.image.height).toBe(1);
    expect(texture.generateMipmaps).toBe(false);
    texture.dispose();
  });
});
