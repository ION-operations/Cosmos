// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER GLSL - Rain, snow, lightning particles
// Depends on: SHARED_GLSL
// ═══════════════════════════════════════════════════════════════════════════════

export const WEATHER_UNIFORMS = `
uniform bool uShowWeather;
uniform float uLightningIntensity;
uniform float uLightningTime;
`;

export const WEATHER_GLSL = `
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
`;

export const WEATHER_DEFAULTS = {
  weatherType: 0,
  weatherIntensity: 0.7,
  windSpeed: 0.5,
  windDirection: 0.5,
  lightningIntensity: 1.0,
};
