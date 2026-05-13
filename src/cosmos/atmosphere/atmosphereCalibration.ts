import {
  DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS,
  sampleAtmosphereOpticalModel,
  type AtmosphereOpticalSample,
  type CosmosAtmosphereLutControls,
} from '@/cosmos/atmosphere/atmosphereLut';
import {
  COSMOS_TWILIGHT_CALIBRATION_TARGETS,
  getCosmosTwilightCalibrationTarget,
  type CosmosTwilightReviewBookmarkId,
} from '@/cosmos/atmosphere/twilightCalibration';
import { createCosmosAtmosphereContinuityState } from '@/cosmos/atmosphere/atmosphereContinuity';

export interface CosmosAtmosphereCalibrationDefaults extends CosmosAtmosphereLutControls {
  horizonHazeStrength: number;
  atmosphereContinuityStrength: number;
  cloudLodBias: number;
}

export interface CosmosTwilightOpticalSamplePlan {
  bookmarkId: CosmosTwilightReviewBookmarkId;
  opticalSampleAltitudeMeters: number;
  cameraAltitudeMeters: number;
  viewMu: number;
  distanceMeters: number;
  role: 'limb-shell-path' | 'low-horizon-path';
  note: string;
}

export interface CosmosTwilightCalibrationEvaluation {
  bookmarkId: CosmosTwilightReviewBookmarkId;
  role: string;
  sunElevationDegrees: number;
  sunMu: number;
  plan: CosmosTwilightOpticalSamplePlan;
  controls: CosmosAtmosphereLutControls;
  sample: AtmosphereOpticalSample;
  continuity: {
    localSkyAlpha: number;
    orbitalRimAlpha: number;
    horizonFogAlpha: number;
    aerialPerspectiveAlpha: number;
  };
  target: {
    opticalDepth: [number, number];
    aerialPerspective: [number, number];
    orbitalRimAlpha: [number, number];
    localSkyAlpha: [number, number];
  };
  pass: boolean;
  failures: string[];
}

export interface CosmosAtmosphereCalibrationState {
  release: 'R-0012';
  model: 'curved-path-lut-twilight-terminator-calibration';
  activeBookmarkId?: string;
  defaults: CosmosAtmosphereCalibrationDefaults;
  runtimeGate: {
    requiredCommand: string;
    expectedState: 'zero-shader-program-page-errors';
  };
  evaluations: CosmosTwilightCalibrationEvaluation[];
  pass: boolean;
  message: string;
}

export const COSMOS_R0012_ATMOSPHERE_DEFAULTS: CosmosAtmosphereCalibrationDefaults = {
  ...DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS,
  strength: 0.90,
  rayleighScale: 1.04,
  mieScale: 0.58,
  ozoneScale: 0.94,
  multiScatteringStrength: 0.68,
  aerialPerspectiveStrength: 0.62,
  skyViewStrength: 0.90,
  opticalDepthDebug: 0.10,
  horizonHazeStrength: 0.70,
  atmosphereContinuityStrength: 0.96,
  cloudLodBias: 0.36,
};

export const COSMOS_R0011_ATMOSPHERE_DEFAULTS = COSMOS_R0012_ATMOSPHERE_DEFAULTS;

export const COSMOS_TWILIGHT_SAMPLE_PLANS: CosmosTwilightOpticalSamplePlan[] = [
  {
    bookmarkId: 'cloud-terminator',
    opticalSampleAltitudeMeters: 18_000,
    cameraAltitudeMeters: 23_582_892,
    viewMu: 0.02,
    distanceMeters: 180_000,
    role: 'limb-shell-path',
    note: 'Orbital terminator samples a representative low-stratosphere limb path, not the camera altitude.',
  },
  {
    bookmarkId: 'twilight-limb',
    opticalSampleAltitudeMeters: 25_000,
    cameraAltitudeMeters: 25_363_291,
    viewMu: 0.01,
    distanceMeters: 180_000,
    role: 'limb-shell-path',
    note: 'Twilight limb samples the ozone-band shell altitude to keep blue/indigo compression measurable.',
  },
  {
    bookmarkId: 'low-twilight-horizon',
    opticalSampleAltitudeMeters: 25,
    cameraAltitudeMeters: 7.5,
    viewMu: 0.035,
    distanceMeters: 650_000,
    role: 'low-horizon-path',
    note: 'Sea-level twilight samples a long near-horizon path to validate haze without invoking orbital rim ownership.',
  },
];

const inRange = (value: number, range: [number, number]) => value >= range[0] && value <= range[1];

