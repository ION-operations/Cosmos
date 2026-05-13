// ═══════════════════════════════════════════
// GENESIS ENGINE — Shared GLSL Functions
// ═══════════════════════════════════════════

// Nishita Atmosphere (Rayleigh + Mie Scattering) — shared across sky, ocean, terrain, clouds
export const ATMOS_GLSL = `
const float ER=6371000.0, AR=6471000.0, HR=8500.0, HM=1200.0;
const vec3 BR=vec3(5.802e-6,13.558e-6,33.1e-6);
const float BM=21e-6;

vec2 raySph(vec3 o, vec3 d, float r){
  float b=dot(o,d); float c=dot(o,o)-r*r;
  float D=b*b-c; if(D<0.) return vec2(1e20,-1e20);
  D=sqrt(D); return vec2(-b-D,-b+D);
}

vec3 atmosphere(vec3 rd, vec3 sd, float si, float alt){
  vec3 ro=vec3(0, ER+max(alt,2.), 0);
  vec2 atH=raySph(ro,rd,AR); if(atH.x>atH.y) return vec3(0);
  float tS=max(atH.x,0.); float tE=atH.y;
  vec2 gH=raySph(ro,rd,ER); if(gH.x>0.&&gH.x<tE) tE=gH.x;
  if(tE<tS) return vec3(0);
  const int VS=16, LS=4; float ds=(tE-tS)/float(VS);
  vec3 sR=vec3(0), sM=vec3(0); float oR=0., oM=0.;
  for(int i=0;i<VS;i++){
    vec3 p=ro+rd*(tS+(float(i)+.5)*ds); float h=length(p)-ER;
    float dR=exp(-h/HR)*ds, dM=exp(-h/HM)*ds; oR+=dR; oM+=dM;
    vec2 sH=raySph(p,sd,AR); float lDs=sH.y/float(LS);
    float lR=0., lM=0.;
    for(int j=0;j<LS;j++){
      vec3 lp=p+sd*(float(j)+.5)*lDs; float lh=length(lp)-ER;
      if(lh<0.){lR=1e10;break;} lR+=exp(-lh/HR)*lDs; lM+=exp(-lh/HM)*lDs;
    }
    vec3 att=exp(-(BR*(oR+lR)+BM*1.1*(oM+lM))); sR+=dR*att; sM+=dM*att;
  }
  float mu=dot(rd,sd), mu2=mu*mu;
  float pR=0.059683*(1.+mu2);
  float g=0.76, g2=g*g;
  float pM=0.11937*(1.-g2)/pow(1.+g2-2.*g*mu,1.5);
  vec3 col=si*(pR*BR*sR+pM*BM*sM);
  float sunAng=0.00935;
  float sunEdge=1.0 - smoothstep(sunAng*.9, sunAng*1.1, acos(clamp(mu,-1.,1.)));
  vec3 sunT=exp(-(BR*oR+BM*1.1*oM));
  col+=sunT*sunEdge*si*0.5;
  return col;
}`;



// Cosmos physical scale uniforms shared by fullscreen and projected passes.
// This keeps camera altitude, planet center, atmosphere radius, and pass cross-fades coherent
// across sea-level, high-altitude, and orbital views.
export const SCALE_GLSL = `
uniform vec3 uCosmosPlanetCenter;
uniform float uCosmosEarthRadius;
uniform float uCosmosAtmosphereRadius;
uniform float uCosmosCameraAltitudeMeters;
uniform float uCosmosScaleLod;
uniform float uCosmosOceanPassAlpha;
uniform float uCosmosCloudPassAlpha;
uniform float uCosmosPlanetPassAlpha;
uniform float uCosmosLocalAtmosphereAlpha;
uniform float uCosmosCloudMicroAlpha;
uniform float uCosmosCloudMesoAlpha;
uniform float uCosmosCloudMacroAlpha;
uniform float uCosmosHorizonFogAlpha;
uniform float uCosmosOrbitalRimAlpha;

vec2 cosmosRaySphere(vec3 o, vec3 d, vec3 c, float r){
  vec3 oc = o - c;
  float b = dot(oc, d);
  float c2 = dot(oc, oc) - r * r;
  float disc = b * b - c2;
  if(disc < 0.0) return vec2(1e20, -1e20);
  float h = sqrt(disc);
  return vec2(-b - h, -b + h);
}

float cosmosAltitudeMeters(vec3 p){
  return length(p - uCosmosPlanetCenter) - uCosmosEarthRadius;
}

float cosmosPassFade(float alpha){
  return clamp(alpha, 0.0, 1.0);
}
`;



