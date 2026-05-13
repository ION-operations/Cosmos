// ═══════════════════════════════════════════
// GENESIS ENGINE — Planet Shaders
// Space-to-ground transition rendering with Cosmos weather-atlas macrostructure
// Sources: farclouds (volumetric clouds from space, planet rings, atmosphere glow), Cosmos R-0001 atlas spine
// ═══════════════════════════════════════════

import { ATMOS_GLSL, NOISE_GLSL, WEATHER_ATLAS_GLSL } from './common';

export const planetVS = `
varying vec2 vUV;
void main(){
  vUV = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Planet renderer — visible when camera altitude > ~50km
// Shows Earth as a sphere with atmosphere rim, atlas-driven cloud regimes, surface hints, and restrained night lights.
export const planetFS = `
precision highp float;
uniform vec3 uCam, uSunDir;
uniform float uSunI, uExpo, uAlt, uTime;
uniform float uCloudCover, uCloudDensity;
uniform sampler2D uGibsSurfaceOverlay;
uniform float uGibsSurfaceOverlayReady, uGibsSurfaceOverlayStrength, uGibsSurfaceWaterBias;
uniform mat4 uInvP, uInvV;
uniform vec2 uRes;
varying vec2 vUV;
${ATMOS_GLSL}
${NOISE_GLSL}
${WEATHER_ATLAS_GLSL}

const float EARTH_R = 6371000.0;
const float ATMO_R = 6471000.0;

// NASA GIBS true-color overlay. The de-clouding heuristic keeps first-pass visible imagery
// from double-stacking bright satellite cloud pixels under the procedural volumetric cloud pass.
vec3 sampleGibsSurfaceOverlay(vec2 uv, vec3 fallbackSurface, CosmosWeatherState wx){
  vec3 gibs = texture2D(uGibsSurfaceOverlay, uv).rgb;
  float luma = dot(gibs, vec3(0.2126, 0.7152, 0.0722));
  float chroma = max(max(gibs.r, gibs.g), gibs.b) - min(min(gibs.r, gibs.g), gibs.b);
  float satelliteCloudWhite = smoothstep(0.52, 0.86, luma) * (1.0 - smoothstep(0.08, 0.26, chroma));
  float waterWorldRetention = mix(1.0, 0.30 + wx.landMask * 0.70, clamp(uGibsSurfaceWaterBias, 0.0, 1.0));
  float gibsWeight = uGibsSurfaceOverlayReady * uGibsSurfaceOverlayStrength * waterWorldRetention * (1.0 - satelliteCloudWhite * 0.72);
  vec3 moderatedGibs = mix(gibs, vec3(luma) * vec3(0.82, 0.93, 1.08), satelliteCloudWhite * 0.20);
  return mix(fallbackSurface, moderatedGibs, clamp(gibsWeight, 0.0, 1.0));
}

// Surface color from space — water-world biased surface using terrain forcing from the shared atlas.
vec3 surfaceColor(vec3 p){
  vec3 n = normalize(p);
  vec2 uv = cosmosSphereUv(n);
  CosmosWeatherState wx = cosmosSampleWeatherUv(uv);

  float shelf = max(wx.coast, smoothstep(0.52, 0.74, wx.evaporation) * 0.35);
  float tropics = 1.0 - smoothstep(0.34, 0.78, abs(n.y));
  vec3 deepOcean = vec3(0.012, 0.039, 0.090);
  vec3 openOcean = vec3(0.018, 0.064, 0.145);
  vec3 shallowOcean = vec3(0.050, 0.170, 0.220);
  vec3 oceanCol = mix(deepOcean, openOcean, wx.evaporation * 0.55 + wx.humidity * 0.25);
  oceanCol = mix(oceanCol, shallowOcean, shelf * (0.40 + tropics * 0.60));
  oceanCol = mix(oceanCol, vec3(0.012, 0.026, 0.052), wx.precip * 0.30);

  float landDetail = gnoise(vec3(uv * 20.0, 3.0)) * 0.5 + 0.5;
  vec3 wetLand = mix(vec3(0.09, 0.17, 0.07), vec3(0.19, 0.26, 0.11), landDetail);
  vec3 dryLand = mix(vec3(0.36, 0.30, 0.18), vec3(0.60, 0.50, 0.31), landDetail);
  float dry = smoothstep(0.46, 0.70, wx.temperature) * (1.0 - wx.humidity) * (1.0 - wx.precip * 0.5);
  vec3 landCol = mix(wetLand, dryLand, dry);

  float polar = smoothstep(0.62, 0.86, abs(n.y));
  landCol = mix(landCol, vec3(0.86, 0.90, 0.91), polar * (0.45 + wx.elevation * 0.55));
  oceanCol = mix(oceanCol, vec3(0.58, 0.72, 0.78), polar * 0.18);

  vec3 proceduralSurface = mix(oceanCol, landCol, wx.landMask);
  return sampleGibsSurfaceOverlay(uv, proceduralSurface, wx);
}

