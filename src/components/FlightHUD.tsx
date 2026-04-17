import React, { useEffect, useRef, useState } from 'react';
import type { FlightState } from '@/hooks/useFlightPhysics';
import { Plane, Gauge, Compass, TrendingUp, Activity, AlertTriangle } from 'lucide-react';

interface FlightHUDProps {
  stateRef: React.MutableRefObject<FlightState>;
  visible?: boolean;
}

// Real-time flight instrumentation HUD: airspeed, altitude, heading,
// throttle, AoA, G-force, vertical speed. Reads from a ref and updates
// at 10 Hz to avoid React reconciliation cost.
const FlightHUD: React.FC<FlightHUDProps> = ({ stateRef, visible = true }) => {
  const [tick, setTick] = useState(0);
  const lastAltRef = useRef(0);
  const vsRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const alt = stateRef.current.altitude;
      vsRef.current = (alt - lastAltRef.current) / Math.max(dt, 0.001);
      lastAltRef.current = alt;
      setTick(t => (t + 1) % 1000);
    }, 100);
    return () => clearInterval(id);
  }, [visible, stateRef]);

  if (!visible) return null;

  const s = stateRef.current;
  const headingDeg = ((s.yaw * 180 / Math.PI) + 360) % 360;
  const pitchDeg = s.pitch * 180 / Math.PI;
  const rollDeg = s.roll * 180 / Math.PI;
  const aoaDeg = s.angleOfAttack * 180 / Math.PI;
  const speedKnots = s.airspeed * 1.94384;
  const altFeet = s.altitude * 3.28084;
  const vsFpm = vsRef.current * 196.85;

  const compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const cardinal = compassPoints[Math.round(headingDeg / 45) % 8];

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-mono text-xs select-none">
      {/* Top center: heading tape */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 panel-glow backdrop-blur-md bg-background/60 px-4 py-2 rounded-lg border border-primary/30">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary font-bold text-sm tracking-wider">{headingDeg.toFixed(0).padStart(3, '0')}°</span>
          <span className="text-muted-foreground text-[10px]">{cardinal}</span>
        </div>
      </div>

      {/* Left: airspeed */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 panel-glow backdrop-blur-md bg-background/60 px-3 py-3 rounded-lg border border-primary/30 min-w-[110px]">
        <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
          <Gauge className="w-3 h-3" />
          <span className="text-[10px] uppercase tracking-wider">Airspeed</span>
        </div>
        <div className="text-primary text-2xl font-bold leading-none">{speedKnots.toFixed(0)}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">kts · {s.airspeed.toFixed(0)} m/s</div>
        {s.stalled && (
          <div className="mt-2 flex items-center gap-1 text-destructive animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px] font-bold">STALL</span>
          </div>
        )}
      </div>

      {/* Right: altitude + VS */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 panel-glow backdrop-blur-md bg-background/60 px-3 py-3 rounded-lg border border-primary/30 min-w-[110px]">
        <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          <span className="text-[10px] uppercase tracking-wider">Altitude</span>
        </div>
        <div className="text-primary text-2xl font-bold leading-none">{altFeet.toFixed(0)}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">ft · {s.altitude.toFixed(0)} m</div>
        <div className={`text-[10px] mt-1 font-mono ${vsFpm > 100 ? 'text-emerald-400' : vsFpm < -100 ? 'text-amber-400' : 'text-muted-foreground'}`}>
          VS {vsFpm >= 0 ? '+' : ''}{vsFpm.toFixed(0)} fpm
        </div>
      </div>

      {/* Bottom-left: attitude */}
      <div className="absolute bottom-4 left-4 panel-glow backdrop-blur-md bg-background/60 px-3 py-2 rounded-lg border border-primary/30">
        <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
          <Plane className="w-3 h-3" />
          <span className="text-[10px] uppercase tracking-wider">Attitude</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-[11px]">
          <div>
            <div className="text-muted-foreground text-[9px]">PITCH</div>
            <div className="text-primary font-bold">{pitchDeg >= 0 ? '+' : ''}{pitchDeg.toFixed(1)}°</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[9px]">ROLL</div>
            <div className="text-primary font-bold">{rollDeg >= 0 ? '+' : ''}{rollDeg.toFixed(1)}°</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[9px]">AoA</div>
            <div className={`font-bold ${Math.abs(aoaDeg) > 12 ? 'text-amber-400' : 'text-primary'}`}>
              {aoaDeg.toFixed(1)}°
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-right: throttle + G */}
      <div className="absolute bottom-4 right-4 panel-glow backdrop-blur-md bg-background/60 px-3 py-2 rounded-lg border border-primary/30 min-w-[140px]">
        <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
          <Activity className="w-3 h-3" />
          <span className="text-[10px] uppercase tracking-wider">Engine</span>
        </div>
        <div className="space-y-1.5">
          <div>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-muted-foreground">THR</span>
              <span className="text-primary font-bold">{(s.throttle * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-muted/40 rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${s.throttle * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">G-Force</span>
            <span className={`font-bold ${Math.abs(s.gForce) > 4 ? 'text-destructive' : Math.abs(s.gForce) > 2.5 ? 'text-amber-400' : 'text-primary'}`}>
              {s.gForce.toFixed(2)} G
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Mode</span>
            <span className="text-primary font-bold uppercase">{s.mode}</span>
          </div>
        </div>
      </div>

      {/* Center crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
        <div className="absolute top-1/2 left-0 w-3 h-px bg-primary/70" />
        <div className="absolute top-1/2 right-0 w-3 h-px bg-primary/70" />
        <div className="absolute left-1/2 top-0 w-px h-3 bg-primary/70" />
        <div className="absolute left-1/2 bottom-0 w-px h-3 bg-primary/70" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary" />
      </div>

      {/* Controls hint */}
      <div className="absolute top-16 left-4 panel-glow backdrop-blur-md bg-background/40 px-2.5 py-1.5 rounded text-[9px] text-muted-foreground space-y-0.5 border border-border/30">
        <div><span className="text-primary">MOUSE</span> Pitch/Yaw</div>
        <div><span className="text-primary">A/D</span> Roll · <span className="text-primary">Q/E</span> Rudder</div>
        <div><span className="text-primary">W/S</span> Elev · <span className="text-primary">⇧/Ctrl</span> Throttle</div>
        <div><span className="text-primary">Z/X</span> Full/Cut · <span className="text-primary">F</span> Free-cam</div>
      </div>
    </div>
  );
};

export default FlightHUD;
