// ═══════════════════════════════════════════
// GENESIS ENGINE — Terrain Shaders
// Ray-marched FBM terrain with biomes
// Sources: goodterrainflyover (IQ), moutainterrainforestsandwater (David Hoskins)
// ═══════════════════════════════════════════

import { ATMOS_GLSL, NOISE_GLSL } from './common';

// Fullscreen quad vertex shader
export const terrainVS = `
varying vec2 vUV;
void main(){
  vUV = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Ray-marched terrain fragment shader
export const terrainFS = `
precision highp float;
uniform vec3 uCam, uSunDir;
uniform float uSunI, uExpo, uAlt, uTime;
uniform mat4 uInvP, uInvV;
uniform vec2 uRes;
varying vec2 vUV;
${ATMOS_GLSL}
${NOISE_GLSL}

// Terrain heightfield — multi-octave FBM with erosion-like features
// Inspired by goodterrainflyover (IQ) and moutainterrainforestsandwater (David Hoskins)
float terrainHeight(vec2 p){
  float h = 0.0;
  float a = 1.0, f = 0.0004;
  // Base continental shape
  h += gnoise(vec3(p * 0.00008, 0.0)) * 2000.0;
  // Mountain ranges
  for(int i = 0; i < 6; i++){
    float n = gnoise(vec3(p * f, float(i) * 1.31));
    // Ridge noise — absolute value creates sharp ridges (IQ technique)
    float ridge = 1.0 - abs(n);
    ridge = ridge * ridge; // sharpen ridges
    h += mix(n, ridge, smoothstep(200.0, 800.0, h)) * a;
    a *= 0.45;
    f *= 2.1;
  }
  // Valley erosion — carve deeper valleys
  float erosion = smoothstep(0.0, 300.0, h);
  h = mix(h * 0.3, h, erosion);
  return h;
}

// Terrain normal from central differences
vec3 terrainNormal(vec2 p, float eps){
  float hL = terrainHeight(p - vec2(eps, 0));
  float hR = terrainHeight(p + vec2(eps, 0));
  float hD = terrainHeight(p - vec2(0, eps));
  float hU = terrainHeight(p + vec2(0, eps));
  return normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
}

// Biome coloring (moutainterrainforestsandwater inspired)
vec3 biomeColor(vec2 p, float h, vec3 N, float slope){
  // Snow
  float snowLine = 1200.0 + gnoise(vec3(p * 0.001, 3.7)) * 300.0;
  float snow = smoothstep(snowLine - 100.0, snowLine + 50.0, h) * smoothstep(0.3, 0.7, N.y);
  
  // Rock
  float rockiness = smoothstep(0.5, 0.8, slope) + smoothstep(800.0, 1500.0, h) * 0.5;
  vec3 rockCol = mix(vec3(0.35, 0.30, 0.25), vec3(0.45, 0.42, 0.38), gnoise(vec3(p * 0.01, 1.1)));
  
  // Grass/forest
  float grassZone = smoothstep(0.0, 200.0, h) * smoothstep(900.0, 400.0, h) * smoothstep(0.3, 0.7, N.y);
  float forestDensity = smoothstep(100.0, 400.0, h) * smoothstep(800.0, 500.0, h);
  forestDensity *= smoothstep(0.4, 0.8, N.y);
  // Tree micro-texture (goodterrainflyover trees — represented as color/roughness variation)
  float treeTex = vnoise(vec3(p * 0.05, 2.2));
  vec3 grassCol = mix(vec3(0.15, 0.28, 0.08), vec3(0.10, 0.22, 0.05), treeTex);
  vec3 forestCol = mix(vec3(0.06, 0.18, 0.04), vec3(0.04, 0.12, 0.02), treeTex);
  vec3 greenCol = mix(grassCol, forestCol, forestDensity);
  
  // Sand/beach
  float sandZone = smoothstep(20.0, -10.0, h);
  vec3 sandCol = vec3(0.76, 0.70, 0.50);
  
  // Compose biomes
  vec3 col = greenCol * grassZone;
  col = mix(col, rockCol, rockiness);
  col = mix(col, sandCol, sandZone);
  col = mix(col, vec3(0.95, 0.97, 1.0), snow);
  
  return col;
}

