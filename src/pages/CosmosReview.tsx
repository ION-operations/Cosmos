import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bug, Camera, Cloud, Eye, Gauge, Waves, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  COSMOS_REVIEW_BOOKMARKS,
  CosmosReviewBookmarkId,
  PRESETS,
  WorldEngine,
  WorldSettings,
} from '@/cosmos/orbital/WorldEngine';
import type { CosmosGibsSurfaceOverlayStatus } from '@/cosmos/gibs/gibsSurfaceOverlay';
import type { CosmosBathymetryOverlayStatus } from '@/cosmos/bathymetry/bathymetryOverlay';
import type { CosmosScaleState } from '@/cosmos/scale/cosmosScale';
import type { CosmosAtmosphereLutState } from '@/cosmos/atmosphere/atmosphereLut';
import {
  COSMOS_R0012_ATMOSPHERE_DEFAULTS,
  createCosmosAtmosphereCalibrationState,
  type CosmosAtmosphereCalibrationState,
} from '@/cosmos/atmosphere/atmosphereCalibration';
import type { CosmosRuntimeDiagnosticsState } from '@/cosmos/runtime/runtimeDiagnostics';
import { COSMOS_DEBUG_OVERLAY_MODES, describeCosmosDebugMode, type CosmosDebugOverlayState } from '@/cosmos/debug/cosmosDebug';

interface Stats {
  fps: number;
  particles: number;
  rings: number;
  alt: number;
}

const PRESET_NAMES = Object.keys(PRESETS) as Array<keyof typeof PRESETS>;

const REVIEW_BOOKMARK_IDS = new Set(COSMOS_REVIEW_BOOKMARKS.map((item) => item.id));

const resolveBookmarkId = (value: string | null | undefined): CosmosReviewBookmarkId => {
  if (value && REVIEW_BOOKMARK_IDS.has(value as CosmosReviewBookmarkId)) return value as CosmosReviewBookmarkId;
  return 'orbit';
};

const tuningFromBookmark = (id: CosmosReviewBookmarkId) => {
  const item = COSMOS_REVIEW_BOOKMARKS.find((bookmark) => bookmark.id === id) ?? COSMOS_REVIEW_BOOKMARKS[0];
  const preset = PRESETS[item.preset];
  return {
    waveH: item.overrides.waveH ?? preset.waveH,
    windS: item.overrides.windS ?? preset.windS,
    cloudCover: item.overrides.cloudCover ?? preset.cloudCover ?? 0.5,
    cloudDensity: item.overrides.cloudDensity ?? preset.cloudDensity ?? 0.6,
    sunE: item.overrides.sunE ?? preset.sunE,
    weatherAtlasStrength: item.overrides.weatherAtlasStrength ?? 0.84,
    cloudRegimeContrast: item.overrides.cloudRegimeContrast ?? 0.72,
    macroWeatherScale: item.overrides.macroWeatherScale ?? 1.0,
    atmosphereContinuityStrength: item.overrides.atmosphereContinuityStrength ?? 0.92,
    horizonHazeStrength: item.overrides.horizonHazeStrength ?? 0.78,
    cloudLodBias: item.overrides.cloudLodBias ?? 0.35,
    atmosphereLutStrength: item.overrides.atmosphereLutStrength ?? 0.82,
    rayleighScale: item.overrides.rayleighScale ?? 1.0,
    mieScale: item.overrides.mieScale ?? 0.72,
    ozoneScale: item.overrides.ozoneScale ?? 0.64,
    multiScatteringStrength: item.overrides.multiScatteringStrength ?? 0.58,
    aerialPerspectiveStrength: item.overrides.aerialPerspectiveStrength ?? 0.72,
    skyViewLutStrength: item.overrides.skyViewLutStrength ?? 0.76,
    opticalDepthDebugStrength: item.overrides.opticalDepthDebugStrength ?? 0,
    gibsSurfaceOverlayStrength: item.overrides.gibsSurfaceOverlayStrength ?? 0.52,
    gibsSurfaceWaterBias: item.overrides.gibsSurfaceWaterBias ?? 0.62,
    bathymetryStrength: item.overrides.bathymetryStrength ?? 0.82,
    shallowWaterOptics: item.overrides.shallowWaterOptics ?? 0.72,
    coastalFoamStrength: item.overrides.coastalFoamStrength ?? 0.62,
    oneWaterOpticsStrength: item.overrides.oneWaterOpticsStrength ?? 0.78,
    debugOverlayMode: item.overrides.debugOverlayMode ?? 0,
    debugOverlayStrength: item.overrides.debugOverlayStrength ?? 0.72,
    debugShellOpacity: item.overrides.debugShellOpacity ?? 0.82,
  };
};