// Cosmos atmosphere/cloud continuity helpers.
// These functions intentionally use the same fixed Earth scale uniforms as SCALE_GLSL so sky,
// projected ocean, volumetric clouds, and orbital rim lighting do not drift apart while zooming.
export const ATMOSPHERE_CONTINUITY_GLSL = `
uniform float uAtmosphereContinuityStrength;
uniform float uHorizonHazeStrength;
uniform float uCloudLodBias;

float cosmosInvSmoothstep(float edge0, float edge1, float value){
  return 1.0 - smoothstep(edge0, edge1, value);
}

float cosmosLocalSkyContinuity(){
  return clamp(uCosmosLocalAtmosphereAlpha * uAtmosphereContinuityStrength, 0.0, 1.0);
}

vec3 cosmosAtmosphereContinuityColor(float sunMu){
  vec3 day = vec3(0.34, 0.52, 0.94);
  vec3 lowSun = vec3(1.0, 0.45, 0.16);
  vec3 twilight = vec3(0.22, 0.16, 0.34);
  vec3 warm = mix(twilight, lowSun, smoothstep(-0.28, 0.14, sunMu));
  return mix(warm, day, smoothstep(0.06, 0.55, sunMu));
}

float cosmosHorizonWeight(vec3 rd){
  float y = abs(normalize(rd).y);
  return pow(1.0 - clamp(y, 0.0, 1.0), 2.15);
}

float cosmosAerialPerspectiveFactor(float distanceMeters, float altitudeMeters){
  float alt = max(altitudeMeters, 0.0);
  float airDensity = exp(-alt / 38000.0);
  float fog = 1.0 - exp(-distanceMeters * distanceMeters * 2.25e-10 * airDensity * max(uHorizonHazeStrength, 0.0));
  return clamp(fog * uAtmosphereContinuityStrength * uCosmosHorizonFogAlpha, 0.0, 1.0);
}

float cosmosCloudMicroDetailAlpha(float rayDistanceMeters){
  float distanceTerm = 1.0 - smoothstep(12000.0, 90000.0, rayDistanceMeters);
  float altitudeTerm = uCosmosCloudMicroAlpha;
  float bias = clamp(uCloudLodBias, 0.0, 1.0);
  return clamp(mix(altitudeTerm * distanceTerm, max(altitudeTerm, distanceTerm) * altitudeTerm, bias), 0.0, 1.0);
}

float cosmosCloudMesoDetailAlpha(float rayDistanceMeters){
  float distanceTerm = 1.0 - smoothstep(65000.0, 360000.0, rayDistanceMeters);
  float altitudeTerm = uCosmosCloudMesoAlpha;
  return clamp(max(distanceTerm * 0.45, altitudeTerm) * (0.55 + uCloudLodBias * 0.45), 0.0, 1.0);
}

float cosmosCloudMacroDetailAlpha(){
  return clamp(uCosmosCloudMacroAlpha, 0.0, 1.0);
}
`;



