// ═══════════════════════════════════════════
// GENESIS ENGINE — World Simulation Core
// Procedural Hyper-Realistic Earth Renderer
// All asset techniques integrated:
//   - ATMOSPHERE_OCEAN: core renderer
//   - greatoceanwaves: multi-octave wave displacement
//   - realisticoceancloseupclearwater: SSS, caustics, micro-normals
//   - goodterrainflyover: ray-marched terrain, trees, shadows
//   - moutainterrainforestsandwater: biome coloring, snow, forests
//   - auroras: full aurora borealis curtains
//   - farclouds: planet from space, city lights, atmosphere glow
//   - greatcloudsflying: FBM volumetric cloud layer
//   - dolphinjump: splash wake patterns, foam interaction
//   - riverflow: (reserved for Phase 3)
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { createCosmosWeatherAtlas, type CosmosWeatherAtlas } from '@/cosmos/weatherAtlas';
import {
  createCosmosAtmosphereLutState,
  createCosmosAtmosphereLutTextures,
  disposeCosmosAtmosphereLutTextures,
  type CosmosAtmosphereLutState,
  type CosmosAtmosphereLutTextures,
} from '@/cosmos/atmosphere/atmosphereLut';
import {
  COSMOS_R0012_ATMOSPHERE_DEFAULTS,
  createCosmosAtmosphereCalibrationState,
  type CosmosAtmosphereCalibrationState,
} from '@/cosmos/atmosphere/atmosphereCalibration';
import { createCosmosDebugOverlayState, type CosmosDebugOverlayState } from '@/cosmos/debug/cosmosDebug';
import {
  createCosmosRuntimeDiagnosticsState,
  createCosmosRuntimeLogEntry,
  type CosmosRuntimeDiagnosticsState,
  type CosmosRuntimeLogEntry,
} from '@/cosmos/runtime/runtimeDiagnostics';
import {
  COSMOS_ATMOSPHERE_RADIUS_M,
  COSMOS_EARTH_RADIUS_M,
  COSMOS_PLANET_CENTER,
  cameraAltitudeMeters,
  createCosmosScaleState,
  type CosmosScaleState,
} from '@/cosmos/scale/cosmosScale';
import {
  createProceduralBathymetryTexture,
  loadCosmosBathymetryOverlay,
  type CosmosBathymetryOverlayStatus,
} from '@/cosmos/bathymetry/bathymetryOverlay';
import {
  createNeutralGibsSurfaceTexture,
  loadCosmosGibsSurfaceOverlay,
  type CosmosGibsSurfaceOverlayStatus,
} from '@/cosmos/gibs/gibsSurfaceOverlay';
import {
  skyVS, skyFS,
  oceanVS, oceanFS, MAX_WAVES, MAX_RINGS,
  terrainVS, terrainFS,
  cloudVS, cloudFS,
  planetVS, planetFS,
  partVS, partFS,
  debugOverlayVS, debugOverlayFS,
} from './shaders/index';

const PI = Math.PI;
const TAU = PI * 2;
const DEG = PI / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

// ── Preset Definitions ──
export interface WorldPreset {
  waveH: number; windS: number; windA?: number; chop: number;
  sunE: number; sunA: number; sunI: number;
  dR: number; dG: number; dB: number;
  scat: number; rough: number;
  foamA: number; foamT: number; expo: number;
  cloudCover?: number; cloudDensity?: number;
}

export const PRESETS: Record<string, WorldPreset> = {
  golden:   { waveH: 1.2, windS: 7, chop: 0.65, sunE: 22, sunA: 210, sunI: 22, dR: 0.008, dG: 0.04, dB: 0.08, scat: 0.7, rough: 0.04, foamA: 1, foamT: 0.3, expo: 1, cloudCover: 0.4, cloudDensity: 0.6 },
  storm:    { waveH: 5, windS: 22, chop: 1.6, sunE: 10, sunA: 200, sunI: 10, dR: 0.005, dG: 0.02, dB: 0.04, scat: 0.5, rough: 0.2, foamA: 2.8, foamT: 0, expo: 0.85, cloudCover: 0.85, cloudDensity: 1.2 },
  glass:    { waveH: 0.12, windS: 1, chop: 0.2, sunE: 50, sunA: 150, sunI: 25, dR: 0.005, dG: 0.05, dB: 0.1, scat: 0.15, rough: 0.01, foamA: 0, foamT: 1, expo: 1.1, cloudCover: 0.15, cloudDensity: 0.3 },
  sunset:   { waveH: 1, windS: 5, chop: 0.6, sunE: 2, sunA: 270, sunI: 30, dR: 0.02, dG: 0.03, dB: 0.05, scat: 0.35, rough: 0.04, foamA: 0.8, foamT: 0.35, expo: 0.8, cloudCover: 0.5, cloudDensity: 0.5 },
  tropical: { waveH: 0.5, windS: 4, chop: 0.4, sunE: 65, sunA: 180, sunI: 26, dR: 0, dG: 0.06, dB: 0.12, scat: 0.2, rough: 0.03, foamA: 0.5, foamT: 0.5, expo: 1.1, cloudCover: 0.3, cloudDensity: 0.4 },
  midnight: { waveH: 0.8, windS: 3, chop: 0.5, sunE: -8, sunA: 0, sunI: 18, dR: 0.002, dG: 0.01, dB: 0.03, scat: 0.1, rough: 0.06, foamA: 0.3, foamT: 0.5, expo: 1.5, cloudCover: 0.2, cloudDensity: 0.3 },
  dawn:     { waveH: 0.7, windS: 4, chop: 0.5, sunE: 5, sunA: 90, sunI: 24, dR: 0.01, dG: 0.04, dB: 0.07, scat: 0.3, rough: 0.05, foamA: 0.6, foamT: 0.4, expo: 0.9, cloudCover: 0.45, cloudDensity: 0.5 },
  aerial:   { waveH: 1.5, windS: 8, chop: 0.7, sunE: 45, sunA: 160, sunI: 22, dR: 0.008, dG: 0.04, dB: 0.08, scat: 0.5, rough: 0.06, foamA: 1.2, foamT: 0.25, expo: 1, cloudCover: 0.5, cloudDensity: 0.6 },
  space:    { waveH: 1, windS: 6, chop: 0.5, sunE: 30, sunA: 180, sunI: 22, dR: 0.008, dG: 0.04, dB: 0.08, scat: 0.5, rough: 0.04, foamA: 1, foamT: 0.3, expo: 1, cloudCover: 0.5, cloudDensity: 0.6 },
};

// ── Settings State ──
export interface WorldSettings {
  waveH: number; windS: number; windA: number; chop: number; timeS: number;
  sunE: number; sunA: number; sunI: number; expo: number;
  dR: number; dG: number; dB: number; scat: number; rough: number;
  foamA: number; foamT: number; splF: number;
  carpet: boolean; carpS: number; carpH: number;
  cinematic: boolean;
  cloudCover: number; cloudDensity: number;
  weatherAtlasStrength: number; macroWeatherScale: number; cloudRegimeContrast: number;
  atmosphereContinuityStrength: number; horizonHazeStrength: number; cloudLodBias: number;
  atmosphereLutStrength: number; rayleighScale: number; mieScale: number; ozoneScale: number;
  multiScatteringStrength: number; aerialPerspectiveStrength: number; skyViewLutStrength: number; opticalDepthDebugStrength: number;
  debugOverlayMode: number; debugOverlayStrength: number; debugShellsEnabled: boolean; debugShellOpacity: number;
  gibsSurfaceOverlayStrength: number; gibsSurfaceWaterBias: number;
  bathymetryStrength: number; shallowWaterOptics: number; coastalFoamStrength: number; oneWaterOpticsStrength: number;
  terrainEnabled: boolean; cloudsEnabled: boolean;
}

interface WaveParam {
  A: number; kx: number; kz: number; omega: number;
  Q: number; phase: number; k: number;
}

interface RingWave {
  x: number; z: number; t: number; k: number;
  c: number; damp: number; spatial: number; amp: number; life: number;
}


export type CosmosReviewBookmarkId =
  | 'orbit'
  | 'cloud-terminator'
  | 'twilight-limb'
  | 'high-altitude'
  | 'storm-zone'
  | 'sun-glitter'
  | 'sea-level'
  | 'low-twilight-horizon'
  | 'underwater';

export interface CosmosReviewBookmark {
  id: CosmosReviewBookmarkId;
  title: string;
  altitudeLabel: string;
  description: string;
  preset: keyof typeof PRESETS;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  overrides: Partial<WorldSettings>;
  weatherSampleUv: [number, number];
  reviewFocus: string[];
}

