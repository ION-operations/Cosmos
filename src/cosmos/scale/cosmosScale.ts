export const COSMOS_EARTH_RADIUS_M = 6_371_000;
export const COSMOS_ATMOSPHERE_RADIUS_M = 6_471_000;
export const COSMOS_RAYLEIGH_SCALE_HEIGHT_M = 8_500;
export const COSMOS_MIE_SCALE_HEIGHT_M = 1_200;

export type CosmosScaleLodId = 'surface' | 'low-altitude' | 'high-altitude' | 'near-space' | 'orbital';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface CosmosScaleState {
  altitudeMeters: number;
  lod: CosmosScaleLodId;
  lod01: number;
  oceanAlpha: number;
  cloudAlpha: number;
  planetAlpha: number;
  localAtmosphereAlpha: number;
  earthRadiusMeters: number;
  atmosphereRadiusMeters: number;
  cloudBaseMeters: number;
  cloudTopMeters: number;
  cloudMicroAlpha: number;
  cloudMesoAlpha: number;
  cloudMacroAlpha: number;
  horizonFogAlpha: number;
  orbitalRimAlpha: number;
}

export const COSMOS_PLANET_CENTER = {
  x: 0,
  y: -COSMOS_EARTH_RADIUS_M,
  z: 0,
} as const;

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const cameraAltitudeMeters = (
  position: Vec3Like,
  center: Vec3Like = COSMOS_PLANET_CENTER,
  radiusMeters = COSMOS_EARTH_RADIUS_M,
) => {
  const dx = position.x - center.x;
  const dy = position.y - center.y;
  const dz = position.z - center.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - radiusMeters;
};

export const classifyScaleLod = (altitudeMeters: number): CosmosScaleLodId => {
  if (altitudeMeters < 1_000) return 'surface';
  if (altitudeMeters < 12_000) return 'low-altitude';
  if (altitudeMeters < 60_000) return 'high-altitude';
  if (altitudeMeters < 800_000) return 'near-space';
  return 'orbital';
};

export const createCosmosScaleState = (altitudeMeters: number): CosmosScaleState => {
  const safeAlt = Math.max(altitudeMeters, -100);
  const lod01 = smoothstep(4_000, 900_000, safeAlt);
  const oceanAlpha = 1 - smoothstep(35_000, 80_000, safeAlt);
  const cloudAlpha = 1 - smoothstep(38_000, 95_000, safeAlt);
  const planetAlpha = smoothstep(42_000, 95_000, safeAlt);
  const localAtmosphereAlpha = 1 - smoothstep(650_000, 2_000_000, safeAlt);
  const upperCloudStretch = smoothstep(8_000, 45_000, safeAlt);
  const cloudMicroAlpha = 1 - smoothstep(4_000, 36_000, safeAlt);
  const cloudMesoAlpha = 1 - smoothstep(22_000, 135_000, safeAlt);
  const cloudMacroAlpha = 0.35 + smoothstep(900, 55_000, safeAlt) * 0.65;
  const horizonFogAlpha = 1 - smoothstep(120_000, 1_350_000, safeAlt);
  const orbitalRimAlpha = smoothstep(36_000, 220_000, safeAlt);

  return {
    altitudeMeters: safeAlt,
    lod: classifyScaleLod(safeAlt),
    lod01,
    oceanAlpha,
    cloudAlpha,
    planetAlpha,
    localAtmosphereAlpha,
    earthRadiusMeters: COSMOS_EARTH_RADIUS_M,
    atmosphereRadiusMeters: COSMOS_ATMOSPHERE_RADIUS_M,
    cloudBaseMeters: 1_000,
    cloudTopMeters: 7_200 + upperCloudStretch * 8_800,
    cloudMicroAlpha,
    cloudMesoAlpha,
    cloudMacroAlpha,
    horizonFogAlpha,
    orbitalRimAlpha,
  };
};