// Cosmos R-0009 atmosphere LUT interface.
// This is a WebGL-safe lookup-table contract inspired by production sky models: generated
// CPU fallback textures today, replaceable by compute/precomputed textures later.
export const ATMOSPHERE_LUT_GLSL = `
uniform sampler2D uCosmosTransmittanceLut;
uniform sampler2D uCosmosMultiScatteringLut;
uniform sampler2D uCosmosSkyViewLut;
uniform sampler2D uCosmosAerialPerspectiveLut;
uniform float uAtmosphereLutStrength;
uniform float uRayleighScale;
uniform float uMieScale;
uniform float uOzoneScale;
uniform float uMultiScatteringStrength;
uniform float uAerialPerspectiveStrength;
uniform float uSkyViewLutStrength;
uniform float uOpticalDepthDebugStrength;

float cosmosLutSat(float v){ return clamp(v, 0.0, 1.0); }

vec2 cosmosTransmittanceLutUv(float altitudeMeters, float sunMu){
  float x = cosmosLutSat((sunMu + 0.35) / 1.35);
  float y = pow(cosmosLutSat(max(altitudeMeters, 0.0) / 100000.0), 1.0 / 1.65);
  return vec2(x, y);
}

vec2 cosmosMultiScatteringLutUv(float altitudeMeters, float sunMu){
  float x = cosmosLutSat((sunMu + 0.42) / 1.42);
  float y = pow(cosmosLutSat(max(altitudeMeters, 0.0) / 100000.0), 1.0 / 1.35);
  return vec2(x, y);
}

vec2 cosmosSkyViewLutUv(vec3 rd, vec3 sunDir){
  float viewMu = cosmosLutSat((normalize(rd).y + 0.08) / 1.08);
  float sunMu = cosmosLutSat((dot(normalize(rd), normalize(sunDir)) + 0.45) / 1.45);
  return vec2(viewMu, sunMu);
}

vec2 cosmosAerialPerspectiveLutUv(float distanceMeters, float altitudeMeters){
  float x = pow(cosmosLutSat(max(distanceMeters, 0.0) / 1000000.0), 1.0 / 1.45);
  float y = pow(cosmosLutSat(max(altitudeMeters, 0.0) / 100000.0), 1.0 / 1.8);
  return vec2(x, y);
}

vec3 cosmosLutSolarTransmittance(float altitudeMeters, float sunMu){
  vec3 lut = texture2D(uCosmosTransmittanceLut, cosmosTransmittanceLutUv(altitudeMeters, sunMu)).rgb;
  vec3 analytic = exp(-vec3(0.22, 0.34, 0.56) * (1.0 - sunMu) * max(uRayleighScale, 0.0));
  return mix(analytic, lut, cosmosLutSat(uAtmosphereLutStrength));
}

float cosmosLutOpticalDepth(float altitudeMeters, float sunMu){
  float lut = texture2D(uCosmosTransmittanceLut, cosmosTransmittanceLutUv(altitudeMeters, sunMu)).a;
  float analytic = cosmosLutSat(exp(-max(altitudeMeters, 0.0) / 42000.0) * (1.0 - sunMu * 0.35));
  return mix(analytic, lut, cosmosLutSat(uAtmosphereLutStrength));
}

vec3 cosmosLutMultiScattering(float altitudeMeters, float sunMu){
  vec4 lut = texture2D(uCosmosMultiScatteringLut, cosmosMultiScatteringLutUv(altitudeMeters, sunMu));
  return lut.rgb * lut.a * uMultiScatteringStrength * cosmosLutSat(uAtmosphereLutStrength);
}

vec3 cosmosLutSkyRadiance(vec3 rd, vec3 sunDir, float altitudeMeters){
  float sunMu = dot(normalize(rd), normalize(sunDir));
  vec4 sky = texture2D(uCosmosSkyViewLut, cosmosSkyViewLutUv(rd, sunDir));
  vec3 trans = cosmosLutSolarTransmittance(altitudeMeters, max(dot(vec3(0.0, 1.0, 0.0), sunDir), sunMu * 0.45));
  vec3 ms = cosmosLutMultiScattering(altitudeMeters, sunMu);
  vec3 lutSky = sky.rgb * uSkyViewLutStrength + ms;
  lutSky *= 0.48 + 0.52 * trans;
  return lutSky * cosmosLutSat(uAtmosphereLutStrength);
}

vec3 cosmosLutAerialPerspectiveColor(float distanceMeters, float altitudeMeters, float sunMu, out float fogAlpha){
  vec4 lut = texture2D(uCosmosAerialPerspectiveLut, cosmosAerialPerspectiveLutUv(distanceMeters, altitudeMeters));
  float horizonLift = 1.0 - smoothstep(0.18, 0.82, abs(sunMu));
  fogAlpha = cosmosLutSat(lut.a * uAerialPerspectiveStrength * uAtmosphereLutStrength);
  vec3 twilight = vec3(0.94, 0.52, 0.24) * horizonLift * (1.0 - smoothstep(0.05, 0.42, sunMu));
  return lut.rgb + twilight * fogAlpha * 0.28;
}
`;