export const COSMOS_REVIEW_BOOKMARKS: CosmosReviewBookmark[] = [
  {
    id: 'orbit',
    title: 'Orbit — whole-disc read',
    altitudeLabel: '26,471 km',
    description: 'Primary space-view benchmark for ocean color, limb glow, and global cloud rhythm.',
    preset: 'space',
    position: [0, 15500000, 24500000],
    target: [0, -6371000, 0],
    fov: 36,
    overrides: { cloudCover: 0.58, cloudDensity: 0.72, sunE: 28, sunA: 206, waveH: 1.0, windS: 8, rough: 0.045, weatherAtlasStrength: 0.86, cloudRegimeContrast: 0.74, macroWeatherScale: 1.0, gibsSurfaceOverlayStrength: 0.26, gibsSurfaceWaterBias: 0.92 },
    weatherSampleUv: [0.094, 0.570],
    reviewFocus: ['Earth limb softness', 'global cloud non-uniformity', 'ocean blue/black depth', 'no obvious shader tiling'],
  },
  {
    id: 'cloud-terminator',
    title: 'Cloud terminator — silver edge',
    altitudeLabel: '23,583 km',
    description: 'Checks rim atmosphere, night-side falloff, city-light restraint, and cloud backscatter.',
    preset: 'sunset',
    position: [-9000000, 13000000, 21000000],
    target: [0, -6371000, 0],
    fov: 34,
    overrides: { cloudCover: 0.68, cloudDensity: 0.82, sunE: 4, sunA: 254, sunI: 28, expo: 0.92, rough: 0.055, weatherAtlasStrength: 0.9, cloudRegimeContrast: 0.82, macroWeatherScale: 1.0, atmosphereLutStrength: 0.9, rayleighScale: 1.10, mieScale: 0.52, ozoneScale: 0.94, multiScatteringStrength: 0.64, aerialPerspectiveStrength: 0.24, skyViewLutStrength: 0.86, opticalDepthDebugStrength: 0.12, gibsSurfaceOverlayStrength: 0.26, gibsSurfaceWaterBias: 0.92 },
    weatherSampleUv: [0.365, 0.315],
    reviewFocus: ['terminator color', 'cloud silver lining', 'horizon glow thickness', 'night-side overbrightness'],
  },
  {
    id: 'twilight-limb',
    title: 'Twilight limb — ozone/rim calibration',
    altitudeLabel: '25,242 km',
    description: 'Dedicated R-0010 orbital twilight target for atmosphere LUT, ozone subtlety, and compressed limb thickness.',
    preset: 'sunset',
    position: [-14200000, 11800000, 21800000],
    target: [0, -6371000, 0],
    fov: 32,
    overrides: { cloudCover: 0.64, cloudDensity: 0.76, sunE: -1.5, sunA: 262, sunI: 27, expo: 0.88, rough: 0.048, weatherAtlasStrength: 0.9, cloudRegimeContrast: 0.82, macroWeatherScale: 1.0, atmosphereLutStrength: 0.92, rayleighScale: 1.12, mieScale: 0.46, ozoneScale: 1.08, multiScatteringStrength: 0.58, aerialPerspectiveStrength: 0.22, skyViewLutStrength: 0.95, opticalDepthDebugStrength: 0.16, gibsSurfaceOverlayStrength: 0.24, gibsSurfaceWaterBias: 0.94 },
    weatherSampleUv: [0.402, 0.294],
    reviewFocus: ['compressed blue-to-indigo limb', 'subtle ozone twilight warmth', 'night-side does not turn milky', 'macro cloud forms remain orbit-scale'],
  },
  {
    id: 'high-altitude',
    title: 'High altitude — weather-scale ocean',
    altitudeLabel: '8.4 km',
    description: 'Aerial pass for cloud deck scale, ocean specular breakup, haze, and sea-state believability.',
    preset: 'aerial',
    position: [1600, 8400, 3600],
    target: [260, 600, -400],
    fov: 48,
    overrides: { cloudCover: 0.62, cloudDensity: 0.7, sunE: 31, sunA: 176, waveH: 1.6, windS: 11, foamA: 1.25, weatherAtlasStrength: 0.84, cloudRegimeContrast: 0.72, macroWeatherScale: 0.86, gibsSurfaceOverlayStrength: 0.30, gibsSurfaceWaterBias: 0.88 },
    weatherSampleUv: [0.715, 0.646],
    reviewFocus: ['cloud deck scale', 'ocean roughness at altitude', 'atmospheric haze', 'visible repetition'],
  },
  {
    id: 'storm-zone',
    title: 'Storm zone — rough water read',
    altitudeLabel: '1.2 km',
    description: 'Stress bookmark for wind wave height, foam/spray density, low light, and storm-cloud mass.',
    preset: 'storm',
    position: [-620, 1200, 1450],
    target: [120, 140, -160],
    fov: 54,
    overrides: { cloudCover: 0.9, cloudDensity: 1.18, sunE: 9, sunA: 214, waveH: 4.4, windS: 24, chop: 1.35, foamA: 2.5, rough: 0.18, expo: 0.86, weatherAtlasStrength: 0.96, cloudRegimeContrast: 0.92, macroWeatherScale: 0.78, gibsSurfaceOverlayStrength: 0.28, gibsSurfaceWaterBias: 0.90 },
    weatherSampleUv: [0.094, 0.570],
    reviewFocus: ['wave scale', 'foam not too uniformly distributed', 'storm darkness', 'horizon visibility'],
  },
  {
    id: 'sun-glitter',
    title: 'Sun glitter — Fresnel/specular',
    altitudeLabel: '260 m',
    description: 'Specular-water benchmark for grazing reflection, roughness, sparkle scale, and sky reflection tint.',
    preset: 'golden',
    position: [140, 260, 520],
    target: [30, 22, -140],
    fov: 45,
    overrides: { cloudCover: 0.32, cloudDensity: 0.46, sunE: 18, sunA: 205, waveH: 1.15, windS: 8, rough: 0.035, foamA: 0.85, expo: 0.98, weatherAtlasStrength: 0.72, cloudRegimeContrast: 0.66, macroWeatherScale: 1.15, gibsSurfaceOverlayStrength: 0.30, gibsSurfaceWaterBias: 0.90 },
    weatherSampleUv: [0.58, 0.52],
    reviewFocus: ['sun glitter shape', 'Fresnel response', 'micro-normal scale', 'overexposed highlights'],
  },
  {
    id: 'sea-level',
    title: 'Sea level — cinematic water',
    altitudeLabel: '4.2 m',
    description: 'Primary lead-eyes sea-level shot for water volume, crest translucency, foam, and horizon height.',
    preset: 'tropical',
    position: [8, 4.2, 38],
    target: [0, 2.0, -160],
    fov: 58,
    overrides: { cloudCover: 0.38, cloudDensity: 0.48, sunE: 24, sunA: 194, waveH: 0.9, windS: 6.5, chop: 0.58, foamA: 0.72, rough: 0.032, scat: 0.38, weatherAtlasStrength: 0.78, cloudRegimeContrast: 0.64, macroWeatherScale: 1.05, gibsSurfaceOverlayStrength: 0.24, gibsSurfaceWaterBias: 0.94 },
    weatherSampleUv: [0.64, 0.49],
    reviewFocus: ['horizon line', 'wave size vs camera', 'foam scale', 'ocean color at eye level'],
  },
  {
    id: 'low-twilight-horizon',
    title: 'Low twilight horizon — sea/sky continuity',
    altitudeLabel: '7.5 m',
    description: 'Ground-to-ocean twilight calibration for local sky, horizon haze, water reflection, and optical-depth LUT handoff.',
    preset: 'sunset',
    position: [-45, 7.5, 64],
    target: [0, 2.4, -155],
    fov: 56,
    overrides: { cloudCover: 0.44, cloudDensity: 0.58, sunE: 1.2, sunA: 246, sunI: 26, waveH: 0.82, windS: 5.4, chop: 0.5, foamA: 0.45, rough: 0.035, scat: 0.42, expo: 0.9, weatherAtlasStrength: 0.76, cloudRegimeContrast: 0.68, macroWeatherScale: 1.0, atmosphereLutStrength: 0.9, rayleighScale: 1.03, mieScale: 0.74, ozoneScale: 0.78, multiScatteringStrength: 0.70, aerialPerspectiveStrength: 0.86, skyViewLutStrength: 0.82, opticalDepthDebugStrength: 0.10, gibsSurfaceOverlayStrength: 0.20, gibsSurfaceWaterBias: 0.96 },
    weatherSampleUv: [0.625, 0.505],
    reviewFocus: ['horizon haze compresses distance but keeps wave scale', 'sky colour connects to water reflection', 'low sun does not flatten ocean into metallic plate', 'local sky owns atmosphere, not orbital rim'],
  },
  {
    id: 'underwater',
    title: 'Underwater — shallow absorption placeholder',
    altitudeLabel: '-2.7 m',
    description: 'Current underwater review target. This is intentionally provisional until bathymetry/depth textures arrive.',
    preset: 'glass',
    position: [0, -2.7, 22],
    target: [0, -1.2, -70],
    fov: 62,
    overrides: { cloudCover: 0.18, cloudDensity: 0.34, sunE: 46, sunA: 172, waveH: 0.38, windS: 3, rough: 0.018, scat: 0.52, foamA: 0.12, expo: 1.08, weatherAtlasStrength: 0.62, cloudRegimeContrast: 0.48, macroWeatherScale: 1.25, gibsSurfaceOverlayStrength: 0.18, gibsSurfaceWaterBias: 0.96 },
    weatherSampleUv: [0.52, 0.43],
    reviewFocus: ['water absorption color', 'surface underside read', 'caustic need', 'turbidity/bathymetry gap'],
  },
];



type UniformValue<T> = { value: T };

interface OceanUniforms {
  uTime: UniformValue<number>;
  uW: UniformValue<THREE.Vector4[]>;
  uW2: UniformValue<THREE.Vector4[]>;
  uWN: UniformValue<number>;
  uR: UniformValue<THREE.Vector4[]>;
  uR2: UniformValue<THREE.Vector4[]>;
  uRN: UniformValue<number>;
  uSunDir: UniformValue<THREE.Vector3>;
  uSunI: UniformValue<number>;
  uExpo: UniformValue<number>;
  uAlt: UniformValue<number>;
  uCam: UniformValue<THREE.Vector3>;
  uDeep: UniformValue<THREE.Vector3>;
  uScat: UniformValue<number>;
  uRough: UniformValue<number>;
  uFoamA: UniformValue<number>;
  uFoamT: UniformValue<number>;
  uInvP: UniformValue<THREE.Matrix4>;
  uInvV: UniformValue<THREE.Matrix4>;
  uPFS: UniformValue<number>;
  uPFE: UniformValue<number>;
  uCosmosPlanetCenter: UniformValue<THREE.Vector3>;
  uCosmosEarthRadius: UniformValue<number>;
  uCosmosAtmosphereRadius: UniformValue<number>;
  uCosmosCameraAltitudeMeters: UniformValue<number>;
  uCosmosScaleLod: UniformValue<number>;
  uCosmosOceanPassAlpha: UniformValue<number>;
  uCosmosCloudPassAlpha: UniformValue<number>;
  uCosmosPlanetPassAlpha: UniformValue<number>;
  uCosmosWeatherAtlasA: UniformValue<THREE.Texture>;
  uCosmosWeatherAtlasB: UniformValue<THREE.Texture>;
  uCosmosTerrainForcingA: UniformValue<THREE.Texture>;
  uCosmosTerrainForcingB: UniformValue<THREE.Texture>;
  uWeatherAtlasStrength: UniformValue<number>;
  uCloudRegimeContrast: UniformValue<number>;
  uMacroWeatherScale: UniformValue<number>;
  uWeatherAnchor: UniformValue<THREE.Vector2>;
  uCosmosBathymetryAtlas: UniformValue<THREE.Texture>;
  uCosmosBathymetryReady: UniformValue<number>;
  uBathymetryStrength: UniformValue<number>;
  uShallowWaterOptics: UniformValue<number>;
  uCoastalFoamStrength: UniformValue<number>;
  uOneWaterOpticsStrength: UniformValue<number>;
  uAtmosphereContinuityStrength: UniformValue<number>;
  uHorizonHazeStrength: UniformValue<number>;
  uCloudLodBias: UniformValue<number>;
  uCosmosTransmittanceLut: UniformValue<THREE.Texture>;
  uCosmosMultiScatteringLut: UniformValue<THREE.Texture>;
  uCosmosSkyViewLut: UniformValue<THREE.Texture>;
  uCosmosAerialPerspectiveLut: UniformValue<THREE.Texture>;
  uAtmosphereLutStrength: UniformValue<number>;
  uRayleighScale: UniformValue<number>;
  uMieScale: UniformValue<number>;
  uOzoneScale: UniformValue<number>;
  uMultiScatteringStrength: UniformValue<number>;
  uAerialPerspectiveStrength: UniformValue<number>;
  uSkyViewLutStrength: UniformValue<number>;
  uOpticalDepthDebugStrength: UniformValue<number>;
}

export class WorldEngine {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private weatherAtlas: CosmosWeatherAtlas;
  private atmosphereLuts: CosmosAtmosphereLutTextures;
  private atmosphereLutState: CosmosAtmosphereLutState;
  private atmosphereCalibrationState: CosmosAtmosphereCalibrationState;
  private runtimeLogEntries: CosmosRuntimeLogEntry[] = [];
  private activeReviewBookmarkId?: CosmosReviewBookmarkId;
  private runtimeDiagnosticsState: CosmosRuntimeDiagnosticsState = createCosmosRuntimeDiagnosticsState();
  private webglContextLost = false;
  private webglContextLostCount = 0;
  private webglContextRestoredCount = 0;
  private weatherAnchor = new THREE.Vector2(0.37, 0.61);
  private planetCenter = new THREE.Vector3(COSMOS_PLANET_CENTER.x, COSMOS_PLANET_CENTER.y, COSMOS_PLANET_CENTER.z);
  private scaleState: CosmosScaleState = createCosmosScaleState(0);
  private gibsSurfaceTexture: THREE.Texture;
  private gibsSurfaceOverlayReady = 0;
  private gibsSurfaceOverlayStatus: CosmosGibsSurfaceOverlayStatus = {
    state: 'fallback',
    textureUrl: '/cosmos/gibs/global-truecolor.jpg',
    manifestUrl: '/cosmos/gibs/global-truecolor.manifest.json',
    message: 'Using procedural surface fallback until a local NASA GIBS atlas is present.',
  };
  private bathymetryTexture: THREE.Texture;
  private bathymetryOverlayReady = 0;
  private bathymetryOverlayStatus: CosmosBathymetryOverlayStatus = {
    state: 'fallback',
    textureUrl: '/cosmos/bathymetry/global-depth.png',
    manifestUrl: '/cosmos/bathymetry/global-depth.manifest.json',
    provider: 'procedural-fallback',
    encoding: 'RGBA depth01/shelf/coast/land',
    verticalDatum: 'synthetic sea-level-relative',
    minElevationMeters: -11000,
    maxElevationMeters: 8500,
    message: 'Using deterministic procedural bathymetry until a local NOAA/GEBCO atlas is present.',
  };

  // State
  settings: WorldSettings;
  private time = 0;
  private fps = 0;
  private frameCount = 0;
  private fpsTime = 0;

  // Objects
  private sunDir = new THREE.Vector3();
  private skyMat!: THREE.ShaderMaterial;
  private skyMesh!: THREE.Mesh;
  private globeMesh!: THREE.Mesh;
  private oceanUnis!: OceanUniforms;
  private oceanMat!: THREE.ShaderMaterial;
  private pGeo!: THREE.BufferGeometry;
  private pMat!: THREE.ShaderMaterial;

