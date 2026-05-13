export const COSMOS_ATMOSPHERE_PHYSICS_RELEASE = 'R-0012' as const;
export const COSMOS_ATMOSPHERE_PHYSICS_MODEL = 'higher-fidelity-curved-path-lut-solver' as const;

export interface CosmosAtmospherePhysicalControls {
  strength: number;
  rayleighScale: number;
  mieScale: number;
  ozoneScale: number;
  multiScatteringStrength: number;
  aerialPerspectiveStrength: number;
  skyViewStrength: number;
  opticalDepthDebug: number;
}

export interface CosmosAtmosphereOpticalDepthIntegral {
  rayleighColumnMeters: number;
  mieColumnMeters: number;
  ozoneColumnMeters: number;
  pathMeters: number;
  normalizedRayleighDepth: number;
  normalizedMieDepth: number;
  normalizedOzoneDepth: number;
  groundHit: boolean;
  atmosphereHit: boolean;
}

export interface CosmosAtmospherePhysicalSample {
  transmittance: [number, number, number];
  inscatter: [number, number, number];
  opticalDepth: number;
  aerialPerspective: number;
  viewIntegral: CosmosAtmosphereOpticalDepthIntegral;
  sunIntegral: CosmosAtmosphereOpticalDepthIntegral;
  phase: {
    rayleigh: number;
    mie: number;
  };
}

export const COSMOS_ATMOSPHERE_PHYSICS_CONSTANTS = {
  earthRadiusMeters: 6_371_000,
  atmosphereTopMeters: 100_000,
  rayleighScaleHeightMeters: 8_500,
  mieScaleHeightMeters: 1_200,
  ozonePeakAltitudeMeters: 25_000,
  ozoneScaleWidthMeters: 15_000,
  wavelengthRayleighRgb: [5.802, 13.558, 33.1] as [number, number, number],
  ozoneAbsorptionRgb: [2.1, 1.18, 0.38] as [number, number, number],
  mieAnisotropy: 0.76,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const clamp01 = (value: number) => clamp(value, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(edge1 - edge0, 1e-6));
  return t * t * (3 - 2 * t);
};

const safeExp = (value: number) => Math.exp(clamp(value, -80, 40));

export function raySphere1D(radiusMeters: number, directionMu: number, sphereRadiusMeters: number): [number, number] | undefined {
  const mu = clamp(directionMu, -1, 1);
  const b = radiusMeters * mu;
  const c = radiusMeters * radiusMeters - sphereRadiusMeters * sphereRadiusMeters;
  const discriminant = b * b - c;
  if (discriminant < 0) return undefined;
  const root = Math.sqrt(discriminant);
  return [-b - root, -b + root];
}

export function rayleighPhase(cosTheta: number): number {
  const mu = clamp(cosTheta, -1, 1);
  return 0.05968310365946075 * (1 + mu * mu);
}

export function henyeyGreensteinPhase(cosTheta: number, anisotropy = COSMOS_ATMOSPHERE_PHYSICS_CONSTANTS.mieAnisotropy): number {
  const mu = clamp(cosTheta, -1, 1);
  const g = clamp(anisotropy, -0.95, 0.95);
  const g2 = g * g;
  return 0.1193662073189215 * (1 - g2) / Math.pow(Math.max(1 + g2 - 2 * g * mu, 1e-4), 1.5);
}

export function ozoneDensity01(altitudeMeters: number): number {
  const h = Math.max(0, altitudeMeters);
  const { ozonePeakAltitudeMeters, ozoneScaleWidthMeters } = COSMOS_ATMOSPHERE_PHYSICS_CONSTANTS;
  const gaussian = Math.exp(-Math.pow((h - ozonePeakAltitudeMeters) / ozoneScaleWidthMeters, 2));
  const lowerGate = smoothstep(9_000, 18_000, h);
  const upperGate = 1 - smoothstep(49_000, 76_000, h);
  return clamp01(gaussian * lowerGate * upperGate);
}