// FBM noise functions — used by terrain, clouds, ocean detail
export const NOISE_GLSL = `
// Hash functions
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float hash31(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
vec3 hash33(vec3 p){
  p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
  return -1.0+2.0*fract(sin(p)*43758.5453);
}

// 3D value noise
float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  f = f*f*(3.0-2.0*f);
  float n = mix(mix(mix(hash31(i), hash31(i+vec3(1,0,0)), f.x),
                    mix(hash31(i+vec3(0,1,0)), hash31(i+vec3(1,1,0)), f.x), f.y),
                mix(mix(hash31(i+vec3(0,0,1)), hash31(i+vec3(1,0,1)), f.x),
                    mix(hash31(i+vec3(0,1,1)), hash31(i+vec3(1,1,1)), f.x), f.y), f.z);
  return n;
}

// 3D gradient noise (Perlin-style)
float gnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f*f*(3.0-2.0*f);
  return mix(mix(mix(dot(hash33(i),f),
                     dot(hash33(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                 mix(dot(hash33(i+vec3(0,1,0)),f-vec3(0,1,0)),
                     dot(hash33(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(hash33(i+vec3(0,0,1)),f-vec3(0,0,1)),
                     dot(hash33(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                 mix(dot(hash33(i+vec3(0,1,1)),f-vec3(0,1,1)),
                     dot(hash33(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
}

// FBM with configurable octaves
float fbm(vec3 p, int octaves){
  float v=0.0, a=0.5, f=1.0;
  for(int i=0; i<8; i++){
    if(i>=octaves) break;
    v += a*gnoise(p*f);
    f *= 2.0; a *= 0.5;
  }
  return v;
}

// Domain-warped FBM for more organic shapes
float warpedFbm(vec3 p, int octaves){
  vec3 q = vec3(fbm(p, octaves), fbm(p+vec3(5.2,1.3,2.8), octaves), 0.0);
  return fbm(p + 4.0*q, octaves);
}
`;


