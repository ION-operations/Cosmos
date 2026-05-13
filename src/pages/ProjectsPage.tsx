import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Cloud,
  Code2,
  Compass,
  ExternalLink,
  Gauge,
  Github,
  Globe2,
  LockKeyhole,
  Network,
  Radio,
  Satellite,
  ShieldCheck,
  TerminalSquare,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const LAN_HOST = '192.168.2.25';

const publicLinks = [
  {
    label: 'Cosmos app',
    href: 'https://ion-operations.github.io/Cosmos/',
    note: 'Public GitHub Pages Vite app.',
  },
  {
    label: 'Cosmos repository',
    href: 'https://github.com/ION-operations/Cosmos',
    note: 'Source, receipts, screenshots, and build workflow.',
  },
  {
    label: 'ION MCP endpoint',
    href: 'https://ion.helixion.net/mcp',
    note: 'Helixion public JSON-RPC Action endpoint.',
  },
  {
    label: 'ION Action Gateway',
    href: 'https://ion-actions.helixion.net/health',
    note: 'Custom GPT Actions health endpoint.',
  },
];

const localServices = [
  {
    name: 'Helixion JOC Cockpit',
    port: '8788',
    role: 'Local-only operator cockpit app with service console, JOC shell, projects/packages, queue, and Codex panels.',
    local: 'http://127.0.0.1:8788/',
    lan: `http://${LAN_HOST}:8788/`,
    routes: [
      ['Cockpit', 'http://127.0.0.1:8788/'],
      ['JOC evolution', 'http://127.0.0.1:8788/joc/evolution'],
      ['Helixion development', 'http://127.0.0.1:8788/helixion/development'],
      ['Development', 'http://127.0.0.1:8788/development'],
      ['Health', 'http://127.0.0.1:8788/health'],
    ],
  },
  {
    name: 'ION MCP Preview',
    port: '8765',
    role: 'Local MCP preview behind the Helixion tunnel. Intended for status, tool discovery, and bounded visibility calls.',
    local: 'http://127.0.0.1:8765/health',
    lan: `http://${LAN_HOST}:8765/health`,
    routes: [
      ['Health', 'http://127.0.0.1:8765/health'],
      ['MCP', 'http://127.0.0.1:8765/mcp'],
      ['Public MCP', 'https://ion.helixion.net/mcp'],
    ],
  },
  {
    name: 'Action Gateway',
    port: '8777',
    role: 'Custom GPT Action Gateway for bounded requests, validation, approval evidence, and receipts.',
    local: 'http://127.0.0.1:8777/health',
    lan: `http://${LAN_HOST}:8777/health`,
    routes: [
      ['Health', 'http://127.0.0.1:8777/health'],
      ['Public health', 'https://ion-actions.helixion.net/health'],
    ],
  },
  {
    name: 'ChatOps Daemon',
    port: '8767',
    role: 'Local daemon surface for ChatOps bridge health and routing visibility.',
    local: 'http://127.0.0.1:8767/health',
    lan: `http://${LAN_HOST}:8767/health`,
    routes: [['Health', 'http://127.0.0.1:8767/health']],
  },
  {
    name: 'dAimon Gemini Bridge',
    port: '8795',
    role: 'Reserved local websocket bridge for the dAimon companion line.',
    local: 'ws://127.0.0.1:8795',
    lan: `ws://${LAN_HOST}:8795`,
    routes: [['WebSocket', 'ws://127.0.0.1:8795']],
  },
];