declare global {
  interface Window {
    __COSMOS_REVIEW_READY__?: boolean;
    __COSMOS_ACTIVE_BOOKMARK__?: CosmosReviewBookmarkId;
    __COSMOS_GIBS_SURFACE_OVERLAY_STATE__?: CosmosGibsSurfaceOverlayStatus;
    __COSMOS_BATHYMETRY_OVERLAY_STATE__?: CosmosBathymetryOverlayStatus;
    __COSMOS_SCALE_STATE__?: CosmosScaleState;
    __COSMOS_DEBUG_OVERLAY_STATE__?: CosmosDebugOverlayState;
    __COSMOS_ATMOSPHERE_LUT_STATE__?: CosmosAtmosphereLutState;
    __COSMOS_ATMOSPHERE_CALIBRATION_STATE__?: CosmosAtmosphereCalibrationState;
    __COSMOS_RUNTIME_DIAGNOSTICS__?: CosmosRuntimeDiagnosticsState;
    __COSMOS_ENGINE__?: WorldEngine;
  }
}

const DEFAULT_GIBS_STATUS: CosmosGibsSurfaceOverlayStatus = {
  state: 'fallback',
  textureUrl: '/cosmos/gibs/global-truecolor.jpg',
  manifestUrl: '/cosmos/gibs/global-truecolor.manifest.json',
  message: 'Procedural fallback active.',
};

const DEFAULT_ATMOSPHERE_LUT_STATE: CosmosAtmosphereLutState = {
  state: 'generated',
  provider: 'cosmos-cpu-lut-fallback',
  model: 'R0012-higher-fidelity-curved-path-lut',
  controls: {
    strength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.strength,
    rayleighScale: COSMOS_R0012_ATMOSPHERE_DEFAULTS.rayleighScale,
    mieScale: COSMOS_R0012_ATMOSPHERE_DEFAULTS.mieScale,
    ozoneScale: COSMOS_R0012_ATMOSPHERE_DEFAULTS.ozoneScale,
    multiScatteringStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.multiScatteringStrength,
    aerialPerspectiveStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.aerialPerspectiveStrength,
    skyViewStrength: COSMOS_R0012_ATMOSPHERE_DEFAULTS.skyViewStrength,
    opticalDepthDebug: COSMOS_R0012_ATMOSPHERE_DEFAULTS.opticalDepthDebug,
  },
  spec: {
    transmittance: { width: 320, height: 80, channels: 4, encoding: 'RGBA8 RGB=solar transmittance from curved optical-depth integral, A=compressed optical depth' },
    multiScattering: { width: 96, height: 48, channels: 4, encoding: 'RGBA8 RGB=phase-weighted multiple-scattering proxy, A=energy' },
    skyView: { width: 240, height: 135, channels: 4, encoding: 'RGBA8 RGB=sky-view radiance proxy using curved path samples, A=horizon/terminator weight' },
    aerialPerspective: { width: 128, height: 72, channels: 4, encoding: 'RGBA8 RGB=aerial-perspective tint from path sample, A=fog density' },
  },
  message: 'Generated deterministic CPU atmosphere lookup textures.',
};

const DEFAULT_ATMOSPHERE_CALIBRATION_STATE: CosmosAtmosphereCalibrationState = createCosmosAtmosphereCalibrationState();