// Cosmos weather atlas — shared macro weather/terrain forcing for orbital, cloud, and ocean passes.
// The atlas stores the same renderer contract used by the main Water World route:
//   A: cloud cover, liquid, ice/cirrus, precipitation
//   B: encoded wind U/V, humidity, temperature
//   terrain A/B: elevation, land/coast/drag, evaporation/heat/orographic/lee forcing
export const WEATHER_ATLAS_GLSL = `
uniform sampler2D uCosmosWeatherAtlasA;
uniform sampler2D uCosmosWeatherAtlasB;
uniform sampler2D uCosmosTerrainForcingA;
uniform sampler2D uCosmosTerrainForcingB;
uniform float uWeatherAtlasStrength;
uniform float uCloudRegimeContrast;
uniform float uMacroWeatherScale;
uniform vec2 uWeatherAnchor;

const float COSMOS_PI = 3.141592653589793;
const float COSMOS_TAU = 6.283185307179586;

float cosmosSat(float v){ return clamp(v, 0.0, 1.0); }

struct CosmosWeatherState {
  float cover;
  float liquid;
  float ice;
  float precip;
  vec2 wind;
  float humidity;
  float temperature;
  float elevation;
  float landMask;
  float coast;
  float roughnessDrag;
  float evaporation;
  float heatCapacity;
  float orographic;
  float leeShadow;
  float instability;
  float stratusWeight;
  float streetWeight;
  float squallWeight;
  float cirrusWeight;
};

vec2 cosmosSphereUv(vec3 n){
  n = normalize(n);
  float lon = atan(n.z, n.x);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  return vec2(fract(lon / COSMOS_TAU + 0.5), clamp(lat / COSMOS_PI + 0.5, 0.001, 0.999));
}

vec2 cosmosPlanarWeatherUv(vec3 p, float timeSeconds){
  float scale = max(uMacroWeatherScale, 0.01);
  vec2 uv = p.xz * 0.000014 * scale + uWeatherAnchor;
  uv += vec2(timeSeconds * 0.000018, sin(timeSeconds * 0.00007) * 0.012);
  return fract(uv);
}

CosmosWeatherState cosmosSampleWeatherUv(vec2 uv){
  vec4 a = texture2D(uCosmosWeatherAtlasA, uv);
  vec4 b = texture2D(uCosmosWeatherAtlasB, uv);
  vec4 ta = texture2D(uCosmosTerrainForcingA, uv);
  vec4 tb = texture2D(uCosmosTerrainForcingB, uv);

  CosmosWeatherState wx;
  wx.cover = a.r;
  wx.liquid = a.g;
  wx.ice = a.b;
  wx.precip = a.a;
  wx.wind = b.rg * 2.0 - 1.0;
  wx.humidity = b.b;
  wx.temperature = b.a;
  wx.elevation = ta.r;
  wx.landMask = ta.g;
  wx.coast = ta.b;
  wx.roughnessDrag = ta.a;
  wx.evaporation = tb.r;
  wx.heatCapacity = tb.g;
  wx.orographic = tb.b;
  wx.leeShadow = tb.a;
  wx.instability = cosmosSat(wx.humidity * wx.temperature + wx.precip * 0.65 + wx.orographic * 0.25 - wx.leeShadow * 0.18);

  float marineLayer = smoothstep(0.35, 0.75, wx.humidity) * (1.0 - smoothstep(0.55, 0.92, wx.temperature));
  float coastFog = smoothstep(0.15, 0.75, wx.coast) * (1.0 - wx.landMask) * wx.humidity;
  wx.stratusWeight = cosmosSat((marineLayer + coastFog * 0.75) * wx.cover);
  wx.streetWeight = cosmosSat(wx.cover * (0.35 + length(wx.wind) * 0.55) * (1.0 - wx.precip * 0.45));
  wx.squallWeight = cosmosSat(wx.precip * 1.25 + wx.instability * wx.cover * 0.35);
  wx.cirrusWeight = cosmosSat(wx.ice * 1.15 + wx.squallWeight * 0.38);
  return wx;
}

CosmosWeatherState cosmosSampleWeatherSphere(vec3 n){
  vec2 uv = cosmosSphereUv(n);
  CosmosWeatherState seedWx = cosmosSampleWeatherUv(uv);
  vec2 advected = uv + seedWx.wind * uWeatherAtlasStrength * 0.018;
  return cosmosSampleWeatherUv(vec2(fract(advected.x), clamp(advected.y, 0.001, 0.999)));
}

CosmosWeatherState cosmosSampleWeatherPlanar(vec3 p, float timeSeconds){
  vec2 uv = cosmosPlanarWeatherUv(p, timeSeconds);
  CosmosWeatherState seedWx = cosmosSampleWeatherUv(uv);
  vec2 advected = uv + seedWx.wind * uWeatherAtlasStrength * 0.028;
  return cosmosSampleWeatherUv(fract(advected));
}

float cosmosCloudRegimeMask(float hFrac, CosmosWeatherState wx, vec2 p2, float timeSeconds){
  float lowDeck = (1.0 - smoothstep(0.16, 0.36, hFrac)) * wx.stratusWeight;
  float midDeck = smoothstep(0.18, 0.36, hFrac) * (1.0 - smoothstep(0.52, 0.74, hFrac)) * (wx.cover * 0.55 + wx.squallWeight * 0.38 + wx.orographic * 0.25);
  float tower = (1.0 - smoothstep(0.12, 0.46, hFrac)) * wx.squallWeight;
  float anvil = smoothstep(0.50, 0.72, hFrac) * (1.0 - smoothstep(0.88, 1.0, hFrac)) * wx.squallWeight;
  float cirrus = smoothstep(0.58, 0.82, hFrac) * wx.cirrusWeight;

  vec2 dir = normalize(wx.wind + vec2(0.001, 0.0));
  vec2 perp = vec2(-dir.y, dir.x);
  float streakCoord = dot(p2 * 0.00035, perp) + dot(p2 * 0.00004, dir);
  float streak = smoothstep(0.30, 0.78, 0.5 + 0.5 * sin(streakCoord * 22.0 + timeSeconds * 0.03));
  float streets = streak * wx.streetWeight * (1.0 - smoothstep(0.36, 0.62, hFrac));

  float regime = max(max(lowDeck, midDeck), max(max(tower, anvil), max(cirrus, streets)));
  return cosmosSat(mix(wx.cover, regime, uCloudRegimeContrast));
}
`;

