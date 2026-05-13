import * as THREE from 'three';

const cosmosPublicUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/');

export type CosmosBathymetryOverlayState = 'loading' | 'loaded' | 'fallback' | 'error';

export interface CosmosBathymetryOverlayManifest {
  provider?: string;
  source?: string;
  layer?: string;
  time?: string;
  width?: number;
  height?: number;
  encoding?: string;
  verticalDatum?: string;
  minElevationMeters?: number;
  maxElevationMeters?: number;
  generatedAtUtc?: string;
  citation?: string;
  notes?: string[];
}

export interface CosmosBathymetryOverlayStatus {
  state: CosmosBathymetryOverlayState;
  textureUrl: string;
  manifestUrl: string;
  provider?: string;
  source?: string;
  layer?: string;
  encoding?: string;
  verticalDatum?: string;
  minElevationMeters?: number;
  maxElevationMeters?: number;
  message: string;
}

export interface CosmosBathymetryOverlayLoadResult {
  texture: THREE.Texture;
  status: CosmosBathymetryOverlayStatus;
}

export const COSMOS_BATHYMETRY_DEFAULT_TEXTURE_URL = cosmosPublicUrl('cosmos/bathymetry/global-depth.png');
export const COSMOS_BATHYMETRY_DEFAULT_MANIFEST_URL = cosmosPublicUrl('cosmos/bathymetry/global-depth.manifest.json');

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function fbmLike(lon01: number, lat01: number, octaves = 5) {
  let value = 0;
  let amp = 0.5;
  let scale = 1;
  for (let i = 0; i < octaves; i += 1) {
    const x = lon01 * scale * 6.28318530718;
    const y = lat01 * scale * 3.14159265359;
    value += amp * Math.sin(x * (1.37 + i * 0.41) + Math.cos(y * (1.91 + i * 0.23)) * 2.0);
    value += amp * 0.55 * Math.cos(y * (2.23 + i * 0.37) + Math.sin(x * 0.7) * 1.5);
    scale *= 2.07;
    amp *= 0.48;
  }
  return value * 0.5 + 0.5;
}

export function createProceduralBathymetryTexture(width = 512, height = 256): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const v = y / Math.max(height - 1, 1);
    const lat = (v - 0.5) * Math.PI;
    const absLat = Math.abs(Math.sin(lat));

    for (let x = 0; x < width; x += 1) {
      const u = x / Math.max(width - 1, 1);
      const ridgeA = fbmLike(u, v, 4);
      const ridgeB = fbmLike((u + 0.31) % 1, 1 - v, 5);
      const gyre = 0.5 + 0.5 * Math.sin(u * Math.PI * 10.0 + Math.cos(v * Math.PI * 5.0) * 2.5);
      const islandArc = smoothstep(0.72, 0.94, ridgeA) * smoothstep(0.18, 0.92, ridgeB);
      const polarShelf = smoothstep(0.62, 0.92, absLat) * 0.24;
      const shelf = clamp01(islandArc * 0.68 + smoothstep(0.54, 0.84, gyre) * 0.12 + polarShelf);
      const landMask = smoothstep(0.90, 0.985, ridgeA + islandArc * 0.24 + polarShelf * 0.2);
      const trench = smoothstep(0.82, 0.98, ridgeB) * (1.0 - shelf) * (1.0 - landMask);

      // R channel: normalized water depth, where 0 means land/shore and 1 means abyssal/hadal.
      let depth01 = clamp01(0.72 + trench * 0.25 - shelf * 0.62 - landMask * 0.86);
      depth01 = clamp01(depth01 + (ridgeB - 0.5) * 0.10);

      const coast = clamp01(shelf * (1.0 - landMask) + smoothstep(0.68, 0.92, ridgeA) * 0.35);
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(depth01 * 255);
      data[idx + 1] = Math.round(shelf * 255);
      data[idx + 2] = Math.round(coast * 255);
      data[idx + 3] = Math.round(landMask * 255);
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  texture.name = 'cosmos-procedural-bathymetry-fallback';
  return texture;
}

function normalizeBathymetryTexture(texture: THREE.Texture) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
}

async function fetchManifest(url: string): Promise<CosmosBathymetryOverlayManifest | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as CosmosBathymetryOverlayManifest;
  } catch {
    return null;
  }
}

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        normalizeBathymetryTexture(texture);
        texture.name = 'cosmos-bathymetry-overlay';
        resolve(texture);
      },
      undefined,
      (error) => reject(error),
    );
  });
}

export async function loadCosmosBathymetryOverlay(
  textureUrl = COSMOS_BATHYMETRY_DEFAULT_TEXTURE_URL,
  manifestUrl = COSMOS_BATHYMETRY_DEFAULT_MANIFEST_URL,
): Promise<CosmosBathymetryOverlayLoadResult> {
  const fallbackTexture = createProceduralBathymetryTexture();

  try {
    const manifest = await fetchManifest(manifestUrl);
    if (!manifest) {
      return {
        texture: fallbackTexture,
        status: {
          state: 'fallback',
          textureUrl,
          manifestUrl,
          provider: 'procedural-fallback',
          encoding: 'RGBA depth01/shelf/coast/land',
          verticalDatum: 'synthetic sea-level-relative',
          minElevationMeters: -11000,
          maxElevationMeters: 8500,
          message: 'Using deterministic procedural bathymetry until a local NOAA/GEBCO depth atlas is present.',
        },
      };
    }

    const loadedTexture = await loadTexture(textureUrl);
    fallbackTexture.dispose();

    return {
      texture: loadedTexture,
      status: {
        state: 'loaded',
        textureUrl,
        manifestUrl,
        provider: manifest.provider,
        source: manifest.source,
        layer: manifest.layer,
        encoding: manifest.encoding,
        verticalDatum: manifest.verticalDatum,
        minElevationMeters: manifest.minElevationMeters,
        maxElevationMeters: manifest.maxElevationMeters,
        message: 'Loaded local bathymetry/depth atlas.',
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      texture: fallbackTexture,
      status: {
        state: 'error',
        textureUrl,
        manifestUrl,
        provider: 'procedural-fallback',
        encoding: 'RGBA depth01/shelf/coast/land',
        verticalDatum: 'synthetic sea-level-relative',
        minElevationMeters: -11000,
        maxElevationMeters: 8500,
        message: `Bathymetry atlas failed to load; procedural fallback active. ${detail}`,
      },
    };
  }
}
