import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X, TreePine, Home, Pause, Play, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VERTEX_SHADER, SHARED_UNIFORMS, SHARED_GLSL } from '@/shaders/shared.glsl';
import { SKY_UNIFORMS, SKY_GLSL, SKY_DEFAULTS } from '@/shaders/sky.glsl';
import { TERRAIN_UNIFORMS, TERRAIN_GLSL, TERRAIN_DEFAULTS } from '@/shaders/terrain.glsl';
import { VEGETATION_UNIFORMS, VEGETATION_GLSL, VEGETATION_DEFAULTS } from '@/shaders/vegetation.glsl';
import { SliderSetting, SettingSection } from '@/components/SettingsPanel';
import { useShaderRenderer } from '@/components/ShaderRenderer';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';

const VEG_FRAGMENT_SHADER = `
precision highp float;
${SHARED_UNIFORMS}
${SKY_UNIFORMS}
${TERRAIN_UNIFORMS}
${VEGETATION_UNIFORMS}
${SHARED_GLSL}
${SKY_GLSL}
${TERRAIN_GLSL}
${VEGETATION_GLSL}

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
            
            if(uShowVegetation) {
                vec3 hitPos = ro + rd * terrainHit.a;
                float height = getTerrainHeight(hitPos.xz);
                vec3 normal = getTerrainNormal(hitPos.xz, height);
                
                vec3 grassColor;
                float grassMask = renderGrass(hitPos, normal, sunDir, lightColor, grassColor);
                if(grassMask > 0.0) {
                    finalColor = mix(finalColor, grassColor, grassMask * 0.5);
                }
                
                vec4 vegResult = renderVegetation(ro, rd, hitPos, normal, height, sunDir, lightColor);
                if(vegResult.a > 0.0 && vegResult.a < terrainHit.a) {
                    finalColor = vegResult.rgb;
                }
            }
        }
    }
    
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const VegetationLab: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    ...TERRAIN_DEFAULTS, ...SKY_DEFAULTS, ...VEGETATION_DEFAULTS,
    showTerrain: true, showVegetation: true,
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
    uWindSpeed: { value: settings.windSpeed || 0.5 },
    uWindDirection: { value: settings.windDirection || 0.5 },
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
    uShowTerrain: { value: true },
    uVegetationDensity: { value: settings.vegetationDensity },
    uTreeHeight: { value: settings.treeHeight },
    uGrassHeight: { value: settings.grassHeight },
    uWindStrength: { value: settings.windStrength },
    uTreeColor: { value: new THREE.Color(...settings.treeColor) },
    uFlowerColors: { value: settings.flowerColors.map((c: [number, number, number]) => new THREE.Color(...c)) },
    uShowVegetation: { value: true },
    uLightningIntensity: { value: 0.0 },
    uLightningTime: { value: 0.0 },
  };

  const { containerRef, rendererRef, materialRef } = useShaderRenderer({
    vertexShader: VERTEX_SHADER,
    fragmentShader: VEG_FRAGMENT_SHADER,
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
    u.uVegetationDensity.value = settings.vegetationDensity;
    u.uTreeHeight.value = settings.treeHeight;
    u.uGrassHeight.value = settings.grassHeight;
    u.uWindStrength.value = settings.windStrength;
    u.uTreeColor.value.setRGB(...settings.treeColor);
  }, [settings, materialRef]);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />
      <DiagnosticsOverlay renderer={rendererRef.current} visible={showDiagnostics} onToggle={() => setShowDiagnostics(false)} />

      <div className="absolute top-5 left-1/2 -translate-x-1/2 panel-glow backdrop-blur-xl rounded-xl p-3 flex items-center gap-3">
        <TreePine className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">Vegetation Lab</h1>
          <p className="text-xs text-muted-foreground">Isolated trees, grass, flowers, wind</p>
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
            <h3 className="text-sm font-semibold text-primary">Vegetation Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-4">
              <SettingSection title="Vegetation">
                <SliderSetting label="Density" value={settings.vegetationDensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('vegetationDensity', v)} />
                <SliderSetting label="Tree Height" value={settings.treeHeight} min={5} max={100} step={1} format={(v) => `${v.toFixed(0)}m`} onChange={(v) => updateSetting('treeHeight', v)} />
                <SliderSetting label="Grass Height" value={settings.grassHeight} min={0} max={2} step={0.05} onChange={(v) => updateSetting('grassHeight', v)} />
              </SettingSection>
              <SettingSection title="Wind">
                <SliderSetting label="Wind Strength" value={settings.windStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('windStrength', v)} />
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

export default VegetationLab;
