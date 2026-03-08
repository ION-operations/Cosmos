import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Settings, X, Sun, Moon, Cloud, Waves, Mountain, Wind, 
  Sparkles, Pause, Play, RotateCcw, Maximize2, CloudRain, CloudSnow, Zap,
  Eye, EyeOff, TreePine, Droplets, Plane, Layers
} from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL EARTH ENGINE V4.0
// Complete WebGL Implementation with Vegetation, Day/Night Cycle, Underwater, WASD Controls, Layer System
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// VERTEX SHADER
// ─────────────────────────────────────────────────────────────────────────────
const VERTEX_SHADER = `
precision highp float;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = vec4(position, 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// MASTER FRAGMENT SHADER V4.0 - Complete Earth System with All Features
// ─────────────────────────────────────────────────────────────────────────────
const EARTH_FRAGMENT_SHADER = `
precision highp float;

// ═══════════════════════════════════════════════════════════════════════════
// UNIFORMS
// ═══════════════════════════════════════════════════════════════════════════

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform sampler2D blueNoise;
uniform sampler2D previousFrame;
uniform int iFrame;

// Camera
uniform vec3 uCameraPos;
uniform float uCameraYaw;
uniform float uCameraPitch;
uniform float uCameraFOV;

// Celestial
uniform int uTimeOfDay;
uniform float uSunAzimuth;
uniform float uSunElevation;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform float uMoonIntensity;
uniform float uStarIntensity;
uniform float uDayNightCycleSpeed;
uniform bool uAutoTimeEnabled;

// Atmosphere
uniform vec3 uSkyZenithColor;
uniform vec3 uSkyHorizonColor;
uniform float uAtmosphereDensity;
uniform float uRayleighStrength;
uniform float uMieStrength;
uniform float uMieG;

// Clouds
uniform float uCloudCoverage;
uniform float uCloudDensity;
uniform float uCloudScale;
uniform float uCloudDetailScale;
uniform float uCloudSpeed;
uniform float uCloudHeight;
uniform float uCloudThickness;
uniform float uCloudLightAbsorption;
uniform float uCloudAmbient;
uniform float uCloudSilverLining;
uniform float uCloudPowder;
uniform int uCloudSteps;
uniform int uCloudLightSteps;

// Terrain
uniform float uTerrainScale;
uniform float uTerrainHeight;
uniform float uMountainHeight;
uniform float uMountainSharpness;
uniform vec3 uGrassColor;
uniform vec3 uRockColor;
uniform vec3 uSnowColor;
uniform vec3 uSandColor;
uniform float uSnowLine;
uniform float uTreeLine;
uniform float uBeachWidth;
uniform float uErosionStrength;

// Vegetation
uniform float uVegetationDensity;
uniform float uTreeHeight;
uniform float uGrassHeight;
uniform float uWindStrength;
uniform vec3 uTreeColor;
uniform vec3 uFlowerColors[4];

// Ocean - GPT Waves V7
uniform float uOceanLevel;
uniform vec3 uOceanColor;
uniform vec3 uOceanDeepColor;
uniform float uWaveHeight;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uOceanFresnel;
uniform float uOceanRoughness;
uniform float uFoamIntensity;
uniform float uCausticsIntensity;
uniform float uBubbleIntensity;
uniform float uSSSIntensity;

// Underwater
uniform float uUnderwaterFogDensity;
uniform vec3 uUnderwaterFogColor;
uniform float uUnderwaterCausticsStrength;
uniform float uUnderwaterGodRayStrength;
uniform float uUnderwaterBubbleCount;

// Fog
uniform float uFogDensity;
uniform float uFogHeight;
uniform vec3 uFogColor;

// God Rays
uniform float uGodRayIntensity;
uniform float uGodRayDecay;
uniform int uGodRaySteps;

// Weather System
uniform int uWeatherType;
uniform float uWeatherIntensity;
uniform float uWindSpeed;
uniform float uWindDirection;
uniform float uLightningIntensity;
uniform float uLightningTime;

// Post-Processing
uniform float uTAAStrength;
uniform float uBloomIntensity;
uniform float uBloomThreshold;
uniform float uExposure;
uniform float uSaturation;
uniform float uVignetteStrength;
uniform float uChromaticAberration;

// Quality
uniform float uRenderScale;

// Layer Visibility
uniform bool uShowSky;
uniform bool uShowClouds;
uniform bool uShowTerrain;
uniform bool uShowOcean;
uniform bool uShowVegetation;
uniform bool uShowWeather;
uniform bool uShowFog;
uniform bool uShowGodRays;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

#define PI 3.14159265359
#define TAU 6.28318530718
#define EPSILON 0.0001

const float CLOUD_EXTENT = 50000.0;
const float EARTH_RADIUS = 6371000.0;
const float goldenRatio = 1.61803398875;

varying vec2 vUv;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec3 saturate3(vec3 x) { return clamp(x, 0.0, 1.0); }

float remap(float x, float a, float b, float c, float d) {
    return c + (x - a) * (d - c) / (b - a);
}

float smootherstep(float edge0, float edge1, float x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

mat2 rot2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

// ═══════════════════════════════════════════════════════════════════════════
// HASH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
}

vec3 hash3v(vec3 p) {
    p = mod(p, 289.0);
    float n = mod((p.x * 17.0 + p.y) * 17.0 + p.z, 289.0);
    n = mod((n * 34.0 + 1.0) * n, 289.0);
    vec3 k = mod(floor(n / vec3(1.0, 7.0, 49.0)), 7.0) * 2.0 - 1.0;
    return normalize(k + 0.0001);
}

// ═══════════════════════════════════════════════════════════════════════════
// NOISE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

