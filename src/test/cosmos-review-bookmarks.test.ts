import { describe, expect, it } from 'vitest';
import { COSMOS_REVIEW_BOOKMARKS, PRESETS } from '@/cosmos/orbital/WorldEngine';

describe('Cosmos orbital review bookmarks', () => {
  it('defines stable unique bookmark ids mapped to valid presets', () => {
    const ids = new Set(COSMOS_REVIEW_BOOKMARKS.map((bookmark) => bookmark.id));
    expect(ids.size).toBe(COSMOS_REVIEW_BOOKMARKS.length);
    expect(ids.has('orbit')).toBe(true);
    expect(ids.has('sea-level')).toBe(true);
    expect(ids.has('underwater')).toBe(true);

    for (const bookmark of COSMOS_REVIEW_BOOKMARKS) {
      expect(PRESETS[bookmark.preset]).toBeDefined();
      expect(bookmark.position).toHaveLength(3);
      expect(bookmark.target).toHaveLength(3);
      expect(bookmark.reviewFocus.length).toBeGreaterThanOrEqual(3);
      expect(bookmark.fov).toBeGreaterThan(20);
      expect(bookmark.fov).toBeLessThan(80);
      expect(bookmark.weatherSampleUv).toHaveLength(2);
      expect(bookmark.overrides.weatherAtlasStrength).toBeGreaterThanOrEqual(0);
      expect(bookmark.overrides.weatherAtlasStrength).toBeLessThanOrEqual(1);
      expect(bookmark.overrides.cloudRegimeContrast).toBeGreaterThanOrEqual(0);
      expect(bookmark.overrides.cloudRegimeContrast).toBeLessThanOrEqual(1);
      expect(bookmark.overrides.macroWeatherScale).toBeGreaterThan(0);
      expect(bookmark.overrides.gibsSurfaceOverlayStrength).toBeGreaterThanOrEqual(0);
      expect(bookmark.overrides.gibsSurfaceOverlayStrength).toBeLessThanOrEqual(1);
      expect(bookmark.overrides.gibsSurfaceWaterBias).toBeGreaterThanOrEqual(0);
      expect(bookmark.overrides.gibsSurfaceWaterBias).toBeLessThanOrEqual(1);
      for (const uv of bookmark.weatherSampleUv) {
        expect(Number.isFinite(uv)).toBe(true);
        expect(uv).toBeGreaterThanOrEqual(0);
        expect(uv).toBeLessThanOrEqual(1);
      }
      for (const coordinate of [...bookmark.position, ...bookmark.target]) {
        expect(Number.isFinite(coordinate)).toBe(true);
      }
    }
  });
});