const DEFAULT_RUNTIME_DIAGNOSTICS: CosmosRuntimeDiagnosticsState = {
  state: 'unknown',
  model: 'R0011-runtime-shader-clean-calibration',
  generatedAtIso: new Date(0).toISOString(),
  renderer: {
    isWebGL2: false,
    precision: 'unknown',
    logarithmicDepthBuffer: false,
    maxTextures: 0,
    maxTextureSize: 0,
    maxVertexTextures: 0,
    vertexTextures: false,
    floatFragmentTextures: false,
    maxAnisotropy: 0,
    checkShaderErrors: true,
    programCount: 0,
    memoryGeometries: 0,
    memoryTextures: 0,
    calls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
  },
  webglProbe: {
    installed: false,
    shaderCompiles: 0,
    shaderWarnings: 0,
    shaderErrors: 0,
    programLinks: 0,
    programWarnings: 0,
    programErrors: 0,
    maxShaderLogLength: 0,
    maxProgramLogLength: 0,
  },
  messages: [],
  counts: {
    total: 0,
    errors: 0,
    warnings: 0,
    shaderErrors: 0,
    shaderWarnings: 0,
    programErrors: 0,
    programWarnings: 0,
    pageErrors: 0,
    contextLosses: 0,
  },
  context: { lost: false, lostCount: 0, restoredCount: 0 },
  message: 'Runtime diagnostics not initialized yet.',
};

const DEFAULT_BATHYMETRY_STATUS: CosmosBathymetryOverlayStatus = {
  state: 'fallback',
  textureUrl: '/cosmos/bathymetry/global-depth.png',
  manifestUrl: '/cosmos/bathymetry/global-depth.manifest.json',
  provider: 'procedural-fallback',
  encoding: 'RGBA depth01/shelf/coast/land',
  verticalDatum: 'synthetic sea-level-relative',
  minElevationMeters: -11000,
  maxElevationMeters: 8500,
  message: 'Procedural bathymetry fallback active.',
};

const formatAltitude = (altitude: number) => {
  if (Math.abs(altitude) >= 1000) return `${(altitude / 1000).toFixed(1)} km`;
  return `${altitude.toFixed(1)} m`;
};

interface ReviewSliderProps<K extends keyof WorldSettings> {
  label: string;
  keyName: K;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: <T extends keyof WorldSettings>(key: T, value: WorldSettings[T]) => void;
}

const ReviewSlider = <K extends keyof WorldSettings>({
  label,
  keyName,
  value,
  min,
  max,
  step,
  onChange,
}: ReviewSliderProps<K>) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[11px] text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono text-primary">{value.toFixed(value < 2 ? 2 : 1)}</span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(keyName, v as WorldSettings[K])}
    />
  </div>
);

