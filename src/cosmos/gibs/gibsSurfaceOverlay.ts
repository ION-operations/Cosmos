import * as THREE from 'three';

const cosmosPublicUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/');

export const COSMOS_GIBS_SURFACE_DEFAULT_TEXTURE_URL = cosmosPublicUrl('cosmos/gibs/global-truecolor.jpg');
export const COSMOS_GIBS_SURFACE_DEFAULT_MANIFEST_URL = cosmosPublicUrl('cosmos/gibs/global-truecolor.manifest.json');

export type CosmosGibsSurfaceOverlayState = 'fallback' | 'loading' | 'loaded' | 'failed';

export interface CosmosGibsSurfaceManifest {
  schema?: string;
  source?: string;
  endpoint?: string;
  layer?: string;
  time?: string;
  projection?: string;
  bbox?: [number, number, number, number];
  width?: number;
  height?: number;
  format?: string;
  textureUrl?: string;
  generatedAt?: string;
}

export interface CosmosGibsSurfaceOverlayStatus {
  state: CosmosGibsSurfaceOverlayState;
  textureUrl: string;
  manifestUrl: string;
  layer?: string;
  time?: string;
  message?: string;
}

export interface CosmosGibsSurfaceOverlayLoadOptions {
  textureUrl?: string;
  manifestUrl?: string;
}

export interface CosmosGibsSurfaceOverlayLoadResult {
  texture: THREE.Texture;
  status: CosmosGibsSurfaceOverlayStatus;
  manifest?: CosmosGibsSurfaceManifest;
}

declare global {
  interface Window {
    __COSMOS_GIBS_SURFACE_OVERLAY_URL__?: string;
    __COSMOS_GIBS_SURFACE_OVERLAY_MANIFEST_URL__?: string;
    __COSMOS_GIBS_SURFACE_OVERLAY_STATE__?: CosmosGibsSurfaceOverlayStatus;
  }
}

export const createNeutralGibsSurfaceTexture = () => {
  const pixel = new Uint8Array([9, 29, 62, 255]);
  const texture = new THREE.DataTexture(pixel, 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
};

const configureSurfaceTexture = (texture: THREE.Texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
};

export const resolveCosmosGibsSurfaceOverlayUrls = (options: CosmosGibsSurfaceOverlayLoadOptions = {}) => {
  const textureUrl = options.textureUrl
    ?? (typeof window !== 'undefined' ? window.__COSMOS_GIBS_SURFACE_OVERLAY_URL__ : undefined)
    ?? COSMOS_GIBS_SURFACE_DEFAULT_TEXTURE_URL;
  const manifestUrl = options.manifestUrl
    ?? (typeof window !== 'undefined' ? window.__COSMOS_GIBS_SURFACE_OVERLAY_MANIFEST_URL__ : undefined)
    ?? COSMOS_GIBS_SURFACE_DEFAULT_MANIFEST_URL;
  return { textureUrl, manifestUrl };
};

const makeStatus = (
  state: CosmosGibsSurfaceOverlayState,
  textureUrl: string,
  manifestUrl: string,
  extra: Partial<CosmosGibsSurfaceOverlayStatus> = {},
): CosmosGibsSurfaceOverlayStatus => ({ state, textureUrl, manifestUrl, ...extra });

const resolveManifestTextureUrl = (manifestTextureUrl: string | undefined, fallbackTextureUrl: string) => {
  if (!manifestTextureUrl) return fallbackTextureUrl;
  if (manifestTextureUrl.startsWith('/cosmos/')) return cosmosPublicUrl(manifestTextureUrl.slice(1));
  return manifestTextureUrl;
};

const fetchManifest = async (manifestUrl: string): Promise<CosmosGibsSurfaceManifest | undefined> => {
  try {
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) return undefined;
    return await response.json() as CosmosGibsSurfaceManifest;
  } catch {
    return undefined;
  }
};

const loadTexture = (textureUrl: string) => new Promise<THREE.Texture>((resolve, reject) => {
  const loader = new THREE.TextureLoader();
  loader.load(
    textureUrl,
    (texture) => resolve(configureSurfaceTexture(texture)),
    undefined,
    (error) => reject(error),
  );
});

export const loadCosmosGibsSurfaceOverlay = async (
  options: CosmosGibsSurfaceOverlayLoadOptions = {},
): Promise<CosmosGibsSurfaceOverlayLoadResult> => {
  const urls = resolveCosmosGibsSurfaceOverlayUrls(options);
  const manifest = await fetchManifest(urls.manifestUrl);
  const textureUrl = resolveManifestTextureUrl(manifest?.textureUrl, urls.textureUrl);

  try {
    const texture = await loadTexture(textureUrl);
    return {
      texture,
      manifest,
      status: makeStatus('loaded', textureUrl, urls.manifestUrl, {
        layer: manifest?.layer,
        time: manifest?.time,
        message: manifest ? 'Loaded local NASA GIBS global surface atlas.' : 'Loaded local surface atlas without manifest.',
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Surface overlay texture failed to load.';
    return {
      texture: createNeutralGibsSurfaceTexture(),
      manifest,
      status: makeStatus('failed', textureUrl, urls.manifestUrl, {
        layer: manifest?.layer,
        time: manifest?.time,
        message,
      }),
    };
  }
};
