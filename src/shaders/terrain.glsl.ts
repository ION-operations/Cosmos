// ═══════════════════════════════════════════════════════════════════════════════
// TERRAIN GLSL - Height generation, materials, erosion, raymarching
// Depends on: SHARED_GLSL, SKY_GLSL (for lighting)
// ═══════════════════════════════════════════════════════════════════════════════

export const TERRAIN_UNIFORMS = `
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
uniform float uOceanLevel;
uniform bool uShowTerrain;
`;

export const TERRAIN_GLSL = `
// ═══════════════════════════════════════════════════════════════════════════
// TERRAIN SYSTEM WITH EROSION
// ═══════════════════════════════════════════════════════════════════════════

float getTerrainHeight(vec2 p) {
    vec2 pos = p * uTerrainScale * 0.001;
    
    float continent = fbm(vec3(pos * 0.3 + 7.3, 0.0), 3) * 0.5 + 0.5;
    continent = smoothstep(0.25, 0.65, continent);
    
    float mountains = ridgedFbm(vec3(pos * 1.5 + 3.7, 0.5), 5);
    mountains = pow(mountains, uMountainSharpness) * uMountainHeight;
    
    float hills = fbm(vec3(pos * 3.0 + 11.1, 1.0), 4) * uTerrainHeight * 0.4;
    
    float detail = fbm(vec3(pos * 12.0 + 5.5, 2.0), 3) * uTerrainHeight * 0.08;
    
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

vec4 raymarchTerrain(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor, out float hitDist) {
    hitDist = -1.0;
    if(!uShowTerrain) return vec4(0.0);
    
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
            
            float NdotL = max(0.0, dot(normal, sunDir));
            
            float lightningFlash = 0.0;
            if(uWeatherType == 3 && uLightningIntensity > 0.0) {
                lightningFlash = uLightningIntensity * exp(-abs(iTime - uLightningTime) * 10.0);
            }
            
            vec3 ambient = material.rgb * 0.25;
            vec3 diffuse = material.rgb * lightColor * NdotL;
            vec3 lightning = material.rgb * lightningFlash * 3.0;
            
            vec3 color = ambient + diffuse + lightning;
            
            return vec4(color, 1.0);
        }
        
        lastH = terrainHeight;
        lastY = pos.y;
        
        float stepScale = max(0.3, distToTerrain * 0.4);
        t += max(0.5, min(stepScale, 200.0 + t * 0.01));
        
        if(t > maxDist) break;
    }
    
    return vec4(0.0);
}
`;

export const TERRAIN_DEFAULTS = {
  terrainScale: 1.0,
  terrainHeight: 500,
  mountainHeight: 3000,
  mountainSharpness: 2.0,
  snowLine: 2500,
  treeLine: 2000,
  beachWidth: 50,
  erosionStrength: 0.3,
  oceanLevel: 0,
  grassColor: [0.2, 0.4, 0.1] as [number, number, number],
  rockColor: [0.4, 0.35, 0.3] as [number, number, number],
  snowColor: [0.95, 0.95, 1.0] as [number, number, number],
  sandColor: [0.8, 0.7, 0.5] as [number, number, number],
};