const mergeControls = (
  bookmarkId: CosmosTwilightReviewBookmarkId,
  controls?: Partial<CosmosAtmosphereLutControls>,
): CosmosAtmosphereLutControls => {
  const target = getCosmosTwilightCalibrationTarget(bookmarkId);
  const targetControls = target?.controls
    ? {
        rayleighScale: target.controls.rayleighScale,
        mieScale: target.controls.mieScale,
        ozoneScale: target.controls.ozoneScale,
        multiScatteringStrength: target.controls.multiScatteringStrength,
        aerialPerspectiveStrength: target.controls.aerialPerspectiveStrength,
        skyViewStrength: target.controls.skyViewLutStrength,
      }
    : {};
  return {
    ...COSMOS_R0012_ATMOSPHERE_DEFAULTS,
    ...targetControls,
    ...controls,
  };
};

export function getCosmosTwilightSamplePlan(bookmarkId: CosmosTwilightReviewBookmarkId): CosmosTwilightOpticalSamplePlan {
  const plan = COSMOS_TWILIGHT_SAMPLE_PLANS.find((item) => item.bookmarkId === bookmarkId);
  if (!plan) throw new Error(`Missing Cosmos twilight sample plan for ${bookmarkId}`);
  return plan;
}

export function evaluateCosmosTwilightCalibrationTarget(
  bookmarkId: CosmosTwilightReviewBookmarkId,
  controls?: Partial<CosmosAtmosphereLutControls>,
): CosmosTwilightCalibrationEvaluation {
  const target = getCosmosTwilightCalibrationTarget(bookmarkId);
  if (!target) throw new Error(`Missing Cosmos twilight target ${bookmarkId}`);
  const plan = getCosmosTwilightSamplePlan(bookmarkId);
  const mergedControls = mergeControls(bookmarkId, controls);
  const sunMu = Math.sin((target.sunElevationDegrees * Math.PI) / 180);
  const sample = sampleAtmosphereOpticalModel({
    altitudeMeters: plan.opticalSampleAltitudeMeters,
    sunMu,
    viewMu: plan.viewMu,
    distanceMeters: plan.distanceMeters,
    controls: mergedControls,
  });
  const continuityState = createCosmosAtmosphereContinuityState(plan.cameraAltitudeMeters, COSMOS_R0012_ATMOSPHERE_DEFAULTS.atmosphereContinuityStrength);
  const continuity = {
    localSkyAlpha: continuityState.localSkyAlpha,
    orbitalRimAlpha: continuityState.orbitalRimAlpha,
    horizonFogAlpha: continuityState.horizonFogAlpha,
    aerialPerspectiveAlpha: continuityState.aerialPerspectiveAlpha,
  };
  const checks = [
    ['opticalDepth', sample.opticalDepth, target.target.opticalDepth] as const,
    ['aerialPerspective', sample.aerialPerspective, target.target.aerialPerspective] as const,
    ['orbitalRimAlpha', continuity.orbitalRimAlpha, target.target.orbitalRimAlpha] as const,
    ['localSkyAlpha', continuity.localSkyAlpha, target.target.localSkyAlpha] as const,
  ];
  const failures = checks
    .filter(([, value, range]) => !inRange(value, range))
    .map(([key, value, range]) => `${key}=${value.toFixed(3)} outside ${range[0]}–${range[1]}`);

  return {
    bookmarkId,
    role: target.role,
    sunElevationDegrees: target.sunElevationDegrees,
    sunMu,
    plan,
    controls: mergedControls,
    sample,
    continuity,
    target: target.target,
    pass: failures.length === 0,
    failures,
  };
}

export function createCosmosAtmosphereCalibrationState(
  activeBookmarkId?: string,
  controls?: Partial<CosmosAtmosphereLutControls>,
): CosmosAtmosphereCalibrationState {
  const evaluations = COSMOS_TWILIGHT_CALIBRATION_TARGETS.map((target) =>
    evaluateCosmosTwilightCalibrationTarget(target.bookmarkId, activeBookmarkId === target.bookmarkId ? controls : undefined),
  );
  const pass = evaluations.every((evaluation) => evaluation.pass);
  return {
    release: 'R-0012',
    model: 'curved-path-lut-twilight-terminator-calibration',
    activeBookmarkId,
    defaults: COSMOS_R0012_ATMOSPHERE_DEFAULTS,
    runtimeGate: {
      requiredCommand: 'COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics',
      expectedState: 'zero-shader-program-page-errors',
    },
    evaluations,
    pass,
    message: pass
      ? 'R-0012 curved-path LUT twilight calibration ranges pass. Run the runtime shader diagnostics gate locally before final visual tuning.'
      : 'R-0012 curved-path LUT twilight calibration range mismatch detected.',
  };
}
