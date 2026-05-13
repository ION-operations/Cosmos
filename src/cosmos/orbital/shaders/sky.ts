// ═══════════════════════════════════════════
// GENESIS ENGINE — Sky Shaders
// Nishita atmosphere + stars + full aurora borealis
// Sources: ATMOSPHERE_OCEAN, auroras.txt
// ═══════════════════════════════════════════

import { ATMOS_GLSL, ATMOSPHERE_CONTINUITY_GLSL, ATMOSPHERE_LUT_GLSL, NOISE_GLSL, SCALE_GLSL } from './common';

export const skyVS = `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
  gl_Position.z = gl_Position.w;
}`;

export const skyFS = `
precision highp float;
uniform vec3 uSunDir;
uniform float uSunI, uExpo, uAlt, uTime;
varying vec3 vDir;
${ATMOS_GLSL}
${SCALE_GLSL}
${ATMOSPHERE_CONTINUITY_GLSL}
${ATMOSPHERE_LUT_GLSL}
${NOISE_GLSL}

// Multi-layer star field with twinkling
vec3 starField(vec3 rd, float night){
  vec3 stars = vec3(0.0);
  float hFade = smoothstep(0.02, 0.25, rd.y);
  for(float layer = 0.0; layer < 4.0; layer++){
    vec3 p = rd * (400.0 + layer * 200.0);
    vec3 ip = floor(p);
    float n1 = fract(sin(dot(ip, vec3(12.9898, 78.233, 37.719 + layer * 17.3))) * 43758.5453);
    float twinkle = 0.7 + 0.3 * sin(uTime * (2.0 + n1 * 5.0) + n1 * 100.0);
    float brightness = pow(n1, 50.0 + layer * 12.0) * (2.5 - layer * 0.4) * twinkle;
    vec3 starColor = mix(vec3(0.5, 0.6, 1.0), vec3(1.0, 0.85, 0.6), fract(n1 * 7.77));
    starColor = mix(starColor, vec3(1.0, 0.4, 0.3), step(0.97, fract(n1 * 13.13)));
    stars += starColor * brightness * night * hFade;
  }
  // Milky way band
  float mw = 1.0 - smoothstep(0.0, 0.4, abs(rd.x * 0.7 + rd.z * 0.3 - rd.y * 0.5));
  mw *= smoothstep(0.0, 0.3, rd.y);
  stars += vec3(0.15, 0.12, 0.2) * mw * night * 0.3;
  return stars;
}

// Full aurora borealis (from auroras.txt techniques — curtain waves, Perlin displacement, emission layers)
vec3 auroraRender(vec3 rd, float night){
  if(night < 0.01 || rd.y < 0.05) return vec3(0.0);

  vec3 aurora = vec3(0.0);
  float hFade = smoothstep(0.05, 0.4, rd.y) * (1.0 - smoothstep(0.7, 0.95, rd.y));

  // Ray march through aurora altitude band (100-300km)
  // Project ray onto aurora curtain heights
  for(float i = 0.0; i < 5.0; i++){
    float h = 0.3 + i * 0.12; // normalized altitude steps
    float t = h / max(rd.y, 0.001);
    vec3 p = rd * t;

    // Curtain wave displacement (from auroras.txt — sinusoidal curtains with noise warping)
    float curtainX = p.x * 1.5 + sin(p.z * 0.8 + uTime * 0.15) * 2.0;
    float curtainWave = sin(curtainX * 2.0 + uTime * 0.3) * 0.5 + 0.5;

    // Perlin-displaced vertical structure
    float noiseVal = gnoise(vec3(p.x * 0.5, h * 3.0 + uTime * 0.1, p.z * 0.3 + uTime * 0.05));
    float structure = curtainWave * (0.5 + 0.5 * noiseVal);

    // Vertical falloff — auroras are brighter at bottom of curtain
    float vertFade = exp(-abs(h - 0.4) * 4.0);

    // Color gradient: green at bottom, blue-purple at top (characteristic aurora emission lines)
    vec3 aCol = mix(vec3(0.1, 0.9, 0.3), vec3(0.3, 0.1, 0.8), smoothstep(0.25, 0.7, h));
    aCol = mix(aCol, vec3(0.8, 0.1, 0.3), smoothstep(0.65, 0.9, h)); // red at very top

    // Secondary ripple from higher frequency noise
    float ripple = sin(p.x * 8.0 + p.z * 6.0 + uTime * 0.8) * 0.3 + 0.7;

    aurora += aCol * structure * vertFade * hFade * ripple * 0.08;
  }

  return aurora * night;
}

void main(){
  vec3 rd = normalize(vDir);
  float localSky = cosmosLocalSkyContinuity();
  vec3 analyticSky = atmosphere(rd, uSunDir, uSunI, uAlt);
  vec3 lutSky = cosmosLutSkyRadiance(rd, uSunDir, max(uCosmosCameraAltitudeMeters, 0.0)) * uSunI * 0.085;
  vec3 col = mix(analyticSky, analyticSky + lutSky, clamp(uAtmosphereLutStrength, 0.0, 1.0)) * localSky;

  float sunMu = dot(rd, uSunDir);
  float horizon = cosmosHorizonWeight(rd) * uHorizonHazeStrength * localSky;
  float lutFogAlpha = 0.0;
  vec3 lutHaze = cosmosLutAerialPerspectiveColor(260000.0 * (0.25 + horizon), max(uCosmosCameraAltitudeMeters, 0.0), sunMu, lutFogAlpha);
  vec3 continuityHaze = mix(cosmosAtmosphereContinuityColor(sunMu), lutHaze, clamp(uAtmosphereLutStrength, 0.0, 1.0) * 0.62) * horizon * uSunI * 0.012;
  continuityHaze *= 1.0 - smoothstep(160000.0, 1100000.0, uCosmosCameraAltitudeMeters);
  col += continuityHaze;

  // Night sky
  float night = 1.0 - smoothstep(-0.25, -0.02, uSunDir.y);
  float spaceStarBoost = 1.0 - localSky * 0.45;
  col += starField(rd, night) * spaceStarBoost;
  col += auroraRender(rd, night) * localSky;

  // Moon (simple disc for night scenes)
  if(night > 0.1){
    vec3 moonDir = normalize(vec3(-uSunDir.x, max(0.2, -uSunDir.y * 0.5 + 0.3), -uSunDir.z));
    float moonAngle = acos(clamp(dot(rd, moonDir), -1.0, 1.0));
    float moonDisc = 1.0 - smoothstep(0.007, 0.009, moonAngle);
    float moonPhase = clamp(dot(moonDir, uSunDir) * 0.5 + 0.5, 0.0, 1.0);
    col += vec3(0.8, 0.85, 0.95) * moonDisc * night * 0.25 * moonPhase * spaceStarBoost;
    // Moon glow
    col += vec3(0.3, 0.35, 0.5) * exp(-moonAngle * 15.0) * night * 0.05 * spaceStarBoost;
  }

  col = 1.0 - exp(-col * uExpo);
  col = pow(col, vec3(1.0/2.2));
  gl_FragColor = vec4(col, 1);
}`;
