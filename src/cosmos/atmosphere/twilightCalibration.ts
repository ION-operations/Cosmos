export type CosmosTwilightReviewBookmarkId = 'cloud-terminator' | 'twilight-limb' | 'low-twilight-horizon';

export interface CosmosTwilightCalibrationTarget {
  bookmarkId: CosmosTwilightReviewBookmarkId;
  role: 'orbital-terminator' | 'orbital-limb' | 'sea-level-horizon';
  sunElevationDegrees: number;
  target: {
    opticalDepth: [number, number];
    aerialPerspective: [number, number];
    orbitalRimAlpha: [number, number];
    localSkyAlpha: [number, number];
  };
  controls: {
    rayleighScale: number;
    mieScale: number;
    ozoneScale: number;
    multiScatteringStrength: number;
    aerialPerspectiveStrength: number;
    skyViewLutStrength: number;
  };
  reviewCues: string[];
}

export const COSMOS_TWILIGHT_CALIBRATION_TARGETS: CosmosTwilightCalibrationTarget[] = [
  {
    bookmarkId: 'cloud-terminator',
    role: 'orbital-terminator',
    sunElevationDegrees: 4,
    target: { opticalDepth: [0.18, 0.58], aerialPerspective: [0.00, 0.18], orbitalRimAlpha: [0.92, 1.00], localSkyAlpha: [0.00, 0.04] },
    controls: { rayleighScale: 1.10, mieScale: 0.52, ozoneScale: 0.94, multiScatteringStrength: 0.64, aerialPerspectiveStrength: 0.24, skyViewLutStrength: 0.86 },
    reviewCues: ['thin blue limb should not inflate into a thick neon halo', 'night-side falloff should be restrained and not milky', 'cloud silver edge should be bright only at glancing solar angles'],
  },
  {
    bookmarkId: 'twilight-limb',
    role: 'orbital-limb',
    sunElevationDegrees: -1.5,
    target: { opticalDepth: [0.28, 0.72], aerialPerspective: [0.00, 0.15], orbitalRimAlpha: [0.95, 1.00], localSkyAlpha: [0.00, 0.03] },
    controls: { rayleighScale: 1.12, mieScale: 0.46, ozoneScale: 1.08, multiScatteringStrength: 0.58, aerialPerspectiveStrength: 0.22, skyViewLutStrength: 0.95 },
    reviewCues: ['terminator should show compressed blue-to-indigo atmospheric band', 'ozone/twilight warmth must stay subtle rather than orange airbrush', 'macro clouds should remain visible without local micro-noise surviving into orbit'],
  },
  {
    bookmarkId: 'low-twilight-horizon',
    role: 'sea-level-horizon',
    sunElevationDegrees: 1.2,
    target: { opticalDepth: [0.30, 0.86], aerialPerspective: [0.28, 0.92], orbitalRimAlpha: [0.00, 0.10], localSkyAlpha: [0.94, 1.00] },
    controls: { rayleighScale: 1.03, mieScale: 0.74, ozoneScale: 0.78, multiScatteringStrength: 0.70, aerialPerspectiveStrength: 0.86, skyViewLutStrength: 0.82 },
    reviewCues: ['horizon haze should compress distance without hiding wave scale', 'sea-level sky should connect to water reflection colour', 'low sun should not make the ocean look like a flat copper plate'],
  },
];

export const getCosmosTwilightCalibrationTarget = (bookmarkId: string) =>
  COSMOS_TWILIGHT_CALIBRATION_TARGETS.find((target) => target.bookmarkId === bookmarkId);
