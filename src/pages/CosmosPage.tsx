import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CloudSun,
  Compass,
  FileText,
  Github,
  Layers,
  Radar,
  Satellite,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/');

const reviewShots = [
  {
    id: 'orbit',
    title: 'Orbit',
    image: assetUrl('cosmos/pages/orbit.png'),
    focus: 'Global read, atmosphere rim thickness, cloud scale, and land retention.',
  },
  {
    id: 'cloud-terminator',
    title: 'Cloud Terminator',
    image: assetUrl('cosmos/pages/cloud-terminator.png'),
    focus: 'Dawn/dusk cloud stacking, shadow falloff, and orbital color balance.',
  },
  {
    id: 'high-altitude',
    title: 'Weather-Scale Ocean',
    image: assetUrl('cosmos/pages/high-altitude.png'),
    focus: 'Cloud decks, haze, water color, and atlas blending at aircraft scale.',
  },
  {
    id: 'storm-zone',
    title: 'Storm Zone',
    image: assetUrl('cosmos/pages/storm-zone.png'),
    focus: 'Wave scale, storm mass, foam hierarchy, and horizon visibility.',
  },
  {
    id: 'sun-glitter',
    title: 'Sun Glitter',
    image: assetUrl('cosmos/pages/sun-glitter.png'),
    focus: 'Fresnel response, micro-normal scale, and specular water balance.',
  },
  {
    id: 'sea-level',
    title: 'Sea Level',
    image: assetUrl('cosmos/pages/sea-level.png'),
    focus: 'Horizon match, water color continuity, and near-surface wave detail.',
  },
  {
    id: 'underwater',
    title: 'Underwater',
    image: assetUrl('cosmos/pages/underwater.png'),
    focus: 'Absorption, turbidity, caustics targets, and bathymetry gaps.',
  },
];

const systems = [
  {
    icon: Satellite,
    label: 'GIBS Surface Atlas',
    text: 'Local NASA true-color intake with a procedural fallback path.',
  },
  {
    icon: Radar,
    label: 'Weather Atlas Spine',
    text: 'Shared macro weather fields driving cloud rhythm and sea state.',
  },
  {
    icon: Waves,
    label: 'Water-World Stack',
    text: 'Orbital, altitude, sea-level, and underwater review targets.',
  },
  {
    icon: Boxes,
    label: 'ION Receipts',
    text: 'Phase receipts, validation logs, and repeatable lead-eyes bookmarks.',
  },
];

const latestAssets = [
  {
    title: 'GitHub App Surface',
    image: assetUrl('cosmos/pages/r0012/home.png'),
    href: assetUrl('cosmos/pages/r0012/home.png'),
    text: 'Static Pages home validation capture.',
  },
  {
    title: 'NASA GIBS Atlas',
    image: assetUrl('cosmos/gibs/global-truecolor.jpg'),
    href: assetUrl('cosmos/gibs/global-truecolor.jpg'),
    text: 'True-color WMS surface raster, 2048x1024.',
  },
  {
    title: 'Bathymetry Atlas',
    image: assetUrl('cosmos/bathymetry/global-depth.png'),
    href: assetUrl('cosmos/bathymetry/global-depth.png'),
    text: 'Depth, shelf, coast, and land-mask channels.',
  },
  {
    title: 'Atmosphere LUT',
    image: assetUrl('cosmos/pages/lut/sky-view.png'),
    href: assetUrl('cosmos/pages/lut/sky-view.png'),
    text: 'R0012 CPU solver debug texture exports.',
  },
];