// Cosmos bathymetry atlas — RGBA contract:
//   R: normalized water depth, 0=land/shore, 1=abyss/hadal
//   G: continental shelf / shallow optical shelf
//   B: coastal influence / runup adjacency
//   A: land mask
// If no real atlas is present, the runtime supplies a deterministic procedural fallback.
export const BATHYMETRY_ATLAS_GLSL = `
uniform sampler2D uCosmosBathymetryAtlas;
uniform float uCosmosBathymetryReady;
uniform float uBathymetryStrength;
uniform float uShallowWaterOptics;
uniform float uCoastalFoamStrength;
uniform float uOneWaterOpticsStrength;

struct CosmosBathymetryState {
  float depth01;
  float shelf;
  float coast;
  float landMask;
  float depthMeters;
  float shallow;
  float abyss;
  float shoalEnergy;
};

CosmosBathymetryState cosmosSampleBathymetryUv(vec2 uv, CosmosWeatherState wx){
  vec4 raw = texture2D(uCosmosBathymetryAtlas, uv);
  float fallbackShelf = cosmosSat(wx.coast * (1.0 - wx.landMask) + wx.evaporation * (1.0 - wx.landMask) * 0.16);
  float fallbackDepth01 = cosmosSat(0.76 - fallbackShelf * 0.58 - wx.landMask * 0.84 + wx.leeShadow * 0.08);
  float fallbackCoast = cosmosSat(wx.coast + fallbackShelf * 0.45);

  float ready = cosmosSat(uCosmosBathymetryReady * uBathymetryStrength);
  CosmosBathymetryState b;
  b.depth01 = cosmosSat(mix(fallbackDepth01, raw.r, ready));
  b.shelf = cosmosSat(mix(fallbackShelf, max(raw.g, (1.0 - smoothstep(0.10, 0.42, b.depth01)) * (1.0 - raw.a)), ready));
  b.coast = cosmosSat(mix(fallbackCoast, max(raw.b, raw.g * 0.72), ready));
  b.landMask = cosmosSat(mix(wx.landMask, max(wx.landMask, raw.a), ready));
  b.depthMeters = mix(0.0, 11000.0, pow(b.depth01, 1.35)) * (1.0 - b.landMask);
  b.shallow = cosmosSat((1.0 - smoothstep(0.06, 0.48, b.depth01)) * (1.0 - b.landMask) + b.shelf * 0.68);
  b.abyss = smoothstep(0.70, 0.96, b.depth01) * (1.0 - b.landMask);
  b.shoalEnergy = cosmosSat((b.shelf * 0.72 + b.coast * 0.42) * (1.0 - b.landMask));
  return b;
}

CosmosBathymetryState cosmosSampleBathymetrySphere(vec3 n){
  vec2 uv = cosmosSphereUv(n);
  CosmosWeatherState wx = cosmosSampleWeatherUv(uv);
  return cosmosSampleBathymetryUv(uv, wx);
}

CosmosBathymetryState cosmosSampleBathymetryPlanar(vec3 p, float timeSeconds, CosmosWeatherState wx){
  vec2 uv = cosmosPlanarWeatherUv(p, timeSeconds * 0.17);
  return cosmosSampleBathymetryUv(uv, wx);
}
`;
