import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, X, Sun, Moon, Cloud, Waves, Mountain, Wind, 
  Droplets, Sparkles, Eye, Pause, Play, Camera, Download
} from 'lucide-react';
import AnimatedLogo from '../components/AnimatedLogo';

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL EARTH ENGINE - HYPER-REALISTIC EARTH SIMULATION
// Version 1.0 - Complete Implementation
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// MASTER VERTEX SHADER
// ─────────────────────────────────────────────────────────────────────────────
const VERTEX_SHADER = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = vec4(position, 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// MASTER FRAGMENT SHADER - COMPLETE EARTH SYSTEM
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
uniform int iFrame;

// Camera
uniform vec3 uCameraPos;
uniform float uCameraYaw;
uniform float uCameraPitch;
uniform float uCameraFOV;

// Celestial
uniform int uTimeOfDay; // 0=night, 1=sunrise, 2=day, 3=sunset
uniform float uSunAzimuth;
uniform float uSunElevation;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform float uMoonIntensity;
uniform float uStarIntensity;

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

// Ocean
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

// Fog
uniform float uFogDensity;
uniform float uFogHeight;
uniform vec3 uFogColor;

// God Rays
uniform float uGodRayIntensity;
uniform float uGodRayDecay;
uniform int uGodRaySteps;

// Quality
uniform float uRenderScale;

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

// Quintic interpolation for smoother gradients
vec3 quintic(vec3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// 3D Gradient Noise (Perlin)
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

// Value Noise
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

// Worley Noise (Cellular)
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

// FBM (Fractal Brownian Motion)
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

// Ridged FBM (for mountains)
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

// Perlin-Worley Hybrid (for clouds)
float perlinWorley(vec3 p, int octaves) {
    float perlin = fbm(p, octaves);
    float worley = worleyNoise(p * 4.0);
    return remap(perlin, worley - 1.0, 1.0, 0.0, 1.0);
}

// Domain Warping
float warpedNoise(vec3 p, float strength, int octaves) {
    vec3 q = vec3(
        fbm(p, 3),
        fbm(p + vec3(5.2, 1.3, 2.8), 3),
        fbm(p + vec3(1.7, 9.2, 3.1), 3)
    );
    return fbm(p + strength * q, octaves);
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
// CELESTIAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

vec3 getSunDirection() {
    float azimuth = uSunAzimuth;
    float elevation = uSunElevation;
    return normalize(vec3(
        cos(elevation) * sin(azimuth),
        sin(elevation),
        cos(elevation) * cos(azimuth)
    ));
}

vec3 getMoonDirection() {
    // Moon roughly opposite to sun
    return normalize(-getSunDirection() + vec3(0.2, 0.3, 0.1));
}

// Procedural Stars
float getStars(vec3 rd) {
    if(rd.y < 0.0) return 0.0;
    
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
    
    return stars * 0.05 * uStarIntensity;
}

// Sun disk and corona
vec3 getSunDisk(vec3 rd, vec3 sunDir) {
    float sunDot = dot(rd, sunDir);
    
    // Main disk
    float disk = smoothstep(0.9997, 0.9999, sunDot);
    
    // Corona
    float corona = pow(saturate(sunDot), 256.0) * 2.0;
    corona += pow(saturate(sunDot), 8.0) * 0.5;
    
    return uSunColor * (disk * 50.0 + corona) * uSunIntensity;
}

// Moon disk with simple texture
vec3 getMoonDisk(vec3 rd, vec3 moonDir) {
    float moonDot = dot(rd, moonDir);
    
    if(moonDot < 0.999) return vec3(0.0);
    
    // Simple crater pattern
    vec3 localPos = rd - moonDir * moonDot;
    float craters = 1.0 - worleyNoise(localPos * 500.0) * 0.3;
    
    float disk = smoothstep(0.999, 0.9995, moonDot);
    return vec3(0.9, 0.9, 0.85) * disk * craters * uMoonIntensity;
}

// ═══════════════════════════════════════════════════════════════════════════
// ATMOSPHERIC SCATTERING
// ═══════════════════════════════════════════════════════════════════════════

// Rayleigh phase function
float rayleighPhase(float cosTheta) {
    return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}

// Mie phase function (Henyey-Greenstein)
float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

// Dual-lobe phase for clouds
float dualLobePhase(float cosTheta, float g1, float g2, float blend) {
    return mix(miePhase(cosTheta, g1), miePhase(cosTheta, g2), blend);
}

// Sky color with atmospheric scattering
vec3 getSkyColor(vec3 rd, vec3 sunDir) {
    float sunDot = dot(rd, sunDir);
    float horizonFactor = 1.0 - pow(saturate(rd.y), 0.4);
    
    // Base sky gradient
    vec3 skyColor = mix(uSkyZenithColor, uSkyHorizonColor, horizonFactor);
    
    // Rayleigh scattering (blue)
    float rayleigh = rayleighPhase(sunDot) * uRayleighStrength;
    vec3 rayleighColor = vec3(0.2, 0.4, 0.8) * rayleigh;
    
    // Mie scattering (sun glow)
    float mie = miePhase(sunDot, uMieG) * uMieStrength;
    vec3 mieColor = uSunColor * mie;
    
    // Combine
    skyColor += rayleighColor + mieColor;
    
    // Sunset/sunrise coloring
    if(sunDir.y < 0.2 && sunDir.y > -0.1) {
        float sunsetFactor = smoothstep(-0.1, 0.2, sunDir.y);
        vec3 sunsetColor = vec3(1.0, 0.4, 0.1);
        float sunsetBlend = pow(saturate(sunDot + 0.5), 2.0) * (1.0 - sunsetFactor);
        skyColor = mix(skyColor, sunsetColor, sunsetBlend * 0.5);
    }
    
    return skyColor;
}

// ═══════════════════════════════════════════════════════════════════════════
// VOLUMETRIC CLOUDS
// ═══════════════════════════════════════════════════════════════════════════

// Cloud height gradient (cumulus profile)
float getCloudHeightGradient(float y, float cloudBase, float cloudTop) {
    float h = (y - cloudBase) / (cloudTop - cloudBase);
    if(h < 0.0 || h > 1.0) return 0.0;
    
    // Flat bottom, puffy top profile
    float bottomFade = smoothstep(0.0, 0.1, h);
    float topFade = smoothstep(1.0, 0.85, h);
    float roundBottom = pow(bottomFade, 0.5);
    float puffyTop = topFade * (1.0 - pow(h, 2.0) * 0.5);
    
    return roundBottom * puffyTop;
}

// Cloud edge fade
float getCloudEdgeFade(vec3 p, float extent) {
    vec2 edgeCoord = (p.xz + extent) / (extent * 2.0);
    return smoothstep(0.0, 0.1, edgeCoord.x) *
           smoothstep(1.0, 0.9, edgeCoord.x) *
           smoothstep(0.0, 0.1, edgeCoord.y) *
           smoothstep(1.0, 0.9, edgeCoord.y);
}

// Cloud density sampling
float sampleCloudDensity(vec3 p, bool cheap) {
    float cloudBase = uCloudHeight;
    float cloudTop = uCloudHeight + uCloudThickness;
    
    // Height gradient
    float heightGrad = getCloudHeightGradient(p.y, cloudBase, cloudTop);
    if(heightGrad <= 0.0) return 0.0;
    
    // Edge fade
    float edgeFade = getCloudEdgeFade(p, CLOUD_EXTENT);
    if(edgeFade <= 0.0) return 0.0;
    
    // Animated coordinates
    vec3 shapeCoord = p * uCloudScale * 0.0001 + vec3(iTime * uCloudSpeed * 0.01, 0.0, 0.0);
    
    // Shape noise (Perlin-Worley)
    float shape = perlinWorley(shapeCoord, 4);
    
    // Apply coverage
    float density = remap(shape * heightGrad, 1.0 - uCloudCoverage, 1.0, 0.0, 1.0);
    density = saturate(density);
    
    if(cheap || density <= 0.0) {
        return density * edgeFade * uCloudDensity;
    }
    
    // Detail erosion
    vec3 detailCoord = p * uCloudDetailScale * 0.001 + vec3(iTime * uCloudSpeed * 0.02, 0.0, 0.0);
    float detail = fbm(detailCoord, 3) * 0.3;
    
    density = remap(density, detail, 1.0, 0.0, 1.0);
    density = saturate(density);
    
    return density * edgeFade * uCloudDensity;
}

// Light marching through clouds
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

// Beer-Powder scattering approximation
float beerPowder(float depth) {
    float beer = exp(-depth);
    float powder = 1.0 - exp(-depth * 2.0);
    return beer * mix(1.0, powder, uCloudPowder);
}

// Cloud multiple scattering
vec3 cloudScattering(vec3 pos, vec3 rd, float density, vec3 sunDir, vec3 lightColor) {
    float lightTransmit = cloudLightMarch(pos, sunDir);
    
    float cosTheta = dot(rd, sunDir);
    float phase = dualLobePhase(cosTheta, 0.8, -0.5, 0.2);
    
    // Ambient sky light
    vec3 ambient = vec3(0.5, 0.6, 0.7) * uCloudAmbient;
    
    // Direct sunlight with multiple scattering approx
    vec3 direct = lightColor * lightTransmit * phase;
    
    // Silver lining effect
    float silverLining = pow(1.0 - abs(cosTheta), 8.0) * uCloudSilverLining;
    vec3 silver = lightColor * silverLining * lightTransmit;
    
    return ambient + direct + silver;
}

// Main cloud raymarching
vec4 raymarchClouds(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor) {
    float cloudBase = uCloudHeight;
    float cloudTop = uCloudHeight + uCloudThickness;
    
    vec3 cloudMin = vec3(-CLOUD_EXTENT, cloudBase, -CLOUD_EXTENT);
    vec3 cloudMax = vec3(CLOUD_EXTENT, cloudTop, CLOUD_EXTENT);
    
    vec2 boxHit = rayBoxIntersect(ro, rd, cloudMin, cloudMax);
    if(boxHit.y <= 0.0) return vec4(0.0);
    
    // Blue noise jitter
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

// Cloud shadow sampling
float sampleCloudShadow(vec3 worldPos, vec3 sunDir) {
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
// TERRAIN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Height generation
float getTerrainHeight(vec2 p) {
    vec2 pos = p * uTerrainScale * 0.0001;
    
    // Continental scale
    float continent = fbm(vec3(pos * 0.5, 0.0), 2) * 0.5 + 0.5;
    continent = smoothstep(0.3, 0.7, continent);
    
    // Mountain ridges
    float mountains = ridgedFbm(vec3(pos * 2.0, 0.0), 5);
    mountains = pow(mountains, uMountainSharpness) * uMountainHeight;
    
    // Hills
    float hills = fbm(vec3(pos * 4.0, 1.0), 4) * uTerrainHeight * 0.3;
    
    // Detail
    float detail = fbm(vec3(pos * 16.0, 2.0), 3) * uTerrainHeight * 0.05;
    
    // Combine
    float height = continent * (mountains + hills + detail);
    
    // Add base terrain height
    height += uOceanLevel;
    
    return height;
}

// Terrain normal calculation
vec3 getTerrainNormal(vec2 p, float height) {
    float e = 10.0;
    float hL = getTerrainHeight(p - vec2(e, 0.0));
    float hR = getTerrainHeight(p + vec2(e, 0.0));
    float hD = getTerrainHeight(p - vec2(0.0, e));
    float hU = getTerrainHeight(p + vec2(0.0, e));
    
    return normalize(vec3(hL - hR, 2.0 * e, hD - hU));
}

// Biome classification
vec4 getTerrainMaterial(vec3 worldPos, vec3 normal, float height) {
    float slope = 1.0 - normal.y;
    float relativeHeight = height - uOceanLevel;
    
    // Beach
    float beachFactor = smoothstep(0.0, uBeachWidth, relativeHeight) * 
                        smoothstep(uBeachWidth * 2.0, uBeachWidth, relativeHeight);
    
    // Grass
    float grassFactor = smoothstep(uBeachWidth, uBeachWidth * 2.0, relativeHeight) *
                        smoothstep(uTreeLine, uTreeLine * 0.8, relativeHeight) *
                        smoothstep(0.5, 0.3, slope);
    
    // Rock (steep slopes and high altitude)
    float rockFactor = smoothstep(0.3, 0.6, slope) +
                       smoothstep(uTreeLine * 0.8, uTreeLine, relativeHeight);
    rockFactor = saturate(rockFactor);
    
    // Snow
    float snowFactor = smoothstep(uSnowLine * 0.9, uSnowLine, relativeHeight) *
                       smoothstep(0.7, 0.4, slope);
    
    // Blend materials
    vec3 color = uSandColor * beachFactor;
    color = mix(color, uGrassColor, grassFactor);
    color = mix(color, uRockColor, rockFactor);
    color = mix(color, uSnowColor, snowFactor);
    
    // Add noise variation
    float variation = fbm(worldPos * 0.1, 3) * 0.2 + 0.9;
    color *= variation;
    
    return vec4(color, 1.0);
}

// Terrain raymarching
vec4 raymarchTerrain(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor, out float hitDist) {
    hitDist = -1.0;
    
    // Start above terrain
    float t = 0.0;
    float maxDist = 50000.0;
    
    // Adaptive step size
    for(int i = 0; i < 256; i++) {
        vec3 pos = ro + rd * t;
        
        float terrainHeight = getTerrainHeight(pos.xz);
        float distToTerrain = pos.y - terrainHeight;
        
        if(distToTerrain < 1.0) {
            hitDist = t;
            
            vec3 normal = getTerrainNormal(pos.xz, terrainHeight);
            vec4 material = getTerrainMaterial(pos, normal, terrainHeight);
            
            // Lighting
            float NdotL = max(0.0, dot(normal, sunDir));
            float cloudShadow = sampleCloudShadow(pos, sunDir);
            
            vec3 ambient = material.rgb * 0.2;
            vec3 diffuse = material.rgb * lightColor * NdotL * cloudShadow;
            
            return vec4(ambient + diffuse, 1.0);
        }
        
        // Adaptive stepping
        t += max(1.0, distToTerrain * 0.5);
        
        if(t > maxDist) break;
    }
    
    return vec4(0.0);
}

// ═══════════════════════════════════════════════════════════════════════════
// OCEAN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Gerstner wave
vec3 gerstnerWave(vec2 pos, float time, vec2 dir, float steepness, float wavelength) {
    float k = TAU / wavelength;
    float c = sqrt(9.8 / k);
    float f = k * (dot(dir, pos) - c * time);
    float a = steepness / k;
    
    return vec3(
        dir.x * a * cos(f),
        a * sin(f),
        dir.y * a * cos(f)
    );
}

// Ocean surface displacement
vec3 getOceanDisplacement(vec2 pos, float time) {
    vec3 displacement = vec3(0.0);
    
    // Multiple wave components
    displacement += gerstnerWave(pos, time, normalize(vec2(1.0, 0.3)), uWaveHeight * 0.5, 60.0);
    displacement += gerstnerWave(pos, time, normalize(vec2(0.8, 0.6)), uWaveHeight * 0.3, 31.0);
    displacement += gerstnerWave(pos, time, normalize(vec2(0.3, 0.9)), uWaveHeight * 0.2, 18.0);
    displacement += gerstnerWave(pos, time, normalize(vec2(-0.4, 0.7)), uWaveHeight * 0.15, 9.0);
    
    return displacement;
}

// Ocean normal calculation
vec3 getOceanNormal(vec2 pos, float time) {
    float e = 0.5;
    vec3 p0 = vec3(pos.x, 0.0, pos.y) + getOceanDisplacement(pos, time);
    vec3 p1 = vec3(pos.x + e, 0.0, pos.y) + getOceanDisplacement(pos + vec2(e, 0.0), time);
    vec3 p2 = vec3(pos.x, 0.0, pos.y + e) + getOceanDisplacement(pos + vec2(0.0, e), time);
    
    return normalize(cross(p2 - p0, p1 - p0));
}

// Ocean rendering
vec4 renderOcean(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor, vec3 skyColor, float terrainDist) {
    // Intersect with ocean plane
    float t = (uOceanLevel - ro.y) / rd.y;
    
    if(t < 0.0 || (terrainDist > 0.0 && t > terrainDist)) {
        return vec4(0.0);
    }
    
    vec3 hitPos = ro + rd * t;
    
    // Get wave displacement and normal
    vec3 displacement = getOceanDisplacement(hitPos.xz, iTime * uWaveSpeed);
    vec3 normal = getOceanNormal(hitPos.xz, iTime * uWaveSpeed);
    
    vec3 viewDir = -rd;
    
    // Fresnel
    float fresnel = uOceanFresnel + (1.0 - uOceanFresnel) * pow(1.0 - max(0.0, dot(normal, viewDir)), 5.0);
    
    // Reflection
    vec3 reflectDir = reflect(-viewDir, normal);
    vec3 reflection = getSkyColor(reflectDir, sunDir);
    
    // Sample clouds in reflection
    vec4 reflectedClouds = raymarchClouds(hitPos + vec3(0.0, 1.0, 0.0), reflectDir, sunDir, lightColor);
    reflection = mix(reflection, reflectedClouds.rgb, reflectedClouds.a * 0.7);
    
    // Refraction (underwater color)
    vec3 refraction = mix(uOceanColor, uOceanDeepColor, 0.5);
    
    // Subsurface scattering
    float sss = pow(saturate(dot(viewDir, -sunDir + normal * 0.3)), 4.0);
    vec3 subsurface = uOceanColor * sss * 0.3;
    
    // Specular
    vec3 halfDir = normalize(viewDir + sunDir);
    float spec = pow(max(0.0, dot(normal, halfDir)), 256.0 / uOceanRoughness);
    vec3 specular = lightColor * spec;
    
    // Foam on wave crests
    float foam = saturate(displacement.y * 2.0 - 0.5) * uFoamIntensity;
    
    // Cloud shadows
    float cloudShadow = sampleCloudShadow(hitPos, sunDir);
    
    // Combine
    vec3 water = mix(refraction, reflection, fresnel);
    water += specular * cloudShadow + subsurface;
    water = mix(water, vec3(1.0), foam);
    water *= cloudShadow * 0.5 + 0.5;
    
    return vec4(water, t);
}

// ═══════════════════════════════════════════════════════════════════════════
// VOLUMETRIC FOG
// ═══════════════════════════════════════════════════════════════════════════

vec3 applyFog(vec3 color, vec3 ro, vec3 rd, float dist, vec3 sunDir, vec3 lightColor) {
    if(uFogDensity <= 0.0) return color;
    
    // Height-based fog density
    float fogAmount = 1.0 - exp(-dist * uFogDensity * 0.0001);
    
    // Sun scattering in fog
    float sunAmount = pow(saturate(dot(rd, sunDir)), 8.0);
    vec3 fogCol = mix(uFogColor, lightColor, sunAmount * 0.5);
    
    return mix(color, fogCol, fogAmount);
}

// ═══════════════════════════════════════════════════════════════════════════
// GOD RAYS
// ═══════════════════════════════════════════════════════════════════════════

float calculateGodRays(vec3 ro, vec3 rd, vec3 sunDir, float sceneDepth) {
    if(uGodRayIntensity <= 0.0) return 0.0;
    
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
// MAIN RENDERING
// ═══════════════════════════════════════════════════════════════════════════

void main() {
    vec2 uv = vUv;
    
    // Camera setup
    vec3 ro = uCameraPos;
    
    // Mouse look
    vec2 mouse = iMouse.xy / iResolution.xy;
    if(length(iMouse.xy) < 1.0) {
        mouse = vec2(0.5, 0.4);
    }
    
    float yaw = uCameraYaw + (mouse.x - 0.5) * PI;
    float pitch = uCameraPitch + (mouse.y - 0.5) * PI * 0.5;
    pitch = clamp(pitch, -PI * 0.45, PI * 0.45);
    
    vec3 lookDir = vec3(
        cos(pitch) * sin(yaw),
        sin(pitch),
        cos(pitch) * cos(yaw)
    );
    
    vec3 rd = getRayDirection(uv, ro, ro + lookDir, uCameraFOV);
    
    // Get sun/moon direction based on time of day
    vec3 sunDir = getSunDirection();
    vec3 moonDir = getMoonDirection();
    
    // Light color based on time
    vec3 lightColor = uSunColor * uSunIntensity;
    if(uTimeOfDay == 0) {
        lightColor = vec3(0.3, 0.35, 0.5) * uMoonIntensity;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // RENDER SKY
    // ─────────────────────────────────────────────────────────────────────
    vec3 skyColor = getSkyColor(rd, sunDir);
    
    // Add stars (night only)
    if(uTimeOfDay == 0) {
        skyColor += vec3(getStars(rd));
    }
    
    // Add sun/moon disk
    skyColor += getSunDisk(rd, sunDir);
    if(uTimeOfDay == 0) {
        skyColor += getMoonDisk(rd, moonDir);
    }
    
    vec3 finalColor = skyColor;
    float sceneDepth = 100000.0;
    
    // ─────────────────────────────────────────────────────────────────────
    // RENDER TERRAIN
    // ─────────────────────────────────────────────────────────────────────
    float terrainDist;
    vec4 terrain = raymarchTerrain(ro, rd, sunDir, lightColor, terrainDist);
    
    if(terrainDist > 0.0) {
        finalColor = terrain.rgb;
        sceneDepth = terrainDist;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // RENDER OCEAN
    // ─────────────────────────────────────────────────────────────────────
    vec4 ocean = renderOcean(ro, rd, sunDir, lightColor, skyColor, terrainDist);
    
    if(ocean.a > 0.0 && (terrainDist < 0.0 || ocean.a < terrainDist)) {
        finalColor = ocean.rgb;
        sceneDepth = ocean.a;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // RENDER CLOUDS
    // ─────────────────────────────────────────────────────────────────────
    vec4 clouds = raymarchClouds(ro, rd, sunDir, lightColor);
    finalColor = mix(finalColor, clouds.rgb, clouds.a);
    
    // ─────────────────────────────────────────────────────────────────────
    // VOLUMETRIC EFFECTS
    // ─────────────────────────────────────────────────────────────────────
    
    // Apply fog
    finalColor = applyFog(finalColor, ro, rd, sceneDepth, sunDir, lightColor);
    
    // God rays
    float godRays = calculateGodRays(ro, rd, sunDir, sceneDepth);
    finalColor += lightColor * godRays;
    
    // ─────────────────────────────────────────────────────────────────────
    // POST-PROCESSING
    // ─────────────────────────────────────────────────────────────────────
    
    // Exposure
    finalColor *= 1.5;
    
    // Tone mapping (ACES approximation)
    finalColor = finalColor / (finalColor + vec3(1.0));
    
    // Gamma correction
    finalColor = pow(finalColor, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// BLUE NOISE TEXTURE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function createBlueNoiseTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  
  const phi2 = 1.32471795724474602596;
  const a1 = 1.0 / phi2;
  const a2 = 1.0 / (phi2 * phi2);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = y * size + x;
      
      const r = ((0.5 + a1 * n) % 1.0) * 255;
      const g = ((0.5 + a2 * n) % 1.0) * 255;
      const b = Math.random() * 255;
      
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  // Time of day
  timeOfDay: 2, // 0=night, 1=sunrise, 2=day, 3=sunset
  sunAzimuth: 0.8,
  sunElevation: 0.4,
  
  // Camera
  cameraHeight: 500,
  cameraFOV: 60,
  
  // Atmosphere
  skyZenithColor: [0.15, 0.35, 0.65],
  skyHorizonColor: [0.5, 0.65, 0.8],
  atmosphereDensity: 1.0,
  rayleighStrength: 1.0,
  mieStrength: 0.5,
  mieG: 0.8,
  
  // Clouds
  cloudCoverage: 0.5,
  cloudDensity: 0.08,
  cloudScale: 1.0,
  cloudDetailScale: 3.0,
  cloudSpeed: 5.0,
  cloudHeight: 2000,
  cloudThickness: 1500,
  cloudLightAbsorption: 0.5,
  cloudAmbient: 0.3,
  cloudSilverLining: 0.5,
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
  grassColor: [0.2, 0.35, 0.15],
  rockColor: [0.4, 0.38, 0.35],
  snowColor: [0.95, 0.95, 0.98],
  sandColor: [0.76, 0.7, 0.5],
  
  // Ocean
  oceanLevel: 0,
  oceanColor: [0.05, 0.15, 0.3],
  oceanDeepColor: [0.02, 0.05, 0.15],
  waveHeight: 2.0,
  waveFrequency: 1.0,
  waveSpeed: 1.0,
  oceanFresnel: 0.02,
  oceanRoughness: 0.3,
  foamIntensity: 0.5,
  
  // Fog
  fogDensity: 0.3,
  fogHeight: 500,
  fogColor: [0.6, 0.65, 0.7],
  
  // God rays
  godRayIntensity: 0.5,
  godRayDecay: 0.95,
  godRaySteps: 16,
  
  // Stars
  starIntensity: 1.0,
  moonIntensity: 0.5,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ProceduralEarth() {
  const containerRef = useRef();
  const rendererRef = useRef();
  const materialRef = useRef();
  const animationRef = useRef();
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.4 });
  
  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState('atmosphere');

  // Initialize renderer
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      powerPreference: 'high-performance',
      precision: 'highp'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const blueNoise = createBlueNoiseTexture();

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        iMouse: { value: new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.4) },
        iFrame: { value: 0 },
        blueNoise: { value: blueNoise },
        
        // Camera
        uCameraPos: { value: new THREE.Vector3(0, settings.cameraHeight, 0) },
        uCameraYaw: { value: 0 },
        uCameraPitch: { value: 0 },
        uCameraFOV: { value: settings.cameraFOV },
        
        // Celestial
        uTimeOfDay: { value: settings.timeOfDay },
        uSunAzimuth: { value: settings.sunAzimuth * Math.PI * 2 },
        uSunElevation: { value: settings.sunElevation * Math.PI * 0.5 },
        uSunColor: { value: new THREE.Color(1, 0.95, 0.8) },
        uSunIntensity: { value: 2.0 },
        uMoonIntensity: { value: settings.moonIntensity },
        uStarIntensity: { value: settings.starIntensity },
        
        // Atmosphere
        uSkyZenithColor: { value: new THREE.Color(...settings.skyZenithColor) },
        uSkyHorizonColor: { value: new THREE.Color(...settings.skyHorizonColor) },
        uAtmosphereDensity: { value: settings.atmosphereDensity },
        uRayleighStrength: { value: settings.rayleighStrength },
        uMieStrength: { value: settings.mieStrength },
        uMieG: { value: settings.mieG },
        
        // Clouds
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
        
        // Terrain
        uTerrainScale: { value: settings.terrainScale },
        uTerrainHeight: { value: settings.terrainHeight },
        uMountainHeight: { value: settings.mountainHeight },
        uMountainSharpness: { value: settings.mountainSharpness },
        uSnowLine: { value: settings.snowLine },
        uTreeLine: { value: settings.treeLine },
        uBeachWidth: { value: settings.beachWidth },
        uGrassColor: { value: new THREE.Color(...settings.grassColor) },
        uRockColor: { value: new THREE.Color(...settings.rockColor) },
        uSnowColor: { value: new THREE.Color(...settings.snowColor) },
        uSandColor: { value: new THREE.Color(...settings.sandColor) },
        
        // Ocean
        uOceanLevel: { value: settings.oceanLevel },
        uOceanColor: { value: new THREE.Color(...settings.oceanColor) },
        uOceanDeepColor: { value: new THREE.Color(...settings.oceanDeepColor) },
        uWaveHeight: { value: settings.waveHeight },
        uWaveFrequency: { value: settings.waveFrequency },
        uWaveSpeed: { value: settings.waveSpeed },
        uOceanFresnel: { value: settings.oceanFresnel },
        uOceanRoughness: { value: settings.oceanRoughness },
        uFoamIntensity: { value: settings.foamIntensity },
        uCausticsIntensity: { value: 0.5 },
        
        // Fog
        uFogDensity: { value: settings.fogDensity },
        uFogHeight: { value: settings.fogHeight },
        uFogColor: { value: new THREE.Color(...settings.fogColor) },
        
        // God rays
        uGodRayIntensity: { value: settings.godRayIntensity },
        uGodRayDecay: { value: settings.godRayDecay },
        uGodRaySteps: { value: settings.godRaySteps },
        
        // Quality
        uRenderScale: { value: 1.0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: EARTH_FRAGMENT_SHADER,
    });
    materialRef.current = material;

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // Mouse movement
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      if (!isPaused) {
        frameRef.current++;
        material.uniforms.iTime.value = clock.getElapsedTime();
        material.uniforms.iFrame.value = frameRef.current;
      }
      
      material.uniforms.iMouse.value.set(
        mouseRef.current.x * window.innerWidth,
        mouseRef.current.y * window.innerHeight
      );
      
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      material.uniforms.iResolution.value.set(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
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
    
    // Update all uniforms
    u.uTimeOfDay.value = settings.timeOfDay;
    u.uSunAzimuth.value = settings.sunAzimuth * Math.PI * 2;
    u.uSunElevation.value = settings.sunElevation * Math.PI * 0.5;
    u.uMoonIntensity.value = settings.moonIntensity;
    u.uStarIntensity.value = settings.starIntensity;
    
    u.uCameraPos.value.y = settings.cameraHeight;
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
    u.uGrassColor.value.setRGB(...settings.grassColor);
    u.uRockColor.value.setRGB(...settings.rockColor);
    u.uSnowColor.value.setRGB(...settings.snowColor);
    u.uSandColor.value.setRGB(...settings.sandColor);
    
    u.uOceanLevel.value = settings.oceanLevel;
    u.uOceanColor.value.setRGB(...settings.oceanColor);
    u.uOceanDeepColor.value.setRGB(...settings.oceanDeepColor);
    u.uWaveHeight.value = settings.waveHeight;
    u.uWaveFrequency.value = settings.waveFrequency;
    u.uWaveSpeed.value = settings.waveSpeed;
    u.uOceanFresnel.value = settings.oceanFresnel;
    u.uOceanRoughness.value = settings.oceanRoughness;
    u.uFoamIntensity.value = settings.foamIntensity;
    
    u.uFogDensity.value = settings.fogDensity;
    u.uFogHeight.value = settings.fogHeight;
    u.uFogColor.value.setRGB(...settings.fogColor);
    
    u.uGodRayIntensity.value = settings.godRayIntensity;
    u.uGodRayDecay.value = settings.godRayDecay;
    u.uGodRaySteps.value = settings.godRaySteps;
    
    // Update sun color based on time of day
    if (settings.timeOfDay === 0) {
      u.uSunColor.value.setRGB(0.3, 0.35, 0.5);
      u.uSunIntensity.value = 0.3;
    } else if (settings.timeOfDay === 1 || settings.timeOfDay === 3) {
      u.uSunColor.value.setRGB(1.0, 0.6, 0.3);
      u.uSunIntensity.value = 1.5;
    } else {
      u.uSunColor.value.setRGB(1.0, 0.95, 0.85);
      u.uSunIntensity.value = 2.0;
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const setTimePreset = (preset) => {
    switch (preset) {
      case 'night':
        setSettings(prev => ({
          ...prev,
          timeOfDay: 0,
          sunElevation: -0.2,
          starIntensity: 1.5,
          moonIntensity: 0.8,
          skyZenithColor: [0.02, 0.03, 0.08],
          skyHorizonColor: [0.05, 0.08, 0.15],
        }));
        break;
      case 'sunrise':
        setSettings(prev => ({
          ...prev,
          timeOfDay: 1,
          sunElevation: 0.1,
          sunAzimuth: 0.25,
          starIntensity: 0.2,
          skyZenithColor: [0.15, 0.25, 0.5],
          skyHorizonColor: [0.9, 0.5, 0.3],
        }));
        break;
      case 'day':
        setSettings(prev => ({
          ...prev,
          timeOfDay: 2,
          sunElevation: 0.4,
          starIntensity: 0,
          skyZenithColor: [0.15, 0.35, 0.65],
          skyHorizonColor: [0.5, 0.65, 0.8],
        }));
        break;
      case 'sunset':
        setSettings(prev => ({
          ...prev,
          timeOfDay: 3,
          sunElevation: 0.08,
          sunAzimuth: 0.75,
          starIntensity: 0.3,
          skyZenithColor: [0.2, 0.25, 0.45],
          skyHorizonColor: [0.95, 0.4, 0.2],
        }));
        break;
    }
  };

  return (
    <div className="w-full h-screen relative overflow-hidden bg-black">
      <div ref={containerRef} className="w-full h-full" />
      
      <AnimatedLogo />
      
      {/* Header */}
      <div className="absolute top-5 left-20 bg-black/70 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/30">
        <h1 className="text-xl font-bold text-cyan-400">Procedural Earth</h1>
        <p className="text-xs text-gray-400">Hyper-Realistic Earth Simulation • Move mouse to look</p>
      </div>
      
      {/* Time presets */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-2">
        <Button size="sm" variant={settings.timeOfDay === 0 ? 'default' : 'outline'} onClick={() => setTimePreset('night')} className="bg-black/50 border-blue-500/30">
          <Moon className="w-4 h-4 mr-1" /> Night
        </Button>
        <Button size="sm" variant={settings.timeOfDay === 1 ? 'default' : 'outline'} onClick={() => setTimePreset('sunrise')} className="bg-black/50 border-orange-500/30">
          <Sun className="w-4 h-4 mr-1" /> Sunrise
        </Button>
        <Button size="sm" variant={settings.timeOfDay === 2 ? 'default' : 'outline'} onClick={() => setTimePreset('day')} className="bg-black/50 border-yellow-500/30">
          <Sun className="w-4 h-4 mr-1" /> Day
        </Button>
        <Button size="sm" variant={settings.timeOfDay === 3 ? 'default' : 'outline'} onClick={() => setTimePreset('sunset')} className="bg-black/50 border-red-500/30">
          <Sun className="w-4 h-4 mr-1" /> Sunset
        </Button>
      </div>
      
      {/* Controls */}
      <div className="absolute top-5 right-5 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)} className="bg-black/50 border-cyan-500/30">
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </Button>
        <Button onClick={() => setShowSettings(!showSettings)} className={showSettings ? 'bg-cyan-600' : 'bg-gray-800'}>
          <Settings className="w-4 h-4 mr-2" />Settings
        </Button>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed right-0 top-0 h-screen w-96 bg-gray-950/95 backdrop-blur-xl border-l border-cyan-500/20 z-50">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Earth Settings</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5 bg-gray-900 p-1">
              <TabsTrigger value="atmosphere" className="text-xs"><Sun className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="clouds" className="text-xs"><Cloud className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="terrain" className="text-xs"><Mountain className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="ocean" className="text-xs"><Waves className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="effects" className="text-xs"><Sparkles className="w-3 h-3" /></TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="p-4 space-y-4">
                <TabsContent value="atmosphere" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Sun Position</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Azimuth</span>
                        <span className="text-cyan-400">{(settings.sunAzimuth * 360).toFixed(0)}°</span>
                      </div>
                      <Slider value={[settings.sunAzimuth]} min={0} max={1} step={0.01} onValueChange={([v]) => updateSetting('sunAzimuth', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Elevation</span>
                        <span className="text-cyan-400">{(settings.sunElevation * 90).toFixed(0)}°</span>
                      </div>
                      <Slider value={[settings.sunElevation]} min={-0.3} max={1} step={0.01} onValueChange={([v]) => updateSetting('sunElevation', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Atmosphere</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Rayleigh Scattering</span>
                        <span className="text-cyan-400">{settings.rayleighStrength.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.rayleighStrength]} min={0} max={3} step={0.05} onValueChange={([v]) => updateSetting('rayleighStrength', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Mie Scattering</span>
                        <span className="text-cyan-400">{settings.mieStrength.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.mieStrength]} min={0} max={2} step={0.05} onValueChange={([v]) => updateSetting('mieStrength', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Mie G (anisotropy)</span>
                        <span className="text-cyan-400">{settings.mieG.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.mieG]} min={0.5} max={0.99} step={0.01} onValueChange={([v]) => updateSetting('mieG', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Stars & Moon</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Star Intensity</span>
                        <span className="text-cyan-400">{settings.starIntensity.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.starIntensity]} min={0} max={2} step={0.05} onValueChange={([v]) => updateSetting('starIntensity', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Moon Intensity</span>
                        <span className="text-cyan-400">{settings.moonIntensity.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.moonIntensity]} min={0} max={2} step={0.05} onValueChange={([v]) => updateSetting('moonIntensity', v)} />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="clouds" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Cloud Shape</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Coverage</span>
                        <span className="text-cyan-400">{(settings.cloudCoverage * 100).toFixed(0)}%</span>
                      </div>
                      <Slider value={[settings.cloudCoverage]} min={0} max={1} step={0.01} onValueChange={([v]) => updateSetting('cloudCoverage', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Density</span>
                        <span className="text-cyan-400">{settings.cloudDensity.toFixed(3)}</span>
                      </div>
                      <Slider value={[settings.cloudDensity]} min={0.01} max={0.2} step={0.005} onValueChange={([v]) => updateSetting('cloudDensity', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Scale</span>
                        <span className="text-cyan-400">{settings.cloudScale.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.cloudScale]} min={0.2} max={3} step={0.1} onValueChange={([v]) => updateSetting('cloudScale', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Animation Speed</span>
                        <span className="text-cyan-400">{settings.cloudSpeed.toFixed(1)}</span>
                      </div>
                      <Slider value={[settings.cloudSpeed]} min={0} max={20} step={0.5} onValueChange={([v]) => updateSetting('cloudSpeed', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Cloud Layer</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Height (m)</span>
                        <span className="text-cyan-400">{settings.cloudHeight.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.cloudHeight]} min={500} max={5000} step={100} onValueChange={([v]) => updateSetting('cloudHeight', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Thickness (m)</span>
                        <span className="text-cyan-400">{settings.cloudThickness.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.cloudThickness]} min={500} max={3000} step={100} onValueChange={([v]) => updateSetting('cloudThickness', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Cloud Lighting</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Light Absorption</span>
                        <span className="text-cyan-400">{settings.cloudLightAbsorption.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.cloudLightAbsorption]} min={0.1} max={1} step={0.05} onValueChange={([v]) => updateSetting('cloudLightAbsorption', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Ambient</span>
                        <span className="text-cyan-400">{settings.cloudAmbient.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.cloudAmbient]} min={0} max={1} step={0.05} onValueChange={([v]) => updateSetting('cloudAmbient', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Silver Lining</span>
                        <span className="text-cyan-400">{settings.cloudSilverLining.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.cloudSilverLining]} min={0} max={1} step={0.05} onValueChange={([v]) => updateSetting('cloudSilverLining', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Powder Effect</span>
                        <span className="text-cyan-400">{settings.cloudPowder.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.cloudPowder]} min={0} max={1} step={0.05} onValueChange={([v]) => updateSetting('cloudPowder', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Quality</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Ray Steps</span>
                        <span className="text-cyan-400">{settings.cloudSteps}</span>
                      </div>
                      <Slider value={[settings.cloudSteps]} min={16} max={128} step={8} onValueChange={([v]) => updateSetting('cloudSteps', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Light Steps</span>
                        <span className="text-cyan-400">{settings.cloudLightSteps}</span>
                      </div>
                      <Slider value={[settings.cloudLightSteps]} min={4} max={16} step={2} onValueChange={([v]) => updateSetting('cloudLightSteps', v)} />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="terrain" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Terrain Shape</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Scale</span>
                        <span className="text-cyan-400">{settings.terrainScale.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.terrainScale]} min={0.2} max={3} step={0.1} onValueChange={([v]) => updateSetting('terrainScale', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Base Height (m)</span>
                        <span className="text-cyan-400">{settings.terrainHeight.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.terrainHeight]} min={100} max={2000} step={50} onValueChange={([v]) => updateSetting('terrainHeight', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Mountain Height (m)</span>
                        <span className="text-cyan-400">{settings.mountainHeight.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.mountainHeight]} min={500} max={8000} step={100} onValueChange={([v]) => updateSetting('mountainHeight', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Mountain Sharpness</span>
                        <span className="text-cyan-400">{settings.mountainSharpness.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.mountainSharpness]} min={1} max={4} step={0.1} onValueChange={([v]) => updateSetting('mountainSharpness', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Biome Thresholds</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Snow Line (m)</span>
                        <span className="text-cyan-400">{settings.snowLine.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.snowLine]} min={1000} max={5000} step={100} onValueChange={([v]) => updateSetting('snowLine', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Tree Line (m)</span>
                        <span className="text-cyan-400">{settings.treeLine.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.treeLine]} min={500} max={4000} step={100} onValueChange={([v]) => updateSetting('treeLine', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Beach Width (m)</span>
                        <span className="text-cyan-400">{settings.beachWidth.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.beachWidth]} min={10} max={200} step={10} onValueChange={([v]) => updateSetting('beachWidth', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Camera</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Height (m)</span>
                        <span className="text-cyan-400">{settings.cameraHeight.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.cameraHeight]} min={50} max={5000} step={50} onValueChange={([v]) => updateSetting('cameraHeight', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">FOV</span>
                        <span className="text-cyan-400">{settings.cameraFOV}°</span>
                      </div>
                      <Slider value={[settings.cameraFOV]} min={30} max={120} step={5} onValueChange={([v]) => updateSetting('cameraFOV', v)} />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="ocean" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Ocean Level</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Sea Level (m)</span>
                        <span className="text-cyan-400">{settings.oceanLevel.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.oceanLevel]} min={-500} max={500} step={10} onValueChange={([v]) => updateSetting('oceanLevel', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Waves</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Wave Height (m)</span>
                        <span className="text-cyan-400">{settings.waveHeight.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.waveHeight]} min={0} max={10} step={0.1} onValueChange={([v]) => updateSetting('waveHeight', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Wave Speed</span>
                        <span className="text-cyan-400">{settings.waveSpeed.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.waveSpeed]} min={0} max={3} step={0.1} onValueChange={([v]) => updateSetting('waveSpeed', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Water Material</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Fresnel</span>
                        <span className="text-cyan-400">{settings.oceanFresnel.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.oceanFresnel]} min={0.01} max={0.1} step={0.005} onValueChange={([v]) => updateSetting('oceanFresnel', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Roughness</span>
                        <span className="text-cyan-400">{settings.oceanRoughness.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.oceanRoughness]} min={0.1} max={1} step={0.05} onValueChange={([v]) => updateSetting('oceanRoughness', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Foam Intensity</span>
                        <span className="text-cyan-400">{settings.foamIntensity.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.foamIntensity]} min={0} max={1} step={0.05} onValueChange={([v]) => updateSetting('foamIntensity', v)} />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="effects" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">Fog</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Density</span>
                        <span className="text-cyan-400">{settings.fogDensity.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.fogDensity]} min={0} max={1} step={0.02} onValueChange={([v]) => updateSetting('fogDensity', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Height (m)</span>
                        <span className="text-cyan-400">{settings.fogHeight.toFixed(0)}</span>
                      </div>
                      <Slider value={[settings.fogHeight]} min={0} max={2000} step={50} onValueChange={([v]) => updateSetting('fogHeight', v)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyan-300">God Rays</h3>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Intensity</span>
                        <span className="text-cyan-400">{settings.godRayIntensity.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.godRayIntensity]} min={0} max={2} step={0.05} onValueChange={([v]) => updateSetting('godRayIntensity', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Decay</span>
                        <span className="text-cyan-400">{settings.godRayDecay.toFixed(2)}</span>
                      </div>
                      <Slider value={[settings.godRayDecay]} min={0.8} max={0.99} step={0.01} onValueChange={([v]) => updateSetting('godRayDecay', v)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Steps</span>
                        <span className="text-cyan-400">{settings.godRaySteps}</span>
                      </div>
                      <Slider value={[settings.godRaySteps]} min={4} max={32} step={2} onValueChange={([v]) => updateSetting('godRaySteps', v)} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      )}
    </div>
  );
}