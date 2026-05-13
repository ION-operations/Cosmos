// ═══════════════════════════════════════════
// GENESIS ENGINE — Cloud Shaders
// Volumetric cloud layer with Cosmos weather-atlas macrostructure
// Sources: greatcloudsflying (FBM flythrough), goodterrainflyover (cloud integration), Cosmos R-0001 atlas spine
// ═══════════════════════════════════════════

import { ATMOS_GLSL, NOISE_GLSL, WEATHER_ATLAS_GLSL } from './common';

export const cloudVS = `
varying vec2 vUV;
void main(){
  vUV = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const cloudFS = `
precision highp float;
uniform vec3 uCam, uSunDir;
uniform float uSunI, uExpo, uAlt, uTime;
uniform mat4 uInvP, uInvV;
uniform vec2 uRes;
uniform float uCloudBase, uCloudTop, uCloudCover, uCloudDensity;
varying vec2 vUV;
${ATMOS_GLSL}
${NOISE_GLSL}
${WEATHER_ATLAS_GLSL}

float cloudHeightGradient(float hNorm, CosmosWeatherState wx){
  float baseFade = smoothstep(0.0, 0.13, hNorm);
  float topFade = smoothstep(1.0, 0.70, hNorm);
  float lowDeckBias = mix(1.0, 0.70 + wx.stratusWeight * 0.65, uWeatherAtlasStrength);
  float towerBias = mix(1.0, 0.72 + wx.squallWeight * 0.85, uWeatherAtlasStrength);
  return baseFade * topFade * max(lowDeckBias, towerBias);
}

float weatherShapedCoverage(float n, CosmosWeatherState wx, float regimeMask){
  float localCover = mix(uCloudCover, mix(0.03, 0.97, wx.cover), uWeatherAtlasStrength);
  localCover = mix(localCover, max(localCover, wx.squallWeight * 0.96), uWeatherAtlasStrength);
  float threshold = 1.0 - localCover;
  float softness = mix(0.31, 0.18, clamp(regimeMask + wx.precip * 0.35, 0.0, 1.0));
  return smoothstep(threshold, threshold + softness, n);
}

// Cloud density function — atlas-placed macro cloud regimes plus procedural volumetric microstructure.
float cloudDensity(vec3 p, float lod){
  CosmosWeatherState wx = cosmosSampleWeatherPlanar(p, uTime);
  float hNorm = clamp((p.y - uCloudBase) / max(uCloudTop - uCloudBase, 1.0), 0.0, 1.0);
  float regimeMask = cosmosCloudRegimeMask(hNorm, wx, p.xz, uTime);

  // Weather-vector advection: macro atlas wind controls the direction of the FBM microstructure.
  vec2 macroWind = wx.wind * uWeatherAtlasStrength;
  vec3 wp = p + vec3(
    (8.0 + macroWind.x * 18.0) * uTime,
    0.0,
    (3.0 + macroWind.y * 18.0) * uTime
  );

  // Base cloud shape — large scale. Keep old FBM only as closure; atlas decides where it matters.
  float n = gnoise(wp * 0.0003) * 0.5 + 0.5;
  n += gnoise(wp * 0.0007 + vec3(0.0, 0.0, uTime * 2.0)) * 0.25;

  // Regime-specific large-scale shaping. Stratus remains broad; squalls/towers tighten into stronger masses.
  float sheet = gnoise(wp * 0.00016 + vec3(2.4, 0.0, -1.7)) * 0.5 + 0.5;
  float cellular = gnoise(wp * 0.0011 + vec3(9.2, 0.0, 4.1)) * 0.5 + 0.5;
  n = mix(n, max(n, sheet * 0.88), uWeatherAtlasStrength * wx.stratusWeight * 0.55);
  n = mix(n, n * (0.75 + cellular * 0.55), uWeatherAtlasStrength * max(wx.streetWeight, wx.squallWeight) * 0.65);

  float coverage = weatherShapedCoverage(n, wx, regimeMask);

  // Detail FBM (greatcloudsflying technique — progressively finer detail based on LOD).
  float detail = 0.0;
  float a = 0.5, f = 0.002;
  int maxOct = int(mix(2.0, 5.0, clamp(1.0 - lod, 0.0, 1.0)));
  for(int i = 0; i < 5; i++){
    if(i >= maxOct) break;
    detail += a * gnoise(wp * f);
    f *= 2.3; a *= 0.5;
  }

  float density = coverage * (0.5 + detail * 0.5);

  // Vertical falloff — atlas regimes reshape the layer so low deck, towers, anvils, and cirrus do not collapse into one uniform slab.
  float vFade = cloudHeightGradient(hNorm, wx);
  float atlasMass = mix(1.0, (0.58 + wx.humidity * 0.42 + wx.precip * 0.56) * (0.50 + regimeMask * 1.18), uWeatherAtlasStrength);
  density *= vFade * atlasMass * uCloudDensity;
  return max(density, 0.0);
}