export function integrateCosmosAtmosphereOpticalDepth(input: {
  altitudeMeters: number;
  directionMu: number;
  maxDistanceMeters?: number;
  steps?: number;
}): CosmosAtmosphereOpticalDepthIntegral {
  const {
    earthRadiusMeters,
    atmosphereTopMeters,
    rayleighScaleHeightMeters,
    mieScaleHeightMeters,
  } = COSMOS_ATMOSPHERE_PHYSICS_CONSTANTS;
  const altitude = Math.max(0, input.altitudeMeters);
  const mu = clamp(input.directionMu, -1, 1);
  const steps = Math.max(4, Math.min(48, Math.floor(input.steps ?? 16)));
  const startRadius = earthRadiusMeters + altitude;
  const atmosphereRadius = earthRadiusMeters + atmosphereTopMeters;
  const atmosphereHit = raySphere1D(startRadius, mu, atmosphereRadius);
  if (!atmosphereHit) {
    return {
      rayleighColumnMeters: 0,
      mieColumnMeters: 0,
      ozoneColumnMeters: 0,
      pathMeters: 0,
      normalizedRayleighDepth: 0,
      normalizedMieDepth: 0,
      normalizedOzoneDepth: 0,
      groundHit: false,
      atmosphereHit: false,
    };
  }

  const tStart = Math.max(0, atmosphereHit[0]);
  let tEnd = atmosphereHit[1];
  let groundHit = false;
  const ground = raySphere1D(startRadius, mu, earthRadiusMeters);
  if (ground && ground[0] > 0 && ground[0] < tEnd) {
    tEnd = ground[0];
    groundHit = true;
  }
  if (input.maxDistanceMeters !== undefined) tEnd = Math.min(tEnd, Math.max(0, input.maxDistanceMeters));
  if (tEnd <= tStart) {
    return {
      rayleighColumnMeters: 0,
      mieColumnMeters: 0,
      ozoneColumnMeters: 0,
      pathMeters: 0,
      normalizedRayleighDepth: 0,
      normalizedMieDepth: 0,
      normalizedOzoneDepth: 0,
      groundHit,
      atmosphereHit: true,
    };
  }

  const dt = (tEnd - tStart) / steps;
  let rayleighColumnMeters = 0;
  let mieColumnMeters = 0;
  let ozoneColumnMeters = 0;

  for (let i = 0; i < steps; i++) {
    const t = tStart + (i + 0.5) * dt;
    const sampleRadius = Math.sqrt(Math.max(0, startRadius * startRadius + t * t + 2 * startRadius * mu * t));
    const sampleAltitude = Math.max(0, sampleRadius - earthRadiusMeters);
    rayleighColumnMeters += safeExp(-sampleAltitude / rayleighScaleHeightMeters) * dt;
    mieColumnMeters += safeExp(-sampleAltitude / mieScaleHeightMeters) * dt;
    ozoneColumnMeters += ozoneDensity01(sampleAltitude) * dt;
  }

  return {
    rayleighColumnMeters,
    mieColumnMeters,
    ozoneColumnMeters,
    pathMeters: tEnd - tStart,
    normalizedRayleighDepth: rayleighColumnMeters / rayleighScaleHeightMeters,
    normalizedMieDepth: mieColumnMeters / mieScaleHeightMeters,
    normalizedOzoneDepth: ozoneColumnMeters / 18_000,
    groundHit,
    atmosphereHit: true,
  };
}

