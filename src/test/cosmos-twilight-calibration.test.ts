import { describe, expect, it } from 'vitest';
import { COSMOS_REVIEW_BOOKMARKS } from '@/cosmos/orbital/WorldEngine';
import { COSMOS_TWILIGHT_CALIBRATION_TARGETS, getCosmosTwilightCalibrationTarget } from '@/cosmos/atmosphere/twilightCalibration';

describe('Cosmos twilight/terminator calibration targets', () => {
  it('maps every calibration target to a real review bookmark', () => {
    const bookmarkIds = new Set(COSMOS_REVIEW_BOOKMARKS.map((bookmark) => bookmark.id));
    expect(bookmarkIds.has('twilight-limb')).toBe(true);
    expect(bookmarkIds.has('low-twilight-horizon')).toBe(true);
    for (const target of COSMOS_TWILIGHT_CALIBRATION_TARGETS) {
      expect(bookmarkIds.has(target.bookmarkId)).toBe(true);
      expect(target.reviewCues.length).toBeGreaterThanOrEqual(3);
      expect(target.target.opticalDepth[0]).toBeLessThan(target.target.opticalDepth[1]);
      expect(target.target.localSkyAlpha[0]).toBeLessThanOrEqual(target.target.localSkyAlpha[1]);
    }
  });

  it('keeps orbital and local atmosphere ownership separated for twilight review', () => {
    const orbital = getCosmosTwilightCalibrationTarget('twilight-limb');
    const local = getCosmosTwilightCalibrationTarget('low-twilight-horizon');
    expect(orbital?.target.orbitalRimAlpha[0]).toBeGreaterThan(0.9);
    expect(orbital?.target.localSkyAlpha[1]).toBeLessThan(0.05);
    expect(local?.target.localSkyAlpha[0]).toBeGreaterThan(0.9);
    expect(local?.target.orbitalRimAlpha[1]).toBeLessThanOrEqual(0.1);
  });
});
