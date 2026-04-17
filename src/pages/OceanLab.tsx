import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Settings, X, Waves, Home, Pause, Play, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VERTEX_SHADER, SHARED_UNIFORMS, SHARED_GLSL } from '@/shaders/shared.glsl';
import { SKY_UNIFORMS, SKY_GLSL, SKY_DEFAULTS } from '@/shaders/sky.glsl';
import { OCEAN_UNIFORMS, OCEAN_GLSL, OCEAN_DEFAULTS } from '@/shaders/ocean.glsl';
import { SliderSetting, SettingSection } from '@/components/SettingsPanel';
import { useShaderRenderer } from '@/components/ShaderRenderer';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';

const OCEAN_FRAGMENT_SHADER = `
precision highp float;
${SHARED_UNIFORMS}
${SKY_UNIFORMS}
${OCEAN_UNIFORMS}
// Stub terrain uniforms (foamShoreline references getTerrainHeight)
uniform float uTerrainScale;
uniform float uTerrainHeight;
uniform float uMountainHeight;
uniform float uMountainSharpness;
uniform float uErosionStrength;
uniform bool uShowTerrain;
${SHARED_GLSL}
${SKY_GLSL}
// Inline a minimal getTerrainHeight stub so foamShoreline compiles
float getTerrainHeight(vec2 p) {
    return uOceanLevel - 100.0; // always below ocean → no shoreline interference
}
${OCEAN_GLSL}

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
    
    if(uShowOcean) {
        vec4 oceanHit = renderOcean(ro, rd, sunDir, lightColor, skyColor, -1.0);
        if(oceanHit.a > 0.0) {
            finalColor = oceanHit.rgb;
        }
    }
    
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const ToggleSetting: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

const OceanLab: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ ...OCEAN_DEFAULTS, ...SKY_DEFAULTS, showOcean: true });
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
    uOceanLevel: { value: settings.oceanLevel },
    uOceanColor: { value: new THREE.Color(...settings.oceanColor) },
    uOceanDeepColor: { value: new THREE.Color(...settings.oceanDeepColor) },
    uWaveHeight: { value: settings.waveHeight },
    uWaveFrequency: { value: settings.waveFrequency },
    uWaveSpeed: { value: settings.waveSpeed },
    uOceanFresnel: { value: settings.oceanFresnel },
    uOceanRoughness: { value: settings.oceanRoughness },
    uFoamIntensity: { value: settings.foamIntensity },
    uFoamJacobianStrength: { value: settings.foamJacobianStrength },
    uFoamShorelineStrength: { value: settings.foamShorelineStrength },
    uFoamTurbulentStrength: { value: settings.foamTurbulentStrength },
    uFoamWindstreakStrength: { value: settings.foamWindstreakStrength },
    uFoamSprayStrength: { value: settings.foamSprayStrength },
    uFoamVoronoiStrength: { value: settings.foamVoronoiStrength },
    uFoamShorelineWidth: { value: settings.foamShorelineWidth },
    uFoamDecay: { value: settings.foamDecay },
    uFoamScale: { value: settings.foamScale },
    uCausticsIntensity: { value: settings.causticsIntensity },
    uBubbleIntensity: { value: settings.bubbleIntensity },
    uSSSIntensity: { value: settings.sssIntensity },
    uUnderwaterFogDensity: { value: settings.underwaterFogDensity },
    uUnderwaterFogColor: { value: new THREE.Color(...settings.underwaterFogColor) },
    uUnderwaterCausticsStrength: { value: settings.underwaterCausticsStrength },
    uUnderwaterGodRayStrength: { value: settings.underwaterGodRayStrength },
    uUnderwaterBubbleCount: { value: settings.underwaterBubbleCount },
    uShowOcean: { value: settings.showOcean },
    uEnableWaves: { value: settings.enableWaves },
    uEnableFresnel: { value: settings.enableFresnel },
    uEnableCaustics: { value: settings.enableCaustics },
    uEnableFoam: { value: settings.enableFoam },
    uEnableFoamJacobian: { value: settings.enableFoamJacobian },
    uEnableFoamShoreline: { value: settings.enableFoamShoreline },
    uEnableFoamTurbulent: { value: settings.enableFoamTurbulent },
    uEnableFoamWindstreak: { value: settings.enableFoamWindstreak },
    uEnableFoamSpray: { value: settings.enableFoamSpray },
    uEnableFoamVoronoi: { value: settings.enableFoamVoronoi },
    uEnableSSS: { value: settings.enableSSS },
    uEnableBubbles: { value: settings.enableBubbles },
    uEnableUnderwaterCaustics: { value: settings.enableUnderwaterCaustics },
    uEnableUnderwaterGodRays: { value: settings.enableUnderwaterGodRays },
    uEnableUnderwaterBubbles: { value: settings.enableUnderwaterBubbles },
  };

  const { containerRef, rendererRef, materialRef } = useShaderRenderer({
    vertexShader: VERTEX_SHADER,
    fragmentShader: OCEAN_FRAGMENT_SHADER,
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
    u.uOceanLevel.value = settings.oceanLevel;
    u.uOceanColor.value.setRGB(...settings.oceanColor);
    u.uOceanDeepColor.value.setRGB(...settings.oceanDeepColor);
    u.uWaveHeight.value = settings.waveHeight;
    u.uWaveFrequency.value = settings.waveFrequency;
    u.uWaveSpeed.value = settings.waveSpeed;
    u.uOceanFresnel.value = settings.oceanFresnel;
    u.uOceanRoughness.value = settings.oceanRoughness;
    u.uFoamIntensity.value = settings.foamIntensity;
    u.uFoamJacobianStrength.value = settings.foamJacobianStrength;
    u.uFoamShorelineStrength.value = settings.foamShorelineStrength;
    u.uFoamTurbulentStrength.value = settings.foamTurbulentStrength;
    u.uFoamWindstreakStrength.value = settings.foamWindstreakStrength;
    u.uFoamSprayStrength.value = settings.foamSprayStrength;
    u.uFoamVoronoiStrength.value = settings.foamVoronoiStrength;
    u.uFoamShorelineWidth.value = settings.foamShorelineWidth;
    u.uFoamDecay.value = settings.foamDecay;
    u.uFoamScale.value = settings.foamScale;
    u.uCausticsIntensity.value = settings.causticsIntensity;
    u.uBubbleIntensity.value = settings.bubbleIntensity;
    u.uSSSIntensity.value = settings.sssIntensity;
    u.uShowOcean.value = settings.showOcean;
    u.uEnableWaves.value = settings.enableWaves;
    u.uEnableFresnel.value = settings.enableFresnel;
    u.uEnableCaustics.value = settings.enableCaustics;
    u.uEnableFoam.value = settings.enableFoam;
    u.uEnableFoamJacobian.value = settings.enableFoamJacobian;
    u.uEnableFoamShoreline.value = settings.enableFoamShoreline;
    u.uEnableFoamTurbulent.value = settings.enableFoamTurbulent;
    u.uEnableFoamWindstreak.value = settings.enableFoamWindstreak;
    u.uEnableFoamSpray.value = settings.enableFoamSpray;
    u.uEnableFoamVoronoi.value = settings.enableFoamVoronoi;
    u.uEnableSSS.value = settings.enableSSS;
    u.uEnableBubbles.value = settings.enableBubbles;
    u.uEnableUnderwaterCaustics.value = settings.enableUnderwaterCaustics;
    u.uEnableUnderwaterGodRays.value = settings.enableUnderwaterGodRays;
    u.uEnableUnderwaterBubbles.value = settings.enableUnderwaterBubbles;
  }, [settings, materialRef]);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />
      <DiagnosticsOverlay renderer={rendererRef.current} visible={showDiagnostics} onToggle={() => setShowDiagnostics(false)} />

      <div className="absolute top-5 left-1/2 -translate-x-1/2 panel-glow backdrop-blur-xl rounded-xl p-3 flex items-center gap-3">
        <Waves className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">Ocean Lab</h1>
          <p className="text-xs text-muted-foreground">Isolated ocean waves, foam, caustics, SSS</p>
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
            <h3 className="text-sm font-semibold text-primary">Ocean Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-4">
              <SettingSection title="Waves">
                <ToggleSetting label="Enable Waves" value={settings.enableWaves} onChange={(v) => updateSetting('enableWaves', v)} />
                <SliderSetting label="Height" value={settings.waveHeight} min={0} max={3} step={0.05} onChange={(v) => updateSetting('waveHeight', v)} />
                <SliderSetting label="Frequency" value={settings.waveFrequency} min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('waveFrequency', v)} />
                <SliderSetting label="Speed" value={settings.waveSpeed} min={0} max={3} step={0.05} onChange={(v) => updateSetting('waveSpeed', v)} />
              </SettingSection>
              <SettingSection title="Surface">
                <ToggleSetting label="Enable Fresnel" value={settings.enableFresnel} onChange={(v) => updateSetting('enableFresnel', v)} />
                <SliderSetting label="Fresnel" value={settings.oceanFresnel} min={0} max={0.5} step={0.01} onChange={(v) => updateSetting('oceanFresnel', v)} />
                <SliderSetting label="Roughness" value={settings.oceanRoughness} min={0} max={1} step={0.05} onChange={(v) => updateSetting('oceanRoughness', v)} />
                <ToggleSetting label="Enable SSS" value={settings.enableSSS} onChange={(v) => updateSetting('enableSSS', v)} />
                <SliderSetting label="SSS Intensity" value={settings.sssIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('sssIntensity', v)} />
              </SettingSection>
              <SettingSection title="Foam Master">
                <ToggleSetting label="Enable Foam" value={settings.enableFoam} onChange={(v) => updateSetting('enableFoam', v)} />
                <SliderSetting label="Intensity" value={settings.foamIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('foamIntensity', v)} />
                <SliderSetting label="Scale" value={settings.foamScale} min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('foamScale', v)} />
                <SliderSetting label="Decay" value={settings.foamDecay} min={0} max={1} step={0.05} onChange={(v) => updateSetting('foamDecay', v)} />
              </SettingSection>
              <SettingSection title="Foam Types">
                <ToggleSetting label="Jacobian (wave-breaking)" value={settings.enableFoamJacobian} onChange={(v) => updateSetting('enableFoamJacobian', v)} />
                <SliderSetting label="  Strength" value={settings.foamJacobianStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('foamJacobianStrength', v)} />
                <ToggleSetting label="Shoreline" value={settings.enableFoamShoreline} onChange={(v) => updateSetting('enableFoamShoreline', v)} />
                <SliderSetting label="  Strength" value={settings.foamShorelineStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('foamShorelineStrength', v)} />
                <ToggleSetting label="Turbulent" value={settings.enableFoamTurbulent} onChange={(v) => updateSetting('enableFoamTurbulent', v)} />
                <SliderSetting label="  Strength" value={settings.foamTurbulentStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('foamTurbulentStrength', v)} />
                <ToggleSetting label="Windstreak" value={settings.enableFoamWindstreak} onChange={(v) => updateSetting('enableFoamWindstreak', v)} />
                <SliderSetting label="  Strength" value={settings.foamWindstreakStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('foamWindstreakStrength', v)} />
                <ToggleSetting label="Spray" value={settings.enableFoamSpray} onChange={(v) => updateSetting('enableFoamSpray', v)} />
                <SliderSetting label="  Strength" value={settings.foamSprayStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('foamSprayStrength', v)} />
                <ToggleSetting label="Voronoi" value={settings.enableFoamVoronoi} onChange={(v) => updateSetting('enableFoamVoronoi', v)} />
                <SliderSetting label="  Strength" value={settings.foamVoronoiStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('foamVoronoiStrength', v)} />
              </SettingSection>
              <SettingSection title="Caustics & Bubbles">
                <ToggleSetting label="Enable Caustics" value={settings.enableCaustics} onChange={(v) => updateSetting('enableCaustics', v)} />
                <SliderSetting label="Caustics" value={settings.causticsIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('causticsIntensity', v)} />
                <ToggleSetting label="Enable Bubbles" value={settings.enableBubbles} onChange={(v) => updateSetting('enableBubbles', v)} />
                <SliderSetting label="Bubbles" value={settings.bubbleIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('bubbleIntensity', v)} />
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

export default OceanLab;