const imageHistory = [
  {
    title: 'R0012 orbit smoke',
    image: assetUrl('cosmos/pages/r0012/orbit-smoke.png'),
    href: assetUrl('cosmos/pages/r0012/orbit-smoke.png'),
    text: '1920x1080 capture from the review screenshot harness after LUT solver integration.',
  },
  {
    title: 'R0012 transmittance LUT',
    image: assetUrl('cosmos/pages/lut/transmittance.png'),
    href: assetUrl('cosmos/pages/lut/transmittance.png'),
    text: 'Generated PNG export used for atmosphere solver review.',
  },
  {
    title: 'R0012 multi-scattering LUT',
    image: assetUrl('cosmos/pages/lut/multi-scattering.png'),
    href: assetUrl('cosmos/pages/lut/multi-scattering.png'),
    text: 'Low-resolution texture showing accumulated atmosphere contribution.',
  },
  {
    title: 'R0012 aerial perspective LUT',
    image: assetUrl('cosmos/pages/lut/aerial-perspective.png'),
    href: assetUrl('cosmos/pages/lut/aerial-perspective.png'),
    text: 'Distance haze and optical-depth review surface.',
  },
  {
    title: 'R0004 seven-view capture set',
    image: assetUrl('cosmos/pages/sea-level.png'),
    href: '#review',
    text: 'Canonical lead-eyes bookmarks for orbit, weather, storm, glitter, sea-level, and underwater critique.',
  },
  {
    title: 'R0004 GIBS surface atlas',
    image: assetUrl('cosmos/gibs/global-truecolor.jpg'),
    href: assetUrl('cosmos/gibs/global-truecolor.manifest.json'),
    text: 'First real global true-color raster stored with manifest state.',
  },
  {
    title: 'R0005 bathymetry atlas',
    image: assetUrl('cosmos/bathymetry/global-depth.png'),
    href: assetUrl('cosmos/bathymetry/global-depth.manifest.json'),
    text: 'Depth raster plumbing for shallow water, shelf breaks, coast foam, fog, and caustics.',
  },
  {
    title: 'Terminator review lineage',
    image: assetUrl('cosmos/pages/cloud-terminator.png'),
    href: assetUrl('cosmos/pages/cloud-terminator.png'),
    text: 'Cloud stacking, twilight handoff, rim thickness, and atmosphere calibration target.',
  },
];

const releases = [
  ['R0012', 'Atmosphere LUT solver', 'Curved-path optical-depth solver, ozone density, PNG LUT exports, quality contracts.', 'R-0012_atmosphere_lut_solver.json'],
  ['R0011', 'Shader-clean twilight calibration', 'Representative atmosphere samples and twilight defaults after shader cleanup.', 'R-0011_shader_clean_twilight_calibration.json'],
  ['R0010', 'Runtime shader diagnostics', 'WebGL program logs, diagnostics panel, twilight review targets.', 'R-0010_runtime_shader_twilight.json'],
  ['R0009', 'Physical atmosphere LUT interface', 'Transmittance, multi-scattering, sky-view, and aerial-perspective data textures.', 'R-0009_physical_atmosphere_lut.json'],
  ['R0008', 'Visual debug overlays', 'Scale ownership, atmosphere ownership, cloud LOD, physical shell overlays.', 'R-0008_visual_debug_overlays.json'],
  ['R0007', 'Atmosphere and cloud LOD', 'Ground-to-orbit sky continuity, rim tuning, and cloud band ownership.', 'R-0007_atmosphere_cloud_lod.json'],
  ['R0006', 'Scale coherence', 'Fixed Earth center, shared scale uniforms, spherical cloud shell altitude logic.', 'R-0006_scale_coherence_ion.json'],
  ['R0005', 'Bathymetry one-water intake', 'Depth atlas channels, shallow optics, coastal foam, underwater fog targets.', 'R-0005_bathymetry_one_water_intake.json'],
  ['R0004', 'GIBS surface overlay runtime', 'NASA true-color global atlas loader, manifest, UI data state, seven screenshots.', 'R-0004_gibs_surface_overlay_runtime.json'],
  ['R0003', 'Weather atlas unification', 'Shared weather atlas sampled by orbit, clouds, ocean, and terrain forcing.', 'R-0003_weather_atlas_unification.json'],
  ['R0002', 'Orbital review route', 'Dedicated Cosmos Review route and stable bookmark IDs.', 'R-0002_orbital_review_route.json'],
  ['R0001', 'Weather atlas spine', 'Deterministic water-world weather generator and first ION Cosmos operating docs.', 'R-0001_weather_atlas_spine.json'],
];

const metrics = [
  ['Release spine', '12 releases'],
  ['Review bookmarks', '7 fixed views'],
  ['Atlas snapshot', '2048x1024'],
  ['LUT exports', 'R0012'],
];

