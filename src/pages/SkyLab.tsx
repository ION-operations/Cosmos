import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X, Sun, Moon, RotateCcw, Pause, Play, BarChart3, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VERTEX_SHADER, SHARED_UNIFORMS, SHARED_GLSL } from '@/shaders/shared.glsl';
import { SKY_UNIFORMS, SKY_GLSL, SKY_DEFAULTS } from '@/shaders/sky.glsl';
import { SliderSetting, SettingSection } from '@/components/SettingsPanel';
import { useShaderRenderer } from '@/components/ShaderRenderer';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';

const SKY_FRAGMENT_SHADER = `
precision highp float;
${SHARED_UNIFORMS}
${SKY_UNIFORMS}
${SHARED_GLSL}
${SKY_GLSL}

void main() {
    vec2 uv = vUv;
    vec3 ro = uCameraPos;
    
    float yaw = uCameraYaw;
    float pitch = uCameraPitch;
    pitch = clamp(pitch, -PI * 0.45, PI * 0.45);
    
    vec3 lookDir = vec3(
        cos(pitch) * sin(yaw),
        sin(pitch),
        cos(pitch) * cos(yaw)
    );
    
    vec3 rd = getRayDirection(uv, ro, ro + lookDir, uCameraFOV);
    vec3 sunDir = getSunDirection();
    vec3 moonDir = getMoonDirection();
    float sunElev = getAutoSunElevation();
    
    vec3 finalColor = getSkyColor(rd, sunDir);
    
    if(sunElev < 0.1 && uWeatherType == 0) {
        finalColor += vec3(getStars(rd));
    }
    
    if(uWeatherType == 0) {
        finalColor += getSunDisk(rd, sunDir);
        if(sunElev < 0.0) {
            finalColor += getMoonDisk(rd, moonDir);
        }
    }
    
    // Simple tonemapping
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const SkyLab: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(SKY_DEFAULTS);
  const [showSettings, setShowSettings] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const uniforms: Record<string, THREE.IUniform> = {
    uTimeOfDay: { value: settings.timeOfDay },
    uSunAzimuth: { value: settings.sunAzimuth * Math.PI * 2 },
    uSunElevation: { value: settings.sunElevation * Math.PI * 0.5 },
    uSunColor: { value: new THREE.Color(1, 0.95, 0.8) },
    uSunIntensity: { value: 2.0 },
    uMoonIntensity: { value: settings.moonIntensity },
    uStarIntensity: { value: settings.starIntensity },
    uAutoTimeEnabled: { value: settings.autoTimeEnabled },
    uDayNightCycleSpeed: { value: settings.dayNightCycleSpeed },
    uSkyZenithColor: { value: new THREE.Color(...settings.skyZenithColor) },
    uSkyHorizonColor: { value: new THREE.Color(...settings.skyHorizonColor) },
    uAtmosphereDensity: { value: settings.atmosphereDensity },
    uRayleighStrength: { value: settings.rayleighStrength },
    uMieStrength: { value: settings.mieStrength },
    uMieG: { value: settings.mieG },
    uWeatherType: { value: settings.weatherType },
    uWeatherIntensity: { value: settings.weatherIntensity },
    uWindSpeed: { value: settings.windSpeed },
    uWindDirection: { value: settings.windDirection },
  };

  const { containerRef, rendererRef, materialRef } = useShaderRenderer({
    vertexShader: VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    uniforms,
    isPaused,
  });

  const updateSetting = useCallback(<K extends keyof typeof SKY_DEFAULTS>(key: K, value: typeof SKY_DEFAULTS[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Sync uniforms on settings change
  useEffect(() => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    u.uSunAzimuth.value = settings.sunAzimuth * Math.PI * 2;
    u.uSunElevation.value = settings.sunElevation * Math.PI * 0.5;
    u.uMoonIntensity.value = settings.moonIntensity;
    u.uStarIntensity.value = settings.starIntensity;
    u.uAutoTimeEnabled.value = settings.autoTimeEnabled;
    u.uDayNightCycleSpeed.value = settings.dayNightCycleSpeed;
    u.uSkyZenithColor.value.setRGB(...settings.skyZenithColor);
    u.uSkyHorizonColor.value.setRGB(...settings.skyHorizonColor);
    u.uRayleighStrength.value = settings.rayleighStrength;
    u.uMieStrength.value = settings.mieStrength;
    u.uMieG.value = settings.mieG;
    u.uWeatherType.value = settings.weatherType;
    u.uWeatherIntensity.value = settings.weatherIntensity;
  }, [settings, materialRef]);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />

      <DiagnosticsOverlay
        renderer={rendererRef.current}
        visible={showDiagnostics}
        onToggle={() => setShowDiagnostics(false)}
      />

      {/* Header */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 panel-glow backdrop-blur-xl rounded-xl p-3 flex items-center gap-3">
        <Sun className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">Sky Lab</h1>
          <p className="text-xs text-muted-foreground">Isolated atmospheric scattering, stars, celestial</p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-5 right-5 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate('/')} className="panel-glow backdrop-blur-sm">
          <Home className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)} className="panel-glow backdrop-blur-sm">
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => setShowDiagnostics(!showDiagnostics)} className="panel-glow backdrop-blur-sm">
          <BarChart3 className="w-4 h-4" />
        </Button>
        <Button variant={showSettings ? 'default' : 'outline'} size="icon" onClick={() => setShowSettings(!showSettings)} className="panel-glow backdrop-blur-sm">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-5 left-5 panel-glow backdrop-blur-xl rounded-xl p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Click</kbd> to look</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">WASD</kbd> Move</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Scroll</kbd> Zoom</span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-20 right-5 w-80 max-h-[calc(100vh-120px)] panel-glow backdrop-blur-xl rounded-xl">
          <div className="flex justify-between items-center p-4 border-b border-border/30">
            <h3 className="text-sm font-semibold text-primary">Sky Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-4">
              <SettingSection title="Sun Position">
                <SliderSetting label="Azimuth" value={settings.sunAzimuth} min={0} max={1} step={0.01} format={(v) => `${(v * 360).toFixed(0)}°`} onChange={(v) => updateSetting('sunAzimuth', v)} />
                <SliderSetting label="Elevation" value={settings.sunElevation} min={-0.3} max={1} step={0.01} format={(v) => `${(v * 90).toFixed(0)}°`} onChange={(v) => updateSetting('sunElevation', v)} />
              </SettingSection>
              <SettingSection title="Day/Night Cycle">
                <SliderSetting label="Cycle Speed" value={settings.dayNightCycleSpeed} min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('dayNightCycleSpeed', v)} />
              </SettingSection>
              <SettingSection title="Atmosphere">
                <SliderSetting label="Rayleigh Scattering" value={settings.rayleighStrength} min={0} max={3} step={0.05} onChange={(v) => updateSetting('rayleighStrength', v)} />
                <SliderSetting label="Mie Scattering" value={settings.mieStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('mieStrength', v)} />
                <SliderSetting label="Mie G" value={settings.mieG} min={0.5} max={0.99} step={0.01} onChange={(v) => updateSetting('mieG', v)} />
              </SettingSection>
              <SettingSection title="Celestial">
                <SliderSetting label="Star Intensity" value={settings.starIntensity} min={0} max={3} step={0.1} onChange={(v) => updateSetting('starIntensity', v)} />
                <SliderSetting label="Moon Intensity" value={settings.moonIntensity} min={0} max={2} step={0.1} onChange={(v) => updateSetting('moonIntensity', v)} />
              </SettingSection>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SkyLab;
