import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Sun, Cloud, Mountain, Waves, TreePine, CloudRain, Sparkles, X, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LABS = [
  { path: '/sky', label: 'Sky Lab', icon: Sun, color: 'text-amber-400', desc: 'Atmospheric scattering, stars, sun/moon' },
  { path: '/clouds', label: 'Cloud Lab', icon: Cloud, color: 'text-sky-400', desc: 'Volumetric cloud raymarching' },
  { path: '/terrain', label: 'Terrain Lab', icon: Mountain, color: 'text-stone-400', desc: 'Procedural terrain + erosion' },
  { path: '/ocean', label: 'Ocean Lab', icon: Waves, color: 'text-cyan-400', desc: 'Waves, foam, caustics, SSS' },
  { path: '/vegetation', label: 'Vegetation Lab', icon: TreePine, color: 'text-emerald-400', desc: 'Trees, grass, flowers, wind' },
  { path: '/weather', label: 'Weather Lab', icon: CloudRain, color: 'text-blue-400', desc: 'Rain, snow, lightning' },
  { path: '/effects', label: 'Effects Lab', icon: Sparkles, color: 'text-violet-400', desc: 'Fog, god rays, bloom, TAA' },
  { path: '/gpu', label: 'WebGPU Engine', icon: Cpu, color: 'text-fuchsia-400', desc: 'Native WebGPU + WGSL compute' },
];

const LabHub: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="absolute bottom-5 right-5 z-40 panel-glow backdrop-blur-xl gap-2"
      >
        <FlaskConical className="w-4 h-4 text-primary" />
        <span className="text-xs">Layer Labs</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="panel-glow backdrop-blur-xl bg-background/90 rounded-2xl p-6 max-w-3xl w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-6 h-6 text-primary" />
                <div>
                  <h2 className="text-xl font-bold text-primary">Layer Isolation Labs</h2>
                  <p className="text-xs text-muted-foreground">Forensic debugging environments for each rendering system</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LABS.map(({ path, label, icon: Icon, color, desc }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setOpen(false)}
                  className="group flex items-start gap-3 p-4 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 hover:border-primary/50 transition-all"
                >
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-5 p-3 rounded-lg bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-primary font-semibold">Forensic mode:</span> Each lab isolates a single rendering system with built-in FPS monitoring, frame time graphs, and GPU diagnostics. Use these to identify which layer causes lag in the main composite.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LabHub;
