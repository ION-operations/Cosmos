import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X, Mountain, Home, Pause, Play, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VERTEX_SHADER, SHARED_UNIFORMS, SHARED_GLSL } from '@/shaders/shared.glsl';
import { SKY_UNIFORMS, SKY_GLSL, SKY_DEFAULTS } from '@/shaders/sky.glsl';
import { TERRAIN_UNIFORMS, TERRAIN_GLSL, TERRAIN_DEFAULTS } from '@/shaders/terrain.glsl';
import { SliderSetting, SettingSection } from '@/components/SettingsPanel';
import { useShaderRenderer } from '@/components/ShaderRenderer';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';

const TERRAIN_FRAGMENT_SHADER = `
precision highp float;
${SHARED_UNIFORMS}
${SKY_UNIFORMS}
${TERRAIN_UNIFORMS}
${SHARED_GLSL}
${SKY_GLSL}
${TERRAIN_GLSL}

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
    
    if(uShowTerrain) {
        vec4 terrainHit = raymarchTerrain(ro, rd, sunDir, lightColor);
        if(terrainHit.a > 0.0) {
            finalColor = terrainHit.rgb;
        }
    }
    
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const TerrainLab: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ ...TERRAIN_DEFAULTS, ...SKY_DEFAULTS, showTerrain: true });
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
    uTerrainScale: { value: settings.terrainScale },
    uTerrainHeight: { value: settings.terrainHeight },
    uMountainHeight: { value: settings.mountainHeight },
    uMountainSharpness: { value: settings.mountainSharpness },
    uGrassColor: { value: new THREE.Color(...settings.grassColor) },
    uRockColor: { value: new THREE.Color(...settings.rockColor) },
    uSnowColor: { value: new THREE.Color(...settings.snowColor) },
    uSandColor: { value: new THREE.Color(...settings.sandColor) },
    uSnowLine: { value: settings.snowLine },
    uTreeLine: { value: settings.treeLine },
    uBeachWidth: { value: settings.beachWidth },
    uErosionStrength: { value: settings.erosionStrength },
    uOceanLevel: { value: settings.oceanLevel },
    uShowTerrain: { value: settings.showTerrain },
    uLightningIntensity: { value: 0.0 },
    uLightningTime: { value: 0.0 },
  };

  const { containerRef, rendererRef, materialRef } = useShaderRenderer({
    vertexShader: VERTEX_SHADER,
    fragmentShader: TERRAIN_FRAGMENT_SHADER,
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
    u.uTerrainScale.value = settings.terrainScale;
    u.uTerrainHeight.value = settings.terrainHeight;
    u.uMountainHeight.value = settings.mountainHeight;
    u.uMountainSharpness.value = settings.mountainSharpness;
    u.uSnowLine.value = settings.snowLine;
    u.uTreeLine.value = settings.treeLine;
    u.uBeachWidth.value = settings.beachWidth;
    u.uErosionStrength.value = settings.erosionStrength;
    u.uOceanLevel.value = settings.oceanLevel;
    u.uShowTerrain.value = settings.showTerrain;
    u.uGrassColor.value.setRGB(...settings.grassColor);
    u.uRockColor.value.setRGB(...settings.rockColor);
    u.uSnowColor.value.setRGB(...settings.snowColor);
    u.uSandColor.value.setRGB(...settings.sandColor);
  }, [settings, materialRef]);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />
      <DiagnosticsOverlay renderer={rendererRef.current} visible={showDiagnostics} onToggle={() => setShowDiagnostics(false)} />

      <div className="absolute top-5 left-1/2 -translate-x-1/2 panel-glow backdrop-blur-xl rounded-xl p-3 flex items-center gap-3">
        <Mountain className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">Terrain Lab</h1>
          <p className="text-xs text-muted-foreground">Isolated terrain raymarching, materials, erosion</p>
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
            <h3 className="text-sm font-semibold text-primary">Terrain Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-4">
              <SettingSection title="Terrain Shape">
                <SliderSetting label="Scale" value={settings.terrainScale} min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('terrainScale', v)} />
                <SliderSetting label="Height" value={settings.terrainHeight} min={50} max={2000} step={10} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('terrainHeight', v)} />
                <SliderSetting label="Mountain Height" value={settings.mountainHeight} min={500} max={8000} step={50} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('mountainHeight', v)} />
                <SliderSetting label="Mountain Sharpness" value={settings.mountainSharpness} min={0.5} max={5} step={0.1} onChange={(v) => updateSetting('mountainSharpness', v)} />
                <SliderSetting label="Erosion" value={settings.erosionStrength} min={0} max={1} step={0.05} onChange={(v) => updateSetting('erosionStrength', v)} />
              </SettingSection>
              <SettingSection title="Biome Zones">
                <SliderSetting label="Ocean Level" value={settings.oceanLevel} min={-500} max={500} step={10} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('oceanLevel', v)} />
                <SliderSetting label="Snow Line" value={settings.snowLine} min={500} max={5000} step={50} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('snowLine', v)} />
                <SliderSetting label="Tree Line" value={settings.treeLine} min={500} max={4000} step={50} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('treeLine', v)} />
                <SliderSetting label="Beach Width" value={settings.beachWidth} min={5} max={200} step={5} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('beachWidth', v)} />
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

export default TerrainLab;