  // New render layers
  private terrainMat!: THREE.ShaderMaterial;
  private terrainMesh!: THREE.Mesh;
  private cloudMat!: THREE.ShaderMaterial;
  private cloudMesh!: THREE.Mesh;
  private planetMat!: THREE.ShaderMaterial;
  private planetMesh!: THREE.Mesh;
  private debugOverlayMat!: THREE.ShaderMaterial;
  private debugOverlayMesh!: THREE.Mesh;
  private debugOverlayScene!: THREE.Scene;
  private debugShellScene!: THREE.Scene;
  private debugShellGroup!: THREE.Group;
  private debugShellMaterials: THREE.LineBasicMaterial[] = [];
  private terrainScene!: THREE.Scene;
  private cloudScene!: THREE.Scene;
  private planetScene!: THREE.Scene;
  private orthoCamera!: THREE.OrthographicCamera;

  // Waves
  private waveParams: WaveParam[] = [];
  private uWaves: THREE.Vector4[] = [];
  private uWaves2: THREE.Vector4[] = [];
  private ringWaves: RingWave[] = [];
  private uRings: THREE.Vector4[] = [];
  private uRings2: THREE.Vector4[] = [];

  // Particles
  private readonly PMAX = 20000;
  private pCount = 0;
  private pPos: Float32Array;
  private pVel: Float32Array;
  private pLife: Float32Array;
  private pSize: Float32Array;
  private pAlpha: Float32Array;

  // Camera
  private camTh = 0.3;
  private camPhi = 1.2;
  private camDist = 55;
  private camTgt = new THREE.Vector3(0, 0, 0);
  private dragging = false;
  private rDrag = false;
  private lastMX = 0;
  private lastMY = 0;
  private downX = 0;
  private downY = 0;
  private didMove = false;
  private carpetPos = new THREE.Vector3();
  private carpetLook = new THREE.Vector3();

  // Cinematic
  private cinematicTime = 0;

  // Callbacks
  private animId = 0;
  private onStatsUpdate?: (fps: number, particles: number, rings: number, alt: number) => void;
  private onGibsOverlayStatusUpdate?: (status: CosmosGibsSurfaceOverlayStatus) => void;
  private onBathymetryOverlayStatusUpdate?: (status: CosmosBathymetryOverlayStatus) => void;
  private onDebugOverlayStateUpdate?: (state: CosmosDebugOverlayState) => void;
  private onAtmosphereLutStateUpdate?: (state: CosmosAtmosphereLutState) => void;
  private onAtmosphereCalibrationStateUpdate?: (state: CosmosAtmosphereCalibrationState) => void;
  private onRuntimeDiagnosticsUpdate?: (state: CosmosRuntimeDiagnosticsState) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.weatherAtlas = createCosmosWeatherAtlas({ preset: 'waterWorldV01', width: 512, height: 256 });
    this.atmosphereLuts = createCosmosAtmosphereLutTextures();
    this.atmosphereLutState = this.atmosphereLuts.state;
    this.atmosphereCalibrationState = createCosmosAtmosphereCalibrationState(undefined, this.atmosphereLutState.controls);
    this.gibsSurfaceTexture = createNeutralGibsSurfaceTexture();
    this.bathymetryTexture = createProceduralBathymetryTexture();
    this.settings = {
      waveH: 1.2, windS: 7, windA: 45, chop: 0.65, timeS: 1,
      sunE: 22, sunA: 210, sunI: 22, expo: 1,
      dR: 0.008, dG: 0.04, dB: 0.08, scat: 0.7, rough: 0.04,
      foamA: 1, foamT: 0.3, splF: 5,
      carpet: false, carpS: 5, carpH: 3,
      cinematic: true,
      cloudCover: 0.4, cloudDensity: 0.6,
      weatherAtlasStrength: 0.84, macroWeatherScale: 1.0, cloudRegimeContrast: 0.72,
      atmosphereContinuityStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.atmosphereContinuityStrength,
      horizonHazeStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.horizonHazeStrength,
      cloudLodBias: COSMOS_R0012_ATMOSPHERE_DEFAULTS.cloudLodBias,
      atmosphereLutStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.strength,
      rayleighScale: COSMOS_R0012_ATMOSPHERE_DEFAULTS.rayleighScale,
      mieScale: COSMOS_R0012_ATMOSPHERE_DEFAULTS.mieScale,
      ozoneScale: COSMOS_R0012_ATMOSPHERE_DEFAULTS.ozoneScale,
      multiScatteringStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.multiScatteringStrength,
      aerialPerspectiveStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.aerialPerspectiveStrength,
      skyViewLutStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.skyViewStrength,
      opticalDepthDebugStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.opticalDepthDebug,
      debugOverlayMode: 0, debugOverlayStrength: 0.72, debugShellsEnabled: false, debugShellOpacity: 0.82,
      gibsSurfaceOverlayStrength: 0.28, gibsSurfaceWaterBias: 0.92,
      bathymetryStrength: 0.82, shallowWaterOptics: 0.72, coastalFoamStrength: 0.62, oneWaterOpticsStrength: 0.78,
      terrainEnabled: true, cloudsEnabled: true,
    };

    this.pPos = new Float32Array(this.PMAX * 3);
    this.pVel = new Float32Array(this.PMAX * 3);
    this.pLife = new Float32Array(this.PMAX);
    this.pSize = new Float32Array(this.PMAX);
    this.pAlpha = new Float32Array(this.PMAX);

    for (let i = 0; i < MAX_WAVES; i++) { this.uWaves.push(new THREE.Vector4()); this.uWaves2.push(new THREE.Vector4()); }
    for (let i = 0; i < MAX_RINGS; i++) { this.uRings.push(new THREE.Vector4(0, 0, 0, -100)); this.uRings2.push(new THREE.Vector4()); }