vec3 quintic(vec3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float gradientNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = quintic(f);
    
    return mix(
        mix(mix(dot(hash3v(i + vec3(0,0,0)), f - vec3(0,0,0)),
                dot(hash3v(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
            mix(dot(hash3v(i + vec3(0,1,0)), f - vec3(0,1,0)),
                dot(hash3v(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
        mix(mix(dot(hash3v(i + vec3(0,0,1)), f - vec3(0,0,1)),
                dot(hash3v(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
            mix(dot(hash3v(i + vec3(0,1,1)), f - vec3(0,1,1)),
                dot(hash3v(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
}

float valueNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(mix(hash13(i + vec3(0,0,0)), hash13(i + vec3(1,0,0)), f.x),
            mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
            mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}

float worleyNoise(vec3 p) {
    vec3 n = floor(p);
    vec3 f = fract(p);
    float d = 1.0;
    
    for(int k = -1; k <= 1; k++) {
        for(int j = -1; j <= 1; j++) {
            for(int i = -1; i <= 1; i++) {
                vec3 g = vec3(float(i), float(j), float(k));
                vec3 o = hash33(n + g);
                vec3 r = g + o - f;
                d = min(d, dot(r, r));
            }
        }
    }
    
    return 1.0 - sqrt(d);
}

float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 8; i++) {
        if(i >= octaves) break;
        value += amplitude * gradientNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

float ridgedFbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float prev = 1.0;
    
    for(int i = 0; i < 8; i++) {
        if(i >= octaves) break;
        float n = abs(gradientNoise(p * frequency));
        n = 1.0 - n;
        n = n * n;
        value += amplitude * n * prev;
        prev = n;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

float perlinWorley(vec3 p, int octaves) {
    float perlin = fbm(p, octaves);
    float worley = worleyNoise(p * 4.0);
    return remap(perlin, worley - 1.0, 1.0, 0.0, 1.0);
}

float warpedNoise(vec3 p, float strength, int octaves) {
    vec3 q = vec3(
        fbm(p, 3),
        fbm(p + vec3(5.2, 1.3, 2.8), 3),
        fbm(p + vec3(1.7, 9.2, 3.1), 3)
    );
    return fbm(p + strength * q, octaves);
}

vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    
    float px0 = gradientNoise(p - dx);
    float px1 = gradientNoise(p + dx);
    float py0 = gradientNoise(p - dy);
    float py1 = gradientNoise(p + dy);
    float pz0 = gradientNoise(p - dz);
    float pz1 = gradientNoise(p + dz);
    
    return vec3(
        py1 - py0 - (pz1 - pz0),
        pz1 - pz0 - (px1 - px0),
        px1 - px0 - (py1 - py0)
    ) / (2.0 * e);
}

// ═══════════════════════════════════════════════════════════════════════════
// RAY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

vec3 getRayDirection(vec2 uv, vec3 camPos, vec3 lookAt, float fov) {
    vec3 forward = normalize(lookAt - camPos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    
    float aspectRatio = iResolution.x / iResolution.y;
    float fovScale = tan(radians(fov) * 0.5);
    
    vec2 screenPos = (uv * 2.0 - 1.0) * vec2(aspectRatio, 1.0) * fovScale;
    
    return normalize(forward + right * screenPos.x + up * screenPos.y);
}

vec2 rayBoxIntersect(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax) {
    vec3 invRd = 1.0 / rd;
    vec3 t0 = (boxMin - ro) * invRd;
    vec3 t1 = (boxMax - ro) * invRd;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float dstA = max(max(tmin.x, tmin.y), tmin.z);
    float dstB = min(min(tmax.x, tmax.y), tmax.z);
    float dstToBox = max(0.0, dstA);
    float dstInsideBox = max(0.0, dstB - dstToBox);
    return vec2(dstToBox, dstInsideBox);
}

float raySphereIntersect(vec3 ro, vec3 rd, vec3 center, float radius) {
    vec3 oc = ro - center;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - radius * radius;
    float h = b * b - c;
    if(h < 0.0) return -1.0;
    return -b - sqrt(h);
}

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
    
    for(float l = -10.0; l <= 10.0; l++) {
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
    return uSunColor * (disk * 50.0 + corona) * uSunIntensity;
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
    
    // Dynamic sky colors based on sun position
    float sunElev = getAutoSunElevation();
    vec3 zenith = uSkyZenithColor;
    vec3 horizon = uSkyHorizonColor;
    
    // Transition colors based on time of day
    if(sunElev < 0.1) {
        float t = smoothstep(-0.2, 0.1, sunElev);
        zenith = mix(vec3(0.02, 0.03, 0.08), zenith, t);
        horizon = mix(vec3(0.1, 0.05, 0.15), horizon, t);
        
        // Sunset/sunrise colors
        if(sunElev > -0.1 && sunElev < 0.1) {
            vec3 sunsetColor = vec3(1.0, 0.4, 0.1);
            float sunsetBlend = 1.0 - abs(sunElev) * 10.0;
            horizon = mix(horizon, sunsetColor, sunsetBlend * 0.7);
        }
    }
    
    vec3 skyColor = mix(zenith, horizon, horizonFactor);
    
    float rayleigh = rayleighPhase(sunDot) * uRayleighStrength;
    vec3 rayleighColor = vec3(0.2, 0.4, 0.8) * rayleigh;
    
    float mie = miePhase(sunDot, uMieG) * uMieStrength;
    vec3 mieColor = uSunColor * mie;
    
    skyColor += rayleighColor + mieColor;
    
    // Weather darkening
    if(uWeatherType > 0) {
        float darkening = uWeatherIntensity * 0.5;
        skyColor *= (1.0 - darkening);
        skyColor = mix(skyColor, vec3(0.4, 0.45, 0.5), uWeatherIntensity * 0.3);
    }
    
    return skyColor;
}

// ═══════════════════════════════════════════════════════════════════════════
// VOLUMETRIC CLOUDS
// ═══════════════════════════════════════════════════════════════════════════

float getCloudHeightGradient(float y, float cloudBase, float cloudTop) {
    float h = (y - cloudBase) / (cloudTop - cloudBase);
    if(h < 0.0 || h > 1.0) return 0.0;
    
    float bottomFade = smoothstep(0.0, 0.1, h);
    float topFade = smoothstep(1.0, 0.85, h);
    float roundBottom = pow(bottomFade, 0.5);
    float puffyTop = topFade * (1.0 - pow(h, 2.0) * 0.5);
    
    return roundBottom * puffyTop;
}

float getCloudEdgeFade(vec3 p, float extent) {
    vec2 edgeCoord = (p.xz + extent) / (extent * 2.0);
    return smoothstep(0.0, 0.1, edgeCoord.x) *
           smoothstep(1.0, 0.9, edgeCoord.x) *
           smoothstep(0.0, 0.1, edgeCoord.y) *
           smoothstep(1.0, 0.9, edgeCoord.y);
}

float sampleCloudDensity(vec3 p, bool cheap) {
    float cloudBase = uCloudHeight;
    float cloudTop = uCloudHeight + uCloudThickness;
    
    float heightGrad = getCloudHeightGradient(p.y, cloudBase, cloudTop);
    if(heightGrad <= 0.0) return 0.0;
    
    float edgeFade = getCloudEdgeFade(p, CLOUD_EXTENT);
    if(edgeFade <= 0.0) return 0.0;
    
    vec3 windOffset = vec3(
        cos(uWindDirection) * uWindSpeed * iTime * 10.0,
        0.0,
        sin(uWindDirection) * uWindSpeed * iTime * 10.0
    );
    
    vec3 shapeCoord = (p + windOffset) * uCloudScale * 0.0001 + vec3(iTime * uCloudSpeed * 0.002, 0.0, 0.0);
    
    float shape = perlinWorley(shapeCoord, 4);
    
    float weatherCoverage = uCloudCoverage;
    if(uWeatherType > 0) {
        weatherCoverage = mix(uCloudCoverage, 0.9, uWeatherIntensity);
    }
    
    float density = remap(shape * heightGrad, 1.0 - weatherCoverage, 1.0, 0.0, 1.0);
    density = saturate(density);
    
    if(cheap || density <= 0.0) {
        return density * edgeFade * uCloudDensity;
    }
    
    vec3 detailCoord = (p + windOffset) * uCloudDetailScale * 0.001 + vec3(iTime * uCloudSpeed * 0.004, 0.0, 0.0);
    float detail = fbm(detailCoord, 3) * 0.3;
    
    density = remap(density, detail, 1.0, 0.0, 1.0);
    density = saturate(density);
    
    return density * edgeFade * uCloudDensity;
}

float cloudLightMarch(vec3 pos, vec3 lightDir) {
    float stepSize = uCloudThickness * 0.5 / float(uCloudLightSteps);
    float totalDensity = 0.0;
    vec3 rayPos = pos;
    
    for(int i = 0; i < 16; i++) {
        if(i >= uCloudLightSteps) break;
        rayPos += lightDir * stepSize;
        totalDensity += sampleCloudDensity(rayPos, true) * stepSize;
    }
    
    return exp(-totalDensity * uCloudLightAbsorption);
}

float beerPowder(float depth) {
    float beer = exp(-depth);
    float powder = 1.0 - exp(-depth * 2.0);
    return beer * mix(1.0, powder, uCloudPowder);
}

vec3 cloudScattering(vec3 pos, vec3 rd, float density, vec3 sunDir, vec3 lightColor) {
    float lightTransmit = cloudLightMarch(pos, sunDir);
    
    float cosTheta = dot(rd, sunDir);
    float phase = dualLobePhase(cosTheta, 0.8, -0.5, 0.2);
    
    vec3 ambient = vec3(0.5, 0.6, 0.7) * uCloudAmbient;
    vec3 direct = lightColor * lightTransmit * phase;
    
    float silverLining = pow(1.0 - abs(cosTheta), 8.0) * uCloudSilverLining;
    vec3 silver = lightColor * silverLining * lightTransmit;
    
    if(uWeatherType == 3 && uLightningIntensity > 0.0) {
        float lightning = uLightningIntensity * exp(-abs(iTime - uLightningTime) * 10.0);
        ambient += vec3(1.0) * lightning * 5.0;
    }
    
    return ambient + direct + silver;
}

vec4 raymarchClouds(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor) {
    if(!uShowClouds) return vec4(0.0);
    
    float cloudBase = uCloudHeight;
    float cloudTop = uCloudHeight + uCloudThickness;
    
    vec3 cloudMin = vec3(-CLOUD_EXTENT, cloudBase, -CLOUD_EXTENT);
    vec3 cloudMax = vec3(CLOUD_EXTENT, cloudTop, CLOUD_EXTENT);
    
    vec2 boxHit = rayBoxIntersect(ro, rd, cloudMin, cloudMax);
    if(boxHit.y <= 0.0) return vec4(0.0);
    
    float noise = texture2D(blueNoise, gl_FragCoord.xy / 128.0).r;
    noise = fract(noise + goldenRatio * float(iFrame % 100));
    
    float stepSize = boxHit.y / float(uCloudSteps);
    float t = boxHit.x + stepSize * noise;
    
    vec3 totalLight = vec3(0.0);
    float totalTransmittance = 1.0;
    
    for(int i = 0; i < 128; i++) {
        if(i >= uCloudSteps) break;
        if(totalTransmittance < 0.01) break;
        
        vec3 pos = ro + rd * t;
        
        if(pos.y >= cloudBase && pos.y <= cloudTop) {
            float density = sampleCloudDensity(pos, false);
            
            if(density > 0.001) {
                vec3 luminance = cloudScattering(pos, rd, density, sunDir, lightColor);
                
                float stepTransmit = exp(-density * stepSize);
                vec3 scatter = luminance * (1.0 - stepTransmit);
                
                totalLight += totalTransmittance * scatter;
                totalTransmittance *= stepTransmit;
            }
        }
        
        t += stepSize;
        if(t > boxHit.x + boxHit.y) break;
    }
    
    return vec4(totalLight, 1.0 - totalTransmittance);
}

float sampleCloudShadow(vec3 worldPos, vec3 sunDir) {
    if(!uShowClouds) return 1.0;
    
    float cloudBase = uCloudHeight;
    float cloudTop = uCloudHeight + uCloudThickness;
    
    vec3 cloudMin = vec3(-CLOUD_EXTENT, cloudBase, -CLOUD_EXTENT);
    vec3 cloudMax = vec3(CLOUD_EXTENT, cloudTop, CLOUD_EXTENT);
    
    vec2 boxHit = rayBoxIntersect(worldPos, sunDir, cloudMin, cloudMax);
    if(boxHit.y <= 0.0) return 1.0;
    
    float stepSize = boxHit.y / 8.0;
    float t = boxHit.x;
    float totalDensity = 0.0;
    
    for(int i = 0; i < 8; i++) {
        vec3 pos = worldPos + sunDir * t;
        totalDensity += sampleCloudDensity(pos, true) * stepSize;
        t += stepSize;
    }
    
    return exp(-totalDensity * 0.5);
}

// ═══════════════════════════════════════════════════════════════════════════
// TERRAIN SYSTEM WITH EROSION
// ═══════════════════════════════════════════════════════════════════════════

float getTerrainHeight(vec2 p) {
    vec2 pos = p * uTerrainScale * 0.001;
    
    // Large-scale continent shape
    float continent = fbm(vec3(pos * 0.3 + 7.3, 0.0), 3) * 0.5 + 0.5;
    continent = smoothstep(0.25, 0.65, continent);
    
    // Mountain ridges
    float mountains = ridgedFbm(vec3(pos * 1.5 + 3.7, 0.5), 5);
    mountains = pow(mountains, uMountainSharpness) * uMountainHeight;
    
    // Rolling hills
    float hills = fbm(vec3(pos * 3.0 + 11.1, 1.0), 4) * uTerrainHeight * 0.4;
    
    // Fine detail
    float detail = fbm(vec3(pos * 12.0 + 5.5, 2.0), 3) * uTerrainHeight * 0.08;
    
    // Domain-warped variation for organic look
    float warp = warpedNoise(vec3(pos * 2.0, 0.3), 0.5, 3) * uTerrainHeight * 0.2;
    
    float erosion = 0.0;
    if(uErosionStrength > 0.0) {
        vec3 erosionNoise = curlNoise(vec3(pos * 5.0, 0.0));
        erosion = (erosionNoise.x + erosionNoise.y) * uErosionStrength * 80.0;
        
        float valleys = pow(1.0 - abs(gradientNoise(vec3(pos * 2.0, 0.5))), 3.0);
        erosion += valleys * uErosionStrength * 150.0;
    }
    
    float height = continent * (mountains + hills + detail + warp - erosion);
    height += uOceanLevel;
    
    return height;
}

vec3 getTerrainNormal(vec2 p, float height) {
    float e = 10.0;
    float hL = getTerrainHeight(p - vec2(e, 0.0));
    float hR = getTerrainHeight(p + vec2(e, 0.0));
    float hD = getTerrainHeight(p - vec2(0.0, e));
    float hU = getTerrainHeight(p + vec2(0.0, e));
    
    return normalize(vec3(hL - hR, 2.0 * e, hD - hU));
}

vec4 getTerrainMaterial(vec3 worldPos, vec3 normal, float height) {
    float slope = 1.0 - normal.y;
    float relativeHeight = height - uOceanLevel;
    
    float beachFactor = smoothstep(0.0, uBeachWidth, relativeHeight) * 
                        smoothstep(uBeachWidth * 2.0, uBeachWidth, relativeHeight);
    
    float grassFactor = smoothstep(uBeachWidth, uBeachWidth * 2.0, relativeHeight) *
                        smoothstep(uTreeLine, uTreeLine * 0.8, relativeHeight) *
                        smoothstep(0.5, 0.3, slope);
    
    float rockFactor = smoothstep(0.3, 0.6, slope) +
                       smoothstep(uTreeLine * 0.8, uTreeLine, relativeHeight);
    rockFactor = saturate(rockFactor);
    
    float snowFactor = smoothstep(uSnowLine * 0.9, uSnowLine, relativeHeight) *
                       smoothstep(0.7, 0.4, slope);
    
    if(uWeatherType == 2) {
        snowFactor = mix(snowFactor, 1.0, uWeatherIntensity * (1.0 - slope));
    }
    
    float wetness = 0.0;
    if(uWeatherType == 1 || uWeatherType == 3) {
        wetness = uWeatherIntensity * 0.5;
    }
    
    vec3 color = uSandColor * beachFactor;
    color = mix(color, uGrassColor, grassFactor);
    color = mix(color, uRockColor, rockFactor);
    color = mix(color, uSnowColor, snowFactor);
    
    float variation = fbm(worldPos * 0.1, 3) * 0.2 + 0.9;
    color *= variation;
    
    color *= (1.0 - wetness * 0.3);
    
    return vec4(color, 1.0);
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURAL VEGETATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

float getWindOffset(vec3 pos, float height) {
    float windTime = iTime * 2.0 + pos.x * 0.1 + pos.z * 0.15;
    float windNoise = sin(windTime) * 0.5 + sin(windTime * 2.3) * 0.3 + sin(windTime * 3.7) * 0.2;
    
    // Height-based sway (more at top)
    float swayAmount = height * uWindStrength * (uWindSpeed + 0.5);
    
    return windNoise * swayAmount;
}

// Billboard tree rendering
vec4 renderTree(vec3 ro, vec3 rd, vec3 treePos, float treeHeight, float treeWidth, vec3 sunDir, vec3 lightColor) {
    // Calculate billboard facing
    vec3 treeCenter = treePos + vec3(0.0, treeHeight * 0.5, 0.0);
    vec3 toCamera = normalize(ro - treeCenter);
    
    // Wind sway
    float windOffset = getWindOffset(treePos, 1.0);
    treeCenter.x += windOffset * treeHeight * 0.1;
    
    // Ray-quad intersection for billboard
    vec3 normal = vec3(toCamera.x, 0.0, toCamera.z);
    normal = normalize(normal);
    
    float d = dot(treePos - ro, normal) / dot(rd, normal);
    if(d < 0.0) return vec4(0.0);
    
    vec3 hitPos = ro + rd * d;
    vec3 localPos = hitPos - treePos;
    
    // Check bounds
    float halfWidth = treeWidth * 0.5;
    float localX = dot(localPos, normalize(vec3(-normal.z, 0.0, normal.x)));
    
    if(abs(localX) > halfWidth || localPos.y < 0.0 || localPos.y > treeHeight) {
        return vec4(0.0);
    }
    
    // Tree shape (cone + trunk)
    float relY = localPos.y / treeHeight;
    float trunkHeight = 0.2;
    float expectedWidth;
    
    if(relY < trunkHeight) {
        expectedWidth = treeWidth * 0.1;
    } else {
        float coneProgress = (relY - trunkHeight) / (1.0 - trunkHeight);
        expectedWidth = treeWidth * 0.5 * (1.0 - coneProgress * 0.8);
    }
    
    if(abs(localX) > expectedWidth) {
        return vec4(0.0);
    }
    
    // Color
    vec3 color;
    if(relY < trunkHeight) {
        color = vec3(0.3, 0.2, 0.1); // Trunk
    } else {
        color = uTreeColor;
        // Add variation
        float variation = hash12(treePos.xz) * 0.3 + 0.7;
        color *= variation;
        
        // Wind highlight
        color += vec3(0.1, 0.15, 0.05) * abs(windOffset);
    }
    
    // Lighting
    float NdotL = max(0.3, dot(vec3(0.0, 1.0, 0.0), sunDir));
    float cloudShadow = sampleCloudShadow(hitPos, sunDir);
    color *= lightColor * NdotL * cloudShadow * 0.5 + 0.5;
    
    return vec4(color, d);
}

// Grass blade rendering
float renderGrass(vec3 worldPos, vec3 normal, vec3 sunDir, vec3 lightColor, inout vec3 grassColor) {
    if(!uShowVegetation) return 0.0;
    
    float relHeight = worldPos.y - uOceanLevel;
    if(relHeight < uBeachWidth || relHeight > uTreeLine * 0.9) return 0.0;
    if(normal.y < 0.7) return 0.0; // Too steep
    
    vec2 gridPos = worldPos.xz * 0.5;
    vec2 cellId = floor(gridPos);
    vec2 cellUV = fract(gridPos);
    
    float density = hash12(cellId) * uVegetationDensity;
    if(density < 0.3) return 0.0;
    
    // Grass blade position within cell
    vec2 bladePos = hash22(cellId) * 0.8 + 0.1;
    float dist = length(cellUV - bladePos);
    
    if(dist > 0.15) return 0.0;
    
    // Grass height with wind
    float height = uGrassHeight * (0.6 + hash12(cellId + 0.5) * 0.4);
    float windSway = getWindOffset(worldPos, height * 0.01);
    
    // Color with variation
    float colorVar = hash12(cellId + 1.0);
    grassColor = mix(uGrassColor, uGrassColor * 1.3, colorVar);
    grassColor = mix(grassColor, vec3(0.4, 0.35, 0.1), colorVar * 0.3); // Yellow tips
    
    // Add flowers
    if(hash12(cellId + 2.0) > 0.85 && uVegetationDensity > 0.5) {
        int flowerType = int(hash12(cellId + 3.0) * 4.0);
        grassColor = mix(grassColor, uFlowerColors[flowerType], 0.6);
    }
    
    // Lighting
    float NdotL = max(0.4, dot(normal, sunDir));
    float cloudShadow = sampleCloudShadow(worldPos, sunDir);
    grassColor *= lightColor * NdotL * cloudShadow * 0.6 + 0.4;
    
    return smoothstep(0.15, 0.0, dist) * (1.0 - abs(windSway) * 0.3);
}

// Render vegetation for terrain
vec4 renderVegetation(vec3 ro, vec3 rd, vec3 terrainHit, vec3 terrainNormal, float terrainHeight, vec3 sunDir, vec3 lightColor) {
    if(!uShowVegetation) return vec4(0.0);
    
    float relHeight = terrainHeight - uOceanLevel;
    if(relHeight < uBeachWidth || relHeight > uTreeLine) return vec4(0.0);
    
    vec4 result = vec4(0.0);
    
    // Check for trees in nearby cells
    vec2 gridPos = terrainHit.xz * 0.01;
    
    for(int x = -2; x <= 2; x++) {
        for(int z = -2; z <= 2; z++) {
            vec2 cellId = floor(gridPos) + vec2(float(x), float(z));
            
            float treeDensity = hash12(cellId * 7.31) * uVegetationDensity;
            if(treeDensity < 0.6) continue;
            
            // Tree position
            vec2 treeXZ = (cellId + hash22(cellId * 3.14) * 0.8 + 0.1) * 100.0;
            float treeY = getTerrainHeight(treeXZ);
            
            // Skip if underwater or too high
            float treeRelHeight = treeY - uOceanLevel;
            if(treeRelHeight < uBeachWidth * 2.0 || treeRelHeight > uTreeLine * 0.8) continue;
            
            vec3 treePos = vec3(treeXZ.x, treeY, treeXZ.y);
            float treeHeight = uTreeHeight * (0.7 + hash12(cellId * 5.0) * 0.6);
            float treeWidth = treeHeight * 0.4;
            
            vec4 tree = renderTree(ro, rd, treePos, treeHeight, treeWidth, sunDir, lightColor);
            
            if(tree.a > 0.0 && (result.a <= 0.0 || tree.a < result.a)) {
                result = tree;
            }
        }
    }
    
    return result;
}

vec4 raymarchTerrain(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor, out float hitDist) {
    hitDist = -1.0;
    if(!uShowTerrain) return vec4(0.0);
    
    // Only march if ray could potentially hit ground
    if(rd.y > 0.1 && ro.y > uMountainHeight + uOceanLevel + 500.0) return vec4(0.0);
    
    float t = 0.0;
    float maxDist = 80000.0;
    float lastH = 0.0;
    float lastY = 0.0;
    
    for(int i = 0; i < 300; i++) {
        vec3 pos = ro + rd * t;
        
        float terrainHeight = getTerrainHeight(pos.xz);
        float distToTerrain = pos.y - terrainHeight;
        
        if(distToTerrain < 0.5) {
            // Binary search refinement for precision
            float tLow = t - max(1.0, abs(lastY - lastH) * 0.3);
            float tHigh = t;
            for(int j = 0; j < 6; j++) {
                float tMid = (tLow + tHigh) * 0.5;
                vec3 midPos = ro + rd * tMid;
                float midH = getTerrainHeight(midPos.xz);
                if(midPos.y < midH) {
                    tHigh = tMid;
                } else {
                    tLow = tMid;
                }
            }
            t = (tLow + tHigh) * 0.5;
            pos = ro + rd * t;
            terrainHeight = getTerrainHeight(pos.xz);
            
            hitDist = t;
            
            vec3 normal = getTerrainNormal(pos.xz, terrainHeight);
            vec4 material = getTerrainMaterial(pos, normal, terrainHeight);
            
            // Add grass overlay
            vec3 grassColor;
            float grassAmount = renderGrass(pos, normal, sunDir, lightColor, grassColor);
            if(grassAmount > 0.0) {
                material.rgb = mix(material.rgb, grassColor, grassAmount * 0.5);
            }
            
            float NdotL = max(0.0, dot(normal, sunDir));
            float cloudShadow = sampleCloudShadow(pos, sunDir);
            
            float lightningFlash = 0.0;
            if(uWeatherType == 3 && uLightningIntensity > 0.0) {
                lightningFlash = uLightningIntensity * exp(-abs(iTime - uLightningTime) * 10.0);
            }
            
            vec3 ambient = material.rgb * 0.25;
            vec3 diffuse = material.rgb * lightColor * NdotL * cloudShadow;
            vec3 lightning = material.rgb * lightningFlash * 3.0;
            
            // Distance-based ambient boost (atmosphere effect)
            float distFade = saturate(t / maxDist);
            vec3 color = ambient + diffuse + lightning;
            
            return vec4(color, 1.0);
        }
        
        lastH = terrainHeight;
        lastY = pos.y;
        
        // Adaptive step size: smaller near terrain, larger far away
        float stepScale = max(0.3, distToTerrain * 0.4);
        t += max(0.5, min(stepScale, 200.0 + t * 0.01));
        
        if(t > maxDist) break;
    }
    
    return vec4(0.0);
}

// ═══════════════════════════════════════════════════════════════════════════
// HYPER-REALISTIC RAYMARCHED OCEAN (TDM Seascape Methodology)
// Domain-warped FBM with rotation between octaves - zero grid artifacts
// ═══════════════════════════════════════════════════════════════════════════

// Octave rotation matrix - breaks grid alignment between FBM layers
const mat2 octave_m = mat2(1.6, 1.2, -1.2, 1.6);

// 2D noise for ocean domain warping
float oceanNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(hash12(i + vec2(0.0, 0.0)), hash12(i + vec2(1.0, 0.0)), u.x),
        mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
        u.y
    ) * 2.0 - 1.0;
}

// Core sea octave - domain warped sine waves with choppiness control
// This is the key to avoiding grid patterns: noise(uv) warps the sampling domain
float sea_octave(vec2 uv, float choppy) {
    uv += vec2(oceanNoise(uv), oceanNoise(uv + 7.3)); // Domain warping!
    vec2 wv = 1.0 - abs(sin(uv));
    vec2 swv = abs(cos(uv));
    wv = mix(wv, swv, wv); // Blend for sharper crests
    return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);
}

// Ocean height map - FBM of sea_octave with rotation between octaves
float oceanMap(vec3 p, int iterations) {
    float SEA_FREQ = uWaveFrequency * 0.16;
    float SEA_HEIGHT = uWaveHeight * 0.6;
    float SEA_CHOPPY = 4.0 + uOceanRoughness * 4.0;
    float SEA_TIME = iTime * uWaveSpeed * 0.8;
    
    float freq = SEA_FREQ;
    float amp = SEA_HEIGHT;
    float choppy = SEA_CHOPPY;
    vec2 uv = p.xz;
    uv.x *= 0.75; // Aspect ratio correction to avoid square patterns
    
    // Wind influence on wave direction
    float windAngle = uWindDirection;
    mat2 windRot = mat2(cos(windAngle), -sin(windAngle), sin(windAngle), cos(windAngle));
    uv = windRot * uv;
    
    float d, h = 0.0;
    for(int i = 0; i < 8; i++) {
        if(i >= iterations) break;
        
        // Two opposing wave directions for standing wave patterns
        d = sea_octave((uv + SEA_TIME) * freq, choppy);
        d += sea_octave((uv - SEA_TIME) * freq, choppy);
        
        h += d * amp;
        
        // Rotate UV between octaves - THIS breaks all grid patterns
        uv = octave_m * uv;
        
        freq *= 1.9;   // Frequency increase
        amp *= 0.22;    // Amplitude decrease (energy cascade)
        choppy = mix(choppy, 1.0, 0.2); // Reduce choppiness at small scales
    }
    
    // Storm extra energy
    if(uWeatherType == 3) {
        float stormWave = sea_octave(p.xz * 0.05 + SEA_TIME * 0.5, 2.0);
        h += stormWave * uWeatherIntensity * uWaveHeight * 1.5;
    }
    
    return p.y - h;
}

// Detailed height map for normal calculation (more octaves)
float oceanMapDetailed(vec3 p) {
    return oceanMap(p, 8);
}

// Coarse height map for raymarching (fewer octaves = faster)
float oceanMapCoarse(vec3 p) {
    return oceanMap(p, 5);
}

// Height-map tracing - finds exact ocean surface intersection
float heightMapTracing(vec3 ori, vec3 dir, out vec3 hitPoint) {
    float tm = 0.0;
    float tx = 2000.0;
    
    // Find rough bounds
    float hx = oceanMapCoarse(ori + dir * tx);
    if(hx > 0.0) {
        hitPoint = ori + dir * tx;
        return tx;
    }
    
    float hm = oceanMapCoarse(ori + dir * tm);
    float tmid = 0.0;
    
    for(int i = 0; i < 8; i++) {
        tmid = mix(tm, tx, hm / (hm - hx));
        hitPoint = ori + dir * tmid;
        float hmid = oceanMapCoarse(hitPoint);
        
        if(hmid < 0.0) {
            tx = tmid;
            hx = hmid;
        } else {
            tm = tmid;
            hm = hmid;
        }
    }
    
    return tmid;
}

// Compute ocean normal from height field
vec3 getOceanNormal(vec3 p, float eps) {
    vec3 n;
    n.y = oceanMapDetailed(p);
    n.x = oceanMapDetailed(vec3(p.x + eps, p.y, p.z)) - n.y;
    n.z = oceanMapDetailed(vec3(p.x, p.y, p.z + eps)) - n.y;
    n.y = eps;
    return normalize(n);
}

float getCaustics(vec3 worldPos, float time) {
    vec2 uv1 = worldPos.xz * 0.04 + vec2(time * 0.3, time * 0.2);
    vec2 uv2 = worldPos.xz * 0.06 + vec2(-time * 0.25, time * 0.35);
    vec2 uv3 = worldPos.xz * 0.1 + vec2(time * 0.15, -time * 0.2);
    
    float c1 = sin(uv1.x * 8.0) * sin(uv1.y * 8.0 + 0.5);
    float c2 = sin(uv2.x * 12.0 + 1.0) * sin(uv2.y * 12.0);
    float c3 = worleyNoise(vec3(uv3 * 2.0, time * 0.3)) * 0.6;
    
    float caustic = (c1 + c2) * 0.3 + c3;
    caustic = pow(caustic * 0.5 + 0.5, 2.0);
    
    return caustic;
}

float getBubbles(vec3 worldPos, float time) {
    vec3 bubblePos = worldPos * vec3(0.1, 0.2, 0.1);
    bubblePos.y += time * 2.0;
    
    float bubbles = 0.0;
    for(float i = 0.0; i < 3.0; i++) {
        vec3 offset = vec3(i * 1.7, i * 2.3, i * 1.1);
        float bubble = worleyNoise(bubblePos * (1.0 + i * 0.3) + offset);
        bubble = pow(bubble, 4.0);
        bubbles += bubble;
    }
    
    return saturate(bubbles * uBubbleIntensity);
}

vec3 getOceanSSS(vec3 viewDir, vec3 normal, vec3 sunDir, vec3 oceanColor) {
    float sss = pow(saturate(dot(viewDir, -sunDir + normal * 0.3)), 4.0);
    vec3 sssColor = oceanColor * 2.0 + vec3(0.0, 0.1, 0.1);
    return sssColor * sss * uSSSIntensity;
}

float getFoam(vec3 displacement, vec2 pos, float time) {
    float heightFoam = pow(saturate(displacement.y * 1.5 - 0.3), 1.5);
    
    float foamNoise = fbm(vec3(pos * 0.08 + time * 0.1, time * 0.3), 3);
    float turbulentFoam = pow(saturate(foamNoise), 3.0) * 0.3;
    
    float breakingFoam = 0.0;
    if(uWeatherType == 3) {
        float noise = fbm(vec3(pos * 0.05 + time * 0.2, time * 0.5), 4);
        breakingFoam = pow(noise * 0.5 + 0.5, 2.0) * uWeatherIntensity * 0.8;
    }
    
    float windAngle = uWindDirection;
    vec2 windDir = vec2(cos(windAngle), sin(windAngle));
    float streak = sin(dot(pos, windDir) * 0.3 + time * 0.5) * 0.5 + 0.5;
    streak *= fbm(vec3(pos * 0.15, time * 0.2), 2) * uWindSpeed * 0.3;
    
    return saturate((heightFoam + turbulentFoam + breakingFoam + streak) * uFoamIntensity);
}

// Diffuse + specular ocean shading
vec3 getOceanColor(vec3 p, vec3 n, vec3 sunDir, vec3 lightColor, vec3 eye, float dist) {
    // Fresnel - Schlick approximation
    float fresnel = clamp(1.0 - dot(n, -eye), 0.0, 1.0);
    fresnel = pow(fresnel, 3.0) * 0.5;
    fresnel = mix(uOceanFresnel, 1.0, fresnel);
    
    // Reflection
    vec3 reflected = getSkyColor(reflect(eye, n), sunDir);
    
    // Refraction / water body color
    float depth = saturate(dist * 0.002);
    vec3 refracted = mix(uOceanColor, uOceanDeepColor, depth);
    
    // Subsurface scattering through wave crests
    vec3 sssColor = uOceanColor * 1.5 + vec3(0.0, 0.05, 0.05);
    float sss = pow(saturate(dot(eye, sunDir + n * 0.3)), 4.0) * uSSSIntensity;
    refracted += sssColor * sss;
    
    // Caustics on shallow areas
    float caustics = getCaustics(p, iTime) * uCausticsIntensity;
    refracted += caustics * 0.15 * lightColor;
    
    // Bubbles
    float bubbles = getBubbles(p, iTime);
    refracted = mix(refracted, vec3(0.9, 0.95, 1.0), bubbles);
    
    // Combine reflection and refraction
    vec3 color = mix(refracted, reflected, fresnel);
    
    // Specular highlight (Blinn-Phong)
    vec3 halfDir = normalize(sunDir - eye);
    float spec = pow(max(dot(n, halfDir), 0.0), 256.0) * uSunIntensity;
    color += lightColor * spec * 2.0;
    
    // Foam - wave height based + wind streaks
    float foamAmount = getFoam(vec3(0.0, oceanMapDetailed(p) + p.y, 0.0), p.xz, iTime);
    color = mix(color, vec3(1.0), foamAmount);
    
    // Cloud shadows
    float cloudShadow = sampleCloudShadow(p, sunDir);
    color *= mix(0.5, 1.0, cloudShadow);
    
    // Atmospheric distance fade
    float atten = max(1.0 - dist * dist * 0.000001, 0.0);
    color = mix(getSkyColor(eye, sunDir), color, atten);
    
    return color;
}

// ═══════════════════════════════════════════════════════════════════════════
// UNDERWATER RENDERING - GPT WAVES V7 STYLE
// ═══════════════════════════════════════════════════════════════════════════

vec4 renderUnderwater(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor) {
    float underwaterGodRays = 0.0;
    if(uUnderwaterGodRayStrength > 0.0) {
        float raySteps = 16.0;
        float stepSize = 50.0;
        float decay = 1.0;
        
        for(float i = 0.0; i < raySteps; i++) {
            vec3 samplePos = ro + rd * i * stepSize;
            if(samplePos.y > uOceanLevel) break;
            
            float surfaceT = (uOceanLevel - samplePos.y) / max(0.1, sunDir.y);
            vec3 surfacePos = samplePos + sunDir * surfaceT;
            float caustic = getCaustics(surfacePos, iTime);
            
            float depth = uOceanLevel - samplePos.y;
            float attenuation = exp(-depth * uUnderwaterFogDensity * 0.01);
            
            underwaterGodRays += caustic * attenuation * decay;
            decay *= 0.9;
        }
    }
    
    float depth = uOceanLevel - ro.y;
    float surfaceT = (uOceanLevel - ro.y) / max(0.1, sunDir.y);
    vec3 surfacePos = ro + sunDir * surfaceT;
    float caustics = getCaustics(surfacePos, iTime) * uUnderwaterCausticsStrength;
    
    float fogFactor = 1.0 - exp(-depth * uUnderwaterFogDensity * 0.005);
    vec3 underwaterFog = uUnderwaterFogColor * (1.0 + caustics * 0.5);
    
    float bubbles = 0.0;
    if(uUnderwaterBubbleCount > 0.0) {
        for(float i = 0.0; i < 5.0; i++) {
            vec3 bubbleStream = ro + rd * (10.0 + i * 20.0);
            vec2 bubbleUV = bubbleStream.xz * 0.1 + vec2(i * 3.7, i * 2.3);
            vec2 cellId = floor(bubbleUV);
            
            float rise = mod(iTime * (0.5 + hash12(cellId) * 0.5) + hash12(cellId + 1.0) * 10.0, 10.0);
            vec2 bubblePos = hash22(cellId) * 0.8 + 0.1;
            bubblePos.y = rise;
            
            float dist = length(fract(bubbleUV) - bubblePos);
            float bubbleRadius = 0.02 + hash12(cellId + 2.0) * 0.03;
            bubbles += smoothstep(bubbleRadius, bubbleRadius * 0.5, dist) * (1.0 - rise * 0.1);
        }
        bubbles *= uUnderwaterBubbleCount * 0.1;
    }
    
    vec3 underwaterColor = underwaterFog;
    underwaterColor += lightColor * underwaterGodRays * uUnderwaterGodRayStrength * 0.5;
    underwaterColor += vec3(0.9, 0.95, 1.0) * bubbles;
    
    return vec4(underwaterColor, fogFactor);
}

// Main ocean render function using height-map raytracing
vec4 renderOcean(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor, vec3 skyColor, float terrainDist) {
    if(!uShowOcean) return vec4(0.0);
    
    bool isUnderwater = ro.y < uOceanLevel;
    
    if(isUnderwater) {
        // Underwater: simple plane intersection for surface from below
        float t = (uOceanLevel - ro.y) / rd.y;
        if(t < 0.0) {
            vec4 underwater = renderUnderwater(ro, rd, sunDir, lightColor);
            return vec4(underwater.rgb, underwater.a + 0.5);
        }
        
        vec3 hitPos = ro + rd * t;
        vec3 normal = -getOceanNormal(hitPos, 0.1);
        vec3 viewDir = -rd;
        
        vec3 refraction = mix(uOceanColor, uOceanDeepColor, 0.5);
        float caustics = getCaustics(hitPos, iTime) * uCausticsIntensity;
        refraction += caustics * lightColor * 0.3;
        
        vec4 underwater = renderUnderwater(ro, rd, sunDir, lightColor);
        vec3 oceanColor = mix(refraction, underwater.rgb, underwater.a * 0.5);
        
        return vec4(oceanColor, t);
    }
    
    // Above water: raymarch the height field for proper wave geometry
    // Only trace if looking somewhat downward toward ocean
    if(rd.y > 0.3) return vec4(0.0);
    
    vec3 hitPoint;
    float t = heightMapTracing(ro, rd, hitPoint);
    
    if(t > 1999.0) return vec4(0.0);
    if(terrainDist > 0.0 && t > terrainDist) return vec4(0.0);
    
    // Get normal with distance-adaptive epsilon
    float eps = max(0.01, t * 0.002);
    vec3 normal = getOceanNormal(hitPoint, eps);
    
    // Full PBR ocean shading
    vec3 oceanColor = getOceanColor(hitPoint, normal, sunDir, lightColor, rd, t);
    
    return vec4(oceanColor, t);
}

// ═══════════════════════════════════════════════════════════════════════════
// WEATHER PARTICLES
// ═══════════════════════════════════════════════════════════════════════════

vec3 renderRain(vec2 uv, vec3 baseColor) {
    if(!uShowWeather || uWeatherType != 1) return baseColor;
    
    float rainIntensity = uWeatherIntensity;
    vec3 rainColor = vec3(0.0);
    float rainAlpha = 0.0;
    
    for(float layer = 0.0; layer < 3.0; layer++) {
        float layerScale = 1.0 + layer * 0.5;
        float layerSpeed = 10.0 + layer * 5.0;
        float layerAlpha = (1.0 - layer * 0.3) * 0.5;
        
        vec2 rainUV = uv * vec2(100.0 * layerScale, 40.0 * layerScale);
        
        rainUV.y -= iTime * layerSpeed;
        rainUV.x += sin(iTime * 0.5 + layer) * 0.5;
        rainUV.x += iTime * uWindSpeed * 3.0;
        
        vec2 cellId = floor(rainUV);
        vec2 cellUV = fract(rainUV);
        
        float rand = hash12(cellId);
        
        if(rand < rainIntensity * 0.8) {
            float dropX = hash12(cellId + 0.1) * 0.8 + 0.1;
            float dropLen = 0.1 + rand * 0.15;
            
            float dist = abs(cellUV.x - dropX);
            float drop = smoothstep(0.02, 0.0, dist) * smoothstep(0.0, dropLen, cellUV.y) * smoothstep(dropLen + 0.1, dropLen, cellUV.y);
            
            rainAlpha += drop * layerAlpha * rainIntensity;
        }
    }
    
    rainColor = vec3(0.7, 0.75, 0.85);
    
    return mix(baseColor, rainColor, saturate(rainAlpha));
}

vec3 renderSnow(vec2 uv, vec3 baseColor) {
    if(!uShowWeather || uWeatherType != 2) return baseColor;
    
    vec3 snowColor = vec3(0.0);
    float snowAlpha = 0.0;
    
    for(float layer = 0.0; layer < 4.0; layer++) {
        float layerScale = 1.0 + layer * 0.3;
        float layerSpeed = 0.5 + layer * 0.2;
        float layerAlpha = (1.0 - layer * 0.2) * 0.4;
        
        vec2 snowUV = uv * vec2(50.0 * layerScale);
        
        snowUV.y -= iTime * layerSpeed;
        snowUV.x += sin(iTime * 0.5 + layer) * 0.3 + iTime * uWindSpeed * 2.0;
        snowUV.x += sin(snowUV.y * 2.0 + layer * 1.5) * 0.1;
        
        vec2 cellId = floor(snowUV);
        vec2 cellUV = fract(snowUV);
        
        float rand = hash12(cellId);
        
        if(rand < uWeatherIntensity * 0.6) {
            vec2 flakePos = hash22(cellId) * 0.6 + 0.2;
            float flakeSize = 0.02 + rand * 0.03;
            
            float dist = length(cellUV - flakePos);
            float flake = smoothstep(flakeSize, flakeSize * 0.5, dist);
            
            snowAlpha += flake * layerAlpha * uWeatherIntensity;
        }
    }
    
    snowColor = vec3(0.95, 0.97, 1.0);
    
    return mix(baseColor, snowColor, saturate(snowAlpha));
}

vec3 renderLightning(vec2 uv, vec3 baseColor) {
    if(!uShowWeather || uWeatherType != 3 || uLightningIntensity <= 0.0) return baseColor;
    
    float timeSinceLightning = abs(iTime - uLightningTime);
    float flash = exp(-timeSinceLightning * 8.0) * uLightningIntensity;
    
    baseColor += vec3(0.8, 0.85, 1.0) * flash * 0.3;
    
    if(timeSinceLightning < 0.3) {
        float boltX = hash11(floor(uLightningTime * 10.0)) * 0.6 + 0.2;
        float boltWidth = 0.01 + flash * 0.02;
        
        float distToBolt = abs(uv.x - boltX);
        
        float y = uv.y;
        float jag = 0.0;
        for(float i = 0.0; i < 5.0; i++) {
            jag += sin(y * 20.0 * (1.0 + i)) * 0.02 / (1.0 + i);
        }
        distToBolt = abs(uv.x - boltX + jag);
        
        if(uv.y > 0.3 && uv.y < 0.9) {
            float bolt = exp(-distToBolt * 100.0) * flash * 5.0;
            bolt *= smoothstep(0.3, 0.5, uv.y) * smoothstep(0.9, 0.7, uv.y);
            
            baseColor += vec3(0.9, 0.95, 1.0) * bolt;
        }
    }
    
    return baseColor;
}

// ═══════════════════════════════════════════════════════════════════════════
// VOLUMETRIC FOG
// ═══════════════════════════════════════════════════════════════════════════

vec3 applyFog(vec3 color, vec3 ro, vec3 rd, float dist, vec3 sunDir, vec3 lightColor) {
    if(!uShowFog || uFogDensity <= 0.0) return color;
    
    float fogAmount = 1.0 - exp(-dist * uFogDensity * 0.0001);
    
    if(uWeatherType > 0) {
        fogAmount = mix(fogAmount, 0.5, uWeatherIntensity * 0.3);
    }
    
    float sunAmount = pow(saturate(dot(rd, sunDir)), 8.0);
    vec3 fogCol = mix(uFogColor, lightColor, sunAmount * 0.5);
    
    if(uWeatherType == 1 || uWeatherType == 3) {
        fogCol = mix(fogCol, vec3(0.4, 0.45, 0.5), uWeatherIntensity * 0.3);
    }
    
    return mix(color, fogCol, fogAmount);
}

// ═══════════════════════════════════════════════════════════════════════════
// GOD RAYS
// ═══════════════════════════════════════════════════════════════════════════

float calculateGodRays(vec3 ro, vec3 rd, vec3 sunDir, float sceneDepth) {
    if(!uShowGodRays || uGodRayIntensity <= 0.0) return 0.0;
    
    float godRays = 0.0;
    float stepSize = min(sceneDepth, 5000.0) / float(uGodRaySteps);
    float decay = 1.0;
    
    for(int i = 0; i < 32; i++) {
        if(i >= uGodRaySteps) break;
        
        vec3 pos = ro + rd * (float(i) * stepSize);
        float cloudOcclusion = sampleCloudShadow(pos, sunDir);
        
        float scatter = (1.0 - cloudOcclusion) * decay;
        float sunDot = max(0.0, dot(normalize(pos - ro), sunDir));
        godRays += scatter * pow(sunDot, 4.0);
        
        decay *= uGodRayDecay;
    }
    
    return godRays * uGodRayIntensity * 0.1;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST-PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

vec3 applyTAA(vec3 currentColor, vec2 uv) {
    if(uTAAStrength <= 0.0) return currentColor;
    
    vec3 prevColor = texture2D(previousFrame, uv).rgb;
    
    return mix(currentColor, prevColor, uTAAStrength * 0.1);
}

vec3 extractBrightness(vec3 color) {
    float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return color * smoothstep(uBloomThreshold, uBloomThreshold + 0.5, brightness);
}

vec3 applyBloom(vec3 color, vec2 uv) {
    if(uBloomIntensity <= 0.0) return color;
    
    vec3 bloom = vec3(0.0);
    float total = 0.0;
    
    for(float x = -4.0; x <= 4.0; x++) {
        for(float y = -4.0; y <= 4.0; y++) {
            vec2 offset = vec2(x, y) / iResolution * 4.0;
            float weight = exp(-(x*x + y*y) / 8.0);
            
            vec2 sampleUV = uv + offset;
            if(sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
                bloom += extractBrightness(color) * weight;
                total += weight;
            }
        }
    }
    
    bloom /= total;
    
    return color + bloom * uBloomIntensity;
}

vec3 applyColorGrading(vec3 color) {
    color *= uExposure;
    
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, uSaturation);
    
    if(uVignetteStrength > 0.0) {
        vec2 vigUV = vUv * 2.0 - 1.0;
        float vig = 1.0 - dot(vigUV, vigUV) * uVignetteStrength * 0.5;
        color *= vig;
    }
    
    // ACES tone mapping
    color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
    
    return saturate3(color);
}

vec3 applyChromaticAberration(vec3 color, vec2 uv) {
    if(uChromaticAberration <= 0.0) return color;
    
    vec2 dir = (uv - 0.5) * uChromaticAberration * 0.01;
    
    float edgeDist = length(uv - 0.5);
    float aberration = edgeDist * uChromaticAberration * 0.02;
    
    color.r *= 1.0 + aberration;
    color.b *= 1.0 - aberration;
    
    return color;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RENDERING
// ═══════════════════════════════════════════════════════════════════════════

void main() {
    vec2 uv = vUv;
    
    vec3 ro = uCameraPos;
    
    // Calculate look direction from yaw and pitch
    float yaw = uCameraYaw;
    float pitch = uCameraPitch;
    pitch = clamp(pitch, -PI * 0.45, PI * 0.45);
    
    vec3 lookDir = vec3(
        cos(pitch) * sin(yaw),
        sin(pitch),
        cos(pitch) * cos(yaw)
    );
    
    vec3 rd = getRayDirection(uv, ro, ro + lookDir, uCameraFOV);
    
    vec3 sunDir = getSunDirection();
    vec3 moonDir = getMoonDirection();
    
    // Dynamic light color based on sun position
    float sunElev = getAutoSunElevation();
    vec3 lightColor = uSunColor * uSunIntensity;
    
    if(sunElev < 0.0) {
        // Night time
        lightColor = vec3(0.3, 0.35, 0.5) * uMoonIntensity;
    } else if(sunElev < 0.1) {
        // Sunrise/sunset
        float t = sunElev / 0.1;
        vec3 sunsetColor = vec3(1.0, 0.5, 0.2) * uSunIntensity;
        lightColor = mix(vec3(0.3, 0.35, 0.5) * uMoonIntensity, sunsetColor, t);
    }
    
    if(uWeatherType > 0) {
        lightColor *= (1.0 - uWeatherIntensity * 0.4);
    }
    
    // Check if underwater
    bool isUnderwater = ro.y < uOceanLevel;
    
    vec3 finalColor = vec3(0.0);
    float sceneDepth = 100000.0;
    
    // ─────────────────────────────────────────────────────────────────────
    // RENDER SKY
    // ─────────────────────────────────────────────────────────────────────
    if(uShowSky) {
        vec3 skyColor = getSkyColor(rd, sunDir);
        
        if(sunElev < 0.1 && uWeatherType == 0) {
            skyColor += vec3(getStars(rd));
        }
        
        if(uWeatherType == 0) {
            skyColor += getSunDisk(rd, sunDir);
            if(sunElev < 0.0) {
                skyColor += getMoonDisk(rd, moonDir);
            }
        }
        
        finalColor = skyColor;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // RENDER TERRAIN
    // ─────────────────────────────────────────────────────────────────────
    float terrainDist;
    vec4 terrain = raymarchTerrain(ro, rd, sunDir, lightColor, terrainDist);
    
    if(terrainDist > 0.0) {
        finalColor = terrain.rgb;
        sceneDepth = terrainDist;
        
        // Render vegetation on terrain
        vec3 terrainHit = ro + rd * terrainDist;
        vec3 terrainNormal = getTerrainNormal(terrainHit.xz, getTerrainHeight(terrainHit.xz));
        vec4 vegetation = renderVegetation(ro, rd, terrainHit, terrainNormal, getTerrainHeight(terrainHit.xz), sunDir, lightColor);
        
        if(vegetation.a > 0.0 && vegetation.a < terrainDist) {
            finalColor = vegetation.rgb;
            sceneDepth = vegetation.a;
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // RENDER OCEAN
    // ─────────────────────────────────────────────────────────────────────
    vec4 ocean = renderOcean(ro, rd, sunDir, lightColor, finalColor, terrainDist);
    
    if(ocean.a > 0.0 && (terrainDist < 0.0 || ocean.a < terrainDist)) {
        finalColor = ocean.rgb;
        sceneDepth = ocean.a;
    }
    
    // If underwater and no surface hit, apply underwater fog
    if(isUnderwater && ocean.a <= 0.0) {
        vec4 underwater = renderUnderwater(ro, rd, sunDir, lightColor);
        finalColor = mix(finalColor, underwater.rgb, underwater.a);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // RENDER CLOUDS
    // ─────────────────────────────────────────────────────────────────────
    if(!isUnderwater) {
        vec4 clouds = raymarchClouds(ro, rd, sunDir, lightColor);
        finalColor = mix(finalColor, clouds.rgb, clouds.a);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // VOLUMETRIC FOG
    // ─────────────────────────────────────────────────────────────────────
    if(!isUnderwater) {
        finalColor = applyFog(finalColor, ro, rd, sceneDepth, sunDir, lightColor);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // GOD RAYS
    // ─────────────────────────────────────────────────────────────────────
    if(!isUnderwater) {
        float godRays = calculateGodRays(ro, rd, sunDir, sceneDepth);
        finalColor += lightColor * godRays;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // WEATHER PARTICLES
    // ─────────────────────────────────────────────────────────────────────
    if(!isUnderwater) {
        finalColor = renderRain(uv, finalColor);
        finalColor = renderSnow(uv, finalColor);
        finalColor = renderLightning(uv, finalColor);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // POST-PROCESSING
    // ─────────────────────────────────────────────────────────────────────
    finalColor = applyTAA(finalColor, uv);
    finalColor = applyBloom(finalColor, uv);
    finalColor = applyChromaticAberration(finalColor, uv);
    finalColor = applyColorGrading(finalColor);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// BLUE NOISE TEXTURE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function createBlueNoiseTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    
    let value = 0;
    for (let o = 0; o < 4; o++) {
      const freq = Math.pow(2, o);
      value += Math.sin(x * freq * 0.1 + y * freq * 0.13) * 
               Math.cos(y * freq * 0.11 - x * freq * 0.09) / Math.pow(2, o);
    }
    value = (value + 1) * 0.5;
    value = (value + Math.random() * 0.5) * 0.5;
    
    const byte = Math.floor(value * 255);
    data[i * 4] = byte;
    data[i * 4 + 1] = byte;
    data[i * 4 + 2] = byte;
    data[i * 4 + 3] = 255;
  }
  
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  
  return texture;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER VISIBILITY SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
interface LayerVisibility {
  sky: boolean;
  clouds: boolean;
  terrain: boolean;
  ocean: boolean;
  vegetation: boolean;
  weather: boolean;
  fog: boolean;
  godRays: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  // Time
  timeOfDay: 2,
  sunAzimuth: 0.3,
  sunElevation: 0.4,
  autoTimeEnabled: false,
  dayNightCycleSpeed: 1.0,
  
  // Camera
  cameraHeight: 200,
  cameraFOV: 75,
  cameraYaw: 0,
  cameraPitch: 0,
  cameraSpeed: 100,
  
  // Atmosphere
  skyZenithColor: [0.15, 0.35, 0.65] as [number, number, number],
  skyHorizonColor: [0.5, 0.65, 0.8] as [number, number, number],
  atmosphereDensity: 1.0,
  rayleighStrength: 1.0,
  mieStrength: 0.5,
  mieG: 0.8,
  moonIntensity: 0.5,
  starIntensity: 1.0,
  
  // Clouds
  cloudCoverage: 0.5,
  cloudDensity: 0.05,
  cloudScale: 1.0,
  cloudDetailScale: 3.0,
  cloudSpeed: 0.5,
  cloudHeight: 1500,
  cloudThickness: 1500,
  cloudLightAbsorption: 0.5,
  cloudAmbient: 0.4,
  cloudSilverLining: 0.3,
  cloudPowder: 0.5,
  cloudSteps: 64,
  cloudLightSteps: 8,
  
  // Terrain
  terrainScale: 1.0,
  terrainHeight: 500,
  mountainHeight: 3000,
  mountainSharpness: 2.0,
  snowLine: 2500,
  treeLine: 2000,
  beachWidth: 50,
  erosionStrength: 0.3,
  grassColor: [0.2, 0.4, 0.1] as [number, number, number],
  rockColor: [0.4, 0.35, 0.3] as [number, number, number],
  snowColor: [0.95, 0.95, 1.0] as [number, number, number],
  sandColor: [0.8, 0.7, 0.5] as [number, number, number],
  
  // Vegetation
  vegetationDensity: 0.7,
  treeHeight: 30,
  grassHeight: 0.5,
  windStrength: 0.5,
  treeColor: [0.15, 0.35, 0.1] as [number, number, number],
  flowerColors: [
    [0.9, 0.3, 0.4] as [number, number, number],  // Red
    [0.9, 0.8, 0.2] as [number, number, number],  // Yellow
    [0.4, 0.3, 0.9] as [number, number, number],  // Purple
    [0.95, 0.95, 0.95] as [number, number, number], // White
  ],
  
  // Ocean
  oceanLevel: 0,
  oceanColor: [0.0, 0.3, 0.5] as [number, number, number],
  oceanDeepColor: [0.0, 0.1, 0.2] as [number, number, number],
  waveHeight: 2.0,
  waveFrequency: 1.0,
  waveSpeed: 1.0,
  oceanFresnel: 0.02,
  oceanRoughness: 0.3,
  foamIntensity: 0.5,
  causticsIntensity: 0.5,
  bubbleIntensity: 0.3,
  sssIntensity: 0.5,
  
  // Underwater
  underwaterFogDensity: 0.5,
  underwaterFogColor: [0.0, 0.2, 0.4] as [number, number, number],
  underwaterCausticsStrength: 1.0,
  underwaterGodRayStrength: 0.5,
  underwaterBubbleCount: 1.0,
  
  // Fog
  fogDensity: 0.5,
  fogHeight: 500,
  fogColor: [0.6, 0.65, 0.7] as [number, number, number],
  
  // God Rays
  godRayIntensity: 0.5,
  godRayDecay: 0.95,
  godRaySteps: 16,
  
  // Weather
  weatherType: 0,
  weatherIntensity: 0.7,
  windSpeed: 0.5,
  windDirection: 0.5,
  lightningIntensity: 1.0,
  
  // Post-Processing
  taaStrength: 0.3,
  bloomIntensity: 0.2,
  bloomThreshold: 0.8,
  exposure: 1.0,
  saturation: 1.1,
  vignetteStrength: 0.3,
  chromaticAberration: 0.5,
};

const DEFAULT_LAYERS: LayerVisibility = {
  sky: true,
  clouds: false, // Default to sky only (no clouds)
  terrain: false,
  ocean: false,
  vegetation: false,
  weather: false,
  fog: false,
  godRays: false,
};

type Settings = typeof DEFAULT_SETTINGS;

// ─────────────────────────────────────────────────────────────────────────────
// SLIDER SETTING COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface SliderSettingProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

const SliderSetting: React.FC<SliderSettingProps> = ({
  label, value, min, max, step, format, onChange
}) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-primary font-mono">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
      className="w-full"
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SETTING SECTION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3 pb-4 border-b border-border/30">
    <h4 className="text-sm font-semibold text-primary">{title}</h4>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LAYER TOGGLE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface LayerToggleProps {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const LayerToggle: React.FC<LayerToggleProps> = ({ label, icon, enabled, onChange }) => (
  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <Switch checked={enabled} onCheckedChange={onChange} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
// Check WebGL support
const isWebGLSupported = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
};

const ProceduralEarth: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const lightningTimeRef = useRef(0);
  
  // Camera state for WASD controls
  const cameraRef = useRef({
    pos: new THREE.Vector3(0, 200, 0),
    yaw: 0,
    pitch: 0,
    velocity: new THREE.Vector3(0, 0, 0),
  });
  const keysRef = useRef<Set<string>>(new Set());
  
  const [showSettings, setShowSettings] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [activeTab, setActiveTab] = useState('atmosphere');
  const [webglError, setWebglError] = useState<string | null>(null);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateLayer = useCallback(<K extends keyof LayerVisibility>(key: K, value: boolean) => {
    setLayers(prev => ({ ...prev, [key]: value }));
  }, []);

  // Enable all layers preset
  const enableAllLayers = useCallback(() => {
    setLayers({
      sky: true,
      clouds: true,
      terrain: true,
      ocean: true,
      vegetation: true,
      weather: true,
      fog: true,
      godRays: true,
    });
  }, []);

  // Sky only preset
  const skyOnlyLayers = useCallback(() => {
    setLayers(DEFAULT_LAYERS);
  }, []);

  // Initialize renderer
  useEffect(() => {
    if (!containerRef.current) return;

    // Check WebGL support first
    if (!isWebGLSupported()) {
      setWebglError('WebGL is not supported in this environment. Please try opening this page in a new browser tab or enable hardware acceleration.');
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        antialias: false, 
        powerPreference: 'high-performance',
        precision: 'highp',
        failIfMajorPerformanceCaveat: false
      });
    } catch (e) {
      setWebglError('Failed to create WebGL context. This may happen in sandboxed environments. Try opening in a new browser tab.');
      return;
    }
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const blueNoise = createBlueNoiseTexture();
    
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        iMouse: { value: new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.4) },
        iFrame: { value: 0 },
        blueNoise: { value: blueNoise },
        previousFrame: { value: renderTarget.texture },
        
        uCameraPos: { value: new THREE.Vector3(0, settings.cameraHeight, 0) },
        uCameraYaw: { value: 0 },
        uCameraPitch: { value: 0 },
        uCameraFOV: { value: settings.cameraFOV },
        
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
        
        uCloudCoverage: { value: settings.cloudCoverage },
        uCloudDensity: { value: settings.cloudDensity },
        uCloudScale: { value: settings.cloudScale },
        uCloudDetailScale: { value: settings.cloudDetailScale },
        uCloudSpeed: { value: settings.cloudSpeed },
        uCloudHeight: { value: settings.cloudHeight },
        uCloudThickness: { value: settings.cloudThickness },
        uCloudLightAbsorption: { value: settings.cloudLightAbsorption },
        uCloudAmbient: { value: settings.cloudAmbient },
        uCloudSilverLining: { value: settings.cloudSilverLining },
        uCloudPowder: { value: settings.cloudPowder },
        uCloudSteps: { value: settings.cloudSteps },
        uCloudLightSteps: { value: settings.cloudLightSteps },
        
        uTerrainScale: { value: settings.terrainScale },
        uTerrainHeight: { value: settings.terrainHeight },
        uMountainHeight: { value: settings.mountainHeight },
        uMountainSharpness: { value: settings.mountainSharpness },
        uSnowLine: { value: settings.snowLine },
        uTreeLine: { value: settings.treeLine },
        uBeachWidth: { value: settings.beachWidth },
        uErosionStrength: { value: settings.erosionStrength },
        uGrassColor: { value: new THREE.Color(...settings.grassColor) },
        uRockColor: { value: new THREE.Color(...settings.rockColor) },
        uSnowColor: { value: new THREE.Color(...settings.snowColor) },
        uSandColor: { value: new THREE.Color(...settings.sandColor) },
        
        uVegetationDensity: { value: settings.vegetationDensity },
        uTreeHeight: { value: settings.treeHeight },
        uGrassHeight: { value: settings.grassHeight },
        uWindStrength: { value: settings.windStrength },
        uTreeColor: { value: new THREE.Color(...settings.treeColor) },
        uFlowerColors: { value: settings.flowerColors.map(c => new THREE.Color(...c)) },
        
        uOceanLevel: { value: settings.oceanLevel },
        uOceanColor: { value: new THREE.Color(...settings.oceanColor) },
        uOceanDeepColor: { value: new THREE.Color(...settings.oceanDeepColor) },
        uWaveHeight: { value: settings.waveHeight },
        uWaveFrequency: { value: settings.waveFrequency },
        uWaveSpeed: { value: settings.waveSpeed },
        uOceanFresnel: { value: settings.oceanFresnel },
        uOceanRoughness: { value: settings.oceanRoughness },
        uFoamIntensity: { value: settings.foamIntensity },
        uCausticsIntensity: { value: settings.causticsIntensity },
        uBubbleIntensity: { value: settings.bubbleIntensity },
        uSSSIntensity: { value: settings.sssIntensity },
        
        uUnderwaterFogDensity: { value: settings.underwaterFogDensity },
        uUnderwaterFogColor: { value: new THREE.Color(...settings.underwaterFogColor) },
        uUnderwaterCausticsStrength: { value: settings.underwaterCausticsStrength },
        uUnderwaterGodRayStrength: { value: settings.underwaterGodRayStrength },
        uUnderwaterBubbleCount: { value: settings.underwaterBubbleCount },
        
        uFogDensity: { value: settings.fogDensity },
        uFogHeight: { value: settings.fogHeight },
        uFogColor: { value: new THREE.Color(...settings.fogColor) },
        
        uGodRayIntensity: { value: settings.godRayIntensity },
        uGodRayDecay: { value: settings.godRayDecay },
        uGodRaySteps: { value: settings.godRaySteps },
        
        uWeatherType: { value: settings.weatherType },
        uWeatherIntensity: { value: settings.weatherIntensity },
        uWindSpeed: { value: settings.windSpeed },
        uWindDirection: { value: settings.windDirection },
        uLightningIntensity: { value: settings.lightningIntensity },
        uLightningTime: { value: 0 },
        
        uTAAStrength: { value: settings.taaStrength },
        uBloomIntensity: { value: settings.bloomIntensity },
        uBloomThreshold: { value: settings.bloomThreshold },
        uExposure: { value: settings.exposure },
        uSaturation: { value: settings.saturation },
        uVignetteStrength: { value: settings.vignetteStrength },
        uChromaticAberration: { value: settings.chromaticAberration },
        
        uRenderScale: { value: 1.0 },
        
        // Layer visibility
        uShowSky: { value: true },
        uShowClouds: { value: false },
        uShowTerrain: { value: false },
        uShowOcean: { value: false },
        uShowVegetation: { value: false },
        uShowWeather: { value: false },
        uShowFog: { value: false },
        uShowGodRays: { value: false },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: EARTH_FRAGMENT_SHADER,
    });
    materialRef.current = material;

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // Mouse look controls
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        cameraRef.current.yaw += e.movementX * 0.002;
        cameraRef.current.pitch -= e.movementY * 0.002;
        cameraRef.current.pitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, cameraRef.current.pitch));
      }
    };

    const handleClick = () => {
      renderer.domElement.requestPointerLock();
    };

    // WASD keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const clock = new THREE.Clock();
    let lastTime = 0;
    
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      const time = clock.getElapsedTime();
      const deltaTime = time - lastTime;
      lastTime = time;
      
      if (!isPaused) {
        frameRef.current++;
        material.uniforms.iTime.value = time;
        material.uniforms.iFrame.value = frameRef.current;
        
        // WASD camera movement
        const keys = keysRef.current;
        const speed = settings.cameraSpeed * deltaTime;
        const cam = cameraRef.current;
        
        const forward = new THREE.Vector3(
          Math.cos(cam.pitch) * Math.sin(cam.yaw),
          Math.sin(cam.pitch),
          Math.cos(cam.pitch) * Math.cos(cam.yaw)
        );
        const right = new THREE.Vector3(
          Math.cos(cam.yaw),
          0,
          -Math.sin(cam.yaw)
        );
        const up = new THREE.Vector3(0, 1, 0);
        
        const moveDir = new THREE.Vector3(0, 0, 0);
        
        if (keys.has('w')) moveDir.add(forward);
        if (keys.has('s')) moveDir.sub(forward);
        if (keys.has('a')) moveDir.sub(right);
        if (keys.has('d')) moveDir.add(right);
        if (keys.has(' ')) moveDir.add(up);
        if (keys.has('shift')) moveDir.sub(up);
        
        if (moveDir.length() > 0) {
          moveDir.normalize();
          cam.velocity.lerp(moveDir.multiplyScalar(speed * 10), 0.1);
        } else {
          cam.velocity.multiplyScalar(0.9);
        }
        
        cam.pos.add(cam.velocity.clone().multiplyScalar(deltaTime));
        
        // Update camera uniforms
        material.uniforms.uCameraPos.value.copy(cam.pos);
        material.uniforms.uCameraYaw.value = cam.yaw;
        material.uniforms.uCameraPitch.value = cam.pitch;
        
        // Random lightning for storms
        if (settings.weatherType === 3 && Math.random() < 0.002) {
          lightningTimeRef.current = time;
          material.uniforms.uLightningTime.value = time;
          material.uniforms.uLightningIntensity.value = 0.8 + Math.random() * 0.2;
        }
      }
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      material.uniforms.iResolution.value.set(w, h);
      renderTarget.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // Update uniforms when settings change
  useEffect(() => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    
    u.uTimeOfDay.value = settings.timeOfDay;
    u.uSunAzimuth.value = settings.sunAzimuth * Math.PI * 2;
    u.uSunElevation.value = settings.sunElevation * Math.PI * 0.5;
    u.uMoonIntensity.value = settings.moonIntensity;
    u.uStarIntensity.value = settings.starIntensity;
    u.uAutoTimeEnabled.value = settings.autoTimeEnabled;
    u.uDayNightCycleSpeed.value = settings.dayNightCycleSpeed;
    
    u.uCameraFOV.value = settings.cameraFOV;
    
    u.uSkyZenithColor.value.setRGB(...settings.skyZenithColor);
    u.uSkyHorizonColor.value.setRGB(...settings.skyHorizonColor);
    u.uAtmosphereDensity.value = settings.atmosphereDensity;
    u.uRayleighStrength.value = settings.rayleighStrength;
    u.uMieStrength.value = settings.mieStrength;
    u.uMieG.value = settings.mieG;
    
    u.uCloudCoverage.value = settings.cloudCoverage;
    u.uCloudDensity.value = settings.cloudDensity;
    u.uCloudScale.value = settings.cloudScale;
    u.uCloudDetailScale.value = settings.cloudDetailScale;
    u.uCloudSpeed.value = settings.cloudSpeed;
    u.uCloudHeight.value = settings.cloudHeight;
    u.uCloudThickness.value = settings.cloudThickness;
    u.uCloudLightAbsorption.value = settings.cloudLightAbsorption;
    u.uCloudAmbient.value = settings.cloudAmbient;
    u.uCloudSilverLining.value = settings.cloudSilverLining;
    u.uCloudPowder.value = settings.cloudPowder;
    u.uCloudSteps.value = settings.cloudSteps;
    u.uCloudLightSteps.value = settings.cloudLightSteps;
    
    u.uTerrainScale.value = settings.terrainScale;
    u.uTerrainHeight.value = settings.terrainHeight;
    u.uMountainHeight.value = settings.mountainHeight;
    u.uMountainSharpness.value = settings.mountainSharpness;
    u.uSnowLine.value = settings.snowLine;
    u.uTreeLine.value = settings.treeLine;
    u.uBeachWidth.value = settings.beachWidth;
    u.uErosionStrength.value = settings.erosionStrength;
    u.uGrassColor.value.setRGB(...settings.grassColor);
    u.uRockColor.value.setRGB(...settings.rockColor);
    u.uSnowColor.value.setRGB(...settings.snowColor);
    u.uSandColor.value.setRGB(...settings.sandColor);
    
    u.uVegetationDensity.value = settings.vegetationDensity;
    u.uTreeHeight.value = settings.treeHeight;
    u.uGrassHeight.value = settings.grassHeight;
    u.uWindStrength.value = settings.windStrength;
    u.uTreeColor.value.setRGB(...settings.treeColor);
    
    u.uOceanLevel.value = settings.oceanLevel;
    u.uOceanColor.value.setRGB(...settings.oceanColor);
    u.uOceanDeepColor.value.setRGB(...settings.oceanDeepColor);
    u.uWaveHeight.value = settings.waveHeight;
    u.uWaveFrequency.value = settings.waveFrequency;
    u.uWaveSpeed.value = settings.waveSpeed;
    u.uOceanFresnel.value = settings.oceanFresnel;
    u.uOceanRoughness.value = settings.oceanRoughness;
    u.uFoamIntensity.value = settings.foamIntensity;
    u.uCausticsIntensity.value = settings.causticsIntensity;
    u.uBubbleIntensity.value = settings.bubbleIntensity;
    u.uSSSIntensity.value = settings.sssIntensity;
    
    u.uUnderwaterFogDensity.value = settings.underwaterFogDensity;
    u.uUnderwaterFogColor.value.setRGB(...settings.underwaterFogColor);
    u.uUnderwaterCausticsStrength.value = settings.underwaterCausticsStrength;
    u.uUnderwaterGodRayStrength.value = settings.underwaterGodRayStrength;
    u.uUnderwaterBubbleCount.value = settings.underwaterBubbleCount;
    
    u.uFogDensity.value = settings.fogDensity;
    u.uFogHeight.value = settings.fogHeight;
    u.uFogColor.value.setRGB(...settings.fogColor);
    
    u.uGodRayIntensity.value = settings.godRayIntensity;
    u.uGodRayDecay.value = settings.godRayDecay;
    u.uGodRaySteps.value = settings.godRaySteps;
    
    u.uWeatherType.value = settings.weatherType;
    u.uWeatherIntensity.value = settings.weatherIntensity;
    u.uWindSpeed.value = settings.windSpeed;
    u.uWindDirection.value = settings.windDirection;
    
    u.uTAAStrength.value = settings.taaStrength;
    u.uBloomIntensity.value = settings.bloomIntensity;
    u.uBloomThreshold.value = settings.bloomThreshold;
    u.uExposure.value = settings.exposure;
    u.uSaturation.value = settings.saturation;
    u.uVignetteStrength.value = settings.vignetteStrength;
    u.uChromaticAberration.value = settings.chromaticAberration;
  }, [settings]);

  // Update layer visibility uniforms
  useEffect(() => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    
    u.uShowSky.value = layers.sky;
    u.uShowClouds.value = layers.clouds;
    u.uShowTerrain.value = layers.terrain;
    u.uShowOcean.value = layers.ocean;
    u.uShowVegetation.value = layers.vegetation;
    u.uShowWeather.value = layers.weather;
    u.uShowFog.value = layers.fog;
    u.uShowGodRays.value = layers.godRays;
  }, [layers]);

  const setTimePreset = (preset: 'night' | 'sunrise' | 'day' | 'sunset') => {
    switch(preset) {
      case 'night':
        setSettings(prev => ({
          ...prev,
          timeOfDay: 0,
          sunElevation: -0.2,
          starIntensity: 1.5,
          moonIntensity: 0.8,
          skyZenithColor: [0.02, 0.03, 0.08] as [number, number, number],
          skyHorizonColor: [0.05, 0.08, 0.15] as [number, number, number],
        }));
        break;
      case 'sunrise':
        setSettings(prev => ({
          ...prev,
          timeOfDay: 1,
          sunElevation: 0.1,
          sunAzimuth: 0.25,
          starIntensity: 0.2,
          skyZenithColor: [0.15, 0.25, 0.5] as [number, number, number],
          skyHorizonColor: [0.9, 0.5, 0.3] as [number, number, number],
        }));
        break;
      case 'day':
        setSettings(prev => ({
          ...prev,
          timeOfDay: 2,
          sunElevation: 0.4,
          starIntensity: 0,
          skyZenithColor: [0.15, 0.35, 0.65] as [number, number, number],
          skyHorizonColor: [0.5, 0.65, 0.8] as [number, number, number],
        }));
        break;
      case 'sunset':
        setSettings(prev => ({
          ...prev,
          timeOfDay: 3,
          sunElevation: 0.08,
          sunAzimuth: 0.75,
          starIntensity: 0.3,
          skyZenithColor: [0.2, 0.25, 0.45] as [number, number, number],
          skyHorizonColor: [0.95, 0.4, 0.2] as [number, number, number],
        }));
        break;
    }
  };

  const setWeatherPreset = (weather: 'clear' | 'rain' | 'snow' | 'storm') => {
    switch(weather) {
      case 'clear':
        setSettings(prev => ({ ...prev, weatherType: 0, weatherIntensity: 0 }));
        break;
      case 'rain':
        setSettings(prev => ({ ...prev, weatherType: 1, weatherIntensity: 0.7, cloudCoverage: 0.8 }));
        break;
      case 'snow':
        setSettings(prev => ({ ...prev, weatherType: 2, weatherIntensity: 0.6, cloudCoverage: 0.7 }));
        break;
      case 'storm':
        setSettings(prev => ({ ...prev, weatherType: 3, weatherIntensity: 1.0, cloudCoverage: 0.95, windSpeed: 1.5 }));
        break;
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setLayers(DEFAULT_LAYERS);
    cameraRef.current = {
      pos: new THREE.Vector3(0, 200, 0),
      yaw: 0,
      pitch: 0,
      velocity: new THREE.Vector3(0, 0, 0),
    };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // WebGL error fallback
  if (webglError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-lg text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <Cloud className="w-12 h-12 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Procedural Earth V4</h1>
          <p className="text-lg text-cyan-400">WebGL Required</p>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <p className="text-slate-300 text-sm leading-relaxed">{webglError}</p>
          </div>
          <div className="space-y-3 text-left bg-slate-800/30 rounded-xl p-4">
            <p className="text-slate-400 text-sm font-medium">Try these solutions:</p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">1.</span>
                <span>Open this page directly in a <strong className="text-white">new browser tab</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">2.</span>
                <span>Enable <strong className="text-white">hardware acceleration</strong> in browser settings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">3.</span>
                <span>Try a different browser (Chrome, Firefox, Edge)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">4.</span>
                <span>Update your graphics drivers</span>
              </li>
            </ul>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />
      
      <AnimatedLogo />
      
      {/* Header */}
      <div className="absolute top-5 left-20 panel-glow backdrop-blur-xl rounded-xl p-4">
        <h1 className="text-xl font-bold text-primary text-glow">Procedural Earth V4</h1>
        <p className="text-xs text-muted-foreground">Vegetation • Day/Night • Underwater • WASD Flight</p>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-5 left-5 panel-glow backdrop-blur-xl rounded-xl p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Click</kbd> to enable flight</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">WASD</kbd> Move</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Space/Shift</kbd> Up/Down</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Mouse</kbd> Look</span>
        </div>
      </div>
      
      {/* Time presets */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-2">
        {(['night', 'sunrise', 'day', 'sunset'] as const).map((preset) => (
          <Button
            key={preset}
            size="sm"
            variant={
              (preset === 'night' && settings.timeOfDay === 0) ||
              (preset === 'sunrise' && settings.timeOfDay === 1) ||
              (preset === 'day' && settings.timeOfDay === 2) ||
              (preset === 'sunset' && settings.timeOfDay === 3)
                ? 'default'
                : 'outline'
            }
            onClick={() => setTimePreset(preset)}
            className="panel-glow backdrop-blur-sm capitalize"
          >
            {preset === 'night' ? <Moon className="w-4 h-4 mr-1" /> : <Sun className="w-4 h-4 mr-1" />}
            {preset}
          </Button>
        ))}
        
        {/* Auto time toggle */}
        <Button
          size="sm"
          variant={settings.autoTimeEnabled ? 'default' : 'outline'}
          onClick={() => updateSetting('autoTimeEnabled', !settings.autoTimeEnabled)}
          className="panel-glow backdrop-blur-sm"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Auto
        </Button>
      </div>
      
      {/* Weather presets */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2">
        <Button
          size="sm"
          variant={settings.weatherType === 0 ? 'default' : 'outline'}
          onClick={() => setWeatherPreset('clear')}
          className="panel-glow backdrop-blur-sm"
        >
          <Sun className="w-4 h-4 mr-1" />
          Clear
        </Button>
        <Button
          size="sm"
          variant={settings.weatherType === 1 ? 'default' : 'outline'}
          onClick={() => setWeatherPreset('rain')}
          className="panel-glow backdrop-blur-sm"
        >
          <CloudRain className="w-4 h-4 mr-1" />
          Rain
        </Button>
        <Button
          size="sm"
          variant={settings.weatherType === 2 ? 'default' : 'outline'}
          onClick={() => setWeatherPreset('snow')}
          className="panel-glow backdrop-blur-sm"
        >
          <CloudSnow className="w-4 h-4 mr-1" />
          Snow
        </Button>
        <Button
          size="sm"
          variant={settings.weatherType === 3 ? 'default' : 'outline'}
          onClick={() => setWeatherPreset('storm')}
          className="panel-glow backdrop-blur-sm"
        >
          <Zap className="w-4 h-4 mr-1" />
          Storm
        </Button>
      </div>
      
      {/* Controls */}
      <div className="absolute top-5 right-5 flex gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsPaused(!isPaused)} 
          className="panel-glow backdrop-blur-sm"
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={resetSettings} 
          className="panel-glow backdrop-blur-sm"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleFullscreen} 
          className="panel-glow backdrop-blur-sm"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button 
          variant={showLayers ? 'default' : 'outline'} 
          size="icon" 
          onClick={() => setShowLayers(!showLayers)} 
          className="panel-glow backdrop-blur-sm"
        >
          <Layers className="w-4 h-4" />
        </Button>
        <Button 
          variant={showSettings ? 'default' : 'outline'} 
          size="icon" 
          onClick={() => setShowSettings(!showSettings)} 
          className="panel-glow backdrop-blur-sm"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Layer Panel */}
      {showLayers && (
        <div className="absolute top-20 right-5 w-64 panel-glow backdrop-blur-xl rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-primary">Layer Visibility</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowLayers(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-2 mb-4">
            <LayerToggle 
              label="Sky" 
              icon={<Sun className="w-4 h-4 text-primary" />} 
              enabled={layers.sky} 
              onChange={(v) => updateLayer('sky', v)} 
            />
            <LayerToggle 
              label="Clouds" 
              icon={<Cloud className="w-4 h-4 text-primary" />} 
              enabled={layers.clouds} 
              onChange={(v) => updateLayer('clouds', v)} 
            />
            <LayerToggle 
              label="Terrain" 
              icon={<Mountain className="w-4 h-4 text-primary" />} 
              enabled={layers.terrain} 
              onChange={(v) => updateLayer('terrain', v)} 
            />
            <LayerToggle 
              label="Ocean" 
              icon={<Waves className="w-4 h-4 text-primary" />} 
              enabled={layers.ocean} 
              onChange={(v) => updateLayer('ocean', v)} 
            />
            <LayerToggle 
              label="Vegetation" 
              icon={<TreePine className="w-4 h-4 text-primary" />} 
              enabled={layers.vegetation} 
              onChange={(v) => updateLayer('vegetation', v)} 
            />
            <LayerToggle 
              label="Weather" 
              icon={<CloudRain className="w-4 h-4 text-primary" />} 
              enabled={layers.weather} 
              onChange={(v) => updateLayer('weather', v)} 
            />
            <LayerToggle 
              label="Fog" 
              icon={<Wind className="w-4 h-4 text-primary" />} 
              enabled={layers.fog} 
              onChange={(v) => updateLayer('fog', v)} 
            />
            <LayerToggle 
              label="God Rays" 
              icon={<Sparkles className="w-4 h-4 text-primary" />} 
              enabled={layers.godRays} 
              onChange={(v) => updateLayer('godRays', v)} 
            />
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={enableAllLayers}>
              <Eye className="w-4 h-4 mr-1" /> All
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={skyOnlyLayers}>
              <EyeOff className="w-4 h-4 mr-1" /> Sky Only
            </Button>
          </div>
        </div>
      )}
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-20 right-5 w-80 max-h-[calc(100vh-120px)] panel-glow backdrop-blur-xl rounded-xl">
          <div className="flex justify-between items-center p-4 border-b border-border/30">
            <h3 className="text-sm font-semibold text-primary">Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-6 p-1 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="atmosphere" className="text-xs px-2">
                <Sun className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="clouds" className="text-xs px-2">
                <Cloud className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="terrain" className="text-xs px-2">
                <Mountain className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="ocean" className="text-xs px-2">
                <Waves className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="vegetation" className="text-xs px-2">
                <TreePine className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="effects" className="text-xs px-2">
                <Sparkles className="w-3 h-3" />
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-4 space-y-4">
                
                {/* ATMOSPHERE TAB */}
                <TabsContent value="atmosphere" className="mt-0 space-y-4">
                  <SettingSection title="Sun Position">
                    <SliderSetting
                      label="Azimuth"
                      value={settings.sunAzimuth}
                      min={0} max={1} step={0.01}
                      format={(v) => `${(v * 360).toFixed(0)}°`}
                      onChange={(v) => updateSetting('sunAzimuth', v)}
                    />
                    <SliderSetting
                      label="Elevation"
                      value={settings.sunElevation}
                      min={-0.3} max={1} step={0.01}
                      format={(v) => `${(v * 90).toFixed(0)}°`}
                      onChange={(v) => updateSetting('sunElevation', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Day/Night Cycle">
                    <SliderSetting
                      label="Cycle Speed"
                      value={settings.dayNightCycleSpeed}
                      min={0.1} max={5} step={0.1}
                      onChange={(v) => updateSetting('dayNightCycleSpeed', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Atmosphere">
                    <SliderSetting
                      label="Rayleigh Scattering"
                      value={settings.rayleighStrength}
                      min={0} max={3} step={0.05}
                      onChange={(v) => updateSetting('rayleighStrength', v)}
                    />
                    <SliderSetting
                      label="Mie Scattering"
                      value={settings.mieStrength}
                      min={0} max={2} step={0.05}
                      onChange={(v) => updateSetting('mieStrength', v)}
                    />
                    <SliderSetting
                      label="Mie G"
                      value={settings.mieG}
                      min={0.5} max={0.99} step={0.01}
                      onChange={(v) => updateSetting('mieG', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Camera">
                    <SliderSetting
                      label="FOV"
                      value={settings.cameraFOV}
                      min={30} max={120} step={1}
                      format={(v) => `${v}°`}
                      onChange={(v) => updateSetting('cameraFOV', v)}
                    />
                    <SliderSetting
                      label="Flight Speed"
                      value={settings.cameraSpeed}
                      min={10} max={500} step={10}
                      onChange={(v) => updateSetting('cameraSpeed', v)}
                    />
                  </SettingSection>
                </TabsContent>
                
                {/* CLOUDS TAB */}
                <TabsContent value="clouds" className="mt-0 space-y-4">
                  <SettingSection title="Cloud Shape">
                    <SliderSetting
                      label="Coverage"
                      value={settings.cloudCoverage}
                      min={0} max={1} step={0.01}
                      format={(v) => `${(v * 100).toFixed(0)}%`}
                      onChange={(v) => updateSetting('cloudCoverage', v)}
                    />
                    <SliderSetting
                      label="Density"
                      value={settings.cloudDensity}
                      min={0.01} max={0.2} step={0.005}
                      onChange={(v) => updateSetting('cloudDensity', v)}
                    />
                    <SliderSetting
                      label="Scale"
                      value={settings.cloudScale}
                      min={0.2} max={3} step={0.1}
                      onChange={(v) => updateSetting('cloudScale', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Cloud Motion">
                    <SliderSetting
                      label="Cloud Speed"
                      value={settings.cloudSpeed}
                      min={0} max={5} step={0.1}
                      onChange={(v) => updateSetting('cloudSpeed', v)}
                    />
                    <SliderSetting
                      label="Detail Scale"
                      value={settings.cloudDetailScale}
                      min={0.5} max={10} step={0.5}
                      onChange={(v) => updateSetting('cloudDetailScale', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Cloud Layer">
                    <SliderSetting
                      label="Height (m)"
                      value={settings.cloudHeight}
                      min={500} max={5000} step={100}
                      onChange={(v) => updateSetting('cloudHeight', v)}
                    />
                    <SliderSetting
                      label="Thickness (m)"
                      value={settings.cloudThickness}
                      min={500} max={3000} step={100}
                      onChange={(v) => updateSetting('cloudThickness', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Cloud Lighting">
                    <SliderSetting
                      label="Silver Lining"
                      value={settings.cloudSilverLining}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('cloudSilverLining', v)}
                    />
                    <SliderSetting
                      label="Powder Effect"
                      value={settings.cloudPowder}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('cloudPowder', v)}
                    />
                  </SettingSection>
                </TabsContent>
                
                {/* TERRAIN TAB */}
                <TabsContent value="terrain" className="mt-0 space-y-4">
                  <SettingSection title="Terrain Shape">
                    <SliderSetting
                      label="Scale"
                      value={settings.terrainScale}
                      min={0.2} max={3} step={0.1}
                      onChange={(v) => updateSetting('terrainScale', v)}
                    />
                    <SliderSetting
                      label="Mountain Height (m)"
                      value={settings.mountainHeight}
                      min={500} max={8000} step={100}
                      onChange={(v) => updateSetting('mountainHeight', v)}
                    />
                    <SliderSetting
                      label="Erosion"
                      value={settings.erosionStrength}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('erosionStrength', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Biomes">
                    <SliderSetting
                      label="Snow Line (m)"
                      value={settings.snowLine}
                      min={1000} max={5000} step={100}
                      onChange={(v) => updateSetting('snowLine', v)}
                    />
                    <SliderSetting
                      label="Tree Line (m)"
                      value={settings.treeLine}
                      min={500} max={4000} step={100}
                      onChange={(v) => updateSetting('treeLine', v)}
                    />
                  </SettingSection>
                </TabsContent>
                
                {/* OCEAN TAB */}
                <TabsContent value="ocean" className="mt-0 space-y-4">
                  <SettingSection title="Ocean Surface">
                    <SliderSetting
                      label="Sea Level (m)"
                      value={settings.oceanLevel}
                      min={-500} max={500} step={10}
                      onChange={(v) => updateSetting('oceanLevel', v)}
                    />
                    <SliderSetting
                      label="Wave Height"
                      value={settings.waveHeight}
                      min={0} max={10} step={0.1}
                      onChange={(v) => updateSetting('waveHeight', v)}
                    />
                    <SliderSetting
                      label="Wave Speed"
                      value={settings.waveSpeed}
                      min={0} max={3} step={0.1}
                      onChange={(v) => updateSetting('waveSpeed', v)}
                    />
                    <SliderSetting
                      label="Roughness"
                      value={settings.oceanRoughness}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('oceanRoughness', v)}
                    />
                    <SliderSetting
                      label="Fresnel"
                      value={settings.oceanFresnel}
                      min={0} max={0.1} step={0.005}
                      onChange={(v) => updateSetting('oceanFresnel', v)}
                    />
                    <SliderSetting
                      label="Foam"
                      value={settings.foamIntensity}
                      min={0} max={2} step={0.05}
                      onChange={(v) => updateSetting('foamIntensity', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="FFT Ocean Effects">
                    <SliderSetting
                      label="Caustics"
                      value={settings.causticsIntensity}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('causticsIntensity', v)}
                    />
                    <SliderSetting
                      label="Subsurface Scattering"
                      value={settings.sssIntensity}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('sssIntensity', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Underwater">
                    <SliderSetting
                      label="Fog Density"
                      value={settings.underwaterFogDensity}
                      min={0} max={2} step={0.05}
                      onChange={(v) => updateSetting('underwaterFogDensity', v)}
                    />
                    <SliderSetting
                      label="Caustics Strength"
                      value={settings.underwaterCausticsStrength}
                      min={0} max={2} step={0.05}
                      onChange={(v) => updateSetting('underwaterCausticsStrength', v)}
                    />
                    <SliderSetting
                      label="God Rays"
                      value={settings.underwaterGodRayStrength}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('underwaterGodRayStrength', v)}
                    />
                    <SliderSetting
                      label="Bubbles"
                      value={settings.underwaterBubbleCount}
                      min={0} max={2} step={0.1}
                      onChange={(v) => updateSetting('underwaterBubbleCount', v)}
                    />
                  </SettingSection>
                </TabsContent>
                
                {/* VEGETATION TAB */}
                <TabsContent value="vegetation" className="mt-0 space-y-4">
                  <SettingSection title="Vegetation">
                    <SliderSetting
                      label="Density"
                      value={settings.vegetationDensity}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('vegetationDensity', v)}
                    />
                    <SliderSetting
                      label="Tree Height"
                      value={settings.treeHeight}
                      min={5} max={100} step={5}
                      onChange={(v) => updateSetting('treeHeight', v)}
                    />
                    <SliderSetting
                      label="Grass Height"
                      value={settings.grassHeight}
                      min={0.1} max={2} step={0.1}
                      onChange={(v) => updateSetting('grassHeight', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Wind">
                    <SliderSetting
                      label="Wind Strength"
                      value={settings.windStrength}
                      min={0} max={2} step={0.05}
                      onChange={(v) => updateSetting('windStrength', v)}
                    />
                    <SliderSetting
                      label="Wind Speed"
                      value={settings.windSpeed}
                      min={0} max={2} step={0.05}
                      onChange={(v) => updateSetting('windSpeed', v)}
                    />
                  </SettingSection>
                </TabsContent>
                
                {/* EFFECTS TAB */}
                <TabsContent value="effects" className="mt-0 space-y-4">
                  <SettingSection title="Post-Processing">
                    <SliderSetting
                      label="Bloom"
                      value={settings.bloomIntensity}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('bloomIntensity', v)}
                    />
                    <SliderSetting
                      label="Exposure"
                      value={settings.exposure}
                      min={0.5} max={2} step={0.05}
                      onChange={(v) => updateSetting('exposure', v)}
                    />
                    <SliderSetting
                      label="Saturation"
                      value={settings.saturation}
                      min={0.5} max={1.5} step={0.05}
                      onChange={(v) => updateSetting('saturation', v)}
                    />
                    <SliderSetting
                      label="Vignette"
                      value={settings.vignetteStrength}
                      min={0} max={1} step={0.05}
                      onChange={(v) => updateSetting('vignetteStrength', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="God Rays">
                    <SliderSetting
                      label="Intensity"
                      value={settings.godRayIntensity}
                      min={0} max={2} step={0.05}
                      onChange={(v) => updateSetting('godRayIntensity', v)}
                    />
                  </SettingSection>
                  
                  <SettingSection title="Fog">
                    <SliderSetting
                      label="Density"
                      value={settings.fogDensity}
                      min={0} max={2} step={0.05}
                      onChange={(v) => updateSetting('fogDensity', v)}
                    />
                  </SettingSection>
                </TabsContent>
                
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ProceduralEarth;
