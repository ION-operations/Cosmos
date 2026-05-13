import { clamp01, smoothstep } from '@/cosmos/scale/cosmosScale';

export interface CosmosAtmosphereContinuityState {
  altitudeMeters: number;
  localSkyAlpha: number;
  orbitalRimAlpha: number;
  horizonFogAlpha: number;
  aerialPerspectiveAlpha: number;
  cloudMicroAlpha: number;
  cloudMesoAlpha: number;
  cloudMacroAlpha: number;
  opticalDepthScale: number;
  terminatorSoftness: number;
}

export const createCosmosAtmosphereContinuityState = (
  altitudeMeters: number,
  strength = 1,
): CosmosAtmosphereContinuityState => {
  const safeAlt = Math.max(altitudeMeters, -100);
  const s = clamp01(strength);
  const localSkyAlpha = (1 - smoothstep(650_000, 2_000_000, safeAlt)) * s;
  const orbitalRimAlpha = smoothstep(36_000, 220_000, safeAlt) * s;
  const horizonFogAlpha = (1 - smoothstep(120_000, 1_350_000, safeAlt)) * s;
  const aerialPerspectiveAlpha = (1 - smoothstep(35_000, 850_000, safeAlt)) * s;
  const cloudMicroAlpha = 1 - smoothstep(4_000, 36_000, safeAlt);
  const cloudMesoAlpha = 1 - smoothstep(22_000, 135_000, safeAlt);
  const cloudMacroAlpha = 0.35 + smoothstep(900, 55_000, safeAlt) * 0.65;
  const opticalDepthScale = 0.62 + horizonFogAlpha * 0.58 + orbitalRimAlpha * 0.18;
  const terminatorSoftness = 0.16 + smoothstep(8_000, 180_000, safeAlt) * 0.34;

  return {
    altitudeMeters: safeAlt,
    localSkyAlpha,
    orbitalRimAlpha,
    horizonFogAlpha,
    aerialPerspectiveAlpha,
    cloudMicroAlpha,
    cloudMesoAlpha,
    cloudMacroAlpha,
    opticalDepthScale,
    terminatorSoftness,
  };
};
