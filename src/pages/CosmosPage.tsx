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

const metrics = [
  ['Release spine', '12 drops'],
  ['Review bookmarks', '7 fixed views'],
  ['Atlas snapshot', '2048x1024'],
  ['Runtime spine', 'R0012'],
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

    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
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
