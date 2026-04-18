// ═══════════════════════════════════════════════════════════════════════════════
// SKY GLSL - Celestial system, atmospheric scattering, stars, sun/moon
// Depends on: SHARED_GLSL
// ═══════════════════════════════════════════════════════════════════════════════

export const SKY_UNIFORMS = `
uniform int uTimeOfDay;
uniform float uSunAzimuth;
uniform float uSunElevation;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform float uMoonIntensity;
uniform float uStarIntensity;
uniform float uDayNightCycleSpeed;
uniform bool uAutoTimeEnabled;

uniform vec3 uSkyZenithColor;
uniform vec3 uSkyHorizonColor;
uniform float uAtmosphereDensity;
uniform float uRayleighStrength;
uniform float uMieStrength;
uniform float uMieG;

// Weather uniforms needed by sky
uniform int uWeatherType;
uniform float uWeatherIntensity;
uniform float uWindSpeed;
uniform float uWindDirection;
`;

export const SKY_GLSL = `
// ═══════════════════════════════════════════════════════════════════════════
// CELESTIAL SYSTEM WITH AUTO DAY/NIGHT CYCLE
// ═══════════════════════════════════════════════════════════════════════════

float getAutoSunElevation() {
    if(!uAutoTimeEnabled) return uSunElevation;
    float cycleTime = iTime * uDayNightCycleSpeed * 0.01;
    return sin(cycleTime) * 0.5 + 0.1;
}

float getAutoSunAzimuth() {
    if(!uAutoTimeEnabled) return uSunAzimuth;
    float cycleTime = iTime * uDayNightCycleSpeed * 0.01;
    return mod(cycleTime * 0.3, TAU);
}

vec3 getSunDirection() {
    float azimuth = getAutoSunAzimuth();
    float elevation = getAutoSunElevation();
    return normalize(vec3(
        cos(elevation) * sin(azimuth),
        sin(elevation),
        cos(elevation) * cos(azimuth)
    ));
}

vec3 getMoonDirection() {
    return normalize(-getSunDirection() + vec3(0.2, 0.3, 0.1));
}

float getStars(vec3 rd) {
    if(rd.y < 0.0) return 0.0;
    
    float sunElev = getAutoSunElevation();
    float starVisibility = smoothstep(0.1, -0.1, sunElev);
    if(starVisibility <= 0.0) return 0.0;
    
    vec3 dir = rd.xzy;
    float theta = acos(dir.z);
    float width = PI / 20000.0;
    float level = floor((theta / PI) * 20000.0);
    float stars = 0.0;
    
    for(float l = -5.0; l <= 5.0; l++) {
        float level_ = clamp(level + l, 0.0, 19999.0);
        float theta_ = (level_ + 0.5) * width;
        
        if(sin(theta_) < hash12(vec2(theta_, 0.0))) continue;
        
        float rnd = hash11(PI + theta_);
        float phi_ = TAU * hash11(level_);
        
        vec3 starPos = vec3(sin(theta_) * cos(phi_), sin(theta_) * sin(phi_), cos(theta_));
        float dist = 0.5 + 0.5 * dot(starPos, dir);
        
        float glow = pow(rnd * 8e-7 / max(1.0 - dist, 5e-7), 2.9 + sin(rnd * 6.0 * iTime));
        stars += glow;
    }
    
    return stars * 0.05 * uStarIntensity * starVisibility;
}

vec3 getSunDisk(vec3 rd, vec3 sunDir) {
    float sunDot = dot(rd, sunDir);
    float disk = smoothstep(0.9997, 0.9999, sunDot);
    float corona = pow(saturate(sunDot), 256.0) * 2.0;
    corona += pow(saturate(sunDot), 8.0) * 0.5;
    // Apply atmospheric extinction so sun reddens at sunset and disappears below horizon
    vec3 sunLight = getSunLightAtSeaLevel(sunDir);
    return sunLight * (disk * 50.0 + corona);
}

vec3 getMoonDisk(vec3 rd, vec3 moonDir) {
    float moonDot = dot(rd, moonDir);
    if(moonDot < 0.999) return vec3(0.0);
    vec3 localPos = rd - moonDir * moonDot;
    float craters = 1.0 - worleyNoise(localPos * 500.0) * 0.3;
    float disk = smoothstep(0.999, 0.9995, moonDot);
    return vec3(0.9, 0.9, 0.85) * disk * craters * uMoonIntensity;
}

// ═══════════════════════════════════════════════════════════════════════════
// ATMOSPHERIC SCATTERING WITH DYNAMIC SKY
// ═══════════════════════════════════════════════════════════════════════════

float rayleighPhase(float cosTheta) {
    return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

float dualLobePhase(float cosTheta, float g1, float g2, float blend) {
    return mix(miePhase(cosTheta, g1), miePhase(cosTheta, g2), blend);
}

vec3 getSkyColor(vec3 rd, vec3 sunDir) {
    float sunDot = dot(rd, sunDir);
    float horizonFactor = 1.0 - pow(saturate(rd.y), 0.4);

    float sunElev = getAutoSunElevation();

    // Base zenith/horizon palette, modulated by sun elevation so it tracks dusk/dawn
    vec3 zenith = uSkyZenithColor;
    vec3 horizon = uSkyHorizonColor;
    float dayBlend = smoothstep(-0.05, 0.25, sunElev);
    zenith  = mix(vec3(0.005, 0.008, 0.025), zenith,  dayBlend);
    horizon = mix(vec3(0.04,  0.03,  0.06),  horizon, dayBlend);

    // Sunset / sunrise warm horizon driven by physical sun transmittance
    vec3 sunLight = getSunLightAtSeaLevel(sunDir);
    float sunsetBand = smoothstep(0.25, 0.0, abs(sunElev));
    // Reddened sun light bleeds along the horizon, strongest near sun azimuth
    float horizonAzimuth = pow(saturate(dot(normalize(vec3(rd.x, 0.0, rd.z)),
                                             normalize(vec3(sunDir.x, 0.0, sunDir.z)))), 4.0);
    horizon = mix(horizon, sunLight * 0.8 + vec3(0.4, 0.18, 0.06), sunsetBand * (0.3 + 0.7 * horizonAzimuth));

    vec3 skyColor = mix(zenith, horizon, horizonFactor);

    // Rayleigh inscatter (blue), modulated by transmitted sun (so it fades at night)
    float rayleigh = rayleighPhase(sunDot) * uRayleighStrength;
    vec3 rayleighColor = vec3(0.2, 0.4, 0.8) * rayleigh * (sunLight.b * 1.5 + 0.05);

    // Mie inscatter (white-ish near sun, tinted by transmittance)
    float mie = miePhase(sunDot, uMieG) * uMieStrength;
    vec3 mieColor = sunLight * mie;

    skyColor += rayleighColor + mieColor;

    if(uWeatherType > 0) {
        float darkening = uWeatherIntensity * 0.5;
        skyColor *= (1.0 - darkening);
        skyColor = mix(skyColor, vec3(0.4, 0.45, 0.5) * dayBlend, uWeatherIntensity * 0.3);
    }

    return skyColor;
}
`;

export const SKY_DEFAULTS = {
  timeOfDay: 2,
  sunAzimuth: 0.3,
  sunElevation: 0.4,
  autoTimeEnabled: false,
  dayNightCycleSpeed: 1.0,
  skyZenithColor: [0.15, 0.35, 0.65] as [number, number, number],
  skyHorizonColor: [0.5, 0.65, 0.8] as [number, number, number],
  atmosphereDensity: 1.0,
  rayleighStrength: 1.0,
  mieStrength: 0.5,
  mieG: 0.8,
  moonIntensity: 0.5,
  starIntensity: 1.0,
  weatherType: 0,
  weatherIntensity: 0,
  windSpeed: 0.5,
  windDirection: 0.5,
};
