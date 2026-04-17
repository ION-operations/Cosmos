import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X, Sparkles, Home, Pause, Play, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VERTEX_SHADER, SHARED_UNIFORMS, SHARED_GLSL } from '@/shaders/shared.glsl';
import { SKY_UNIFORMS, SKY_GLSL, SKY_DEFAULTS } from '@/shaders/sky.glsl';
import { POSTPROCESS_UNIFORMS, POSTPROCESS_GLSL, POSTPROCESS_DEFAULTS } from '@/shaders/postprocess.glsl';
import { CLOUDS_UNIFORMS, CLOUDS_GLSL, CLOUDS_DEFAULTS } from '@/shaders/clouds.glsl';
import { SliderSetting, SettingSection } from '@/components/SettingsPanel';
import { useShaderRenderer } from '@/components/ShaderRenderer';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import FlightHUD from '@/components/FlightHUD';

const EFFECTS_FRAGMENT_SHADER = `
precision highp float;
${SHARED_UNIFORMS}
${SKY_UNIFORMS}
${CLOUDS_UNIFORMS}
${POSTPROCESS_UNIFORMS}
${SHARED_GLSL}
${SKY_GLSL}
${CLOUDS_GLSL}
${POSTPROCESS_GLSL}

void main() {
    vec2 uv = vUv;
    vec3 ro = uCameraPos;
    
    float yaw = uCameraYaw;
    float pitch = clamp(uCameraPitch, -PI * 0.45, PI * 0.45);
    vec3 lookDir = vec3(cos(pitch)*sin(yaw), sin(pitch), cos(pitch)*cos(yaw));
    vec3 rd = getRayDirection(uv, ro, ro + lookDir, uCameraFOV);
    vec3 sunDir = getSunDirection();
    vec3 lightColor = uSunColor * uSunIntensity;
    
    vec3 skyColor = getSkyColor(rd, sunDir);
    vec3 finalColor = skyColor;
    
    if(uShowClouds) {
        vec4 cloudResult = raymarchClouds(ro, rd, sunDir, lightColor);
        finalColor = mix(finalColor, cloudResult.rgb, cloudResult.a);
    }
    
    if(uShowFog) {
        finalColor = applyFog(finalColor, ro, rd, 5000.0, sunDir, lightColor);
    }
    
    if(uShowGodRays) {
        float godRays = calculateGodRays(ro, rd, sunDir, 5000.0);
        finalColor += lightColor * godRays;
    }
    
    finalColor = applyTAA(finalColor, uv);
    finalColor = applyBloom(finalColor, uv);
    finalColor = applyChromaticAberration(finalColor, uv);
    finalColor = applyColorGrading(finalColor);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const EffectsLab: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    ...POSTPROCESS_DEFAULTS, ...SKY_DEFAULTS, ...CLOUDS_DEFAULTS,
    showFog: true, showGodRays: true, showClouds: true,
  });
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
    uWeatherType: { value: 0 },
    uWeatherIntensity: { value: 0 },
    uWindSpeed: { value: 0.5 },
    uWindDirection: { value: 0.5 },
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
    uCloudSteps: { value: 32 },
    uCloudLightSteps: { value: 4 },
    uShowClouds: { value: settings.showClouds },
    uLightningIntensity: { value: 0 },
    uLightningTime: { value: 0 },
    uTAAStrength: { value: settings.taaStrength },
    uBloomIntensity: { value: settings.bloomIntensity },
    uBloomThreshold: { value: settings.bloomThreshold },
    uExposure: { value: settings.exposure },
    uSaturation: { value: settings.saturation },
    uVignetteStrength: { value: settings.vignetteStrength },
    uChromaticAberration: { value: settings.chromaticAberration },
    uRenderScale: { value: 1.0 },
    uShowFog: { value: settings.showFog },
    uFogDensity: { value: settings.fogDensity },
    uFogHeight: { value: settings.fogHeight },
    uFogColor: { value: new THREE.Color(...settings.fogColor) },
    uShowGodRays: { value: settings.showGodRays },
    uGodRayIntensity: { value: settings.godRayIntensity },
    uGodRayDecay: { value: settings.godRayDecay },
    uGodRaySteps: { value: settings.godRaySteps },
  };

  const { containerRef, rendererRef, materialRef, flightStateRef } = useShaderRenderer({
    vertexShader: VERTEX_SHADER,
    fragmentShader: EFFECTS_FRAGMENT_SHADER,
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
    u.uTAAStrength.value = settings.taaStrength;
    u.uBloomIntensity.value = settings.bloomIntensity;
    u.uBloomThreshold.value = settings.bloomThreshold;
    u.uExposure.value = settings.exposure;
    u.uSaturation.value = settings.saturation;
    u.uVignetteStrength.value = settings.vignetteStrength;
    u.uChromaticAberration.value = settings.chromaticAberration;
    u.uShowFog.value = settings.showFog;
    u.uFogDensity.value = settings.fogDensity;
    u.uFogColor.value.setRGB(...settings.fogColor);
    u.uShowGodRays.value = settings.showGodRays;
    u.uGodRayIntensity.value = settings.godRayIntensity;
    u.uGodRayDecay.value = settings.godRayDecay;
    u.uGodRaySteps.value = settings.godRaySteps;
    u.uShowClouds.value = settings.showClouds;
  }, [settings, materialRef]);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />
      <DiagnosticsOverlay renderer={rendererRef.current} visible={showDiagnostics} onToggle={() => setShowDiagnostics(false)} />
      <FlightHUD stateRef={flightStateRef} />

      <div className="absolute top-5 left-1/2 -translate-x-1/2 panel-glow backdrop-blur-xl rounded-xl p-3 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">Effects Lab</h1>
          <p className="text-xs text-muted-foreground">Isolated fog, god rays, bloom, color grading</p>
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
            <h3 className="text-sm font-semibold text-primary">Effects Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-4">
              <SettingSection title="Fog">
                <SliderSetting label="Fog Density" value={settings.fogDensity} min={0} max={2} step={0.05} onChange={(v) => updateSetting('fogDensity', v)} />
                <SliderSetting label="Fog Height" value={settings.fogHeight} min={0} max={2000} step={50} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('fogHeight', v)} />
              </SettingSection>
              <SettingSection title="God Rays">
                <SliderSetting label="Intensity" value={settings.godRayIntensity} min={0} max={2} step={0.05} onChange={(v) => updateSetting('godRayIntensity', v)} />
                <SliderSetting label="Decay" value={settings.godRayDecay} min={0.8} max={1} step={0.01} onChange={(v) => updateSetting('godRayDecay', v)} />
                <SliderSetting label="Steps" value={settings.godRaySteps} min={4} max={64} step={4} format={(v) => `${v.toFixed(0)}`} onChange={(v) => updateSetting('godRaySteps', v)} />
              </SettingSection>
              <SettingSection title="Tone Mapping">
                <SliderSetting label="Exposure" value={settings.exposure} min={0.1} max={3} step={0.05} onChange={(v) => updateSetting('exposure', v)} />
                <SliderSetting label="Saturation" value={settings.saturation} min={0} max={2} step={0.05} onChange={(v) => updateSetting('saturation', v)} />
              </SettingSection>
              <SettingSection title="Post Processing">
                <SliderSetting label="TAA Strength" value={settings.taaStrength} min={0} max={1} step={0.05} onChange={(v) => updateSetting('taaStrength', v)} />
                <SliderSetting label="Bloom Intensity" value={settings.bloomIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('bloomIntensity', v)} />
                <SliderSetting label="Bloom Threshold" value={settings.bloomThreshold} min={0} max={2} step={0.05} onChange={(v) => updateSetting('bloomThreshold', v)} />
                <SliderSetting label="Vignette" value={settings.vignetteStrength} min={0} max={1} step={0.05} onChange={(v) => updateSetting('vignetteStrength', v)} />
                <SliderSetting label="Chromatic Aberration" value={settings.chromaticAberration} min={0} max={2} step={0.05} onChange={(v) => updateSetting('chromaticAberration', v)} />
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

export default EffectsLab;
