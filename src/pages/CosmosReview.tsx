import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Cloud, Download, Eye, FolderOpen, Gauge, Waves, X } from 'lucide-react';
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

interface Stats {
  fps: number;
  particles: number;
  rings: number;
  alt: number;
}

const PRESET_NAMES = Object.keys(PRESETS) as Array<keyof typeof PRESETS>;
const R0004_SCREENSHOT_DIR = '/home/sev/Cosmos/earth-forge/docs/cosmos/validation/screenshots/R0004';

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
    gibsSurfaceOverlayStrength: item.overrides.gibsSurfaceOverlayStrength ?? 0.52,
    gibsSurfaceWaterBias: item.overrides.gibsSurfaceWaterBias ?? 0.62,
  };
};

declare global {
  interface Window {
    __COSMOS_REVIEW_READY__?: boolean;
    __COSMOS_ACTIVE_BOOKMARK__?: CosmosReviewBookmarkId;
    __COSMOS_APPLY_BOOKMARK__?: (id: CosmosReviewBookmarkId) => void;
  }
}

const DEFAULT_GIBS_STATUS: CosmosGibsSurfaceOverlayStatus = {
  state: 'fallback',
  textureUrl: '/cosmos/gibs/global-truecolor.jpg',
  manifestUrl: '/cosmos/gibs/global-truecolor.manifest.json',
  message: 'Procedural fallback active.',
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

  const bookmark = useMemo(
    () => COSMOS_REVIEW_BOOKMARKS.find((item) => item.id === activeBookmark) ?? COSMOS_REVIEW_BOOKMARKS[0],
    [activeBookmark],
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new WorldEngine(canvasRef.current);
    engineRef.current = engine;
    engine.setStatsCallback((fps, particles, rings, alt) => {
      setStats({ fps, particles, rings, alt });
    });
    engine.setGibsOverlayStatusCallback(setGibsStatus);
    window.__COSMOS_REVIEW_READY__ = false;
    engine.applyReviewBookmark(initialBookmarkRef.current);
    window.__COSMOS_ACTIVE_BOOKMARK__ = initialBookmarkRef.current;
    document.documentElement.dataset.cosmosBookmark = initialBookmarkRef.current;
    engine.start();
    window.__COSMOS_REVIEW_READY__ = true;

    return () => {
      engine.stop();
      engineRef.current = null;
      window.__COSMOS_REVIEW_READY__ = false;
    };
  }, []);

  const applyBookmark = useCallback((id: CosmosReviewBookmarkId) => {
    const next = COSMOS_REVIEW_BOOKMARKS.find((item) => item.id === id);
    if (!next) return;
    engineRef.current?.applyReviewBookmark(id);
    setActiveBookmark(id);
    setActivePreset(next.preset);
    setTuning(tuningFromBookmark(id));
    window.__COSMOS_ACTIVE_BOOKMARK__ = id;
    document.documentElement.dataset.cosmosBookmark = id;
  }, []);

  useEffect(() => {
    window.__COSMOS_APPLY_BOOKMARK__ = applyBookmark;
    return () => {
      delete window.__COSMOS_APPLY_BOOKMARK__;
    };
  }, [applyBookmark]);

  const applyPreset = useCallback((preset: keyof typeof PRESETS) => {
    engineRef.current?.applyPreset(preset);
    setActivePreset(preset);
  }, []);

  const captureCurrentCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeBookmark}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }, [activeBookmark]);

  const updateTuning = useCallback(<K extends keyof WorldSettings>(key: K, value: WorldSettings[K]) => {
    engineRef.current?.updateSettings({ [key]: value } as Partial<WorldSettings>);
    if (typeof value === 'number' && key in tuning) {
      setTuning((prev) => ({ ...prev, [key]: value }));
    }
  }, [tuning]);

  const expectedScreenshotPath = `${R0004_SCREENSHOT_DIR}/${activeBookmark}.png`;
  const expectedScreenshotUrl = `/@fs${expectedScreenshotPath}`;

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
              <div className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Eye className="h-4 w-4 text-emerald-400" /> GIBS surface overlay
              </div>
              <ReviewSlider label="GIBS blend" keyName="gibsSurfaceOverlayStrength" value={tuning.gibsSurfaceOverlayStrength} min={0} max={1} step={0.01} onChange={updateTuning} />
              <ReviewSlider label="Water-world bias" keyName="gibsSurfaceWaterBias" value={tuning.gibsSurfaceWaterBias} min={0} max={1} step={0.01} onChange={updateTuning} />
            </section>

            <section className="rounded-xl border border-border/30 bg-background/45 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">GIBS data status</h3>
              <p className="mt-2"><span className="font-semibold text-foreground">State:</span> {gibsStatus.state}</p>
              {gibsStatus.layer && <p><span className="font-semibold text-foreground">Layer:</span> {gibsStatus.layer}</p>}
              {gibsStatus.time && <p><span className="font-semibold text-foreground">Date:</span> {gibsStatus.time}</p>}
              <p className="break-all"><span className="font-semibold text-foreground">Texture:</span> {gibsStatus.textureUrl}</p>
              {gibsStatus.message && <p className="mt-1">{gibsStatus.message}</p>}
            </section>

            <section className="space-y-3 rounded-xl border border-border/30 bg-background/45 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Capture/output</h3>
              <div className="grid grid-cols-1 gap-2">
                <Button size="sm" className="justify-start" onClick={captureCurrentCanvas}>
                  <Download className="mr-2 h-4 w-4" />
                  Capture {activeBookmark}.png
                </Button>
                <Button asChild size="sm" variant="outline" className="justify-start bg-background/50">
                  <a href={expectedScreenshotUrl} target="_blank" rel="noreferrer">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open saved PNG
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="justify-start bg-background/50">
                  <Link to="/cosmos-local-run">
                    <Camera className="mr-2 h-4 w-4" />
                    R0004 run console
                  </Link>
                </Button>
              </div>
              <p className="break-all text-[10px] leading-relaxed text-muted-foreground">{expectedScreenshotPath}</p>
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