    this.init();
  }

  setStatsCallback(cb: (fps: number, particles: number, rings: number, alt: number) => void) {
    this.onStatsUpdate = cb;
  }

  setGibsOverlayStatusCallback(cb: (status: CosmosGibsSurfaceOverlayStatus) => void) {
    this.onGibsOverlayStatusUpdate = cb;
    cb(this.gibsSurfaceOverlayStatus);
  }

  setBathymetryOverlayStatusCallback(cb: (status: CosmosBathymetryOverlayStatus) => void) {
    this.onBathymetryOverlayStatusUpdate = cb;
    cb(this.bathymetryOverlayStatus);
  }

  setDebugOverlayStateCallback(cb: (state: CosmosDebugOverlayState) => void) {
    this.onDebugOverlayStateUpdate = cb;
    cb(this.getDebugOverlayState());
  }

  setAtmosphereLutStateCallback(cb: (state: CosmosAtmosphereLutState) => void) {
    this.onAtmosphereLutStateUpdate = cb;
    cb(this.atmosphereLutState);
  }

  setAtmosphereCalibrationStateCallback(cb: (state: CosmosAtmosphereCalibrationState) => void) {
    this.onAtmosphereCalibrationStateUpdate = cb;
    cb(this.atmosphereCalibrationState);
  }

  setRuntimeDiagnosticsCallback(cb: (state: CosmosRuntimeDiagnosticsState) => void) {
    this.onRuntimeDiagnosticsUpdate = cb;
    cb(this.getRuntimeDiagnosticsState());
  }

  private pushRuntimeMessage(entry: CosmosRuntimeLogEntry) {
    this.runtimeLogEntries.push(createCosmosRuntimeLogEntry(entry));
    if (this.runtimeLogEntries.length > 200) this.runtimeLogEntries.splice(0, this.runtimeLogEntries.length - 200);
    this.emitRuntimeDiagnosticsState();
  }

  getRuntimeDiagnosticsState(): CosmosRuntimeDiagnosticsState {
    const capabilities = this.renderer?.capabilities;
    const info = this.renderer?.info;
    const debugInfo = this.renderer?.debug;
    const probe = typeof window !== 'undefined' ? window.__COSMOS_WEBGL_PROBE__ : undefined;
    const probeLogs = probe?.logs ?? [];
    const programs = info?.programs ?? [];
    this.runtimeDiagnosticsState = createCosmosRuntimeDiagnosticsState({
      bookmarkId: typeof window !== 'undefined' ? window.__COSMOS_ACTIVE_BOOKMARK__ : undefined,
      debugMode: this.settings.debugOverlayMode,
      renderer: {
        isWebGL2: Boolean(capabilities?.isWebGL2),
        precision: capabilities?.precision ?? 'unknown',
        logarithmicDepthBuffer: Boolean(capabilities?.logarithmicDepthBuffer),
        maxTextures: capabilities?.maxTextures ?? 0,
        maxTextureSize: capabilities?.maxTextureSize ?? 0,
        maxVertexTextures: capabilities?.maxVertexTextures ?? 0,
        vertexTextures: Boolean(capabilities?.vertexTextures),
        floatFragmentTextures: Boolean(capabilities?.floatFragmentTextures),
        maxAnisotropy: capabilities?.getMaxAnisotropy?.() ?? 0,
        checkShaderErrors: debugInfo?.checkShaderErrors ?? true,
        programCount: programs.length,
        memoryGeometries: info?.memory.geometries ?? 0,
        memoryTextures: info?.memory.textures ?? 0,
        calls: info?.render.calls ?? 0,
        triangles: info?.render.triangles ?? 0,
        points: info?.render.points ?? 0,
        lines: info?.render.lines ?? 0,
      },
      webglProbe: { installed: Boolean(probe), ...(probe?.stats ?? {}) },
      messages: [...this.runtimeLogEntries, ...probeLogs],
      context: {
        lost: this.webglContextLost,
        lostCount: this.webglContextLostCount,
        restoredCount: this.webglContextRestoredCount,
      },
    });
    return this.runtimeDiagnosticsState;
  }

  private emitRuntimeDiagnosticsState() {
    const state = this.getRuntimeDiagnosticsState();
    if (typeof window !== 'undefined') {
      window.__COSMOS_RUNTIME_DIAGNOSTICS__ = state;
    }
    this.onRuntimeDiagnosticsUpdate?.(state);
  }

  private configureRendererDiagnostics() {
    const debug = this.renderer.debug as THREE.WebGLRenderer['debug'] & {
      onShaderError?: (
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        vertexShader: WebGLShader,
        fragmentShader: WebGLShader,
      ) => void;
    };
    debug.checkShaderErrors = true;
    debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      const programInfoLog = gl.getProgramInfoLog(program) ?? '';
      const vertexShaderInfoLog = vertexShader ? gl.getShaderInfoLog(vertexShader) ?? '' : '';
      const fragmentShaderInfoLog = fragmentShader ? gl.getShaderInfoLog(fragmentShader) ?? '' : '';
      const vertexStatus = vertexShader ? Boolean(gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) : false;
      const fragmentStatus = fragmentShader ? Boolean(gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) : false;
      const programStatus = program ? Boolean(gl.getProgramParameter(program, gl.LINK_STATUS)) : false;
      const text = programInfoLog || vertexShaderInfoLog || fragmentShaderInfoLog || 'Three.js shader error callback fired without an info log.';
      this.pushRuntimeMessage({
        kind: 'webgl-program',
        type: 'error',
        text: `programStatus=${programStatus} vertexStatus=${vertexStatus} fragmentStatus=${fragmentStatus}
${text}`,
      });
      console.error('[Cosmos R-0010 shader diagnostic]', { programStatus, vertexStatus, fragmentStatus, programInfoLog, vertexShaderInfoLog, fragmentShaderInfoLog });
    };
  }

  private bindRuntimeContextEvents() {
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.webglContextLost = true;
      this.webglContextLostCount++;
      this.pushRuntimeMessage({ kind: 'webgl-context', type: 'error', text: 'webglcontextlost' });
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.webglContextLost = false;
      this.webglContextRestoredCount++;
      this.pushRuntimeMessage({ kind: 'webgl-context', type: 'info', text: 'webglcontextrestored' });
    });
  }

  private currentAtmosphereLutControls() {
    return {
      strength: this.settings.atmosphereLutStrength,
      rayleighScale: this.settings.rayleighScale,
      mieScale: this.settings.mieScale,
      ozoneScale: this.settings.ozoneScale,
      multiScatteringStrength: this.settings.multiScatteringStrength,
      aerialPerspectiveStrength: this.settings.aerialPerspectiveStrength,
      skyViewStrength: this.settings.skyViewLutStrength,
      opticalDepthDebug: this.settings.opticalDepthDebugStrength,
    };
  }

  private emitAtmosphereLutState() {
    const controls = this.currentAtmosphereLutControls();
    this.atmosphereLutState = createCosmosAtmosphereLutState(controls);
    this.atmosphereCalibrationState = createCosmosAtmosphereCalibrationState(this.activeReviewBookmarkId, controls);
    if (typeof window !== 'undefined') {
      window.__COSMOS_ATMOSPHERE_LUT_STATE__ = this.atmosphereLutState;
      window.__COSMOS_ATMOSPHERE_CALIBRATION_STATE__ = this.atmosphereCalibrationState;
    }
    this.onAtmosphereLutStateUpdate?.(this.atmosphereLutState);
    this.onAtmosphereCalibrationStateUpdate?.(this.atmosphereCalibrationState);
  }

  private rebuildAtmosphereLuts() {
    const previous = this.atmosphereLuts;
    this.atmosphereLuts = createCosmosAtmosphereLutTextures(this.currentAtmosphereLutControls());
    disposeCosmosAtmosphereLutTextures(previous);
    this.syncAtmosphereLutUniforms(this.skyMat);
    this.syncAtmosphereLutUniforms(this.oceanMat);
    this.syncAtmosphereLutUniforms(this.cloudMat);
    this.syncAtmosphereLutUniforms(this.planetMat);
    this.syncAtmosphereLutUniforms(this.debugOverlayMat);
    this.emitAtmosphereLutState();
  }

  getDebugOverlayState(): CosmosDebugOverlayState {
    return createCosmosDebugOverlayState({
      mode: this.settings.debugOverlayMode,
      overlayStrength: this.settings.debugOverlayStrength,
      shellsEnabled: this.settings.debugShellsEnabled,
      shellOpacity: this.settings.debugShellOpacity,
      scaleState: this.scaleState,
      shellContract: {
        earthRadiusMeters: COSMOS_EARTH_RADIUS_M,
        cloudBaseRadiusMeters: COSMOS_EARTH_RADIUS_M + this.scaleState.cloudBaseMeters,
        cloudTopRadiusMeters: COSMOS_EARTH_RADIUS_M + this.scaleState.cloudTopMeters,
        atmosphereRadiusMeters: COSMOS_ATMOSPHERE_RADIUS_M,
      },
    });
  }

  private emitDebugOverlayState() {
    const state = this.getDebugOverlayState();
    if (typeof window !== 'undefined') {
      window.__COSMOS_DEBUG_OVERLAY_STATE__ = state;
    }
    this.onDebugOverlayStateUpdate?.(state);
  }

  private createScaleUniforms() {
    return {
      uCosmosPlanetCenter: { value: this.planetCenter },
      uCosmosEarthRadius: { value: COSMOS_EARTH_RADIUS_M },
      uCosmosAtmosphereRadius: { value: COSMOS_ATMOSPHERE_RADIUS_M },
      uCosmosCameraAltitudeMeters: { value: this.scaleState.altitudeMeters },
      uCosmosScaleLod: { value: this.scaleState.lod01 },
      uCosmosOceanPassAlpha: { value: this.scaleState.oceanAlpha },
      uCosmosCloudPassAlpha: { value: this.scaleState.cloudAlpha },
      uCosmosPlanetPassAlpha: { value: this.scaleState.planetAlpha },
      uCosmosLocalAtmosphereAlpha: { value: this.scaleState.localAtmosphereAlpha },
      uCosmosCloudMicroAlpha: { value: this.scaleState.cloudMicroAlpha },
      uCosmosCloudMesoAlpha: { value: this.scaleState.cloudMesoAlpha },
      uCosmosCloudMacroAlpha: { value: this.scaleState.cloudMacroAlpha },
      uCosmosHorizonFogAlpha: { value: this.scaleState.horizonFogAlpha },
      uCosmosOrbitalRimAlpha: { value: this.scaleState.orbitalRimAlpha },
    };
  }

  private createAtmosphereLutUniforms() {
    return {
      uCosmosTransmittanceLut: { value: this.atmosphereLuts.transmittance },
      uCosmosMultiScatteringLut: { value: this.atmosphereLuts.multiScattering },
      uCosmosSkyViewLut: { value: this.atmosphereLuts.skyView },
      uCosmosAerialPerspectiveLut: { value: this.atmosphereLuts.aerialPerspective },
      uAtmosphereLutStrength: { value: this.settings.atmosphereLutStrength },
      uRayleighScale: { value: this.settings.rayleighScale },
      uMieScale: { value: this.settings.mieScale },
      uOzoneScale: { value: this.settings.ozoneScale },
      uMultiScatteringStrength: { value: this.settings.multiScatteringStrength },
      uAerialPerspectiveStrength: { value: this.settings.aerialPerspectiveStrength },
      uSkyViewLutStrength: { value: this.settings.skyViewLutStrength },
      uOpticalDepthDebugStrength: { value: this.settings.opticalDepthDebugStrength },
    };
  }

  private syncAtmosphereLutUniforms(mat?: THREE.ShaderMaterial) {
    if (!mat) return;
    const u = mat.uniforms;
    if (u.uCosmosTransmittanceLut) u.uCosmosTransmittanceLut.value = this.atmosphereLuts.transmittance;
    if (u.uCosmosMultiScatteringLut) u.uCosmosMultiScatteringLut.value = this.atmosphereLuts.multiScattering;
    if (u.uCosmosSkyViewLut) u.uCosmosSkyViewLut.value = this.atmosphereLuts.skyView;
    if (u.uCosmosAerialPerspectiveLut) u.uCosmosAerialPerspectiveLut.value = this.atmosphereLuts.aerialPerspective;
    if (u.uAtmosphereLutStrength) u.uAtmosphereLutStrength.value = this.settings.atmosphereLutStrength;
    if (u.uRayleighScale) u.uRayleighScale.value = this.settings.rayleighScale;
    if (u.uMieScale) u.uMieScale.value = this.settings.mieScale;
    if (u.uOzoneScale) u.uOzoneScale.value = this.settings.ozoneScale;
    if (u.uMultiScatteringStrength) u.uMultiScatteringStrength.value = this.settings.multiScatteringStrength;
    if (u.uAerialPerspectiveStrength) u.uAerialPerspectiveStrength.value = this.settings.aerialPerspectiveStrength;
    if (u.uSkyViewLutStrength) u.uSkyViewLutStrength.value = this.settings.skyViewLutStrength;
    if (u.uOpticalDepthDebugStrength) u.uOpticalDepthDebugStrength.value = this.settings.opticalDepthDebugStrength;
  }

  private syncScaleUniforms(mat?: THREE.ShaderMaterial) {
    if (!mat) return;
    const u = mat.uniforms;
    if (u.uCosmosPlanetCenter) u.uCosmosPlanetCenter.value.copy(this.planetCenter);
    if (u.uCosmosEarthRadius) u.uCosmosEarthRadius.value = COSMOS_EARTH_RADIUS_M;
    if (u.uCosmosAtmosphereRadius) u.uCosmosAtmosphereRadius.value = COSMOS_ATMOSPHERE_RADIUS_M;
    if (u.uCosmosCameraAltitudeMeters) u.uCosmosCameraAltitudeMeters.value = this.scaleState.altitudeMeters;
    if (u.uCosmosScaleLod) u.uCosmosScaleLod.value = this.scaleState.lod01;
    if (u.uCosmosOceanPassAlpha) u.uCosmosOceanPassAlpha.value = this.scaleState.oceanAlpha;
    if (u.uCosmosCloudPassAlpha) u.uCosmosCloudPassAlpha.value = this.scaleState.cloudAlpha;
    if (u.uCosmosPlanetPassAlpha) u.uCosmosPlanetPassAlpha.value = this.scaleState.planetAlpha;
    if (u.uCosmosLocalAtmosphereAlpha) u.uCosmosLocalAtmosphereAlpha.value = this.scaleState.localAtmosphereAlpha;
    if (u.uCosmosCloudMicroAlpha) u.uCosmosCloudMicroAlpha.value = this.scaleState.cloudMicroAlpha;
    if (u.uCosmosCloudMesoAlpha) u.uCosmosCloudMesoAlpha.value = this.scaleState.cloudMesoAlpha;
    if (u.uCosmosCloudMacroAlpha) u.uCosmosCloudMacroAlpha.value = this.scaleState.cloudMacroAlpha;
    if (u.uCosmosHorizonFogAlpha) u.uCosmosHorizonFogAlpha.value = this.scaleState.horizonFogAlpha;
    if (u.uCosmosOrbitalRimAlpha) u.uCosmosOrbitalRimAlpha.value = this.scaleState.orbitalRimAlpha;
    if (u.uCloudBase) u.uCloudBase.value = this.scaleState.cloudBaseMeters;
    if (u.uCloudTop) u.uCloudTop.value = this.scaleState.cloudTopMeters;
  }

  private updateScaleState(): number {
    const altitude = cameraAltitudeMeters(this.camera.position, this.planetCenter, COSMOS_EARTH_RADIUS_M);
    this.scaleState = createCosmosScaleState(altitude);

    const positiveAltitude = Math.max(this.scaleState.altitudeMeters, 0.1);
    const near = THREE.MathUtils.clamp(positiveAltitude * 0.00002, 0.05, 5000);
    const far = THREE.MathUtils.clamp(
      positiveAltitude + COSMOS_EARTH_RADIUS_M * 4.0 + 2_000_000,
      200_000,
      80_000_000,
    );
    if (Math.abs(this.camera.near - near) > 0.001 || Math.abs(this.camera.far - far) > 1) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }

    this.syncScaleUniforms(this.oceanMat);
    this.syncScaleUniforms(this.skyMat);
    this.syncScaleUniforms(this.terrainMat);
    this.syncScaleUniforms(this.cloudMat);
    this.syncScaleUniforms(this.planetMat);
    this.syncScaleUniforms(this.debugOverlayMat);
    this.syncAtmosphereLutUniforms(this.oceanMat);
    this.syncAtmosphereLutUniforms(this.skyMat);
    this.syncAtmosphereLutUniforms(this.cloudMat);
    this.syncAtmosphereLutUniforms(this.planetMat);
    this.syncAtmosphereLutUniforms(this.debugOverlayMat);

    if (typeof window !== 'undefined') {
      window.__COSMOS_SCALE_STATE__ = this.scaleState;
      window.__COSMOS_DEBUG_OVERLAY_STATE__ = this.getDebugOverlayState();
      window.__COSMOS_RUNTIME_DIAGNOSTICS__ = this.getRuntimeDiagnosticsState();
    }

    return this.scaleState.altitudeMeters;
  }

  private emitBathymetryOverlayStatus() {
    if (typeof window !== 'undefined') {
      window.__COSMOS_BATHYMETRY_OVERLAY_STATE__ = this.bathymetryOverlayStatus;
    }
    this.onBathymetryOverlayStatusUpdate?.(this.bathymetryOverlayStatus);
  }

  private syncBathymetryUniforms() {
    const materials = [this.oceanMat, this.planetMat, this.cloudMat, this.terrainMat].filter(Boolean) as THREE.ShaderMaterial[];
    for (const mat of materials) {
      const u = mat.uniforms;
      if (u.uCosmosBathymetryAtlas) u.uCosmosBathymetryAtlas.value = this.bathymetryTexture;
      if (u.uCosmosBathymetryReady) u.uCosmosBathymetryReady.value = this.bathymetryOverlayReady;
      if (u.uBathymetryStrength) u.uBathymetryStrength.value = this.settings.bathymetryStrength;
      if (u.uShallowWaterOptics) u.uShallowWaterOptics.value = this.settings.shallowWaterOptics;
      if (u.uCoastalFoamStrength) u.uCoastalFoamStrength.value = this.settings.coastalFoamStrength;
      if (u.uOneWaterOpticsStrength) u.uOneWaterOpticsStrength.value = this.settings.oneWaterOpticsStrength;
    }
  }

  private async bootstrapBathymetryOverlay() {
    this.bathymetryOverlayStatus = { ...this.bathymetryOverlayStatus, state: 'loading', message: 'Searching for local NOAA/GEBCO bathymetry atlas.' };
    this.emitBathymetryOverlayStatus();
    const result = await loadCosmosBathymetryOverlay();
    this.bathymetryTexture.dispose();
    this.bathymetryTexture = result.texture;
    this.bathymetryOverlayReady = result.status.state === 'loaded' ? 1 : 0;
    this.bathymetryOverlayStatus = result.status;
    this.syncBathymetryUniforms();
    this.emitBathymetryOverlayStatus();
  }

  private emitGibsOverlayStatus() {
    if (typeof window !== 'undefined') {
      window.__COSMOS_GIBS_SURFACE_OVERLAY_STATE__ = this.gibsSurfaceOverlayStatus;
    }
    this.onGibsOverlayStatusUpdate?.(this.gibsSurfaceOverlayStatus);
  }

  private syncGibsSurfaceUniforms() {
    if (!this.planetMat) return;
    const u = this.planetMat.uniforms;
    if (u.uGibsSurfaceOverlay) u.uGibsSurfaceOverlay.value = this.gibsSurfaceTexture;
    if (u.uGibsSurfaceOverlayReady) u.uGibsSurfaceOverlayReady.value = this.gibsSurfaceOverlayReady;
    if (u.uGibsSurfaceOverlayStrength) u.uGibsSurfaceOverlayStrength.value = this.settings.gibsSurfaceOverlayStrength;
    if (u.uGibsSurfaceWaterBias) u.uGibsSurfaceWaterBias.value = this.settings.gibsSurfaceWaterBias;
  }

  private async bootstrapGibsSurfaceOverlay() {
    this.gibsSurfaceOverlayStatus = { ...this.gibsSurfaceOverlayStatus, state: 'loading', message: 'Searching for local NASA GIBS surface atlas.' };
    this.emitGibsOverlayStatus();
    const result = await loadCosmosGibsSurfaceOverlay();
    if (result.status.state === 'loaded') {
      this.gibsSurfaceTexture.dispose();
      this.gibsSurfaceTexture = result.texture;
      this.gibsSurfaceOverlayReady = 1;
    } else {
      result.texture.dispose();
      this.gibsSurfaceOverlayReady = 0;
    }
    this.gibsSurfaceOverlayStatus = result.status;
    this.syncGibsSurfaceUniforms();
    this.emitGibsOverlayStatus();
  }

  private init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.autoClear = false;
    this.configureRendererDiagnostics();
    this.bindRuntimeContextEvents();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.canvas.clientWidth / this.canvas.clientHeight, 0.05, 8e7);
    this.camera.position.set(0, 15, 50);

    // Orthographic camera for fullscreen quad passes
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.updateSun();
    this.createSky();
    this.createGlobe();
    this.createOcean();
    this.createParticles();
    this.createTerrain();
    this.createClouds();
    this.createPlanet();
    this.createDebugOverlays();
    this.emitAtmosphereLutState();
    this.emitRuntimeDiagnosticsState();
    this.generateSpectrum();
    this.syncWaves();
    this.updateCam();
    this.bindEvents();
    void this.bootstrapGibsSurfaceOverlay();
    void this.bootstrapBathymetryOverlay();
  }

  private updateSun() {
    const e = this.settings.sunE * DEG;
    const a = this.settings.sunA * DEG;
    this.sunDir.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).normalize();
  }

  private createSky() {
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: skyVS,
      fragmentShader: skyFS,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uSunDir: { value: this.sunDir },
        uSunI: { value: this.settings.sunI },
        uExpo: { value: this.settings.expo },
        uAlt: { value: 15 },
        uTime: { value: 0 },
        ...this.createScaleUniforms(),
        uAtmosphereContinuityStrength: { value: this.settings.atmosphereContinuityStrength },
        uHorizonHazeStrength: { value: this.settings.horizonHazeStrength },
        uCloudLodBias: { value: this.settings.cloudLodBias },
        ...this.createAtmosphereLutUniforms(),
      },
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(50000, 32, 16), this.skyMat);
    this.skyMesh.renderOrder = -10;
    this.scene.add(this.skyMesh);
  }

  private createGlobe() {
    const globeGeo = new THREE.SphereGeometry(COSMOS_EARTH_RADIUS_M, 96, 48);
    const globeMat = new THREE.MeshBasicMaterial({ color: 0x061828 });
    this.globeMesh = new THREE.Mesh(globeGeo, globeMat);
    this.globeMesh.position.copy(this.planetCenter);
    this.globeMesh.renderOrder = 0;
    this.scene.add(this.globeMesh);
  }

  private createOcean() {
    this.oceanUnis = {
      uTime: { value: 0 },
      uW: { value: this.uWaves },
      uW2: { value: this.uWaves2 },
      uWN: { value: this.waveParams.length },
      uR: { value: this.uRings },
      uR2: { value: this.uRings2 },
      uRN: { value: 0 },
      uSunDir: { value: this.sunDir },
      uSunI: { value: this.settings.sunI },
      uExpo: { value: this.settings.expo },
      uAlt: { value: 15 },
      uCam: { value: new THREE.Vector3() },
      uDeep: { value: new THREE.Vector3(this.settings.dR, this.settings.dG, this.settings.dB) },
      uScat: { value: this.settings.scat },
      uRough: { value: this.settings.rough },
      uFoamA: { value: this.settings.foamA },
      uFoamT: { value: this.settings.foamT },
      uInvP: { value: new THREE.Matrix4() },
      uInvV: { value: new THREE.Matrix4() },
      uPFS: { value: 15000 },
      uPFE: { value: 22000 },
      ...this.createScaleUniforms(),
      uCosmosWeatherAtlasA: { value: this.weatherAtlas.weatherA },
      uCosmosWeatherAtlasB: { value: this.weatherAtlas.weatherB },
      uCosmosTerrainForcingA: { value: this.weatherAtlas.terrainForcingA },
      uCosmosTerrainForcingB: { value: this.weatherAtlas.terrainForcingB },
      uWeatherAtlasStrength: { value: this.settings.weatherAtlasStrength },
      uCloudRegimeContrast: { value: this.settings.cloudRegimeContrast },
      uMacroWeatherScale: { value: this.settings.macroWeatherScale },
      uWeatherAnchor: { value: this.weatherAnchor },
      uCosmosBathymetryAtlas: { value: this.bathymetryTexture },
      uCosmosBathymetryReady: { value: this.bathymetryOverlayReady },
      uBathymetryStrength: { value: this.settings.bathymetryStrength },
      uShallowWaterOptics: { value: this.settings.shallowWaterOptics },
      uCoastalFoamStrength: { value: this.settings.coastalFoamStrength },
      uOneWaterOpticsStrength: { value: this.settings.oneWaterOpticsStrength },
      uAtmosphereContinuityStrength: { value: this.settings.atmosphereContinuityStrength },
      uHorizonHazeStrength: { value: this.settings.horizonHazeStrength },
      uCloudLodBias: { value: this.settings.cloudLodBias },
      ...this.createAtmosphereLutUniforms(),
    };

    this.oceanMat = new THREE.ShaderMaterial({
      vertexShader: oceanVS,
      fragmentShader: oceanFS,
      uniforms: this.oceanUnis,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });

    const oceanMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 280, 280), this.oceanMat);
    oceanMesh.frustumCulled = false;
    oceanMesh.renderOrder = 1;
    this.scene.add(oceanMesh);
  }

  private createParticles() {
    this.pGeo = new THREE.BufferGeometry();
    const pPA = new THREE.BufferAttribute(new Float32Array(this.PMAX * 3), 3);
    pPA.setUsage(THREE.DynamicDrawUsage);
    const pSA = new THREE.BufferAttribute(new Float32Array(this.PMAX), 1);
    pSA.setUsage(THREE.DynamicDrawUsage);
    const pAA = new THREE.BufferAttribute(new Float32Array(this.PMAX), 1);
    pAA.setUsage(THREE.DynamicDrawUsage);
    this.pGeo.setAttribute('position', pPA);
    this.pGeo.setAttribute('aSize', pSA);
    this.pGeo.setAttribute('aAlpha', pAA);

    this.pMat = new THREE.ShaderMaterial({
      vertexShader: partVS,
      fragmentShader: partFS,
      uniforms: {
        uSunDir: { value: this.sunDir },
        uSunI: { value: this.settings.sunI },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const partMesh = new THREE.Points(this.pGeo, this.pMat);
    partMesh.renderOrder = 2;
    this.scene.add(partMesh);
  }

  // ── New render passes ──

  private createTerrain() {
    const sharedUnis = {
      uCam: { value: new THREE.Vector3() },
      uSunDir: { value: this.sunDir },
      uSunI: { value: this.settings.sunI },
      uExpo: { value: this.settings.expo },
      uAlt: { value: 15 },
      uTime: { value: 0 },
      uInvP: { value: new THREE.Matrix4() },
      uInvV: { value: new THREE.Matrix4() },
      uRes: { value: new THREE.Vector2() },
      ...this.createScaleUniforms(),
    };

    this.terrainMat = new THREE.ShaderMaterial({
      vertexShader: terrainVS,
      fragmentShader: terrainFS,
      uniforms: sharedUnis,
      transparent: false,
      depthWrite: false,
      depthTest: false,
    });

    this.terrainScene = new THREE.Scene();
    const quad = new THREE.PlaneGeometry(2, 2);
    this.terrainMesh = new THREE.Mesh(quad, this.terrainMat);
    this.terrainScene.add(this.terrainMesh);
  }

  private createClouds() {
    const sharedUnis = {
      uCam: { value: new THREE.Vector3() },
      uSunDir: { value: this.sunDir },
      uSunI: { value: this.settings.sunI },
      uExpo: { value: this.settings.expo },
      uAlt: { value: 15 },
      uTime: { value: 0 },
      uInvP: { value: new THREE.Matrix4() },
      uInvV: { value: new THREE.Matrix4() },
      uRes: { value: new THREE.Vector2() },
      ...this.createScaleUniforms(),
      uCloudBase: { value: 2000 },
      uCloudTop: { value: 4500 },
      uCloudCover: { value: this.settings.cloudCover },
      uCloudDensity: { value: this.settings.cloudDensity },
      uCosmosWeatherAtlasA: { value: this.weatherAtlas.weatherA },
      uCosmosWeatherAtlasB: { value: this.weatherAtlas.weatherB },
      uCosmosTerrainForcingA: { value: this.weatherAtlas.terrainForcingA },
      uCosmosTerrainForcingB: { value: this.weatherAtlas.terrainForcingB },
      uWeatherAtlasStrength: { value: this.settings.weatherAtlasStrength },
      uCloudRegimeContrast: { value: this.settings.cloudRegimeContrast },
      uMacroWeatherScale: { value: this.settings.macroWeatherScale },
      uWeatherAnchor: { value: this.weatherAnchor },
      uAtmosphereContinuityStrength: { value: this.settings.atmosphereContinuityStrength },
      uHorizonHazeStrength: { value: this.settings.horizonHazeStrength },
      uCloudLodBias: { value: this.settings.cloudLodBias },
      ...this.createAtmosphereLutUniforms(),
    };

    this.cloudMat = new THREE.ShaderMaterial({
      vertexShader: cloudVS,
      fragmentShader: cloudFS,
      uniforms: sharedUnis,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    });

    this.cloudScene = new THREE.Scene();
    const quad = new THREE.PlaneGeometry(2, 2);
    this.cloudMesh = new THREE.Mesh(quad, this.cloudMat);
    this.cloudScene.add(this.cloudMesh);
  }

  private createPlanet() {
    const sharedUnis = {
      uCam: { value: new THREE.Vector3() },
      uSunDir: { value: this.sunDir },
      uSunI: { value: this.settings.sunI },
      uExpo: { value: this.settings.expo },
      uAlt: { value: 15 },
      uTime: { value: 0 },
      uInvP: { value: new THREE.Matrix4() },
      uInvV: { value: new THREE.Matrix4() },
      uRes: { value: new THREE.Vector2() },
      ...this.createScaleUniforms(),
      uCloudCover: { value: this.settings.cloudCover },
      uCloudDensity: { value: this.settings.cloudDensity },
      uCosmosWeatherAtlasA: { value: this.weatherAtlas.weatherA },
      uCosmosWeatherAtlasB: { value: this.weatherAtlas.weatherB },
      uCosmosTerrainForcingA: { value: this.weatherAtlas.terrainForcingA },
      uCosmosTerrainForcingB: { value: this.weatherAtlas.terrainForcingB },
      uWeatherAtlasStrength: { value: this.settings.weatherAtlasStrength },
      uCloudRegimeContrast: { value: this.settings.cloudRegimeContrast },
      uMacroWeatherScale: { value: this.settings.macroWeatherScale },
      uWeatherAnchor: { value: this.weatherAnchor },
      uCosmosBathymetryAtlas: { value: this.bathymetryTexture },
      uCosmosBathymetryReady: { value: this.bathymetryOverlayReady },
      uBathymetryStrength: { value: this.settings.bathymetryStrength },
      uShallowWaterOptics: { value: this.settings.shallowWaterOptics },
      uCoastalFoamStrength: { value: this.settings.coastalFoamStrength },
      uOneWaterOpticsStrength: { value: this.settings.oneWaterOpticsStrength },
      uGibsSurfaceOverlay: { value: this.gibsSurfaceTexture },
      uGibsSurfaceOverlayReady: { value: this.gibsSurfaceOverlayReady },
      uGibsSurfaceOverlayStrength: { value: this.settings.gibsSurfaceOverlayStrength },
      uGibsSurfaceWaterBias: { value: this.settings.gibsSurfaceWaterBias },
      uAtmosphereContinuityStrength: { value: this.settings.atmosphereContinuityStrength },
      uHorizonHazeStrength: { value: this.settings.horizonHazeStrength },
      uCloudLodBias: { value: this.settings.cloudLodBias },
      ...this.createAtmosphereLutUniforms(),
    };

    this.planetMat = new THREE.ShaderMaterial({
      vertexShader: planetVS,
      fragmentShader: planetFS,
      uniforms: sharedUnis,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.planetScene = new THREE.Scene();
    const quad = new THREE.PlaneGeometry(2, 2);
    this.planetMesh = new THREE.Mesh(quad, this.planetMat);
    this.planetScene.add(this.planetMesh);
  }



  private makeShellWireframe(radiusMeters: number, color: number, opacity: number): THREE.LineSegments {
    const geometry = new THREE.WireframeGeometry(new THREE.SphereGeometry(radiusMeters, 96, 48));
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
    });
    this.debugShellMaterials.push(material);
    const shell = new THREE.LineSegments(geometry, material);
    shell.frustumCulled = false;
    shell.renderOrder = 9000;
    return shell;
  }

  private createDebugOverlays() {
    this.debugOverlayMat = new THREE.ShaderMaterial({
      vertexShader: debugOverlayVS,
      fragmentShader: debugOverlayFS,
      uniforms: {
        uCam: { value: new THREE.Vector3() },
        uInvP: { value: new THREE.Matrix4() },
        uInvV: { value: new THREE.Matrix4() },
        uRes: { value: new THREE.Vector2() },
        uTime: { value: 0 },
        ...this.createScaleUniforms(),
        uCloudBase: { value: this.scaleState.cloudBaseMeters },
        uCloudTop: { value: this.scaleState.cloudTopMeters },
        uAtmosphereContinuityStrength: { value: this.settings.atmosphereContinuityStrength },
        uHorizonHazeStrength: { value: this.settings.horizonHazeStrength },
        uCloudLodBias: { value: this.settings.cloudLodBias },
        uCosmosDebugOverlayMode: { value: this.settings.debugOverlayMode },
        uCosmosDebugOverlayStrength: { value: this.settings.debugOverlayStrength },
        uCosmosDebugShellOpacity: { value: this.settings.debugShellOpacity },
        uSunDir: { value: this.sunDir },
        ...this.createAtmosphereLutUniforms(),
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    });

    const debugScene = new THREE.Scene();
    this.debugOverlayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.debugOverlayMat);
    debugScene.add(this.debugOverlayMesh);
    this.debugOverlayScene = debugScene;

    this.debugShellScene = new THREE.Scene();
    this.debugShellGroup = new THREE.Group();
    this.debugShellGroup.position.copy(this.planetCenter);
    this.debugShellGroup.add(this.makeShellWireframe(COSMOS_EARTH_RADIUS_M, 0x12ff58, 0.26));
    this.debugShellGroup.add(this.makeShellWireframe(COSMOS_EARTH_RADIUS_M + this.scaleState.cloudBaseMeters, 0x00d8ff, 0.22));
    this.debugShellGroup.add(this.makeShellWireframe(COSMOS_EARTH_RADIUS_M + this.scaleState.cloudTopMeters, 0xff25ef, 0.22));
    this.debugShellGroup.add(this.makeShellWireframe(COSMOS_ATMOSPHERE_RADIUS_M, 0xff9b24, 0.30));
    this.debugShellGroup.visible = false;
    this.debugShellScene.add(this.debugShellGroup);
  }

  private spectrumSeed(): number {
    const source = [
      this.settings.waveH.toFixed(3),
      this.settings.windS.toFixed(3),
      this.settings.windA.toFixed(3),
      this.settings.chop.toFixed(3),
    ].join('|');
    let h = 2166136261;
    for (let i = 0; i < source.length; i++) {
      h ^= source.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  private seeded01(seed: number, index: number): number {
    let x = (seed + Math.imul(index + 1, 0x9E3779B9)) >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x7feb352d);
    x ^= x >>> 15;
    x = Math.imul(x, 0x846ca68b);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  // ── Wave Spectrum (JONSWAP) ──
  private generateSpectrum() {
    const g = 9.81;
    const U = Math.max(this.settings.windS, 0.5);
    const dir = (this.settings.windA || 45) * DEG;
    const pk = 0.88 * g / U;
    this.waveParams = [];
    const N = Math.min(12, MAX_WAVES);
    const seed = this.spectrumSeed();
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N;
      const om = pk * Math.pow(2, (t - 0.4) * 3.5);
      const k = om * om / g;
      const sig = om <= pk ? 0.07 : 0.09;
      const gam = 3.3;
      const r = Math.exp(-Math.pow(om - pk, 2) / (2 * sig * sig * pk * pk));
      const al = 0.0081;
      const Sw = al * g * g / Math.pow(om, 5) * Math.exp(-1.25 * Math.pow(pk / om, 4)) * Math.pow(gam, r);
      const dOm = pk * Math.pow(2, 3.5 / N) * 0.5;
      const A = Math.sqrt(2 * Sw * dOm) * this.settings.waveH * 0.5;
      const spread = (this.seeded01(seed, i * 2) - 0.5) * 1.2 * Math.pow(1 - t, 0.5);
      const d = dir + spread;
      const Q = Math.min(this.settings.chop * 0.8 / Math.max(k * A * N * 0.5, 0.001), 1);
      this.waveParams.push({
        A, kx: Math.cos(d) * k, kz: Math.sin(d) * k,
        omega: om, Q, phase: this.seeded01(seed, i * 2 + 1) * TAU, k
      });
    }
  }

  private syncWaves() {
    for (let i = 0; i < MAX_WAVES; i++) {
      if (i < this.waveParams.length) {
        const w = this.waveParams[i];
        this.uWaves[i].set(w.A, w.kx, w.kz, w.omega);
        this.uWaves2[i].set(w.Q, w.phase, w.k, 0);
      } else {
        this.uWaves[i].set(0, 0, 0, 0);
        this.uWaves2[i].set(0, 0, 0, 0);
      }
    }
  }

  private syncRings() {
    for (let i = 0; i < MAX_RINGS; i++) {
      if (i < this.ringWaves.length) {
        const r = this.ringWaves[i];
        this.uRings[i].set(r.x, r.z, r.amp, r.t);
        this.uRings2[i].set(r.k, r.c, r.damp, r.spatial);
      } else {
        this.uRings[i].set(0, 0, 0, -100);
        this.uRings2[i].set(0, 0, 0, 0);
      }
    }
  }

  private cpuWaveHeight(x: number, z: number, t: number): number {
    let y = 0;
    for (const w of this.waveParams) {
      y += w.A * Math.cos(w.kx * x + w.kz * z - w.omega * t + w.phase);
    }
    for (const rw of this.ringWaves) {
      const dx = x - rw.x, dz = z - rw.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const age = t - rw.t;
      if (age < 0 || age > rw.life) continue;
      const front = rw.c * age, edge = 0.35 + 1.5 / Math.max(rw.k, 0.001);
      const fm = smoothstep(0, edge, front - dist);
      y += rw.amp * Math.exp(-rw.damp * age) * Math.exp(-rw.spatial * dist) * fm * Math.sin(rw.k * (dist - rw.c * age));
    }
    return y;
  }

  private emitRipple(x: number, z: number, energy: number) {
    if (energy < 0.001) return;
    const lam = lerp(0.3, 2.5, clamp(energy / 12, 0, 1));
    const k = TAU / lam;
    const c = Math.sqrt(9.81 / Math.max(k, 0.001));
    const amp = Math.min(0.15 * Math.sqrt(energy), 1.5);
    this.ringWaves.push({ x, z, t: this.time, k, c, damp: 1.1, spatial: 0.04, amp, life: 8 });
    if (this.ringWaves.length > MAX_RINGS) this.ringWaves.shift();
  }

  private spawnSplash(wx: number, wy: number, wz: number, count: number, force: number) {
    for (let i = 0; i < count && this.pCount < this.PMAX; i++) {
      const idx = this.pCount;
      const ang = Math.random() * TAU;
      const up = 0.4 + Math.random() * 0.8;
      const sp = 0.3 + Math.random() * 0.7;
      this.pPos[idx * 3] = wx + (Math.random() - 0.5) * 1.2;
      this.pPos[idx * 3 + 1] = wy + Math.random() * 0.2;
      this.pPos[idx * 3 + 2] = wz + (Math.random() - 0.5) * 1.2;
      this.pVel[idx * 3] = Math.cos(ang) * sp * force;
      this.pVel[idx * 3 + 1] = up * force * (0.8 + Math.random() * 0.5);
      this.pVel[idx * 3 + 2] = Math.sin(ang) * sp * force;
      this.pLife[idx] = 1.5 + Math.random() * 2.5;
      this.pSize[idx] = 0.06 + Math.random() * 0.22;
      this.pAlpha[idx] = 0.5 + Math.random() * 0.5;
      this.pCount++;
    }
  }

  private updateParticles(dt: number) {
    let alive = 0;
    for (let i = 0; i < this.pCount; i++) {
      this.pLife[i] -= dt;
      if (this.pLife[i] <= 0) continue;
      this.pVel[i * 3 + 1] -= 9.81 * dt;
      this.pPos[i * 3] += this.pVel[i * 3] * dt;
      this.pPos[i * 3 + 1] += this.pVel[i * 3 + 1] * dt;
      this.pPos[i * 3 + 2] += this.pVel[i * 3 + 2] * dt;
      const sy = this.cpuWaveHeight(this.pPos[i * 3], this.pPos[i * 3 + 2], this.time);
      if (this.pPos[i * 3 + 1] < sy && this.pVel[i * 3 + 1] < 0) {
        const impact = -this.pVel[i * 3 + 1];
        if (impact > 0.4) {
          this.emitRipple(this.pPos[i * 3], this.pPos[i * 3 + 2], impact * impact * clamp(this.pSize[i] / 0.14, 0.35, 2.5) * 0.3);
        }
        this.pPos[i * 3 + 1] = sy;
        if (impact < 2) { this.pLife[i] = 0; continue; }
        this.pVel[i * 3 + 1] *= -0.12;
        this.pVel[i * 3] *= 0.3;
        this.pVel[i * 3 + 2] *= 0.3;
        this.pLife[i] -= 0.7;
      }
      this.pAlpha[i] = Math.min(this.pLife[i] / 0.5, 1) * 0.65;
      if (alive !== i) {
        this.pPos[alive * 3] = this.pPos[i * 3];
        this.pPos[alive * 3 + 1] = this.pPos[i * 3 + 1];
        this.pPos[alive * 3 + 2] = this.pPos[i * 3 + 2];
        this.pVel[alive * 3] = this.pVel[i * 3];
        this.pVel[alive * 3 + 1] = this.pVel[i * 3 + 1];
        this.pVel[alive * 3 + 2] = this.pVel[i * 3 + 2];
        this.pLife[alive] = this.pLife[i];
        this.pSize[alive] = this.pSize[i];
        this.pAlpha[alive] = this.pAlpha[i];
      }
      alive++;
    }
    this.pCount = alive;
  }

  // ── Camera ──
  private updateCam() {
    if (this.settings.carpet || this.settings.cinematic) return;
    const x = this.camDist * Math.sin(this.camPhi) * Math.sin(this.camTh);
    const y = this.camDist * Math.cos(this.camPhi);
    const z = this.camDist * Math.sin(this.camPhi) * Math.cos(this.camTh);
    this.camera.position.set(this.camTgt.x + x, this.camTgt.y + Math.max(y, 1.5), this.camTgt.z + z);
    this.camera.lookAt(this.camTgt);
  }

  private updateCarpet(dt: number) {
    if (!this.settings.carpet) return;
    const d = (this.settings.windA || 45) * DEG;
    this.carpetPos.x += Math.cos(d) * this.settings.carpS * dt;
    this.carpetPos.z += Math.sin(d) * this.settings.carpS * dt;
    this.carpetPos.y = this.cpuWaveHeight(this.carpetPos.x, this.carpetPos.z, this.time) + this.settings.carpH;
    const ax = this.carpetPos.x + Math.cos(d) * 15;
    const az = this.carpetPos.z + Math.sin(d) * 15;
    this.carpetLook.set(ax, this.cpuWaveHeight(ax, az, this.time) + this.settings.carpH * 0.5, az);
    this.camera.position.lerp(this.carpetPos, 0.06);
    this.camera.lookAt(this.carpetLook);
  }

  // Cinematic camera — sweeping orbit with altitude transitions
  // Enhanced with space-to-ground flythrough capability
  private updateCinematic(dt: number) {
    if (!this.settings.cinematic) return;
    this.cinematicTime += dt * 0.15;
    const t = this.cinematicTime;

    // Multi-phase cinematic: ocean sweep → climb → space → descent
    const phase = (t * 0.05) % 4.0; // 4 phases

    let altitude: number, radius: number, angle: number;

    if (phase < 1.0) {
      // Phase 0: Low ocean sweep
      altitude = 12 + 30 * Math.sin(t * 0.3) * Math.sin(t * 0.3);
      radius = 40 + 20 * Math.sin(t * 0.2);
      angle = t * 0.4;
    } else if (phase < 2.0) {
      // Phase 1: Climbing through clouds
      const p = phase - 1.0;
      altitude = lerp(50, 8000, p * p);
      radius = lerp(60, 200, p);
      angle = t * 0.3;
    } else if (phase < 3.0) {
      // Phase 2: Space view
      const p = phase - 2.0;
      altitude = lerp(8000, 80000, Math.sin(p * PI * 0.5));
      radius = 300 + 100 * Math.sin(t * 0.15);
      angle = t * 0.2;
    } else {
      // Phase 3: Descent back to surface
      const p = phase - 3.0;
      altitude = lerp(80000, 20, p * p * p);
      radius = lerp(300, 50, p);
      angle = t * 0.35;
    }

    const cx = radius * Math.sin(angle);
    const cz = radius * Math.cos(angle);
    const cy = altitude;

    const targetPos = new THREE.Vector3(cx, cy, cz);
    this.camera.position.lerp(targetPos, 0.02);

    // Look at: when high look at planet center, when low look at ocean
    const lookAngle = angle + 0.3;
    const lookR = radius * 0.5;
    const lx = lookR * Math.sin(lookAngle);
    const lz = lookR * Math.cos(lookAngle);
    let ly: number;
    if (altitude > 5000) {
      ly = 0; // look at sea level from space
    } else {
      ly = this.cpuWaveHeight(lx, lz, this.time) + 2;
    }
    const lookTarget = new THREE.Vector3(lx, ly, lz);
    this.camTgt.lerp(lookTarget, 0.02);
    this.camera.lookAt(this.camTgt);
  }

  private lastAuto = 0;
  private autoSpawn() {
    if (this.time - this.lastAuto < 0.35) return;
    this.lastAuto = this.time;
    const ref = this.settings.carpet ? this.carpetPos : this.camTgt;
    const cx = ref.x + (Math.random() - 0.5) * 70;
    const cz = ref.z + (Math.random() - 0.5) * 70;
    const eps = 0.5;
    const h0 = this.cpuWaveHeight(cx, cz, this.time);
    const hx = this.cpuWaveHeight(cx + eps, cz, this.time);
    const hz = this.cpuWaveHeight(cx, cz + eps, this.time);
    const slope = Math.sqrt(Math.pow((hx - h0) / eps, 2) + Math.pow((hz - h0) / eps, 2));
    if (slope > 0.45 + Math.random() * 0.5 && this.settings.foamA > 0.3) {
      this.spawnSplash(cx, h0, cz, Math.round(2 + slope * 6), slope * 2);
    }
  }

  // ── Events ──
  private boundMouseDown: (e: MouseEvent) => void = () => {};
  private boundMouseMove: (e: MouseEvent) => void = () => {};
  private boundMouseUp: (e: MouseEvent) => void = () => {};
  private boundWheel: (e: WheelEvent) => void = () => {};
  private boundResize: () => void = () => {};
  private boundKeydown: (e: KeyboardEvent) => void = () => {};

  private bindEvents() {
    this.boundMouseDown = (e: MouseEvent) => {
      this.downX = e.clientX; this.downY = e.clientY; this.didMove = false;
      if (e.button === 2) this.rDrag = true; else this.dragging = true;
      this.lastMX = e.clientX; this.lastMY = e.clientY;
      if (this.settings.cinematic) this.settings.cinematic = false;
    };
    this.boundMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - this.lastMX, dy = e.clientY - this.lastMY;
      if (Math.abs(e.clientX - this.downX) + Math.abs(e.clientY - this.downY) > 3) this.didMove = true;
      if (this.dragging && !e.altKey) {
        this.camTh -= dx * 0.005;
        this.camPhi = Math.max(0.15, Math.min(PI * 0.48, this.camPhi - dy * 0.005));
        this.updateCam();
      }
      if (this.rDrag) {
        const fw = new THREE.Vector3().subVectors(this.camTgt, this.camera.position).normalize();
        const rt = new THREE.Vector3().crossVectors(fw, this.camera.up).normalize();
        this.camTgt.addScaledVector(rt, -dx * this.camDist * 0.002);
        this.camTgt.y += dy * this.camDist * 0.002;
        this.updateCam();
      }
      this.lastMX = e.clientX; this.lastMY = e.clientY;
    };
    this.boundMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && !this.didMove) this.castSplash(e.clientX, e.clientY);
      this.dragging = false; this.rDrag = false;
    };
    this.boundWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.camDist *= (1 + e.deltaY * 0.001);
      this.camDist = Math.max(5, Math.min(1.5e8, this.camDist));
      if (this.settings.cinematic) this.settings.cinematic = false;
      this.updateCam();
    };
    this.boundResize = () => {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    this.boundKeydown = (e: KeyboardEvent) => {
      const names = Object.keys(PRESETS);
      if (e.key >= '1' && e.key <= '9' && names[+e.key - 1]) {
        this.applyPreset(names[+e.key - 1]);
      }
      if (e.key === 'c' || e.key === 'C') {
        this.settings.cinematic = !this.settings.cinematic;
      }
    };

    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', this.boundResize);
    document.addEventListener('keydown', this.boundKeydown);
  }

  private rc = new THREE.Raycaster();
  private m2v = new THREE.Vector2();
  private oPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private castSplash(mx: number, my: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.m2v.set(((mx - rect.left) / rect.width) * 2 - 1, -((my - rect.top) / rect.height) * 2 + 1);
    this.rc.setFromCamera(this.m2v, this.camera);
    const hit = new THREE.Vector3();
    if (this.rc.ray.intersectPlane(this.oPlane, hit)) {
      const wh = this.cpuWaveHeight(hit.x, hit.z, this.time);
      this.emitRipple(hit.x, hit.z, this.settings.splF);
      this.spawnSplash(hit.x, wh, hit.z, Math.round(25 + Math.random() * 35), this.settings.splF);
    }
  }

  // ── Public API ──
  applyPreset(name: string) {
    const p = PRESETS[name];
    if (!p) return;
    Object.assign(this.settings, {
      ...p,
      cloudCover: p.cloudCover ?? 0.4,
      cloudDensity: p.cloudDensity ?? 0.6,
    });
    this.generateSpectrum();
    this.syncWaves();
    this.updateSun();
    this.oceanUnis.uWN.value = this.waveParams.length;
    if (name === 'aerial') { this.camDist = 200; this.camPhi = 0.6; this.camTh = 0.5; }
    if (name === 'midnight') { this.camDist = 45; this.camPhi = 1.1; this.camTh = 2; }
    if (name === 'space') { this.camDist = 100000; this.camPhi = 0.8; this.camTh = 0; }
    this.updateCam();
  }

  updateSettings(partial: Partial<WorldSettings>) {
    const needSpectrum = ['waveH', 'windS', 'windA', 'chop'].some(k => k in partial);
    const needSun = ['sunE', 'sunA'].some(k => k in partial);
    const needAtmosphereLut = [
      'atmosphereLutStrength',
      'rayleighScale',
      'mieScale',
      'ozoneScale',
      'multiScatteringStrength',
      'aerialPerspectiveStrength',
      'skyViewLutStrength',
      'opticalDepthDebugStrength',
    ].some(k => k in partial);
    Object.assign(this.settings, partial);
    if (needSpectrum) { this.generateSpectrum(); this.syncWaves(); this.oceanUnis.uWN.value = this.waveParams.length; }
    if (needSun) this.updateSun();
    if (needAtmosphereLut) {
      this.rebuildAtmosphereLuts();
    }
    if ('debugOverlayMode' in partial || 'debugOverlayStrength' in partial || 'debugShellsEnabled' in partial || 'debugShellOpacity' in partial || 'opticalDepthDebugStrength' in partial) {
      this.syncDebugOverlayState();
    }
  }

  private syncDebugOverlayState() {
    if (this.debugOverlayMat) {
      const u = this.debugOverlayMat.uniforms;
      if (u.uCosmosDebugOverlayMode) u.uCosmosDebugOverlayMode.value = this.settings.debugOverlayMode;
      if (u.uCosmosDebugOverlayStrength) u.uCosmosDebugOverlayStrength.value = this.settings.debugOverlayStrength;
      if (u.uCosmosDebugShellOpacity) u.uCosmosDebugShellOpacity.value = this.settings.debugShellOpacity;
      this.syncAtmosphereLutUniforms(this.debugOverlayMat);
    }
    const shellVisible = this.settings.debugShellsEnabled && this.settings.debugOverlayMode > 0;
    if (this.debugShellGroup) this.debugShellGroup.visible = shellVisible;
    for (const material of this.debugShellMaterials) {
      material.opacity = this.settings.debugShellOpacity;
      material.needsUpdate = true;
    }
    this.emitDebugOverlayState();
  }

  applyReviewBookmark(id: CosmosReviewBookmarkId) {
    const bookmark = COSMOS_REVIEW_BOOKMARKS.find((item) => item.id === id);
    if (!bookmark) return;
    this.activeReviewBookmarkId = id;
    const preset = PRESETS[bookmark.preset];
    Object.assign(this.settings, {
      ...preset,
      cloudCover: preset.cloudCover ?? this.settings.cloudCover,
      cloudDensity: preset.cloudDensity ?? this.settings.cloudDensity,
      ...bookmark.overrides,
      cinematic: false,
      carpet: false,
    });
    this.weatherAnchor.set(bookmark.weatherSampleUv[0], bookmark.weatherSampleUv[1]);
    this.camera.fov = bookmark.fov;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(...bookmark.position);
    this.camTgt.set(...bookmark.target);
    this.camera.lookAt(this.camTgt);
    this.camDist = this.camera.position.distanceTo(this.camTgt);
    const dx = this.camera.position.x - this.camTgt.x;
    const dy = this.camera.position.y - this.camTgt.y;
    const dz = this.camera.position.z - this.camTgt.z;
    this.camPhi = Math.acos(THREE.MathUtils.clamp(dy / Math.max(this.camDist, 1e-6), -1, 1));
    this.camTh = Math.atan2(dx, dz);
    this.updateSun();
    this.rebuildAtmosphereLuts();
    this.generateSpectrum();
    this.syncWaves();
    this.oceanUnis.uWN.value = this.waveParams.length;
    this.updateScaleState();
  }

  getReviewBookmark(id: CosmosReviewBookmarkId): CosmosReviewBookmark | undefined {
    return COSMOS_REVIEW_BOOKMARKS.find((item) => item.id === id);
  }

  start() {
    this.animate();
  }

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    window.removeEventListener('resize', this.boundResize);
    document.removeEventListener('keydown', this.boundKeydown);
    this.weatherAtlas.dispose();
    disposeCosmosAtmosphereLutTextures(this.atmosphereLuts);
    this.gibsSurfaceTexture.dispose();
    this.bathymetryTexture.dispose();
    this.debugOverlayMat?.dispose();
    this.debugOverlayMesh?.geometry.dispose();
    this.debugShellGroup?.traverse((object) => {
      if (object instanceof THREE.LineSegments) {
        object.geometry.dispose();
      }
    });
    for (const material of this.debugShellMaterials) material.dispose();
    this.renderer.dispose();
  }

  // ── Uniform Sync Helper ──
  private syncPassUniforms(mat: THREE.ShaderMaterial, alt: number) {
    this.syncScaleUniforms(mat);
    const u = mat.uniforms;
    if (u.uCam) u.uCam.value.copy(this.camera.position);
    if (u.uSunDir) u.uSunDir.value.copy(this.sunDir);
    if (u.uSunI) u.uSunI.value = this.settings.sunI;
    if (u.uExpo) u.uExpo.value = this.settings.expo;
    if (u.uAlt) u.uAlt.value = alt;
    if (u.uTime) u.uTime.value = this.time;
    if (u.uInvP) u.uInvP.value.copy(this.camera.projectionMatrixInverse);
    if (u.uInvV) u.uInvV.value.copy(this.camera.matrixWorld);
    if (u.uRes) u.uRes.value.set(this.canvas.clientWidth, this.canvas.clientHeight);
    if (u.uWeatherAtlasStrength) u.uWeatherAtlasStrength.value = this.settings.weatherAtlasStrength;
    if (u.uCloudRegimeContrast) u.uCloudRegimeContrast.value = this.settings.cloudRegimeContrast;
    if (u.uMacroWeatherScale) u.uMacroWeatherScale.value = this.settings.macroWeatherScale;
    if (u.uWeatherAnchor) u.uWeatherAnchor.value.copy(this.weatherAnchor);
    if (u.uGibsSurfaceOverlayReady) u.uGibsSurfaceOverlayReady.value = this.gibsSurfaceOverlayReady;
    if (u.uGibsSurfaceOverlayStrength) u.uGibsSurfaceOverlayStrength.value = this.settings.gibsSurfaceOverlayStrength;
    if (u.uGibsSurfaceWaterBias) u.uGibsSurfaceWaterBias.value = this.settings.gibsSurfaceWaterBias;
    if (u.uCosmosBathymetryAtlas) u.uCosmosBathymetryAtlas.value = this.bathymetryTexture;
    if (u.uCosmosBathymetryReady) u.uCosmosBathymetryReady.value = this.bathymetryOverlayReady;
    if (u.uBathymetryStrength) u.uBathymetryStrength.value = this.settings.bathymetryStrength;
    if (u.uShallowWaterOptics) u.uShallowWaterOptics.value = this.settings.shallowWaterOptics;
    if (u.uCoastalFoamStrength) u.uCoastalFoamStrength.value = this.settings.coastalFoamStrength;
    if (u.uOneWaterOpticsStrength) u.uOneWaterOpticsStrength.value = this.settings.oneWaterOpticsStrength;
    if (u.uCloudCover) u.uCloudCover.value = this.settings.cloudCover;
    if (u.uCloudDensity) u.uCloudDensity.value = this.settings.cloudDensity;
    if (u.uAtmosphereContinuityStrength) u.uAtmosphereContinuityStrength.value = this.settings.atmosphereContinuityStrength;
    if (u.uHorizonHazeStrength) u.uHorizonHazeStrength.value = this.settings.horizonHazeStrength;
    if (u.uCloudLodBias) u.uCloudLodBias.value = this.settings.cloudLodBias;
    this.syncAtmosphereLutUniforms(mat);
    if (u.uCosmosDebugOverlayMode) u.uCosmosDebugOverlayMode.value = this.settings.debugOverlayMode;
    if (u.uCosmosDebugOverlayStrength) u.uCosmosDebugOverlayStrength.value = this.settings.debugOverlayStrength;
    if (u.uCosmosDebugShellOpacity) u.uCosmosDebugShellOpacity.value = this.settings.debugShellOpacity;
  }

  // ── Animation Loop ──
  private animate = () => {
    this.animId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt * this.settings.timeS;
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
      this.emitRuntimeDiagnosticsState();
    }

    this.ringWaves = this.ringWaves.filter(r => (this.time - r.t) < r.life);
    this.updateCarpet(dt);
    this.updateCinematic(dt);
    this.camera.updateMatrixWorld(true);
    this.globeMesh.position.copy(this.planetCenter);
    this.skyMesh.position.copy(this.camera.position);

    const alt = this.updateScaleState();

    // Update ocean uniforms
    const u = this.oceanUnis;
    u.uTime.value = this.time;
    this.syncRings();
    u.uRN.value = this.ringWaves.length;
    u.uCam.value.copy(this.camera.position);
    u.uInvP.value.copy(this.camera.projectionMatrixInverse);
    u.uInvV.value.copy(this.camera.matrixWorld);
    u.uAlt.value = alt;
    u.uSunDir.value.copy(this.sunDir);
    u.uSunI.value = this.settings.sunI;
    u.uExpo.value = this.settings.expo;
    u.uDeep.value.set(this.settings.dR, this.settings.dG, this.settings.dB);
    u.uScat.value = this.settings.scat;
    u.uRough.value = this.settings.rough;
    u.uFoamA.value = this.settings.foamA;
    u.uFoamT.value = this.settings.foamT;
    u.uWeatherAtlasStrength.value = this.settings.weatherAtlasStrength;
    u.uCloudRegimeContrast.value = this.settings.cloudRegimeContrast;
    u.uMacroWeatherScale.value = this.settings.macroWeatherScale;
    u.uWeatherAnchor.value.copy(this.weatherAnchor);
    u.uCosmosBathymetryAtlas.value = this.bathymetryTexture;
    u.uCosmosBathymetryReady.value = this.bathymetryOverlayReady;
    u.uBathymetryStrength.value = this.settings.bathymetryStrength;
    u.uShallowWaterOptics.value = this.settings.shallowWaterOptics;
    u.uCoastalFoamStrength.value = this.settings.coastalFoamStrength;
    u.uOneWaterOpticsStrength.value = this.settings.oneWaterOpticsStrength;
    u.uAtmosphereContinuityStrength.value = this.settings.atmosphereContinuityStrength;
    u.uHorizonHazeStrength.value = this.settings.horizonHazeStrength;
    u.uCloudLodBias.value = this.settings.cloudLodBias;
    this.syncAtmosphereLutUniforms(this.oceanMat);

    // Sky uniforms
    this.skyMat.uniforms.uSunDir.value.copy(this.sunDir);
    this.skyMat.uniforms.uSunI.value = this.settings.sunI;
    this.skyMat.uniforms.uExpo.value = this.settings.expo;
    this.skyMat.uniforms.uAlt.value = alt;
    this.skyMat.uniforms.uTime.value = this.time;
    this.skyMat.uniforms.uAtmosphereContinuityStrength.value = this.settings.atmosphereContinuityStrength;
    this.skyMat.uniforms.uHorizonHazeStrength.value = this.settings.horizonHazeStrength;
    this.skyMat.uniforms.uCloudLodBias.value = this.settings.cloudLodBias;
    this.syncAtmosphereLutUniforms(this.skyMat);

    // Particle uniforms
    this.pMat.uniforms.uSunDir.value.copy(this.sunDir);
    this.pMat.uniforms.uSunI.value = this.settings.sunI;

    // Sync new pass uniforms
    this.syncPassUniforms(this.terrainMat, alt);
    this.syncPassUniforms(this.cloudMat, alt);
    this.syncPassUniforms(this.planetMat, alt);

    this.syncPassUniforms(this.debugOverlayMat, alt);
    this.debugOverlayMat.uniforms.uCosmosDebugOverlayMode.value = this.settings.debugOverlayMode;
    this.debugOverlayMat.uniforms.uCosmosDebugOverlayStrength.value = this.settings.debugOverlayStrength;
    this.debugOverlayMat.uniforms.uCosmosDebugShellOpacity.value = this.settings.debugShellOpacity;
    this.debugShellGroup.position.copy(this.planetCenter);
    this.debugShellGroup.visible = this.settings.debugShellsEnabled && this.settings.debugOverlayMode > 0;
    for (const material of this.debugShellMaterials) material.opacity = this.settings.debugShellOpacity;

    // Cloud-specific uniforms
    this.cloudMat.uniforms.uCloudCover.value = this.settings.cloudCover;
    this.cloudMat.uniforms.uCloudDensity.value = this.settings.cloudDensity;

    // Auto-spawn splashes
    if (alt < 200) {
      this.autoSpawn();
    }
    this.updateParticles(dt);

    // Sync particle buffers
    const pa = (this.pGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const sa = (this.pGeo.attributes.aSize as THREE.BufferAttribute).array as Float32Array;
    const aa = (this.pGeo.attributes.aAlpha as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < this.pCount; i++) {
      pa[i * 3] = this.pPos[i * 3];
      pa[i * 3 + 1] = this.pPos[i * 3 + 1];
      pa[i * 3 + 2] = this.pPos[i * 3 + 2];
      sa[i] = this.pSize[i];
      aa[i] = this.pAlpha[i];
    }
    for (let i = this.pCount; i < Math.min(this.pCount + 50, this.PMAX); i++) aa[i] = 0;
    this.pGeo.attributes.position.needsUpdate = true;
    (this.pGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.pGeo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    this.pGeo.setDrawRange(0, this.pCount);

    // ── Multi-pass rendering ──
    this.renderer.clear();

    // Pass 1: Sky + Globe + Ocean + Particles (main scene)
    this.renderer.render(this.scene, this.camera);

    // Pass 2: Planet (only visible from high altitude — space view)
    if (this.scaleState.planetAlpha > 0.001) {
      this.renderer.render(this.planetScene, this.orthoCamera);
    }

    // Pass 3: Terrain (visible at medium altitude when looking at land)
    // Disabled by default for performance — enable via settings
    // if (this.settings.terrainEnabled && alt < 30000) {
    //   this.renderer.render(this.terrainScene, this.orthoCamera);
    // }

    // Pass 4: Volumetric clouds (visible at various altitudes)
    if (this.settings.cloudsEnabled && this.scaleState.cloudAlpha > 0.001) {
      this.renderer.render(this.cloudScene, this.orthoCamera);
    }

    if (this.settings.debugShellsEnabled && this.settings.debugOverlayMode > 0) {
      this.renderer.render(this.debugShellScene, this.camera);
    }

    if (this.settings.debugOverlayMode > 0 && this.settings.debugOverlayStrength > 0.001) {
      this.renderer.render(this.debugOverlayScene, this.orthoCamera);
    }

    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.fps, this.pCount, this.ringWaves.length, alt);
    }
  };
}