const projects = [
  {
    icon: Waves,
    name: 'Cosmos Water World',
    status: 'Live public app',
    summary:
      'Real-data water-world renderer with GIBS surface atlas, bathymetry, atmosphere LUTs, review bookmarks, and release receipts.',
    primary: { label: 'Open app', href: 'https://ion-operations.github.io/Cosmos/' },
    secondary: { label: 'Review orbit', href: '/cosmos-review?bookmark=orbit&panel=1', internal: true },
    meta: ['GitHub Pages', 'Vite app', 'R0012 deployed'],
  },
  {
    icon: Compass,
    name: 'Helixion JOC',
    status: 'Local cockpit',
    summary:
      'Cockpit glass for ION, dAimon, WisdomNET, Codex Capsule Chat, browser carrier work, and queue gateway state.',
    primary: { label: 'Open local cockpit', href: 'http://127.0.0.1:8788/' },
    secondary: { label: 'LAN candidate', href: `http://${LAN_HOST}:8788/` },
    meta: ['Port 8788', 'Local-only by default', 'JOC shell'],
  },
  {
    icon: ShieldCheck,
    name: 'ION Core',
    status: 'Control-plane substrate',
    summary:
      'Law, state, context graph, queues, receipts, skill routing, proof boundaries, and operator-visible service health.',
    primary: { label: 'Public MCP', href: 'https://ion.helixion.net/mcp' },
    secondary: { label: 'Local health', href: 'http://127.0.0.1:8765/health' },
    meta: ['MCP 8765', 'Receipts', 'Bounded tools'],
  },
  {
    icon: Radio,
    name: 'JOC Queue Gateway',
    status: 'Bounded action lane',
    summary:
      'Custom GPT Actions gateway and browser/queue carrier state for typed requests, approval evidence, and task receipts.',
    primary: { label: 'Action health', href: 'https://ion-actions.helixion.net/health' },
    secondary: { label: 'Local gateway', href: 'http://127.0.0.1:8777/health' },
    meta: ['Gateway 8777', 'Actions tunnel', 'No silent authority'],
  },
  {
    icon: Network,
    name: 'dAimon Companion',
    status: 'Portable companion line',
    summary:
      'Browser extension and page companion direction for DOM perception, bounded agent lanes, and user-approved page work.',
    primary: { label: 'Bridge reservation', href: 'ws://127.0.0.1:8795' },
    secondary: { label: 'ION context', href: 'https://github.com/ION-operations/Cosmos' },
    meta: ['Websocket 8795', 'Extension lane', 'Approval-gated'],
  },
  {
    icon: Boxes,
    name: 'WisdomNET',
    status: 'Candidate hub',
    summary:
      'Federated hub direction for candidate packs, connectors, trusted workflows, and project/package promotion surfaces.',
    primary: { label: 'View Cosmos releases', href: '/#releases', internal: true },
    secondary: { label: 'Projects panel', href: 'http://127.0.0.1:8788/' },
    meta: ['Planned hub', 'Package surfaces', 'Receipts first'],
  },
];

const boundaryNotes = [
  ['Public', 'Links with https:// are intended to be reachable outside the local machine when their tunnels are online.'],
  ['Local', '127.0.0.1 links open only on the same machine running the ION service.'],
  ['LAN', `${LAN_HOST} links are convenience targets for this network and require the service to bind beyond localhost.`],
  ['Authority', 'These surfaces are visibility and approved-control links; they do not grant production or live execution authority.'],
];

const ExternalAnchor = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
  <a className={className} href={href} target="_blank" rel="noreferrer">
    {children}
  </a>
);

