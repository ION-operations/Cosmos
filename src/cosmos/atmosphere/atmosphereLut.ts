import * as THREE from 'three';
import {
  COSMOS_ATMOSPHERE_PHYSICS_MODEL,
  sampleCosmosAtmospherePhysicalModel,
  type CosmosAtmospherePhysicalSample,
} from '@/cosmos/atmosphere/atmospherePhysics';

export type CosmosAtmosphereLutKey =
  | 'transmittance'
  | 'multiScattering'
  | 'skyView'
  | 'aerialPerspective';

export interface CosmosAtmosphereLutDimensions {
  width: number;
  height: number;
  channels: 4;
  encoding: string;
}

export interface CosmosAtmosphereLutSpec {
  transmittance: CosmosAtmosphereLutDimensions;
  multiScattering: CosmosAtmosphereLutDimensions;
  skyView: CosmosAtmosphereLutDimensions;
  aerialPerspective: CosmosAtmosphereLutDimensions;
}

export interface CosmosAtmosphereLutControls {
  strength: number;
  rayleighScale: number;
  mieScale: number;
  ozoneScale: number;
  multiScatteringStrength: number;
  aerialPerspectiveStrength: number;
  skyViewStrength: number;
  opticalDepthDebug: number;
}

export interface CosmosAtmosphereLutState {
  state: 'generated';
  provider: 'cosmos-cpu-lut-fallback';
  model: 'R0012-higher-fidelity-curved-path-lut';
  controls: CosmosAtmosphereLutControls;
  spec: CosmosAtmosphereLutSpec;
  message: string;
}

export interface CosmosAtmosphereLutTextures {
  transmittance: THREE.DataTexture;
  multiScattering: THREE.DataTexture;
  skyView: THREE.DataTexture;
  aerialPerspective: THREE.DataTexture;
  state: CosmosAtmosphereLutState;
}

export interface AtmosphereOpticalSample {
  transmittance: [number, number, number];
  inscatter: [number, number, number];
  opticalDepth: number;
  aerialPerspective: number;
}

export const COSMOS_ATMOSPHERE_LUT_SPEC: CosmosAtmosphereLutSpec = {
  transmittance: {
    width: 320,
    height: 80,
    channels: 4,
    encoding: 'RGBA8 RGB=solar transmittance from curved optical-depth integral, A=compressed optical depth',
  },
  multiScattering: {
    width: 96,
    height: 48,
    channels: 4,
    encoding: 'RGBA8 RGB=phase-weighted multiple-scattering proxy, A=energy',
  },
  skyView: {
    width: 240,
    height: 135,
    channels: 4,
    encoding: 'RGBA8 RGB=sky-view radiance proxy using curved path samples, A=horizon/terminator weight',
  },
  aerialPerspective: {
    width: 128,
    height: 72,
    channels: 4,
    encoding: 'RGBA8 RGB=aerial-perspective tint from path sample, A=fog density',
  },
};

export const DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS: CosmosAtmosphereLutControls = {
  strength: 0.90,
  rayleighScale: 1.04,
  mieScale: 0.58,
  ozoneScale: 0.94,
  multiScatteringStrength: 0.68,
  aerialPerspectiveStrength: 0.62,
  skyViewStrength: 0.90,
  opticalDepthDebug: 0.10,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(edge1 - edge0, 1e-6));
  return t * t * (3 - 2 * t);
};

const toByte = (value: number) => Math.round(clamp01(value) * 255);

function normaliseControls(input?: Partial<CosmosAtmosphereLutControls>): CosmosAtmosphereLutControls {
  return {
    ...DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS,
    ...input,
    strength: clamp01(input?.strength ?? DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS.strength),
    rayleighScale: Math.max(0, input?.rayleighScale ?? DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS.rayleighScale),
    mieScale: Math.max(0, input?.mieScale ?? DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS.mieScale),
    ozoneScale: Math.max(0, input?.ozoneScale ?? DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS.ozoneScale),
    multiScatteringStrength: clamp01(input?.multiScatteringStrength ?? DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS.multiScatteringStrength),
    aerialPerspectiveStrength: clamp01(input?.aerialPerspectiveStrength ?? DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS.aerialPerspectiveStrength),
    skyViewStrength: clamp01(input?.skyViewStrength ?? DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS.skyViewStrength),
    opticalDepthDebug: clamp01(input?.opticalDepthDebug ?? DEFAULT_COSMOS_ATMOSPHERE_LUT_CONTROLS.opticalDepthDebug),
  };
}

export function sampleAtmosphereOpticalModel(input: {
  altitudeMeters: number;
  sunMu: number;
  viewMu?: number;
  distanceMeters?: number;
  controls?: Partial<CosmosAtmosphereLutControls>;
}): AtmosphereOpticalSample {
  const controls = normaliseControls(input.controls);
  const sample: CosmosAtmospherePhysicalSample = sampleCosmosAtmospherePhysicalModel({
    altitudeMeters: input.altitudeMeters,
    sunMu: input.sunMu,
    viewMu: input.viewMu,
    distanceMeters: input.distanceMeters,
    controls,
  });

  return {
    transmittance: sample.transmittance,
    inscatter: sample.inscatter,
    opticalDepth: sample.opticalDepth,
    aerialPerspective: sample.aerialPerspective,
  };
}

function createTexture(data: Uint8Array, dimensions: CosmosAtmosphereLutDimensions): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, dimensions.width, dimensions.height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