// Ray march terrain
// Uses sphere tracing with terrain SDF approximation (IQ technique)
float marchTerrain(vec3 ro, vec3 rd, float tMin, float tMax){
  float t = tMin;
  float lastH = 0.0, lastY = 0.0;
  for(int i = 0; i < 128; i++){
    if(t > tMax) break;
    vec3 p = ro + rd * t;
    float h = terrainHeight(p.xz);
    if(p.y < h){
      // Bisect for precision
      float tL = t - lastH; // approximate
      float a = lastY - terrainHeight((ro + rd * (t - lastH * 0.5)).xz); // not exact but fast
      return t - lastH * (lastY - terrainHeight((ro + rd * (t - lastH)).xz)) / max(lastY - h - terrainHeight((ro + rd * (t - lastH)).xz) + terrainHeight((ro + rd * t).xz), 0.001);
    }
    // Step size increases with distance for LOD
    lastH = max(0.5, (p.y - h) * 0.35);
    lastY = p.y - h;
    t += lastH;
  }
  return -1.0;
}

vec3 skyCol(vec3 rd){ return atmosphere(rd, uSunDir, uSunI, uAlt); }

void main(){
  // Reconstruct ray
  vec2 ndc = vUV * 2.0 - 1.0;
  vec4 clip = vec4(ndc, 1.0, 1.0);
  vec4 viewPos = uInvP * clip;
  viewPos /= max(viewPos.w, 1e-6);
  vec4 worldPos = uInvV * viewPos;
  vec3 rd = normalize(worldPos.xyz - uCam);
  
  // Only render terrain where there's land (above water at y=0)
  // Skip if camera is looking at ocean
  float tMax = 50000.0; // max ray distance
  float tMin = max(0.1, (50.0 - uCam.y) / max(rd.y, 0.0001)); // start above water
  
  // Check if ray can hit terrain
  if(rd.y > 0.1 && uCam.y > 2000.0){
    // Looking up from high altitude — skip terrain
    discard;
  }
  
  float t = marchTerrain(uCam, rd, 1.0, tMax);
  
  if(t < 0.0){
    discard; // No terrain hit — ocean/sky will show through
  }
  
  vec3 hitP = uCam + rd * t;
  float eps = max(0.5, t * 0.001);
  vec3 N = terrainNormal(hitP.xz, eps);
  float slope = 1.0 - N.y;
  float h = terrainHeight(hitP.xz);
  
  // Biome shading
  vec3 albedo = biomeColor(hitP.xz, h, N, slope);
  
  // Lighting
  float NdL = max(dot(N, uSunDir), 0.0);
  float ambient = 0.15 + 0.05 * N.y;
  vec3 sunT = exp(-BR * 1.5e5 * max(1.0 - uSunDir.y, 0.0));
  
  // Soft shadows — simplified (goodterrainflyover)
  float shadow = 1.0;
  vec3 sro = hitP + N * 2.0;
  for(int i = 0; i < 32; i++){
    float st = 2.0 + float(i) * 8.0;
    vec3 sp = sro + uSunDir * st;
    float sh = terrainHeight(sp.xz);
    shadow = min(shadow, 8.0 * (sp.y - sh) / st);
    if(shadow < 0.01) break;
  }
  shadow = clamp(shadow, 0.0, 1.0);
  
  vec3 col = albedo * (ambient + NdL * shadow * 0.85) * sunT * uSunI * 0.04;
  
  // Specular for wet rocks
  vec3 H = normalize(uSunDir + (-rd));
  float spec = pow(max(dot(N, H), 0.0), 32.0) * shadow * NdL;
  col += sunT * spec * uSunI * 0.001 * smoothstep(0.6, 0.8, slope);
  
  // Aerial perspective
  vec3 fogC = skyCol(normalize(vec3(rd.x, max(rd.y, 0.02), rd.z)));
  float fogF = 1.0 - exp(-t * 0.00004);
  col = mix(col, fogC, fogF);
  
  // Tonemap
  col = 1.0 - exp(-col * uExpo);
  col = pow(col, vec3(1.0 / 2.2));
  
  gl_FragColor = vec4(col, 1.0);
}`;
