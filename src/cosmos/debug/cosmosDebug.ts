import type { CosmosScaleState } from '@/cosmos/scale/cosmosScale';

export interface CosmosDebugOverlayModeDefinition {
  id: number;
  key: string;
  label: string;
  shortLabel: string;
  diagnosticTarget: string;
  colorMeaning: string;
}

export const COSMOS_DEBUG_OVERLAY_MODES = [
  {
    id: 0,
    key: 'off',
    label: 'Off',
    shortLabel: 'Off',
    diagnosticTarget: 'normal beauty render',
    colorMeaning: 'no diagnostic overlay',
  },
  {
    id: 1,
    key: 'scale-ownership',
    label: 'Scale ownership',
    shortLabel: 'Scale',
    diagnosticTarget: 'ocean/cloud/planet pass ownership handoff',
    colorMeaning: 'red=ocean pass, green=cloud pass, blue=planet/orbital pass',
  },
  {
    id: 2,
    key: 'atmosphere-ownership',
    label: 'Atmosphere ownership',
    shortLabel: 'Atmo',
    diagnosticTarget: 'local sky, horizon haze, and orbital rim handoff',
    colorMeaning: 'red=local sky, green=horizon fog, blue=orbital rim',
  },
  {
    id: 3,
    key: 'cloud-lod',
    label: 'Cloud LOD',
    shortLabel: 'Cloud LOD',
    diagnosticTarget: 'micro/meso/macro cloud detail ownership by altitude',
    colorMeaning: 'red=micro detail, green=meso form, blue=macro weather structure',
  },
  {
    id: 4,
    key: 'physical-shells',
    label: 'Physical shells',
    shortLabel: 'Shells',
    diagnosticTarget: 'Earth, cloud-base, cloud-top, and atmosphere radii alignment',
    colorMeaning: 'green=Earth shell, cyan=cloud base, magenta=cloud top, amber=atmosphere shell',
  },
  {
    id: 5,
    key: 'composite-diagnostic',
    label: 'Composite diagnostic',
    shortLabel: 'Composite',
    diagnosticTarget: 'combined ownership tint plus shell lines',
    colorMeaning: 'ownership tint plus physical shell line colors',
  },
  {
    id: 6,
    key: 'optical-depth-lut',
    label: 'Optical depth LUT',
    shortLabel: 'Optical',
    diagnosticTarget: 'R-0009 transmittance, optical depth, and aerial-perspective LUT ownership',
    colorMeaning: 'red=optical depth, green=aerial perspective, blue=multi-scattering/rim energy',
  },
] as const satisfies readonly CosmosDebugOverlayModeDefinition[];

export type CosmosDebugOverlayModeId = typeof COSMOS_DEBUG_OVERLAY_MODES[number]['id'];

export interface CosmosDebugShellContract {
  earthRadiusMeters: number;
  cloudBaseRadiusMeters: number;
  cloudTopRadiusMeters: number;
  atmosphereRadiusMeters: number;
}

export interface CosmosDebugOverlayState {
  mode: number;
  modeKey: string;
  modeLabel: string;
  overlayStrength: number;
  shellsEnabled: boolean;
  shellOpacity: number;
  scaleState?: CosmosScaleState;
  shellContract: CosmosDebugShellContract;
}

export const COSMOS_DEBUG_DEFAULT_SHELL_CONTRACT: CosmosDebugShellContract = {
  earthRadiusMeters: 6_371_000,
  cloudBaseRadiusMeters: 6_373_000,
  cloudTopRadiusMeters: 6_375_500,
  atmosphereRadiusMeters: 6_471_000,
};

export function describeCosmosDebugMode(mode: number): CosmosDebugOverlayModeDefinition {
  return COSMOS_DEBUG_OVERLAY_MODES.find((item) => item.id === mode) ?? COSMOS_DEBUG_OVERLAY_MODES[0];
}

export function createCosmosDebugOverlayState(input: {
  mode: number;
  overlayStrength: number;
  shellsEnabled: boolean;
  shellOpacity: number;
  scaleState?: CosmosScaleState;
  shellContract?: Partial<CosmosDebugShellContract>;
}): CosmosDebugOverlayState {
  const mode = describeCosmosDebugMode(input.mode);
  return {
    mode: mode.id,
    modeKey: mode.key,
    modeLabel: mode.label,
    overlayStrength: clamp01(input.overlayStrength),
    shellsEnabled: input.shellsEnabled,
    shellOpacity: clamp01(input.shellOpacity),
    scaleState: input.scaleState,
    shellContract: {
      ...COSMOS_DEBUG_DEFAULT_SHELL_CONTRACT,
      ...input.shellContract,
    },
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