function buildTransmittanceBytes(controls: CosmosAtmosphereLutControls): Uint8Array {
  const { width, height } = COSMOS_ATMOSPHERE_LUT_SPEC.transmittance;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const altitude = Math.pow(y / Math.max(height - 1, 1), 1.65) * 100_000;
    for (let x = 0; x < width; x++) {
      const sunMu = lerp(-0.35, 1.0, x / Math.max(width - 1, 1));
      const sample = sampleAtmosphereOpticalModel({ altitudeMeters: altitude, sunMu, viewMu: sunMu, distanceMeters: 140_000, controls });
      const i = (y * width + x) * 4;
      data[i] = toByte(sample.transmittance[0]);
      data[i + 1] = toByte(sample.transmittance[1]);
      data[i + 2] = toByte(sample.transmittance[2]);
      data[i + 3] = toByte(sample.opticalDepth);
    }
  }
  return data;
}

function buildMultiScatteringBytes(controls: CosmosAtmosphereLutControls): Uint8Array {
  const { width, height } = COSMOS_ATMOSPHERE_LUT_SPEC.multiScattering;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const altitude = Math.pow(y / Math.max(height - 1, 1), 1.35) * 100_000;
    for (let x = 0; x < width; x++) {
      const sunMu = lerp(-0.42, 1.0, x / Math.max(width - 1, 1));
      const sample = sampleAtmosphereOpticalModel({ altitudeMeters: altitude, sunMu, viewMu: 0.18, distanceMeters: 220_000, controls });
      const energy = clamp01((1 - (sample.transmittance[0] + sample.transmittance[1] + sample.transmittance[2]) / 3) * controls.multiScatteringStrength * 1.8);
      const i = (y * width + x) * 4;
      data[i] = toByte(sample.inscatter[0] + energy * 0.20);
      data[i + 1] = toByte(sample.inscatter[1] + energy * 0.32);
      data[i + 2] = toByte(sample.inscatter[2] + energy * 0.52);
      data[i + 3] = toByte(energy);
    }
  }
  return data;
}

function buildSkyViewBytes(controls: CosmosAtmosphereLutControls): Uint8Array {
  const { width, height } = COSMOS_ATMOSPHERE_LUT_SPEC.skyView;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sunMu = lerp(-0.45, 1.0, y / Math.max(height - 1, 1));
    for (let x = 0; x < width; x++) {
      const viewMu = lerp(-0.08, 1.0, x / Math.max(width - 1, 1));
      const horizon = 1 - smoothstep(0.02, 0.42, Math.abs(viewMu));
      const sample = sampleAtmosphereOpticalModel({ altitudeMeters: 30, sunMu, viewMu, distanceMeters: lerp(60_000, 460_000, horizon), controls });
      const i = (y * width + x) * 4;
      data[i] = toByte(sample.inscatter[0] * controls.skyViewStrength + horizon * 0.11);
      data[i + 1] = toByte(sample.inscatter[1] * controls.skyViewStrength + horizon * 0.07);
      data[i + 2] = toByte(sample.inscatter[2] * controls.skyViewStrength + horizon * 0.04);
      data[i + 3] = toByte(horizon * smoothstep(-0.35, 0.12, sunMu));
    }
  }
  return data;
}

function buildAerialPerspectiveBytes(controls: CosmosAtmosphereLutControls): Uint8Array {
  const { width, height } = COSMOS_ATMOSPHERE_LUT_SPEC.aerialPerspective;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const altitude = Math.pow(y / Math.max(height - 1, 1), 1.8) * 100_000;
    for (let x = 0; x < width; x++) {
      const distance = Math.pow(x / Math.max(width - 1, 1), 1.45) * 1_000_000;
      const sample = sampleAtmosphereOpticalModel({ altitudeMeters: altitude, sunMu: 0.38, viewMu: 0.08, distanceMeters: distance, controls });
      const density = sample.aerialPerspective;
      const i = (y * width + x) * 4;
      data[i] = toByte(0.34 * density + sample.inscatter[0] * 0.38);
      data[i + 1] = toByte(0.52 * density + sample.inscatter[1] * 0.38);
      data[i + 2] = toByte(0.88 * density + sample.inscatter[2] * 0.38);
      data[i + 3] = toByte(density);
    }
  }
  return data;
}

export function createCosmosAtmosphereLutTextures(
  controlsInput?: Partial<CosmosAtmosphereLutControls>,
): CosmosAtmosphereLutTextures {
  const controls = normaliseControls(controlsInput);
  return {
    transmittance: createTexture(buildTransmittanceBytes(controls), COSMOS_ATMOSPHERE_LUT_SPEC.transmittance),
    multiScattering: createTexture(buildMultiScatteringBytes(controls), COSMOS_ATMOSPHERE_LUT_SPEC.multiScattering),
    skyView: createTexture(buildSkyViewBytes(controls), COSMOS_ATMOSPHERE_LUT_SPEC.skyView),
    aerialPerspective: createTexture(buildAerialPerspectiveBytes(controls), COSMOS_ATMOSPHERE_LUT_SPEC.aerialPerspective),
    state: createCosmosAtmosphereLutState(controls),
  };
}

export function createCosmosAtmosphereLutState(
  controlsInput?: Partial<CosmosAtmosphereLutControls>,
): CosmosAtmosphereLutState {
  const controls = normaliseControls(controlsInput);
  return {
    state: 'generated',
    provider: 'cosmos-cpu-lut-fallback',
    model: 'R0012-higher-fidelity-curved-path-lut',
    controls,
    spec: COSMOS_ATMOSPHERE_LUT_SPEC,
    message: `Generated deterministic CPU atmosphere lookup textures with ${COSMOS_ATMOSPHERE_PHYSICS_MODEL} and debug-exportable LUT contract.`,
  };
}

export function disposeCosmosAtmosphereLutTextures(textures: CosmosAtmosphereLutTextures): void {
  textures.transmittance.dispose();
  textures.multiScattering.dispose();
  textures.skyView.dispose();
  textures.aerialPerspective.dispose();
}
