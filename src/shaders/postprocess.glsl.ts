// ═══════════════════════════════════════════════════════════════════════════════
// POST-PROCESS GLSL - Fog, god rays, TAA, bloom, color grading
// Depends on: SHARED_GLSL
// ═══════════════════════════════════════════════════════════════════════════════

export const POSTPROCESS_UNIFORMS = `
uniform float uTAAStrength;
uniform float uBloomIntensity;
uniform float uBloomThreshold;
uniform float uExposure;
uniform float uSaturation;
uniform float uVignetteStrength;
uniform float uChromaticAberration;
uniform float uRenderScale;

uniform bool uShowFog;
uniform float uFogDensity;
uniform float uFogHeight;
uniform vec3 uFogColor;

uniform bool uShowGodRays;
uniform float uGodRayIntensity;
uniform float uGodRayDecay;
uniform int uGodRaySteps;
`;

export const POSTPROCESS_GLSL = `
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
    vec3 bloom = extractBrightness(color);
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
`;

export const POSTPROCESS_DEFAULTS = {
  taaStrength: 0.3,
  bloomIntensity: 0.2,
  bloomThreshold: 0.8,
  exposure: 1.0,
  saturation: 1.1,
  vignetteStrength: 0.3,
  chromaticAberration: 0.5,
  fogDensity: 0.5,
  fogHeight: 500,
  fogColor: [0.6, 0.65, 0.7] as [number, number, number],
  godRayIntensity: 0.5,
  godRayDecay: 0.95,
  godRaySteps: 16,
};