const CosmosReview = () => {
  const [searchParams] = useSearchParams();
  const initialBookmark = useMemo(() => resolveBookmarkId(searchParams.get('bookmark')), [searchParams]);
  const initialBookmarkRef = useRef<CosmosReviewBookmarkId>(initialBookmark);
  const initialBookmarkData = useMemo(
    () => COSMOS_REVIEW_BOOKMARKS.find((item) => item.id === initialBookmarkRef.current) ?? COSMOS_REVIEW_BOOKMARKS[0],
    [],
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  const [stats, setStats] = useState<Stats>({ fps: 0, particles: 0, rings: 0, alt: 0 });
  const [activeBookmark, setActiveBookmark] = useState<CosmosReviewBookmarkId>(initialBookmarkRef.current);
  const [activePreset, setActivePreset] = useState<keyof typeof PRESETS>(initialBookmarkData.preset);
  const [panelOpen, setPanelOpen] = useState(searchParams.get('panel') !== '0');
  const [tuning, setTuning] = useState(() => tuningFromBookmark(initialBookmarkRef.current));
  const [gibsStatus, setGibsStatus] = useState<CosmosGibsSurfaceOverlayStatus>(DEFAULT_GIBS_STATUS);
  const [bathymetryStatus, setBathymetryStatus] = useState<CosmosBathymetryOverlayStatus>(DEFAULT_BATHYMETRY_STATUS);
  const [scaleState, setScaleState] = useState<CosmosScaleState | null>(null);
  const [debugState, setDebugState] = useState<CosmosDebugOverlayState | null>(null);
  const [atmosphereLutState, setAtmosphereLutState] = useState<CosmosAtmosphereLutState>(DEFAULT_ATMOSPHERE_LUT_STATE);
  const [atmosphereCalibrationState, setAtmosphereCalibrationState] = useState<CosmosAtmosphereCalibrationState>(DEFAULT_ATMOSPHERE_CALIBRATION_STATE);
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<CosmosRuntimeDiagnosticsState>(DEFAULT_RUNTIME_DIAGNOSTICS);
  const [debugShellsEnabled, setDebugShellsEnabled] = useState(false);

  const bookmark = useMemo(
    () => COSMOS_REVIEW_BOOKMARKS.find((item) => item.id === activeBookmark) ?? COSMOS_REVIEW_BOOKMARKS[0],
    [activeBookmark],
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new WorldEngine(canvasRef.current);
    engineRef.current = engine;
    window.__COSMOS_ENGINE__ = engine;
    engine.setStatsCallback((fps, particles, rings, alt) => {
      setStats({ fps, particles, rings, alt });
      if (window.__COSMOS_SCALE_STATE__) setScaleState(window.__COSMOS_SCALE_STATE__);
      if (window.__COSMOS_DEBUG_OVERLAY_STATE__) setDebugState(window.__COSMOS_DEBUG_OVERLAY_STATE__);
      if (window.__COSMOS_RUNTIME_DIAGNOSTICS__) setRuntimeDiagnostics(window.__COSMOS_RUNTIME_DIAGNOSTICS__);
      if (window.__COSMOS_ATMOSPHERE_CALIBRATION_STATE__) setAtmosphereCalibrationState(window.__COSMOS_ATMOSPHERE_CALIBRATION_STATE__);
    });
    engine.setGibsOverlayStatusCallback(setGibsStatus);
    engine.setBathymetryOverlayStatusCallback(setBathymetryStatus);
    engine.setDebugOverlayStateCallback(setDebugState);
    engine.setAtmosphereLutStateCallback(setAtmosphereLutState);
    engine.setAtmosphereCalibrationStateCallback(setAtmosphereCalibrationState);
    engine.setRuntimeDiagnosticsCallback(setRuntimeDiagnostics);
    window.__COSMOS_REVIEW_READY__ = false;
    engine.applyReviewBookmark(initialBookmarkRef.current);
    window.__COSMOS_ACTIVE_BOOKMARK__ = initialBookmarkRef.current;
    document.documentElement.dataset.cosmosBookmark = initialBookmarkRef.current;
    engine.start();
    window.__COSMOS_REVIEW_READY__ = true;

    return () => {
      engine.stop();
      engineRef.current = null;
      window.__COSMOS_ENGINE__ = undefined;
      window.__COSMOS_REVIEW_READY__ = false;
    };
  }, []);

  const applyBookmark = useCallback((id: CosmosReviewBookmarkId) => {
    const next = COSMOS_REVIEW_BOOKMARKS.find((item) => item.id === id);
    if (!next) return;
    engineRef.current?.applyReviewBookmark(id);
    setActiveBookmark(id);
    setActivePreset(next.preset);
    setTuning((prev) => ({ ...tuningFromBookmark(id), debugOverlayMode: prev.debugOverlayMode, debugOverlayStrength: prev.debugOverlayStrength, debugShellOpacity: prev.debugShellOpacity }));
    window.__COSMOS_ACTIVE_BOOKMARK__ = id;
    document.documentElement.dataset.cosmosBookmark = id;
  }, []);

  const applyPreset = useCallback((preset: keyof typeof PRESETS) => {
    engineRef.current?.applyPreset(preset);
    setActivePreset(preset);
  }, []);

  const updateTuning = useCallback(<K extends keyof WorldSettings>(key: K, value: WorldSettings[K]) => {
    engineRef.current?.updateSettings({ [key]: value } as Partial<WorldSettings>);
    if (typeof value === 'number' && key in tuning) {
      setTuning((prev) => ({ ...prev, [key]: value }));
    }
    if (window.__COSMOS_DEBUG_OVERLAY_STATE__) setDebugState(window.__COSMOS_DEBUG_OVERLAY_STATE__);
  }, [tuning]);

  const setDebugMode = useCallback((mode: number) => {
    updateTuning('debugOverlayMode', mode);
  }, [updateTuning]);

  const toggleDebugShells = useCallback(() => {
    const next = !debugShellsEnabled;
    setDebugShellsEnabled(next);
    engineRef.current?.updateSettings({ debugShellsEnabled: next });
    if (window.__COSMOS_DEBUG_OVERLAY_STATE__) setDebugState(window.__COSMOS_DEBUG_OVERLAY_STATE__);
  }, [debugShellsEnabled]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-foreground">
      <canvas ref={canvasRef} className="block h-full w-full" />

      <div className="fixed left-4 top-4 z-30 flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="bg-background/65 backdrop-blur-xl">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Main Water World
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="bg-background/65 backdrop-blur-xl" onClick={() => setPanelOpen((open) => !open)}>
          {panelOpen ? <X className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          Review Panel
        </Button>
      </div>

      <div className="fixed right-4 top-4 z-30 min-w-[190px] rounded-xl border border-border/40 bg-background/65 p-3 text-xs shadow-2xl backdrop-blur-xl">
        <div className="mb-1 flex items-center gap-2 font-semibold text-primary">
          <Gauge className="h-4 w-4" /> Live renderer
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
          <span>FPS</span><span className="text-right font-mono text-foreground">{stats.fps}</span>
          <span>Alt</span><span className="text-right font-mono text-foreground">{formatAltitude(stats.alt)}</span>
          <span>Spray</span><span className="text-right font-mono text-foreground">{stats.particles}</span>
          <span>Rings</span><span className="text-right font-mono text-foreground">{stats.rings}</span>
          <span>GIBS</span><span className="text-right font-mono text-foreground">{gibsStatus.state}</span>
          <span>Depth</span><span className="text-right font-mono text-foreground">{bathymetryStatus.state}</span>
          <span>LOD</span><span className="text-right font-mono text-foreground">{scaleState?.lod ?? '—'}</span>
          <span>Pass α</span><span className="text-right font-mono text-foreground">{scaleState ? `${scaleState.oceanAlpha.toFixed(2)}/${scaleState.cloudAlpha.toFixed(2)}/${scaleState.planetAlpha.toFixed(2)}` : '—'}</span>
          <span>Debug</span><span className="text-right font-mono text-foreground">{debugState?.modeKey ?? 'off'}</span>
          <span>Runtime</span><span className="text-right font-mono text-foreground">{runtimeDiagnostics.state}</span>
          <span>Shaders</span><span className="text-right font-mono text-foreground">{runtimeDiagnostics.renderer.programCount}/{runtimeDiagnostics.counts.shaderErrors + runtimeDiagnostics.counts.programErrors}</span>
        </div>
      </div>

      {panelOpen && (
        <aside className="fixed bottom-4 left-4 top-16 z-20 w-[360px] overflow-hidden rounded-2xl border border-border/40 bg-background/80 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-border/30 p-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
              <Camera className="h-4 w-4" /> Cosmos Orbital Review
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Fixed camera bookmarks for repeatable lead-eyes review. This route now shares the main Water World macro weather atlas with the orbital/ocean stack.
            </p>
          </div>

          <div className="h-[calc(100%-88px)] overflow-y-auto p-4 space-y-5">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Camera bookmarks</h3>
              <div className="grid grid-cols-1 gap-2">
                {COSMOS_REVIEW_BOOKMARKS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => applyBookmark(item.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      activeBookmark === item.id
                        ? 'border-primary/60 bg-primary/15 text-foreground'
                        : 'border-border/30 bg-background/50 text-muted-foreground hover:border-primary/40 hover:bg-background/75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{item.title}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{item.altitudeLabel}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug opacity-85">{item.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border/30 bg-background/45 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Active visual target</h3>
              <p className="mt-2 text-sm font-semibold">{bookmark.title}</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                {bookmark.reviewFocus.map((focus) => <li key={focus}>{focus}</li>)}
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preset bank</h3>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_NAMES.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                      activePreset === preset
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'border-border/30 bg-background/50 text-muted-foreground hover:bg-background/80'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-border/30 bg-background/45 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Waves className="h-4 w-4 text-cyan-400" /> Fast water/weather tuning
              </div>
              <ReviewSlider label="Wave height" keyName="waveH" value={tuning.waveH} min={0} max={6} step={0.05} onChange={updateTuning} />
              <ReviewSlider label="Wind speed" keyName="windS" value={tuning.windS} min={0} max={28} step={0.25} onChange={updateTuning} />
              <ReviewSlider label="Sun elevation" keyName="sunE" value={tuning.sunE} min={-10} max={70} step={0.5} onChange={updateTuning} />
              <div className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Cloud className="h-4 w-4 text-sky-400" /> Cloud pass
              </div>
              <ReviewSlider label="Cloud cover" keyName="cloudCover" value={tuning.cloudCover} min={0} max={1} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Cloud density" keyName="cloudDensity" value={tuning.cloudDensity} min={0} max={1.6} step={0.02} onChange={updateTuning} />
              <ReviewSlider label="Atlas strength" keyName="weatherAtlasStrength" value={tuning.weatherAtlasStrength} min={0} max={1} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Regime contrast" keyName="cloudRegimeContrast" value={tuning.cloudRegimeContrast} min={0} max={1} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Macro scale" keyName="macroWeatherScale" value={tuning.macroWeatherScale} min={0.35} max={2.2} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Cloud LOD lock" keyName="cloudLodBias" value={tuning.cloudLodBias} min={0} max={1} step={0.01} onChange={updateTuning} />
              <div className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Eye className="h-4 w-4 text-indigo-400" /> Atmosphere continuity
              </div>
              <ReviewSlider label="Continuity strength" keyName="atmosphereContinuityStrength" value={tuning.atmosphereContinuityStrength} min={0} max={1.2} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Horizon haze" keyName="horizonHazeStrength" value={tuning.horizonHazeStrength} min={0} max={1.5} step={0.01} onChange={updateTuning} />
              <div className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Eye className="h-4 w-4 text-violet-400" /> Physical atmosphere LUT
              </div>
              <ReviewSlider label="LUT strength" keyName="atmosphereLutStrength" value={tuning.atmosphereLutStrength} min={0} max={1} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Rayleigh scale" keyName="rayleighScale" value={tuning.rayleighScale} min={0} max={2.2} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Mie/aerosol scale" keyName="mieScale" value={tuning.mieScale} min={0} max={2.2} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Ozone scale" keyName="ozoneScale" value={tuning.ozoneScale} min={0} max={2} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Multiple scattering" keyName="multiScatteringStrength" value={tuning.multiScatteringStrength} min={0} max={1.5} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Aerial perspective" keyName="aerialPerspectiveStrength" value={tuning.aerialPerspectiveStrength} min={0} max={1.5} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Sky-view LUT" keyName="skyViewLutStrength" value={tuning.skyViewLutStrength} min={0} max={1.5} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Optical debug" keyName="opticalDepthDebugStrength" value={tuning.opticalDepthDebugStrength} min={0} max={1} step={0.01} onChange={updateTuning} />
              <div className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Eye className="h-4 w-4 text-emerald-400" /> GIBS surface overlay
              </div>
              <ReviewSlider label="GIBS blend" keyName="gibsSurfaceOverlayStrength" value={tuning.gibsSurfaceOverlayStrength} min={0} max={1} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Water-world bias" keyName="gibsSurfaceWaterBias" value={tuning.gibsSurfaceWaterBias} min={0} max={1} step={0.01} onChange={updateTuning} />
              <div className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Waves className="h-4 w-4 text-blue-400" /> Bathymetry / one-water optics
              </div>
              <ReviewSlider label="Bathymetry blend" keyName="bathymetryStrength" value={tuning.bathymetryStrength} min={0} max={1} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Shallow-water optics" keyName="shallowWaterOptics" value={tuning.shallowWaterOptics} min={0} max={1.35} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Coastal foam" keyName="coastalFoamStrength" value={tuning.coastalFoamStrength} min={0} max={1.5} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="One-water composite" keyName="oneWaterOpticsStrength" value={tuning.oneWaterOpticsStrength} min={0} max={1} step={0.01} onChange={updateTuning} />
            </section>

            <section className="space-y-3 rounded-xl border border-border/30 bg-background/45 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Bug className="h-4 w-4 text-amber-400" /> Visual diagnostics
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {COSMOS_DEBUG_OVERLAY_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setDebugMode(mode.id)}
                    className={`rounded-md border px-2 py-1.5 text-left text-[10px] transition-colors ${
                      tuning.debugOverlayMode === mode.id
                        ? 'border-amber-400/70 bg-amber-400/15 text-amber-100'
                        : 'border-border/30 bg-background/50 text-muted-foreground hover:bg-background/80'
                    }`}
                  >
                    <span className="block font-semibold uppercase tracking-wider">{mode.shortLabel}</span>
                    <span className="block opacity-75">{mode.colorMeaning}</span>
                  </button>
                ))}
              </div>
              <ReviewSlider label="Overlay strength" keyName="debugOverlayStrength" value={tuning.debugOverlayStrength} min={0} max={1} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Shell opacity" keyName="debugShellOpacity" value={tuning.debugShellOpacity} min={0} max={1} step={0.01} onChange={updateTuning} />
              <Button variant="outline" size="sm" className="w-full bg-background/45" onClick={toggleDebugShells}>
                {debugShellsEnabled ? 'Disable 3D shell wireframes' : 'Enable 3D shell wireframes'}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Active: <span className="font-semibold text-foreground">{describeCosmosDebugMode(tuning.debugOverlayMode).label}</span>.
                {debugState ? ` ${debugState.modeKey}: ${debugState.shellsEnabled ? 'wire shells on' : 'wire shells off'}.` : ''}
              </p>
            </section>

            <section className="rounded-xl border border-border/30 bg-background/45 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Runtime shader diagnostics</h3>
              <p className="mt-2"><span className="font-semibold text-foreground">State:</span> {runtimeDiagnostics.state}</p>
              <p><span className="font-semibold text-foreground">Model:</span> {runtimeDiagnostics.model}</p>
              <p><span className="font-semibold text-foreground">Shader checks:</span> {runtimeDiagnostics.renderer.checkShaderErrors ? 'enabled' : 'disabled'}</p>
              <p><span className="font-semibold text-foreground">Programs:</span> {runtimeDiagnostics.renderer.programCount}</p>
              <p><span className="font-semibold text-foreground">WebGL probe:</span> {runtimeDiagnostics.webglProbe.installed ? 'installed' : 'not installed'}</p>
              <p><span className="font-semibold text-foreground">Errors:</span> {runtimeDiagnostics.counts.errors} total / {runtimeDiagnostics.counts.shaderErrors} shader / {runtimeDiagnostics.counts.programErrors} program / {runtimeDiagnostics.counts.pageErrors} page</p>
              <p><span className="font-semibold text-foreground">Warnings:</span> {runtimeDiagnostics.counts.warnings}</p>
              <p className="mt-1">{runtimeDiagnostics.message}</p>
            </section>

            <section className="rounded-xl border border-border/30 bg-background/45 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Atmosphere LUT status</h3>
              <p className="mt-2"><span className="font-semibold text-foreground">State:</span> {atmosphereLutState.state}</p>
              <p><span className="font-semibold text-foreground">Provider:</span> {atmosphereLutState.provider}</p>
              <p><span className="font-semibold text-foreground">Model:</span> {atmosphereLutState.model}</p>
              <p><span className="font-semibold text-foreground">Transmittance:</span> {atmosphereLutState.spec.transmittance.width}×{atmosphereLutState.spec.transmittance.height}</p>
              <p><span className="font-semibold text-foreground">Sky-view:</span> {atmosphereLutState.spec.skyView.width}×{atmosphereLutState.spec.skyView.height}</p>
              <p className="mt-1">{atmosphereLutState.message}</p>
            </section>

            <section className="rounded-xl border border-border/30 bg-background/45 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">R-0011 atmosphere calibration</h3>
              <p className="mt-2"><span className="font-semibold text-foreground">State:</span> {atmosphereCalibrationState.pass ? 'static targets pass' : 'needs attention'}</p>
              <p><span className="font-semibold text-foreground">Runtime gate:</span> {atmosphereCalibrationState.runtimeGate.expectedState}</p>
              <p><span className="font-semibold text-foreground">Active:</span> {atmosphereCalibrationState.activeBookmarkId ?? activeBookmark}</p>
              <div className="mt-2 space-y-1">
                {atmosphereCalibrationState.evaluations.map((evaluation) => (
                  <p key={evaluation.bookmarkId}>
                    <span className="font-semibold text-foreground">{evaluation.bookmarkId}:</span>{' '}
                    OD {evaluation.sample.opticalDepth.toFixed(2)} / AP {evaluation.sample.aerialPerspective.toFixed(2)} / rim {evaluation.continuity.orbitalRimAlpha.toFixed(2)} / sky {evaluation.continuity.localSkyAlpha.toFixed(2)}
                  </p>
                ))}
              </div>
              <p className="mt-1">{atmosphereCalibrationState.message}</p>
            </section>

            <section className="rounded-xl border border-border/30 bg-background/45 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">GIBS data status</h3>
              <p className="mt-2"><span className="font-semibold text-foreground">State:</span> {gibsStatus.state}</p>
              {gibsStatus.layer && <p><span className="font-semibold text-foreground">Layer:</span> {gibsStatus.layer}</p>}
              {gibsStatus.time && <p><span className="font-semibold text-foreground">Date:</span> {gibsStatus.time}</p>}
              <p className="break-all"><span className="font-semibold text-foreground">Texture:</span> {gibsStatus.textureUrl}</p>
              {gibsStatus.message && <p className="mt-1">{gibsStatus.message}</p>}
            </section>

            <section className="rounded-xl border border-border/30 bg-background/45 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Bathymetry data status</h3>
              <p className="mt-2"><span className="font-semibold text-foreground">State:</span> {bathymetryStatus.state}</p>
              {bathymetryStatus.provider && <p><span className="font-semibold text-foreground">Provider:</span> {bathymetryStatus.provider}</p>}
              {bathymetryStatus.layer && <p><span className="font-semibold text-foreground">Layer:</span> {bathymetryStatus.layer}</p>}
              {bathymetryStatus.encoding && <p><span className="font-semibold text-foreground">Encoding:</span> {bathymetryStatus.encoding}</p>}
              {bathymetryStatus.verticalDatum && <p><span className="font-semibold text-foreground">Datum:</span> {bathymetryStatus.verticalDatum}</p>}
              <p className="break-all"><span className="font-semibold text-foreground">Texture:</span> {bathymetryStatus.textureUrl}</p>
              {bathymetryStatus.message && <p className="mt-1">{bathymetryStatus.message}</p>}
            </section>

            <section className="rounded-xl border border-border/30 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-primary">Lead-eyes protocol:</span> capture the same bookmark before/after each patch, then tag the failure mode by scale: orbit, altitude, sea-level, or underwater.
            </section>
          </div>
        </aside>
      )}
    </div>
  );
};

export default CosmosReview;
