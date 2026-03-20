import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X, Cloud, Home, Pause, Play, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VERTEX_SHADER, SHARED_UNIFORMS, SHARED_GLSL } from '@/shaders/shared.glsl';
import { SKY_UNIFORMS, SKY_GLSL, SKY_DEFAULTS } from '@/shaders/sky.glsl';
import { CLOUDS_UNIFORMS, CLOUDS_GLSL, CLOUDS_DEFAULTS } from '@/shaders/clouds.glsl';
import { SliderSetting, SettingSection } from '@/components/SettingsPanel';
import { useShaderRenderer } from '@/components/ShaderRenderer';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';

const CLOUD_FRAGMENT_SHADER = `
precision highp float;
${SHARED_UNIFORMS}
${SKY_UNIFORMS}
${CLOUDS_UNIFORMS}
${SHARED_GLSL}
${SKY_GLSL}
${CLOUDS_GLSL}

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
    
    if(uShowClouds) {
        vec3 lightColor = uSunColor * uSunIntensity;
        vec4 cloudResult = raymarchClouds(ro, rd, sunDir, lightColor);
        finalColor = mix(finalColor, cloudResult.rgb, cloudResult.a);
    }
    
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const CloudLab: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ ...CLOUDS_DEFAULTS, ...SKY_DEFAULTS, showClouds: true });
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
    uCloudCoverage: { value: settings.cloudCoverage },
    uCloudDensity: { value: settings.cloudDensity },
    uCloudScale: { value: settings.cloudScale },
    uCloudDetailScale: { value: settings.cloudDetailScale },
    uCloudSpeed: { value: settings.cloudSpeed },
    uCloudHeight: { value: settings.cloudHeight },
    uCloudThickness: { value: settings.cloudThickness },
    uCloudLightAbsorption: { value: settings.cloudLightAbsorption },
    uCloudAmbient: { value: settings.cloudAmbient },
    uCloudSilverLining: { value: settings.cloudSilverLining },
    uCloudPowder: { value: settings.cloudPowder },
    uCloudSteps: { value: settings.cloudSteps },
    uCloudLightSteps: { value: settings.cloudLightSteps },
    uShowClouds: { value: settings.showClouds },
    uLightningIntensity: { value: settings.lightningIntensity },
    uLightningTime: { value: 0.0 },
  };

  const { containerRef, rendererRef, materialRef } = useShaderRenderer({
    vertexShader: VERTEX_SHADER,
    fragmentShader: CLOUD_FRAGMENT_SHADER,
    uniforms,
    isPaused,
  });

  const updateSetting = useCallback(<K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    u.uSunAzimuth.value = settings.sunAzimuth * Math.PI * 2;
    u.uSunElevation.value = settings.sunElevation * Math.PI * 0.5;
    u.uCloudCoverage.value = settings.cloudCoverage;
    u.uCloudDensity.value = settings.cloudDensity;
    u.uCloudScale.value = settings.cloudScale;
    u.uCloudDetailScale.value = settings.cloudDetailScale;
    u.uCloudSpeed.value = settings.cloudSpeed;
    u.uCloudHeight.value = settings.cloudHeight;
    u.uCloudThickness.value = settings.cloudThickness;
    u.uCloudLightAbsorption.value = settings.cloudLightAbsorption;
    u.uCloudAmbient.value = settings.cloudAmbient;
    u.uCloudSilverLining.value = settings.cloudSilverLining;
    u.uCloudPowder.value = settings.cloudPowder;
    u.uCloudSteps.value = settings.cloudSteps;
    u.uCloudLightSteps.value = settings.cloudLightSteps;
    u.uShowClouds.value = settings.showClouds;
    u.uWeatherType.value = settings.weatherType;
    u.uWeatherIntensity.value = settings.weatherIntensity;
  }, [settings, materialRef]);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />
      <DiagnosticsOverlay renderer={rendererRef.current} visible={showDiagnostics} onToggle={() => setShowDiagnostics(false)} />

      <div className="absolute top-5 left-1/2 -translate-x-1/2 panel-glow backdrop-blur-xl rounded-xl p-3 flex items-center gap-3">
        <Cloud className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">Cloud Lab</h1>
          <p className="text-xs text-muted-foreground">Isolated volumetric cloud system</p>
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
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Scroll</kbd> Zoom</span>
        </div>
      </div>

      {showSettings && (
        <div className="absolute top-20 right-5 w-80 max-h-[calc(100vh-120px)] panel-glow backdrop-blur-xl rounded-xl">
          <div className="flex justify-between items-center p-4 border-b border-border/30">
            <h3 className="text-sm font-semibold text-primary">Cloud Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-4">
              <SettingSection title="Cloud Shape">
                <SliderSetting label="Coverage" value={settings.cloudCoverage} min={0} max={1} step={0.01} onChange={(v) => updateSetting('cloudCoverage', v)} />
                <SliderSetting label="Density" value={settings.cloudDensity} min={0} max={0.2} step={0.001} onChange={(v) => updateSetting('cloudDensity', v)} />
                <SliderSetting label="Scale" value={settings.cloudScale} min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('cloudScale', v)} />
                <SliderSetting label="Detail Scale" value={settings.cloudDetailScale} min={0.5} max={10} step={0.1} onChange={(v) => updateSetting('cloudDetailScale', v)} />
              </SettingSection>
              <SettingSection title="Cloud Geometry">
                <SliderSetting label="Height" value={settings.cloudHeight} min={500} max={5000} step={50} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('cloudHeight', v)} />
                <SliderSetting label="Thickness" value={settings.cloudThickness} min={200} max={5000} step={50} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('cloudThickness', v)} />
                <SliderSetting label="Speed" value={settings.cloudSpeed} min={0} max={3} step={0.05} onChange={(v) => updateSetting('cloudSpeed', v)} />
              </SettingSection>
              <SettingSection title="Cloud Lighting">
                <SliderSetting label="Light Absorption" value={settings.cloudLightAbsorption} min={0} max={2} step={0.05} onChange={(v) => updateSetting('cloudLightAbsorption', v)} />
                <SliderSetting label="Ambient" value={settings.cloudAmbient} min={0} max={1} step={0.05} onChange={(v) => updateSetting('cloudAmbient', v)} />
                <SliderSetting label="Silver Lining" value={settings.cloudSilverLining} min={0} max={1} step={0.05} onChange={(v) => updateSetting('cloudSilverLining', v)} />
                <SliderSetting label="Powder Effect" value={settings.cloudPowder} min={0} max={1} step={0.05} onChange={(v) => updateSetting('cloudPowder', v)} />
              </SettingSection>
              <SettingSection title="Performance">
                <SliderSetting label="Ray Steps" value={settings.cloudSteps} min={16} max={128} step={8} format={(v) => `${v.toFixed(0)}`} onChange={(v) => updateSetting('cloudSteps', v)} />
                <SliderSetting label="Light Steps" value={settings.cloudLightSteps} min={2} max={16} step={1} format={(v) => `${v.toFixed(0)}`} onChange={(v) => updateSetting('cloudLightSteps', v)} />
              </SettingSection>
              <SettingSection title="Sun">
                <SliderSetting label="Azimuth" value={settings.sunAzimuth} min={0} max={1} step={0.01} format={(v) => `${(v*360).toFixed(0)}°`} onChange={(v) => updateSetting('sunAzimuth', v)} />
                <SliderSetting label="Elevation" value={settings.sunElevation} min={-0.3} max={1} step={0.01} format={(v) => `${(v*90).toFixed(0)}°`} onChange={(v) => updateSetting('sunElevation', v)} />
              </SettingSection>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default CloudLab;
