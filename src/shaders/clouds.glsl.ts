// ═══════════════════════════════════════════════════════════════════════════════
// CLOUDS GLSL - Volumetric cloud system
// Depends on: SHARED_GLSL, SKY_GLSL
// ═══════════════════════════════════════════════════════════════════════════════

export const CLOUDS_UNIFORMS = `
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
uniform bool uShowClouds;
uniform float uLightningIntensity;
uniform float uLightningTime;
`;

export const CLOUDS_GLSL = `
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

vec3 cloudScattering(vec3 pos, vec3 rd, float density, vec3 sunDir, vec3 lightColorUnused) {
    // PHYSICAL direct light at this cloud point — handles Earth shadow + sunset reddening
    vec3 sunLight = getSunLight(pos, sunDir);
    float lightTransmit = cloudLightMarch(pos, sunDir);

    float cosTheta = dot(rd, sunDir);
    float phase = dualLobePhase(cosTheta, 0.8, -0.5, 0.2);

    // Sky-driven ambient — clouds darken at night, blue/warm during day
    vec3 ambient = getSkyAmbient(pos, sunDir) * uCloudAmbient;
    vec3 direct = sunLight * lightTransmit * phase;

    float silverLining = pow(1.0 - abs(cosTheta), 8.0) * uCloudSilverLining;
    vec3 silver = sunLight * silverLining * lightTransmit;

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
`;

export const CLOUDS_DEFAULTS = {
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
  lightningIntensity: 0,
};