export function sampleCosmosAtmospherePhysicalModel(input: {
  altitudeMeters: number;
  sunMu: number;
  viewMu?: number;
  distanceMeters?: number;
  controls: CosmosAtmospherePhysicalControls;
}): CosmosAtmospherePhysicalSample {
  const controls = input.controls;
  const altitude = Math.max(0, input.altitudeMeters);
  const sunMu = clamp(input.sunMu, -1, 1);
  const viewMu = clamp(input.viewMu ?? sunMu, -1, 1);
  const distanceMeters = Math.max(0, input.distanceMeters ?? 120_000);

  const viewIntegral = integrateCosmosAtmosphereOpticalDepth({
    altitudeMeters: altitude,
    directionMu: viewMu,
    maxDistanceMeters: distanceMeters,
    steps: 16,
  });
  const sunIntegral = integrateCosmosAtmosphereOpticalDepth({
    altitudeMeters: altitude,
    directionMu: sunMu,
    steps: 12,
  });

  const rayleighDepth = (viewIntegral.normalizedRayleighDepth * 0.68 + sunIntegral.normalizedRayleighDepth * 0.32) * controls.rayleighScale;
  const mieDepth = (viewIntegral.normalizedMieDepth * 0.72 + sunIntegral.normalizedMieDepth * 0.28) * controls.mieScale;
  const ozoneDepth = (viewIntegral.normalizedOzoneDepth * 0.42 + sunIntegral.normalizedOzoneDepth * 0.58) * controls.ozoneScale;

  const opticalRaw = rayleighDepth * 0.020 + mieDepth * 0.028 + ozoneDepth * 0.016;
  const opticalDepth = clamp01((1 - Math.exp(-opticalRaw)) * controls.strength * 1.35);
  const { wavelengthRayleighRgb, ozoneAbsorptionRgb } = COSMOS_ATMOSPHERE_PHYSICS_CONSTANTS;
  const transmittance: [number, number, number] = [
    safeExp(-(wavelengthRayleighRgb[0] * rayleighDepth * 0.018 + 1.35 * mieDepth * 0.030 + ozoneAbsorptionRgb[0] * ozoneDepth * 0.018) * controls.strength),
    safeExp(-(wavelengthRayleighRgb[1] * rayleighDepth * 0.018 + 1.35 * mieDepth * 0.030 + ozoneAbsorptionRgb[1] * ozoneDepth * 0.018) * controls.strength),
    safeExp(-(wavelengthRayleighRgb[2] * rayleighDepth * 0.018 + 1.35 * mieDepth * 0.030 + ozoneAbsorptionRgb[2] * ozoneDepth * 0.018) * controls.strength),
  ].map(clamp01) as [number, number, number];

  const nightPenalty = smoothstep(-0.24, 0.05, sunMu);
  const horizonWeight = 1 - smoothstep(0.04, 0.58, Math.abs(viewMu));
  const rayleighBlue = smoothstep(-0.08, 0.75, sunMu) * clamp01(rayleighDepth * 0.18);
  const mieGold = smoothstep(-0.34, 0.16, sunMu) * (1 - smoothstep(0.20, 0.74, sunMu));
  const multiple = controls.multiScatteringStrength * (0.18 + 0.82 * (1 - transmittance[2]));
  const phaseRayleigh = rayleighPhase(sunMu);
  const phaseMie = henyeyGreensteinPhase(sunMu);
  const phaseBoost = clamp01((phaseRayleigh * 3.2 + phaseMie * 0.18) * 0.9 + 0.12);

  const inscatter: [number, number, number] = [
    (0.13 * rayleighBlue + 0.82 * mieGold * horizonWeight + multiple * 0.32) * nightPenalty * phaseBoost,
    (0.29 * rayleighBlue + 0.46 * mieGold * horizonWeight + multiple * 0.50) * nightPenalty * phaseBoost,
    (0.78 * rayleighBlue + 0.14 * mieGold * horizonWeight + multiple * 0.92) * nightPenalty * phaseBoost,
  ].map(clamp01) as [number, number, number];

  const densityForAerialPerspective = safeExp(-altitude / COSMOS_ATMOSPHERE_PHYSICS_CONSTANTS.rayleighScaleHeightMeters);
  const aerialPerspective = clamp01((1 - Math.exp(-distanceMeters * distanceMeters * 2.7e-10 * densityForAerialPerspective)) * controls.aerialPerspectiveStrength);

  return {
    transmittance,
    inscatter,
    opticalDepth,
    aerialPerspective,
    viewIntegral,
    sunIntegral,
    phase: {
      rayleigh: phaseRayleigh,
      mie: phaseMie,
    },
  };
}
