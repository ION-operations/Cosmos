import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Clipboard,
  ExternalLink,
  FileImage,
  FileJson,
  FolderOpen,
  Play,
  TerminalSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COSMOS_REVIEW_BOOKMARKS } from '@/cosmos/orbital/WorldEngine';

const PROJECT_ROOT = '/home/sev/Cosmos/earth-forge';
const SCREENSHOT_DIR = `${PROJECT_ROOT}/docs/cosmos/validation/screenshots/R0004`;
const REPORT_PATH = `${PROJECT_ROOT}/docs/cosmos/R0004_LOCAL_RUN.md`;
const VALIDATION_DIR = `${PROJECT_ROOT}/docs/cosmos/validation`;

const fsUrl = (path: string) => `/@fs${path}`;

const COMMANDS = [
  'npm ci',
  'npm run cosmos:gibs:global-snapshot',
  'npm run build',
  'npm run test',
  'npm run lint',
  'npm i -D playwright',
  'npx playwright install chromium',
  'npm run cosmos:review:screenshots',
];

const DATA_LINKS = [
  {
    label: 'GIBS atlas JPG',
    href: '/cosmos/gibs/global-truecolor.jpg',
    icon: FileImage,
  },
  {
    label: 'GIBS manifest',
    href: '/cosmos/gibs/global-truecolor.manifest.json',
    icon: FileJson,
  },
  {
    label: 'Local run report',
    href: fsUrl(REPORT_PATH),
    icon: ExternalLink,
  },
  {
    label: 'Validation folder',
    href: fsUrl(VALIDATION_DIR),
    icon: FolderOpen,
  },
];

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

const CosmosLocalRun = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const commandBlock = useMemo(() => COMMANDS.join('\n'), []);

  const onCopy = async (id: string, value: string) => {
    await copyText(value);
    setCopied(id);
    window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1500);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Main
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-normal text-white">R0004 Local Run Console</h1>
              <p className="text-sm text-slate-400">Project root: {PROJECT_ROOT}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Link to="/cosmos-review?bookmark=orbit&panel=1">
                <Camera className="mr-2 h-4 w-4" />
                Open Review
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
              onClick={() => onCopy('commands', commandBlock)}
            >
              <Clipboard className="mr-2 h-4 w-4" />
              {copied === 'commands' ? 'Copied' : 'Copy Commands'}
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-300">
              <TerminalSquare className="h-4 w-4" />
              Required command stack
            </div>
            <pre className="overflow-auto rounded-md border border-white/10 bg-black/45 p-3 text-xs leading-6 text-slate-200">
              {commandBlock}
            </pre>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-300">
              <FolderOpen className="h-4 w-4" />
              Local outputs
            </div>
            <div className="grid gap-2">
              {DATA_LINKS.map(({ label, href, icon: Icon }) => (
                <Button
                  key={label}
                  asChild
                  variant="outline"
                  className="justify-start border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
                >
                  <a href={href} target="_blank" rel="noreferrer">
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                    <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-70" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">Bookmark launchers and screenshots</h2>
              <p className="mt-1 text-sm text-slate-400">{SCREENSHOT_DIR}</p>
            </div>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
              onClick={() => onCopy('screenshot-dir', SCREENSHOT_DIR)}
            >
              <Clipboard className="mr-2 h-4 w-4" />
              {copied === 'screenshot-dir' ? 'Copied' : 'Copy Folder Path'}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {COSMOS_REVIEW_BOOKMARKS.map((bookmark) => {
              const screenshotPath = `${SCREENSHOT_DIR}/${bookmark.id}.png`;
              const reviewHref = `/cosmos-review?bookmark=${encodeURIComponent(bookmark.id)}&panel=1`;
              const cleanHref = `/cosmos-review?bookmark=${encodeURIComponent(bookmark.id)}&panel=0`;
              return (
                <article key={bookmark.id} className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{bookmark.title}</h3>
                      <p className="mt-1 text-xs text-slate-400">{bookmark.id}.png</p>
                    </div>
                    <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-[11px] font-mono text-cyan-200">
                      {bookmark.altitudeLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild size="sm" className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                      <Link to={reviewHref}>
                        <Play className="mr-2 h-4 w-4" />
                        Panel
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10">
                      <Link to={cleanHref}>
                        <Camera className="mr-2 h-4 w-4" />
                        Clean
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10">
                      <a href={fsUrl(screenshotPath)} target="_blank" rel="noreferrer">
                        <FileImage className="mr-2 h-4 w-4" />
                        PNG
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
                      onClick={() => onCopy(bookmark.id, screenshotPath)}
                    >
                      <Clipboard className="mr-2 h-4 w-4" />
                      {copied === bookmark.id ? 'Copied' : 'Path'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};

export default CosmosLocalRun;