const ProjectLink = ({
  link,
  className,
}: {
  link: { label: string; href: string; internal?: boolean };
  className?: string;
}) => {
  if (link.internal) {
    return (
      <Link className={className} to={link.href}>
        {link.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <ExternalAnchor className={className} href={link.href}>
      {link.label}
      <ExternalLink className="h-4 w-4" />
    </ExternalAnchor>
  );
};

const ProjectsPage = () => (
  <main className="min-h-screen bg-[#080807] text-stone-100">
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_24%_16%,rgba(103,232,249,0.16),transparent_32%),linear-gradient(180deg,#11100d_0%,#080807_100%)]">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <Button asChild variant="outline" className="mb-10 border-white/15 bg-black/20 text-white hover:bg-white/10">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cosmos
          </Link>
        </Button>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <div className="inline-flex items-center gap-2 border border-cyan-200/25 bg-cyan-200/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-normal text-cyan-100">
              <Globe2 className="h-4 w-4" />
              ION Operations Project Hub
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-normal text-white sm:text-6xl lg:text-7xl">
              One front door for Cosmos, Helixion, JOC, ION, and companion systems.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              This page keeps public apps, local cockpit routes, LAN candidates, and Helixion endpoints in one
              operator surface. Local links are intentionally labeled because GitHub Pages cannot make localhost
              services globally reachable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-cyan-300 text-stone-950 hover:bg-cyan-200">
                <Link to="/lab">
                  Launch Cosmos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-black/20 text-white hover:bg-white/10">
                <a href="http://127.0.0.1:8788/" target="_blank" rel="noreferrer">
                  Open Helixion Local
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <aside className="self-end border border-white/10 bg-black/35 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-cyan-100">
              <Gauge className="h-4 w-4" />
              Access Map
            </div>
            <div className="grid gap-3">
              {boundaryNotes.map(([label, text]) => (
                <div key={label} className="border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-sm font-semibold text-white">{label}</div>
                  <p className="mt-1 text-xs leading-5 text-stone-400">{text}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-cyan-200">
            <Satellite className="h-4 w-4" />
            Project Surfaces
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white">Apps and control surfaces.</h2>
        </div>
        <ExternalAnchor
          href="https://github.com/ION-operations/Cosmos"
          className="inline-flex min-h-10 items-center gap-2 border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white hover:bg-white/10"
        >
          <Github className="h-4 w-4" />
          GitHub
        </ExternalAnchor>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map(({ icon: Icon, name, status, summary, primary, secondary, meta }) => (
          <article key={name} className="grid min-h-[330px] border border-white/10 bg-[#11100d] p-5">
            <div>
              <div className="flex items-start justify-between gap-4">
                <Icon className="h-6 w-6 text-cyan-200" />
                <span className="border border-cyan-200/25 bg-cyan-200/10 px-2 py-1 text-xs font-semibold text-cyan-100">
                  {status}
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-white">{name}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-400">{summary}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {meta.map((item) => (
                  <span key={item} className="border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-stone-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 grid content-end gap-2 text-sm">
              <ProjectLink
                link={primary}
                className="inline-flex min-h-10 items-center justify-between gap-3 bg-cyan-300 px-4 font-semibold text-stone-950 hover:bg-cyan-200"
              />
              <ProjectLink
                link={secondary}
                className="inline-flex min-h-10 items-center justify-between gap-3 border border-white/15 bg-white/[0.04] px-4 font-semibold text-white hover:bg-white/10"
              />
            </div>
          </article>
        ))}
      </div>
    </section>

    <section className="border-y border-white/10 bg-[#11100d]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[330px_minmax(0,1fr)] lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-amber-200">
            <TerminalSquare className="h-4 w-4" />
            Local Services
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white">Operator machine endpoints.</h2>
          <p className="mt-4 text-sm leading-7 text-stone-400">
            These are sourced from the ION local user services runbook. The localhost links are the canonical
            targets; LAN links are included for convenience when the service is exposed beyond loopback.
          </p>
        </div>

        <div className="grid gap-4">
          {localServices.map((service) => (
            <article key={service.name} className="border border-white/10 bg-black/25 p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_230px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-white">{service.name}</h3>
                    <span className="border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-stone-300">
                      port {service.port}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-400">{service.role}</p>
                  <div className="mt-4 grid gap-2 text-xs text-stone-300 sm:grid-cols-2">
                    <code className="border border-white/10 bg-black/35 px-3 py-2">{service.local}</code>
                    <code className="border border-white/10 bg-black/35 px-3 py-2">{service.lan}</code>
                  </div>
                </div>
                <div className="grid content-start gap-2 text-sm">
                  {service.routes.map(([label, href]) => (
                    <ExternalAnchor
                      key={`${service.name}-${label}`}
                      href={href}
                      className="inline-flex min-h-9 items-center justify-between gap-3 border border-white/10 bg-white/[0.04] px-3 font-semibold text-white hover:bg-white/10"
                    >
                      {label}
                      <ExternalLink className="h-4 w-4 text-cyan-200" />
                    </ExternalAnchor>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-cyan-200">
          <Cloud className="h-4 w-4" />
          Public Links
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white">Reachable surfaces and tunnels.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {publicLinks.map((link) => (
          <ExternalAnchor key={link.href} href={link.href} className="border border-white/10 bg-[#11100d] p-4 hover:bg-white/[0.04]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-white">{link.label}</h3>
              <ExternalLink className="h-4 w-4 text-cyan-200" />
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-400">{link.note}</p>
          </ExternalAnchor>
        ))}
      </div>
    </section>

    <section className="border-t border-white/10 bg-[#d7cfb6] text-stone-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal">
            <LockKeyhole className="h-4 w-4" />
            Boundary Note
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal">This hub is a visibility surface.</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-stone-800">
            Opening a link may show a local cockpit or health route, but this page does not grant production authority,
            live execution authority, secrets authority, unrestricted browser control, or silent browser send.
          </p>
        </div>
        <div className="grid gap-2 text-sm">
          <Link className="flex items-center justify-between border border-stone-950/15 bg-stone-950/5 px-4 py-3 hover:bg-stone-950/10" to="/">
            <span>Cosmos main page</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link className="flex items-center justify-between border border-stone-950/15 bg-stone-950/5 px-4 py-3 hover:bg-stone-950/10" to="/cosmos-review?bookmark=orbit&panel=1">
            <span>Cosmos review route</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <ExternalAnchor
            href="http://127.0.0.1:8788/"
            className="flex items-center justify-between border border-stone-950/15 bg-stone-950/5 px-4 py-3 hover:bg-stone-950/10"
          >
            <span>Helixion local cockpit</span>
            <ExternalLink className="h-4 w-4" />
          </ExternalAnchor>
        </div>
      </div>
    </section>
  </main>
);

export default ProjectsPage;
