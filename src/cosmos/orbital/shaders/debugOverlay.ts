// ═══════════════════════════════════════════
// COSMOS R-0008 — Fullscreen visual diagnostic overlay
// ═══════════════════════════════════════════

import { ATMOSPHERE_CONTINUITY_GLSL, ATMOSPHERE_LUT_GLSL, SCALE_GLSL } from './common';

export const debugOverlayVS = `
varying vec2 vUV;
void main(){
  vUV = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const debugOverlayFS = `
precision highp float;
uniform vec3 uCam;
uniform vec3 uSunDir;
uniform mat4 uInvP, uInvV;
uniform vec2 uRes;
uniform float uCosmosDebugOverlayMode;
uniform float uCosmosDebugOverlayStrength;
uniform float uCosmosDebugShellOpacity;
uniform float uCloudBase, uCloudTop;
uniform float uTime;
varying vec2 vUV;
${SCALE_GLSL}
${ATMOSPHERE_CONTINUITY_GLSL}
${ATMOSPHERE_LUT_GLSL}

vec3 cosmosDebugWorldRay(vec2 uv){
  vec2 ndc = uv * 2.0 - 1.0;
  vec4 clip = vec4(ndc, 1.0, 1.0);
  vec4 viewPos = uInvP * clip;
  viewPos /= max(viewPos.w, 1e-6);
  vec4 worldPos = uInvV * viewPos;
  return normalize(worldPos.xyz - uCam);
}

float cosmosShellTangentLine(vec3 ro, vec3 rd, float radiusMeters, float widthMeters){
  vec3 oc = ro - uCosmosPlanetCenter;
  float closestT = -dot(oc, rd);
  vec3 closest = oc + rd * closestT;
  float closestRadius = length(closest);
  float tangent = 1.0 - smoothstep(0.0, widthMeters, abs(closestRadius - radiusMeters));
  float facing = smoothstep(-1000000.0, 100000.0, closestT);
  return tangent * facing;
}

vec3 cosmosOwnershipScaleColor(){
  return clamp(vec3(uCosmosOceanPassAlpha, uCosmosCloudPassAlpha, uCosmosPlanetPassAlpha), 0.0, 1.0);
}

vec3 cosmosOwnershipAtmosphereColor(){
  return clamp(vec3(uCosmosLocalAtmosphereAlpha, uCosmosHorizonFogAlpha, uCosmosOrbitalRimAlpha), 0.0, 1.0);
}

vec3 cosmosOwnershipCloudLodColor(){
  return clamp(vec3(uCosmosCloudMicroAlpha, uCosmosCloudMesoAlpha, uCosmosCloudMacroAlpha), 0.0, 1.0);
}

vec3 cosmosOpticalDepthLutColor(vec3 ro, vec3 rd){
  vec2 atmo = cosmosRaySphere(ro, rd, uCosmosPlanetCenter, uCosmosAtmosphereRadius);
  if(atmo.x > atmo.y) return vec3(0.0);
  float t0 = max(atmo.x, 0.0);
  float t1 = max(atmo.y, t0);
  float path = max(t1 - t0, 0.0);
  vec3 p = ro + rd * (t0 + path * 0.5);
  float altitude = max(cosmosAltitudeMeters(p), 0.0);
  float sunMu = dot(normalize(p - uCosmosPlanetCenter), normalize(uSunDir));
  float opticalDepth = cosmosLutOpticalDepth(altitude, sunMu);
  float fogAlpha = 0.0;
  vec3 aerial = cosmosLutAerialPerspectiveColor(min(path, 1000000.0), altitude, sunMu, fogAlpha);
  vec3 ms = cosmosLutMultiScattering(altitude, sunMu);
  return clamp(vec3(opticalDepth, fogAlpha, max(ms.b, length(ms) * 0.45)) + aerial * 0.18, 0.0, 1.0);
}

vec3 cosmosShellColor(vec3 ro, vec3 rd){
  float altitudeFactor = clamp(1.0 + uCosmosCameraAltitudeMeters / 8000000.0, 1.0, 5.0);
  float width = mix(90.0, 32000.0, smoothstep(0.0, 12000000.0, uCosmosCameraAltitudeMeters)) * altitudeFactor;

  float earth = cosmosShellTangentLine(ro, rd, uCosmosEarthRadius, width * 0.75);
  float cloudBase = cosmosShellTangentLine(ro, rd, uCosmosEarthRadius + uCloudBase, width);
  float cloudTop = cosmosShellTangentLine(ro, rd, uCosmosEarthRadius + uCloudTop, width);
  float atmosphere = cosmosShellTangentLine(ro, rd, uCosmosAtmosphereRadius, width * 1.25);

  vec3 col = vec3(0.0);
  col = max(col, vec3(0.08, 1.00, 0.32) * earth);
  col = max(col, vec3(0.00, 0.92, 1.00) * cloudBase);
  col = max(col, vec3(1.00, 0.10, 0.95) * cloudTop);
  col = max(col, vec3(1.00, 0.55, 0.10) * atmosphere);
  return col;
}

void main(){
  float mode = floor(uCosmosDebugOverlayMode + 0.5);
  float strength = clamp(uCosmosDebugOverlayStrength, 0.0, 1.0);
  if(mode < 0.5 || strength <= 0.001){ discard; }

  vec3 rd = cosmosDebugWorldRay(vUV);
  vec3 shell = cosmosShellColor(uCam, rd) * clamp(uCosmosDebugShellOpacity, 0.0, 1.0);
  vec3 col = vec3(0.0);
  float alpha = strength * 0.36;

  if(mode < 1.5){
    col = cosmosOwnershipScaleColor();
  } else if(mode < 2.5){
    col = cosmosOwnershipAtmosphereColor();
  } else if(mode < 3.5){
    col = cosmosOwnershipCloudLodColor();
  } else if(mode < 4.5){
    col = shell;
    alpha = max(length(shell), 0.0) * strength;
  } else if(mode < 5.5){
    vec3 ownership = mix(cosmosOwnershipScaleColor(), cosmosOwnershipAtmosphereColor(), 0.45);
    ownership = mix(ownership, cosmosOwnershipCloudLodColor(), 0.35);
    col = max(ownership * 0.78, shell);
    alpha = max(strength * 0.32, min(0.85, length(shell) * strength));
  } else {
    col = max(cosmosOpticalDepthLutColor(uCam, rd), shell * 0.45);
    alpha = max(strength * max(0.28, uOpticalDepthDebugStrength), min(0.86, length(shell) * strength));
  }

  if(mode < 3.5 || mode > 4.5){
    col = max(col, shell * 1.15);
  }

  float stripe = step(0.965, fract((vUV.y + uTime * 0.006) * 32.0));
  col += stripe * vec3(0.08) * strength;
  alpha = clamp(alpha + stripe * 0.08 * strength, 0.0, 0.92);
  if(alpha <= 0.001 || length(col) <= 0.001){ discard; }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), alpha);
}`;
