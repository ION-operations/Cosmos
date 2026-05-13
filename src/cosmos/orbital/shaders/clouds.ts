// ═══════════════════════════════════════════
// GENESIS ENGINE — Cloud Shaders
// Volumetric cloud layer with Cosmos weather-atlas macrostructure
// R-0006: spherical shell scale coherence for zoom-stable cloud/atmosphere transitions
// ═══════════════════════════════════════════

import { ATMOS_GLSL, ATMOSPHERE_CONTINUITY_GLSL, ATMOSPHERE_LUT_GLSL, NOISE_GLSL, SCALE_GLSL, WEATHER_ATLAS_GLSL } from './common';

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
${SCALE_GLSL}
${ATMOSPHERE_CONTINUITY_GLSL}
${ATMOSPHERE_LUT_GLSL}
${WEATHER_ATLAS_GLSL}

CosmosWeatherState sampleCloudWeather(vec3 p){
  vec3 n = normalize(p - uCosmosPlanetCenter);
  if(uCosmosCameraAltitudeMeters > 18000.0){
    return cosmosSampleWeatherSphere(n);
  }
  return cosmosSampleWeatherPlanar(p, uTime);
}

float cloudHeightGradient(float hNorm, CosmosWeatherState wx){
  float baseFade = smoothstep(0.0, 0.14, hNorm);
  float topFade = 1.0 - smoothstep(0.70, 1.0, hNorm);
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

float cloudDensity(vec3 p, float lod, float rayDistanceMeters){
  CosmosWeatherState wx = sampleCloudWeather(p);
  float altitude = cosmosAltitudeMeters(p);
  float hNorm = clamp((altitude - uCloudBase) / max(uCloudTop - uCloudBase, 1.0), 0.0, 1.0);
  float regimeMask = cosmosCloudRegimeMask(hNorm, wx, p.xz, uTime);

  vec2 macroWind = wx.wind * uWeatherAtlasStrength;
  vec3 wp = p + vec3(
    (8.0 + macroWind.x * 18.0) * uTime,
    0.0,
    (3.0 + macroWind.y * 18.0) * uTime
  );

  float highScaleDamp = smoothstep(15000.0, 80000.0, uCosmosCameraAltitudeMeters);
  float microAlpha = cosmosCloudMicroDetailAlpha(rayDistanceMeters);
  float mesoAlpha = cosmosCloudMesoDetailAlpha(rayDistanceMeters);
  float macroAlpha = cosmosCloudMacroDetailAlpha();
  float baseFreq = mix(0.00030, 0.00016, highScaleDamp * macroAlpha);
  float detailFreq = mix(0.00074, 0.00036, highScaleDamp);

  float n = gnoise(wp * baseFreq) * 0.5 + 0.5;
  n += gnoise(wp * detailFreq + vec3(0.0, 0.0, uTime * 2.0)) * 0.25 * microAlpha;

  float sheet = gnoise(wp * mix(0.00016, 0.00009, highScaleDamp) + vec3(2.4, 0.0, -1.7)) * 0.5 + 0.5;
  float cellular = gnoise(wp * mix(0.0011, 0.00058, highScaleDamp) + vec3(9.2, 0.0, 4.1)) * 0.5 + 0.5;
  n = mix(n, max(n, sheet * 0.88), uWeatherAtlasStrength * wx.stratusWeight * 0.55 * max(mesoAlpha, 0.35));
  n = mix(n, n * (0.75 + cellular * 0.55 * microAlpha), uWeatherAtlasStrength * max(wx.streetWeight, wx.squallWeight) * 0.65 * max(mesoAlpha, 0.30));

  float coverage = weatherShapedCoverage(n, wx, regimeMask);

  float detail = 0.0;
  float a = 0.5, f = mix(0.0020, 0.0012, highScaleDamp);
  int maxOct = int(mix(2.0, 5.0, clamp((1.0 - lod) * microAlpha + uCloudLodBias * 0.18, 0.0, 1.0)));
  for(int i = 0; i < 5; i++){
    if(i >= maxOct) break;
    detail += a * gnoise(wp * f);
    f *= 2.3; a *= 0.5;
  }

  detail *= mix(0.18, 1.0, microAlpha);
  float density = coverage * (0.5 + detail * 0.5);
  float vFade = cloudHeightGradient(hNorm, wx);
  float atlasMass = mix(1.0, (0.58 + wx.humidity * 0.42 + wx.precip * 0.56) * (0.50 + regimeMask * 1.18), uWeatherAtlasStrength);
  atlasMass *= mix(0.82, 1.08, macroAlpha);
  density *= vFade * atlasMass * uCloudDensity;
  return max(density, 0.0);
}

float lightMarch(vec3 p, float lod){
  float d = 0.0;
  float stepSize = (uCloudTop - uCloudBase) / 4.0;
  for(int i = 0; i < 4; i++){
    p += uSunDir * stepSize;
    float altitude = cosmosAltitudeMeters(p);
    if(altitude < uCloudBase || altitude > uCloudTop) break;
    d += cloudDensity(p, lod, length(p - uCam)) * stepSize * 0.01;
  }
  return exp(-d * 2.0);
}

void main(){
  if(uCosmosCloudPassAlpha <= 0.001) discard;

  vec2 ndc = vUV * 2.0 - 1.0;
  vec4 clip = vec4(ndc, 1.0, 1.0);
  vec4 viewPos = uInvP * clip;
  viewPos /= max(viewPos.w, 1e-6);
  vec4 worldPos = uInvV * viewPos;
  vec3 rd = normalize(worldPos.xyz - uCam);

  float shellTop = uCosmosEarthRadius + uCloudTop;
  vec2 topHit = cosmosRaySphere(uCam, rd, uCosmosPlanetCenter, shellTop);
  if(topHit.x > topHit.y) discard;

  float tEnter = max(topHit.x, 0.0);
  float tExit = topHit.y;
  vec2 groundHit = cosmosRaySphere(uCam, rd, uCosmosPlanetCenter, uCosmosEarthRadius);
  if(groundHit.x > 0.0 && groundHit.x < tExit) tExit = groundHit.x;

  float maxMarch = mix(110000.0, 360000.0, smoothstep(8000.0, 90000.0, uCosmosCameraAltitudeMeters));
  maxMarch *= mix(0.92, 1.18, uCosmosCloudMacroAlpha);
  tExit = min(tExit, tEnter + maxMarch);
  if(tExit <= tEnter || tEnter > maxMarch) discard;

  const int STEPS = 48;
  float stepSize = (tExit - tEnter) / float(STEPS);
  float t = tEnter;

  vec3 totalColor = vec3(0.0);
  float totalAlpha = 0.0;
  vec3 sunT = mix(exp(-BR * 1.5e5 * max(1.0 - uSunDir.y, 0.0)), cosmosLutSolarTransmittance(max(uCosmosCameraAltitudeMeters, 0.0), uSunDir.y), clamp(uAtmosphereLutStrength, 0.0, 1.0));
  vec3 sunColor = sunT * uSunI * 0.04;

  for(int i = 0; i < STEPS; i++){
    if(totalAlpha > 0.95) break;
    vec3 p = uCam + rd * t;
    float altitude = cosmosAltitudeMeters(p);
    if(altitude >= uCloudBase && altitude <= uCloudTop){
      float rayDistance = length(p - uCam);
      float lod = clamp(rayDistance / 120000.0, 0.0, 1.0);
      float d = cloudDensity(p, lod, rayDistance);
      if(d > 0.001){
        CosmosWeatherState wx = sampleCloudWeather(p);
        float hNorm = clamp((altitude - uCloudBase) / max(uCloudTop - uCloudBase, 1.0), 0.0, 1.0);
        float regimeMask = cosmosCloudRegimeMask(hNorm, wx, p.xz, uTime);

        float light = lightMarch(p, lod);
        float mu = dot(rd, uSunDir);
        float phase = 0.5 + 0.5 * mu;
        float silver = pow(max(mu, 0.0), 8.0) * mix(1.6, 2.6, wx.ice);

        vec3 ambient = mix(vec3(0.33, 0.38, 0.48), vec3(0.72, 0.76, 0.82), hNorm);
        ambient = mix(ambient, vec3(0.25, 0.28, 0.34), wx.precip * uWeatherAtlasStrength * (1.0 - hNorm) * 0.45);
        vec3 lit = sunColor * (light + silver * 0.3) * (0.6 + phase * 0.4);
        lit *= mix(1.0, 1.0 + regimeMask * 0.28 + wx.ice * 0.18, uWeatherAtlasStrength);

        float lutFogAlpha = 0.0;
        vec3 lutScatter = cosmosLutAerialPerspectiveColor(rayDistance, altitude, dot(uSunDir, normalize(p - uCosmosPlanetCenter)), lutFogAlpha);
        vec3 cloudCol = ambient * 0.3 + lit;
        cloudCol = mix(cloudCol, cloudCol + lutScatter * 0.18, clamp(uAtmosphereLutStrength, 0.0, 1.0));
        float alpha = (1.0 - exp(-d * stepSize * 0.014)) * (1.0 - totalAlpha);
        totalColor += cloudCol * alpha;
        totalAlpha += alpha;
      }
    }
    t += stepSize;
  }

  totalAlpha *= uCosmosCloudPassAlpha * mix(0.88, 1.0, uAtmosphereContinuityStrength);
  if(totalAlpha < 0.001) discard;

  totalColor = 1.0 - exp(-totalColor * uExpo);
  totalColor = pow(totalColor, vec3(1.0 / 2.2));
  gl_FragColor = vec4(totalColor, totalAlpha);
}`;
