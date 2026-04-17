import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X, CloudRain, Home, Pause, Play, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VERTEX_SHADER, SHARED_UNIFORMS, SHARED_GLSL } from '@/shaders/shared.glsl';
import { SKY_UNIFORMS, SKY_GLSL, SKY_DEFAULTS } from '@/shaders/sky.glsl';
import { WEATHER_UNIFORMS, WEATHER_GLSL, WEATHER_DEFAULTS } from '@/shaders/weather.glsl';
import { SliderSetting, SettingSection } from '@/components/SettingsPanel';
import { useShaderRenderer } from '@/components/ShaderRenderer';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import FlightHUD from '@/components/FlightHUD';

const WEATHER_FRAGMENT_SHADER = `
precision highp float;
${SHARED_UNIFORMS}
${SKY_UNIFORMS}
${WEATHER_UNIFORMS}
${SHARED_GLSL}
${SKY_GLSL}
${WEATHER_GLSL}

void main() {
    vec2 uv = vUv;
    vec3 ro = uCameraPos;
    
    float yaw = uCameraYaw;
    float pitch = clamp(uCameraPitch, -PI * 0.45, PI * 0.45);
    vec3 lookDir = vec3(cos(pitch)*sin(yaw), sin(pitch), cos(pitch)*cos(yaw));
    vec3 rd = getRayDirection(uv, ro, ro + lookDir, uCameraFOV);
    vec3 sunDir = getSunDirection();
    
    vec3 skyColor = getSkyColor(rd, sunDir);
    vec3 finalColor = skyColor;
    
    finalColor = renderRain(uv, finalColor);
    finalColor = renderSnow(uv, finalColor);
    finalColor = renderLightning(uv, finalColor);
    
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const WeatherLab: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ ...WEATHER_DEFAULTS, ...SKY_DEFAULTS, showWeather: true });
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
    uAutoTimeEnabled: { value: false },
    uDayNightCycleSpeed: { value: 1.0 },
    uSkyZenithColor: { value: new THREE.Color(...settings.skyZenithColor) },
    uSkyHorizonColor: { value: new THREE.Color(...settings.skyHorizonColor) },
    uAtmosphereDensity: { value: 1.0 },
    uRayleighStrength: { value: 1.0 },
    uMieStrength: { value: 0.5 },
    uMieG: { value: 0.8 },
    uWeatherType: { value: settings.weatherType },
    uWeatherIntensity: { value: settings.weatherIntensity },
    uWindSpeed: { value: settings.windSpeed },
    uWindDirection: { value: settings.windDirection },
    uShowWeather: { value: settings.showWeather },
    uLightningIntensity: { value: settings.lightningIntensity },
    uLightningTime: { value: 0.0 },
  };

  const { containerRef, rendererRef, materialRef, flightStateRef } = useShaderRenderer({
    vertexShader: VERTEX_SHADER,
    fragmentShader: WEATHER_FRAGMENT_SHADER,
    uniforms,
    isPaused,
  });

  const updateSetting = useCallback(<K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    u.uWeatherType.value = settings.weatherType;
    u.uWeatherIntensity.value = settings.weatherIntensity;
    u.uWindSpeed.value = settings.windSpeed;
    u.uWindDirection.value = settings.windDirection;
    u.uShowWeather.value = settings.showWeather;
    u.uLightningIntensity.value = settings.lightningIntensity;
    u.uSunAzimuth.value = settings.sunAzimuth * Math.PI * 2;
    u.uSunElevation.value = settings.sunElevation * Math.PI * 0.5;
  }, [settings, materialRef]);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />
      <DiagnosticsOverlay renderer={rendererRef.current} visible={showDiagnostics} onToggle={() => setShowDiagnostics(false)} />

      <div className="absolute top-5 left-1/2 -translate-x-1/2 panel-glow backdrop-blur-xl rounded-xl p-3 flex items-center gap-3">
        <CloudRain className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">Weather Lab</h1>
          <p className="text-xs text-muted-foreground">Isolated rain, snow, lightning particles</p>
        </div>
      </div>

      <div className="absolute top-5 right-5 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate('/')} className="panel-glow backdrop-blur-sm"><Home className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)} className="panel-glow backdrop-blur-sm">{isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}</Button>
        <Button variant="outline" size="icon" onClick={() => setShowDiagnostics(!showDiagnostics)} className="panel-glow backdrop-blur-sm"><BarChart3 className="w-4 h-4" /></Button>
        <Button variant={showSettings ? 'default' : 'outline'} size="icon" onClick={() => setShowSettings(!showSettings)} className="panel-glow backdrop-blur-sm"><Settings className="w-4 h-4" /></Button>
      </div>

      <div className="absolute bottom-5 left-5 panel-glow backdrop-blur-xl rounded-xl p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Click</kbd> to look</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">WASD</kbd> Move</span>
        </div>
      </div>

      {showSettings && (
        <div className="absolute top-20 right-5 w-80 max-h-[calc(100vh-120px)] panel-glow backdrop-blur-xl rounded-xl">
          <div className="flex justify-between items-center p-4 border-b border-border/30">
            <h3 className="text-sm font-semibold text-primary">Weather Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-4">
              <SettingSection title="Weather Type">
                <SliderSetting label="Type (0=Off 1=Rain 2=Snow 3=Storm)" value={settings.weatherType} min={0} max={3} step={1} format={(v) => ['Off','Rain','Snow','Storm'][v]} onChange={(v) => updateSetting('weatherType', v)} />
                <SliderSetting label="Intensity" value={settings.weatherIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('weatherIntensity', v)} />
              </SettingSection>
              <SettingSection title="Wind">
                <SliderSetting label="Wind Speed" value={settings.windSpeed} min={0} max={2} step={0.05} onChange={(v) => updateSetting('windSpeed', v)} />
                <SliderSetting label="Wind Direction" value={settings.windDirection} min={0} max={1} step={0.01} format={(v) => `${(v*360).toFixed(0)}°`} onChange={(v) => updateSetting('windDirection', v)} />
              </SettingSection>
              <SettingSection title="Lightning">
                <SliderSetting label="Lightning Intensity" value={settings.lightningIntensity} min={0} max={3} step={0.1} onChange={(v) => updateSetting('lightningIntensity', v)} />
              </SettingSection>
              <SettingSection title="Sun">
                <SliderSetting label="Elevation" value={settings.sunElevation} min={-0.3} max={1} step={0.01} format={(v) => `${(v*90).toFixed(0)}°`} onChange={(v) => updateSetting('sunElevation', v)} />
              </SettingSection>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default WeatherLab;