const CosmosPage = () => (
  <main className="min-h-screen bg-[#080807] text-stone-100">
    <section className="relative flex min-h-[92vh] items-end overflow-hidden">
      <img
        src={assetUrl('cosmos/pages/sea-level.png')}
        alt="Cosmos sea-level water renderer"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,5,0.18)_0%,rgba(5,6,5,0.28)_42%,rgba(8,8,7,0.88)_100%)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-5 pb-16 pt-28 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-normal text-cyan-100 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            ION Operations / Water World
          </div>
          <h1 className="text-6xl font-semibold tracking-normal text-white sm:text-7xl lg:text-8xl">
            Cosmos
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-100/88 sm:text-xl">
            A cinematic Earth and ocean renderer built as a verifiable visual laboratory: satellite intake,
            weather-scale atmosphere, water-world review bookmarks, and phase receipts for every major change.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-cyan-300 text-stone-950 hover:bg-cyan-200">
              <Link to="/lab">
                Launch Lab
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-black/20 text-white hover:bg-white/10">
              <a href="#latest">Latest Images</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-black/20 text-white hover:bg-white/10">
              <a href="#history">Image History</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-black/20 text-white hover:bg-white/10">
              <Link to="/cosmos-review?bookmark=sea-level&panel=1">
                Review Bookmarks
              </Link>
            </Button>
          </div>
        </div>

        <div className="self-end border border-white/15 bg-black/40 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-cyan-100">
            <CheckCircle2 className="h-4 w-4" />
            Current Evidence
          </div>
          <div className="grid grid-cols-2 gap-3">
            {metrics.map(([label, value]) => (
              <div key={label} className="border border-white/10 bg-white/[0.04] p-3">
                <div className="text-xl font-semibold text-white">{value}</div>
                <div className="mt-1 text-xs text-stone-300">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section id="latest" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-cyan-200">
            <Satellite className="h-4 w-4" />
            Latest Images
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white">R0012 visual state, public on Pages.</h2>
        </div>
        <Button asChild variant="outline" className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
          <a href="https://github.com/ION-operations/Cosmos/tree/main/public/cosmos/pages" target="_blank" rel="noreferrer">
            Public Image Folder
          </a>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <a href={assetUrl('cosmos/pages/r0012/orbit-smoke.png')} className="overflow-hidden border border-white/10 bg-[#11100d]">
          <img
            src={assetUrl('cosmos/pages/r0012/orbit-smoke.png')}
            alt="R0012 Cosmos sky-only orbit validation capture"
            className="aspect-[16/10] w-full object-cover"
          />
          <div className="p-5">
            <h3 className="text-2xl font-semibold text-white">R0012 Sky-Only Runtime</h3>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Runtime smoke capture with sky visible by default, GIBS loaded, bathymetry loaded, atmosphere LUT generated, and diagnostics ok.
            </p>
          </div>
        </a>
        <div className="grid gap-3 sm:grid-cols-2">
          {latestAssets.map((asset) => (
            <a key={asset.title} href={asset.href} className="overflow-hidden border border-white/10 bg-[#11100d]">
              <img src={asset.image} alt={asset.title} className="aspect-[16/10] w-full object-cover" />
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white">{asset.title}</h3>
                <p className="mt-1 text-xs leading-5 text-stone-400">{asset.text}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>

    <section className="border-y border-white/10 bg-[#11100d]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[330px_minmax(0,1fr)] lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-amber-200">
            <Compass className="h-4 w-4" />
            Design Brief
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white">A renderer with receipts.</h2>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            Cosmos follows the ION style of evidence-first project design: clear operating docs, stable review
            IDs, validation logs, and explicit next-candidate work instead of hidden visual drift.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {systems.map(({ icon: Icon, label, text }) => (
            <article key={label} className="border border-white/10 bg-black/25 p-4">
              <Icon className="h-5 w-5 text-cyan-200" />
              <h3 className="mt-4 text-sm font-semibold text-white">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-400">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section id="review" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-cyan-200">
            <Layers className="h-4 w-4" />
            Lead-Eyes Views
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white">Repeatable visual critique surfaces.</h2>
        </div>
        <Button asChild variant="outline" className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
          <Link to="/cosmos-local-run">
            <FileText className="mr-2 h-4 w-4" />
            Local Run Console
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reviewShots.map((shot) => (
          <Link
            key={shot.id}
            to={`/cosmos-review?bookmark=${shot.id}&panel=1`}
            className="group overflow-hidden border border-white/10 bg-[#11100d]"
          >
            <div className="aspect-[16/9] overflow-hidden bg-black">
              <img
                src={shot.image}
                alt={`${shot.title} review capture`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
              />
            </div>
            <div className="flex items-start justify-between gap-4 p-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{shot.title}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-400">{shot.focus}</p>
              </div>
              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-cyan-200 transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </section>

    <section id="history" className="mx-auto max-w-7xl border-t border-white/10 px-5 py-16 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-cyan-200">
            <Layers className="h-4 w-4" />
            Image History
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white">Every visible asset has a trail.</h2>
        </div>
        <Button asChild variant="outline" className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
          <a href="https://github.com/ION-operations/Cosmos/tree/main/docs/cosmos/validation" target="_blank" rel="noreferrer">
            Validation Logs
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {imageHistory.map((asset) => (
          <a key={asset.title} href={asset.href} className="overflow-hidden border border-white/10 bg-[#11100d]">
            <img src={asset.image} alt={asset.title} className="aspect-[16/10] w-full object-cover" />
            <div className="p-4">
              <h3 className="text-base font-semibold text-white">{asset.title}</h3>
              <p className="mt-2 min-h-[76px] text-xs leading-5 text-stone-400">{asset.text}</p>
              <span className="mt-4 inline-flex text-xs font-semibold text-cyan-200">Open</span>
            </div>
          </a>
        ))}
      </div>
    </section>

    <section id="releases" className="border-t border-white/10 bg-[linear-gradient(180deg,#11100d_0%,#080807_100%)]">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-cyan-200">
              <FileText className="h-4 w-4" />
              Release History
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white">Receipt-backed evolution from R0001 to R0012.</h2>
          </div>
          <Button asChild variant="outline" className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
            <a href="https://github.com/ION-operations/Cosmos/tree/main/docs/cosmos/receipts" target="_blank" rel="noreferrer">
              Receipt Folder
            </a>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {releases.map(([id, title, text, file]) => (
            <a
              key={id}
              href={`https://github.com/ION-operations/Cosmos/blob/main/docs/cosmos/receipts/${file}`}
              target="_blank"
              rel="noreferrer"
              className="min-h-[160px] border border-white/10 bg-[#11100d] p-4"
            >
              <span className="inline-flex border border-cyan-200/40 px-2 py-1 text-xs font-semibold text-cyan-200">{id}</span>
              <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-stone-400">{text}</p>
            </a>
          ))}
        </div>
      </div>
    </section>

    <section className="border-t border-white/10 bg-[#d7cfb6] text-stone-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal">
            <CloudSun className="h-4 w-4" />
            Next Candidate
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal">R0012: bathymetry, scale, atmosphere, and runtime diagnostics.</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-stone-800">
            The visual gap is now clear: true-color land retention overwhelms the water-world read. The runtime
            now carries depth rasters, shallow-water color targets, shelf breaks, coastal foam masks, underwater fog,
            atmosphere LUTs, twilight calibration, and diagnostics that hold the work accountable from orbit to sea level.
          </p>
        </div>
        <div className="grid gap-2 text-sm">
          <a className="flex items-center justify-between border border-stone-950/15 bg-stone-950/5 px-4 py-3 hover:bg-stone-950/10" href="https://github.com/ION-operations/Cosmos" target="_blank" rel="noreferrer">
            <span className="flex items-center gap-2"><Github className="h-4 w-4" /> ION Operations / Cosmos</span>
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link className="flex items-center justify-between border border-stone-950/15 bg-stone-950/5 px-4 py-3 hover:bg-stone-950/10" to="/cosmos-review?bookmark=orbit&panel=1">
            <span>Orbit Review</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link className="flex items-center justify-between border border-stone-950/15 bg-stone-950/5 px-4 py-3 hover:bg-stone-950/10" to="/cosmos-review?bookmark=underwater&panel=1">
            <span>Underwater Review</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  </main>
);

export default CosmosPage;