// Cloud layer from space — atlas cloud state places weather; procedural noise only breaks edges/details.
float spaceCloudDensity(vec3 p){
  vec3 n = normalize(p);
  vec2 uv = cosmosSphereUv(n);
  CosmosWeatherState wx = cosmosSampleWeatherSphere(n);

  float proc = gnoise(vec3(uv * 4.0, uTime * 0.01)) * 0.5 + 0.5;
  proc += gnoise(vec3(uv * 8.0 + wx.wind * 0.7, uTime * 0.015)) * 0.25;
  proc += gnoise(vec3(uv * 18.0 + wx.wind * 1.6, uTime * 0.02)) * 0.125;

  float regime = cosmosCloudRegimeMask(0.58, wx, uv * 6371000.0, uTime);
  float frontalBands = smoothstep(0.35, 0.78, 0.5 + 0.5 * sin((uv.x * 10.0 + uv.y * 17.0) + proc * 3.5));
  float cloudMacro = mix(wx.cover, max(wx.cover, frontalBands * wx.streetWeight), 0.32);
  cloudMacro = max(cloudMacro, wx.squallWeight * 0.92);
  cloudMacro = mix(cloudMacro, max(cloudMacro, wx.cirrusWeight * 0.64), smoothstep(0.50, 0.90, abs(n.y)));

  float atlasCloud = smoothstep(0.20, 0.78, cloudMacro + proc * 0.32 - 0.18) * (0.44 + regime * 0.82);
  float fallback = smoothstep(0.45, 0.8, proc);
  float density = mix(fallback * uCloudCover, atlasCloud, uWeatherAtlasStrength);
  density *= mix(0.70, 1.22, uCloudDensity);
  density *= 1.0 - wx.leeShadow * uWeatherAtlasStrength * 0.25;
  return clamp(density, 0.0, 1.0);
}

vec3 spaceCloudColor(vec3 n, float NdL){
  CosmosWeatherState wx = cosmosSampleWeatherSphere(n);
  vec3 wetBase = vec3(0.64, 0.68, 0.74);
  vec3 iceTop = vec3(0.93, 0.95, 0.98);
  vec3 cloudCol = mix(wetBase, iceTop, clamp(wx.ice * 0.75 + NdL * 0.35, 0.0, 1.0));
  cloudCol = mix(cloudCol, vec3(0.43, 0.47, 0.53), wx.precip * uWeatherAtlasStrength * 0.28);
  return cloudCol * (0.28 + NdL * 0.72);
}

// Atmosphere rim glow (farclouds)
vec3 atmosphereGlow(vec3 ro, vec3 rd, vec3 center, float sunI){
  vec3 toC = center - ro;
  float tca = dot(toC, rd);
  vec3 closest = ro + rd * max(tca, 0.0);
  float dist = length(closest - center);

  // Atmosphere ring
  float atmoEdge = smoothstep(ATMO_R, EARTH_R, dist);
  float rimGlow = smoothstep(ATMO_R * 1.02, ATMO_R * 0.995, dist) * (1.0 - atmoEdge);

  // Color depends on sun angle
  float mu = dot(normalize(closest - center), uSunDir);
  vec3 dayColor = vec3(0.3, 0.5, 1.0);
  vec3 sunsetColor = vec3(1.0, 0.4, 0.1);
  vec3 rimColor = mix(sunsetColor, dayColor, smoothstep(-0.2, 0.3, mu));

  return rimColor * rimGlow * sunI * 0.015;
}

// City lights on the night side — atlas terrain mask keeps lights out of open ocean.
vec3 cityLights(vec3 p, vec3 sunDir){
  vec3 n = normalize(p);
  float nightSide = smoothstep(0.0, -0.2, dot(n, sunDir));
  if(nightSide < 0.01) return vec3(0.0);

  vec2 uv = cosmosSphereUv(n);
  CosmosWeatherState wx = cosmosSampleWeatherUv(uv);

  float cities = pow(vnoise(vec3(uv * 30.0, 4.0)), 6.0) * 2.2;
  cities += pow(vnoise(vec3(uv * 60.0, 5.0)), 8.0) * 1.4;
  float coastalSettlement = smoothstep(0.15, 0.75, wx.coast) * 0.55;
  float landSettlement = wx.landMask * (0.42 + coastalSettlement);
  float stormDimming = 1.0 - wx.cover * uWeatherAtlasStrength * 0.45;

  return vec3(1.0, 0.78, 0.38) * cities * nightSide * landSettlement * stormDimming * 0.28;
}

void main(){
  vec2 ndc = vUV * 2.0 - 1.0;
  vec4 clip = vec4(ndc, 1.0, 1.0);
  vec4 viewPos = uInvP * clip;
  viewPos /= max(viewPos.w, 1e-6);
  vec4 worldPos = uInvV * viewPos;
  vec3 rd = normalize(worldPos.xyz - uCam);

  vec3 center = vec3(uCam.x, -EARTH_R, uCam.z);

  // Ray-sphere intersection with Earth
  vec3 oc = uCam - center;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - EARTH_R * EARTH_R;
  float disc = b*b - c;

  // Atmosphere glow (always visible when in space)
  vec3 col = atmosphereGlow(uCam, rd, center, uSunI);

  if(disc > 0.0){
    float t = -b - sqrt(disc);
    if(t > 0.0){
      vec3 hitP = uCam + rd * t;
      vec3 relP = hitP - center;
      vec3 N = normalize(relP);
      float NdL = max(dot(N, uSunDir), 0.0);

      // Surface
      vec3 surface = surfaceColor(relP);
      vec3 sunT = exp(-BR * 1.5e5 * max(1.0 - uSunDir.y, 0.0));

      // Clouds
      float clouds = spaceCloudDensity(relP);
      vec3 cloudCol = spaceCloudColor(N, NdL);
      float cloudShadow = 1.0 - clouds * uWeatherAtlasStrength * 0.18;

      vec3 baseCol = mix(surface * cloudShadow, cloudCol, clouds);
      vec3 lit = baseCol * NdL * sunT * uSunI * 0.04;
      lit += baseCol * 0.010; // ambient

      // City lights
      lit += cityLights(relP, uSunDir);

      col += lit;
    }
  }

  if(length(col) < 0.001) discard;

  col = 1.0 - exp(-col * uExpo);
  col = pow(col, vec3(1.0/2.2));

  gl_FragColor = vec4(col, 1.0);
}`;