// Light marching for cloud illumination
float lightMarch(vec3 p, float lod){
  float d = 0.0;
  float stepSize = (uCloudTop - uCloudBase) / 4.0;
  for(int i = 0; i < 4; i++){
    p += uSunDir * stepSize;
    if(p.y < uCloudBase || p.y > uCloudTop) break;
    d += cloudDensity(p, lod) * stepSize * 0.01;
  }
  return exp(-d * 2.0);
}

void main(){
  // Reconstruct ray
  vec2 ndc = vUV * 2.0 - 1.0;
  vec4 clip = vec4(ndc, 1.0, 1.0);
  vec4 viewPos = uInvP * clip;
  viewPos /= max(viewPos.w, 1e-6);
  vec4 worldPos = uInvV * viewPos;
  vec3 rd = normalize(worldPos.xyz - uCam);

  // Intersect cloud slab
  float tBot = (uCloudBase - uCam.y) / rd.y;
  float tTop = (uCloudTop - uCam.y) / rd.y;

  float tEnter = min(tBot, tTop);
  float tExit = max(tBot, tTop);

  if(tExit < 0.0 || tEnter > 100000.0) discard;
  tEnter = max(tEnter, 0.0);

  // Ray march through cloud layer
  const int STEPS = 48;
  float stepSize = (tExit - tEnter) / float(STEPS);
  float t = tEnter;

  vec3 totalColor = vec3(0.0);
  float totalAlpha = 0.0;

  vec3 sunT = exp(-BR * 1.5e5 * max(1.0 - uSunDir.y, 0.0));
  vec3 sunColor = sunT * uSunI * 0.04;

  for(int i = 0; i < STEPS; i++){
    if(totalAlpha > 0.95) break;

    vec3 p = uCam + rd * t;
    float lod = clamp(t / 50000.0, 0.0, 1.0);
    float d = cloudDensity(p, lod);

    if(d > 0.001){
      CosmosWeatherState wx = cosmosSampleWeatherPlanar(p, uTime);
      float hNorm = clamp((p.y - uCloudBase) / max(uCloudTop - uCloudBase, 1.0), 0.0, 1.0);
      float regimeMask = cosmosCloudRegimeMask(hNorm, wx, p.xz, uTime);

      // Lighting
      float light = lightMarch(p, lod);

      // Silver lining / phase function
      float mu = dot(rd, uSunDir);
      float phase = 0.5 + 0.5 * mu; // simple HG approximation
      float silver = pow(max(mu, 0.0), 8.0) * mix(1.6, 2.6, wx.ice);

      // Cloud color: darker wet bases, brighter icy anvils/cirrus.
      vec3 ambient = mix(vec3(0.33, 0.38, 0.48), vec3(0.72, 0.76, 0.82), hNorm);
      ambient = mix(ambient, vec3(0.25, 0.28, 0.34), wx.precip * uWeatherAtlasStrength * (1.0 - hNorm) * 0.45);
      vec3 lit = sunColor * (light + silver * 0.3) * (0.6 + phase * 0.4);
      lit *= mix(1.0, 1.0 + regimeMask * 0.28 + wx.ice * 0.18, uWeatherAtlasStrength);

      vec3 cloudCol = ambient * 0.3 + lit;

      // Accumulate
      float alpha = (1.0 - exp(-d * stepSize * 0.02)) * (1.0 - totalAlpha);
      totalColor += cloudCol * alpha;
      totalAlpha += alpha;
    }
    t += stepSize;
  }

  if(totalAlpha < 0.001) discard;

  // Tonemap
  totalColor = 1.0 - exp(-totalColor * uExpo);
  totalColor = pow(totalColor, vec3(1.0 / 2.2));

  gl_FragColor = vec4(totalColor, totalAlpha);
}`;
