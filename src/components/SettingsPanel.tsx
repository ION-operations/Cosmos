import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

// ─────────────────────────────────────────────────────────────────────────────
// SLIDER SETTING COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export interface SliderSettingProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

export const SliderSetting: React.FC<SliderSettingProps> = ({
  label, value, min, max, step, format, onChange
}) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-primary font-mono">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
      className="w-full"
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SETTING SECTION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3 pb-4 border-b border-border/30">
    <h4 className="text-sm font-semibold text-primary">{title}</h4>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LAYER TOGGLE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export interface LayerToggleProps {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const LayerToggle: React.FC<LayerToggleProps> = ({ label, icon, enabled, onChange }) => (
  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <Switch checked={enabled} onCheckedChange={onChange} />
  </div>
);
