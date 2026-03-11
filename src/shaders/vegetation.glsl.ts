// ═══════════════════════════════════════════════════════════════════════════════
// VEGETATION GLSL - Trees, grass, flowers, wind
// Depends on: SHARED_GLSL, SKY_GLSL, TERRAIN_GLSL
// ═══════════════════════════════════════════════════════════════════════════════

export const VEGETATION_UNIFORMS = `
uniform float uVegetationDensity;
uniform float uTreeHeight;
uniform float uGrassHeight;
uniform float uWindStrength;
uniform vec3 uTreeColor;
uniform vec3 uFlowerColors[4];
uniform bool uShowVegetation;
`;

export const VEGETATION_GLSL = `
// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURAL VEGETATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

float getWindOffset(vec3 pos, float height) {
    float windTime = iTime * 2.0 + pos.x * 0.1 + pos.z * 0.15;
    float windNoise = sin(windTime) * 0.5 + sin(windTime * 2.3) * 0.3 + sin(windTime * 3.7) * 0.2;
    float swayAmount = height * uWindStrength * (uWindSpeed + 0.5);
    return windNoise * swayAmount;
}

vec4 renderTree(vec3 ro, vec3 rd, vec3 treePos, float treeHeight, float treeWidth, vec3 sunDir, vec3 lightColor) {
    vec3 treeCenter = treePos + vec3(0.0, treeHeight * 0.5, 0.0);
    vec3 toCamera = normalize(ro - treeCenter);
    
    float windOffset = getWindOffset(treePos, 1.0);
    treeCenter.x += windOffset * treeHeight * 0.1;
    
    vec3 normal = vec3(toCamera.x, 0.0, toCamera.z);
    normal = normalize(normal);
    
    float d = dot(treePos - ro, normal) / dot(rd, normal);
    if(d < 0.0) return vec4(0.0);
    
    vec3 hitPos = ro + rd * d;
    vec3 localPos = hitPos - treePos;
    
    float halfWidth = treeWidth * 0.5;
    float localX = dot(localPos, normalize(vec3(-normal.z, 0.0, normal.x)));
    
    if(abs(localX) > halfWidth || localPos.y < 0.0 || localPos.y > treeHeight) {
        return vec4(0.0);
    }
    
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
    
    vec3 color;
    if(relY < trunkHeight) {
        color = vec3(0.3, 0.2, 0.1);
    } else {
        color = uTreeColor;
        float variation = hash12(treePos.xz) * 0.3 + 0.7;
        color *= variation;
        color += vec3(0.1, 0.15, 0.05) * abs(windOffset);
    }
    
    float NdotL = max(0.3, dot(vec3(0.0, 1.0, 0.0), sunDir));
    color *= lightColor * NdotL * 0.5 + 0.5;
    
    return vec4(color, d);
}

float renderGrass(vec3 worldPos, vec3 normal, vec3 sunDir, vec3 lightColor, inout vec3 grassColor) {
    if(!uShowVegetation) return 0.0;
    
    float relHeight = worldPos.y - uOceanLevel;
    if(relHeight < uBeachWidth || relHeight > uTreeLine * 0.9) return 0.0;
    if(normal.y < 0.7) return 0.0;
    
    vec2 gridPos = worldPos.xz * 0.5;
    vec2 cellId = floor(gridPos);
    vec2 cellUV = fract(gridPos);
    
    float density = hash12(cellId) * uVegetationDensity;
    if(density < 0.3) return 0.0;
    
    vec2 bladePos = hash22(cellId) * 0.8 + 0.1;
    float dist = length(cellUV - bladePos);
    if(dist > 0.15) return 0.0;
    
    float height = uGrassHeight * (0.6 + hash12(cellId + 0.5) * 0.4);
    float windSway = getWindOffset(worldPos, height * 0.01);
    
    float colorVar = hash12(cellId + 1.0);
    grassColor = mix(uGrassColor, uGrassColor * 1.3, colorVar);
    grassColor = mix(grassColor, vec3(0.4, 0.35, 0.1), colorVar * 0.3);
    
    if(hash12(cellId + 2.0) > 0.85 && uVegetationDensity > 0.5) {
        int flowerType = int(hash12(cellId + 3.0) * 4.0);
        grassColor = mix(grassColor, uFlowerColors[flowerType], 0.6);
    }
    
    float NdotL = max(0.4, dot(normal, sunDir));
    grassColor *= lightColor * NdotL * 0.6 + 0.4;
    
    return smoothstep(0.15, 0.0, dist) * (1.0 - abs(windSway) * 0.3);
}

vec4 renderVegetation(vec3 ro, vec3 rd, vec3 terrainHit, vec3 terrainNormal, float terrainHeight, vec3 sunDir, vec3 lightColor) {
    if(!uShowVegetation) return vec4(0.0);
    
    float relHeight = terrainHeight - uOceanLevel;
    if(relHeight < uBeachWidth || relHeight > uTreeLine) return vec4(0.0);
    
    vec4 result = vec4(0.0);
    
    vec2 gridPos = terrainHit.xz * 0.01;
    
    for(int x = -2; x <= 2; x++) {
        for(int z = -2; z <= 2; z++) {
            vec2 cellId = floor(gridPos) + vec2(float(x), float(z));
            
            float treeDensity = hash12(cellId * 7.31) * uVegetationDensity;
            if(treeDensity < 0.6) continue;
            
            vec2 treeXZ = (cellId + hash22(cellId * 3.14) * 0.8 + 0.1) * 100.0;
            float treeY = getTerrainHeight(treeXZ);
            
            float treeRelHeight = treeY - uOceanLevel;
            if(treeRelHeight < uBeachWidth * 2.0 || treeRelHeight > uTreeLine * 0.8) continue;
            
            vec3 treePos = vec3(treeXZ.x, treeY, treeXZ.y);
            float treeH = uTreeHeight * (0.7 + hash12(cellId * 5.0) * 0.6);
            float treeW = treeH * 0.4;
            
            vec4 tree = renderTree(ro, rd, treePos, treeH, treeW, sunDir, lightColor);
            
            if(tree.a > 0.0 && (result.a <= 0.0 || tree.a < result.a)) {
                result = tree;
            }
        }
    }
    
    return result;
}
`;

export const VEGETATION_DEFAULTS = {
  vegetationDensity: 0.7,
  treeHeight: 30,
  grassHeight: 0.5,
  windStrength: 0.5,
  treeColor: [0.15, 0.35, 0.1] as [number, number, number],
  flowerColors: [
    [0.9, 0.3, 0.4] as [number, number, number],
    [0.9, 0.8, 0.2] as [number, number, number],
    [0.4, 0.3, 0.9] as [number, number, number],
    [0.95, 0.95, 0.95] as [number, number, number],
  ],
};
