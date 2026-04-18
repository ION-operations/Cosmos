// ═══════════════════════════════════════════════════════════════════════════════
// OCEAN GLSL - Wave simulation, foam, caustics, underwater
// Depends on: SHARED_GLSL, SKY_GLSL
// ═══════════════════════════════════════════════════════════════════════════════

export const OCEAN_UNIFORMS = `
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
uniform bool uShowOcean;

// Foam sub-types
uniform float uFoamJacobianStrength;
uniform float uFoamShorelineStrength;
uniform float uFoamTurbulentStrength;
uniform float uFoamWindstreakStrength;
uniform float uFoamSprayStrength;
uniform float uFoamVoronoiStrength;
uniform float uFoamShorelineWidth;
uniform float uFoamDecay;
uniform float uFoamScale;

// Underwater
uniform float uUnderwaterFogDensity;
uniform vec3 uUnderwaterFogColor;
uniform float uUnderwaterCausticsStrength;
uniform float uUnderwaterGodRayStrength;
uniform float uUnderwaterBubbleCount;

// Feature toggles
uniform bool uEnableWaves;
uniform bool uEnableFresnel;
uniform bool uEnableCaustics;
uniform bool uEnableFoam;
uniform bool uEnableFoamJacobian;
uniform bool uEnableFoamShoreline;
uniform bool uEnableFoamTurbulent;
uniform bool uEnableFoamWindstreak;
uniform bool uEnableFoamSpray;
uniform bool uEnableFoamVoronoi;
uniform bool uEnableSSS;
uniform bool uEnableBubbles;
uniform bool uEnableUnderwaterCaustics;
uniform bool uEnableUnderwaterGodRays;
uniform bool uEnableUnderwaterBubbles;
`;

export const OCEAN_GLSL = `
// ═══════════════════════════════════════════════════════════════════════════
// HYPER-REALISTIC RAYMARCHED OCEAN (TDM Seascape Methodology)
// ═══════════════════════════════════════════════════════════════════════════

const mat2 octave_m = mat2(1.6, 1.2, -1.2, 1.6);

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

float sea_octave(vec2 uv, float choppy) {
    uv += vec2(oceanNoise(uv), oceanNoise(uv + 7.3));
    vec2 wv = 1.0 - abs(sin(uv));
    vec2 swv = abs(cos(uv));
    wv = mix(wv, swv, wv);
    return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);
}

float oceanMap(vec3 p, int iterations) {
    if(!uEnableWaves) return p.y;
    
    float SEA_FREQ = uWaveFrequency * 0.16;
    float SEA_HEIGHT = uWaveHeight * 0.6;
    float SEA_CHOPPY = 4.0 + uOceanRoughness * 4.0;
    float SEA_TIME = iTime * uWaveSpeed * 0.8;
    
    float freq = SEA_FREQ;
    float amp = SEA_HEIGHT;
    float choppy = SEA_CHOPPY;
    vec2 uv = p.xz;
    uv.x *= 0.75;
    
    float windAngle = uWindDirection;
    mat2 windRot = mat2(cos(windAngle), -sin(windAngle), sin(windAngle), cos(windAngle));
    uv = windRot * uv;
    
    float d, h = 0.0;
    for(int i = 0; i < 8; i++) {
        if(i >= iterations) break;
        
        d = sea_octave((uv + SEA_TIME) * freq, choppy);
        d += sea_octave((uv - SEA_TIME) * freq, choppy);
        
        h += d * amp;
        
        uv = octave_m * uv;
        
        freq *= 1.9;
        amp *= 0.22;
        choppy = mix(choppy, 1.0, 0.2);
    }
    
    if(uWeatherType == 3) {
        float stormWave = sea_octave(p.xz * 0.05 + SEA_TIME * 0.5, 2.0);
        h += stormWave * uWeatherIntensity * uWaveHeight * 1.5;
    }
    
    return p.y - h;
}

float oceanMapDetailed(vec3 p) {
    return oceanMap(p, 8);
}

float oceanMapCoarse(vec3 p) {
    return oceanMap(p, 5);
}

float heightMapTracing(vec3 ori, vec3 dir, out vec3 hitPoint) {
    float tm = 0.0;
    float tx = 2000.0;
    
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

vec3 getOceanNormal(vec3 p, float eps) {
    vec3 n;
    n.y = oceanMapDetailed(p);
    n.x = oceanMapDetailed(vec3(p.x + eps, p.y, p.z)) - n.y;
    n.z = oceanMapDetailed(vec3(p.x, p.y, p.z + eps)) - n.y;
    n.y = eps;
    return normalize(n);
}

float getCaustics(vec3 worldPos, float time) {
    vec2 uv = worldPos.xz * 0.05;
    float c = 0.0;
    for(float i = 0.0; i < 3.0; i++) {
        vec2 p = uv * (1.5 + i * 0.5) + vec2(time * (0.2 + i * 0.1), time * (0.15 - i * 0.05));
        float w = worleyNoise(vec3(p, i + time * 0.2));
        c += pow(w, 3.0 - i * 0.5) * (1.0 - i * 0.25);
    }
    return saturate(c * 0.8);
}

float getBubbles(vec3 worldPos, float time) {
    vec3 bp = worldPos * vec3(0.08, 0.15, 0.08);
    bp.y += time * 1.5;
    float bubbles = 0.0;
    for(float i = 0.0; i < 3.0; i++) {
        vec3 offset = vec3(i * 1.7, i * 2.3, i * 1.1);
        float b = worleyNoise(bp * (1.0 + i * 0.3) + offset);
        bubbles += pow(b, 5.0);
    }
    return saturate(bubbles * uBubbleIntensity * 0.5);
}

float oceanDiffuse(vec3 n, vec3 l, float p) {
    return pow(dot(n, l) * 0.4 + 0.6, p);
}

float oceanSpecular(vec3 n, vec3 l, vec3 e, float s) {
    float nrm = (s + 8.0) / (PI * 8.0);
    return pow(max(dot(reflect(e, n), l), 0.0), s) * nrm;
}

// ═══════════════════════════════════════════════════════════════════════════
// FOAM SYSTEM — 6 TECHNIQUES
// ═══════════════════════════════════════════════════════════════════════════

float foamJacobian(vec3 p, vec3 normal) {
    float steepness = 1.0 - normal.y;
    float curvature = smoothstep(0.2, 0.8, steepness);
    float noise = hash12(p.xz * uFoamScale * 3.0 + iTime * 0.5) * 0.5 + 0.5;
    return saturate(curvature * noise * uFoamJacobianStrength);
}

float foamShoreline(vec3 p) {
    float terrainH = getTerrainHeight(p.xz);
    float depth = p.y - terrainH;
    if(depth > uFoamShorelineWidth * 2.0) return 0.0;
    float shoreProximity = 1.0 - smoothstep(0.0, uFoamShorelineWidth, depth);
    float surge = sin(p.x * 0.05 + iTime * uWaveSpeed * 2.0) * 0.5 + 0.5;
    float cellFoam = hash12(floor(p.xz * uFoamScale * 8.0) + iTime * 0.1);
    cellFoam = smoothstep(0.3, 0.8, cellFoam);
    return saturate(shoreProximity * cellFoam * surge * uFoamShorelineStrength);
}

float foamTurbulent(vec3 p, vec3 normal) {
    float steepness = 1.0 - normal.y;
    float breakThreshold = smoothstep(0.3, 0.7, steepness);
    float noise1 = hash12(p.xz * uFoamScale * 1.5 + iTime * 0.2);
    float noise2 = hash12(p.xz * uFoamScale * 4.0 + iTime * 0.4);
    float foam = breakThreshold * (noise1 * 0.6 + noise2 * 0.4);
    return saturate(foam * uFoamTurbulentStrength);
}

float foamWindstreak(vec3 p) {
    float windAngle = uWindDirection;
    vec2 windDir = vec2(cos(windAngle), sin(windAngle));
    vec2 perpDir = vec2(-windDir.y, windDir.x);
    float perpDist = dot(p.xz, perpDir);
    float alongDist = dot(p.xz, windDir);
    float streakFreq = uFoamScale * 0.3;
    float streak = sin(perpDist * streakFreq + hash12(vec2(alongDist * 0.02, 0.0)) * 3.0);
    streak = smoothstep(0.7, 1.0, streak);
    float windFactor = smoothstep(0.2, 0.8, uWindSpeed);
    return saturate(streak * windFactor * uFoamWindstreakStrength);
}

float foamSpray(vec3 p, vec3 normal, float waveHeight) {
    float crestFactor = smoothstep(0.0, 0.5, waveHeight) * smoothstep(0.5, 0.9, normal.y);
    float windTear = smoothstep(0.3, 1.0, uWindSpeed);
    float windAngle = uWindDirection;
    vec2 windOffset = vec2(cos(windAngle), sin(windAngle)) * iTime * uWindSpeed * 5.0;
    float particles = hash12((p.xz + windOffset) * uFoamScale * 12.0);
    particles = smoothstep(0.5, 0.9, particles);
    return saturate(crestFactor * windTear * particles * uFoamSprayStrength);
}

float foamVoronoi(vec3 p) {
    vec2 uv = p.xz * uFoamScale * 5.0 + iTime * 0.1;
    vec2 n = floor(uv);
    vec2 f = fract(uv);
    float md = 8.0;
    for(int j = -1; j <= 1; j++)
    for(int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash22(n + g);
        o = 0.5 + 0.5 * sin(iTime * 0.3 + o * TAU);
        float d = length(g + o - f);
        md = min(md, d);
    }
    float foam = smoothstep(0.3, 0.0, md);
    return saturate(foam * uFoamVoronoiStrength * 0.5);
}

vec3 computeAllFoam(vec3 p, vec3 normal, vec3 sunDir, vec3 lightColorUnused, float dist, float waveHeight) {
    if(!uEnableFoam || uFoamIntensity <= 0.0) return vec3(0.0);
    if(dist > 3000.0) return vec3(0.0);

    float totalFoam = 0.0;
    if(uEnableFoamJacobian) totalFoam += foamJacobian(p, normal);
    if(uEnableFoamShoreline) totalFoam += foamShoreline(p);
    if(uEnableFoamTurbulent) totalFoam += foamTurbulent(p, normal);
    if(uEnableFoamWindstreak) totalFoam += foamWindstreak(p);
    if(uEnableFoamSpray) totalFoam += foamSpray(p, normal, waveHeight);
    if(uEnableFoamVoronoi) totalFoam += foamVoronoi(p);

    totalFoam = saturate(totalFoam) * uFoamIntensity;
    if(totalFoam < 0.001) return vec3(0.0);

    vec3 sunLight = getSunLight(p, sunDir);
    vec3 ambient = getSkyAmbient(p, sunDir) * 0.6;
    vec3 foamAlbedo = vec3(0.85, 0.88, 0.9);
    float NdotL = max(dot(normal, sunDir), 0.0) * 0.6 + 0.4;
    vec3 foamColor = foamAlbedo * (sunLight * NdotL + ambient);

    float distFade = smoothstep(3000.0, 500.0, dist);
    totalFoam *= distFade;

    return foamColor * totalFoam;
}

vec3 getOceanColor(vec3 p, vec3 n, vec3 sunDir, vec3 lightColorUnused, vec3 eye, float dist) {
    // Physical sun reaching this water point (handles Earth shadow + sunset color)
    vec3 sunLight = getSunLight(p, sunDir);
    vec3 ambient  = getSkyAmbient(p, sunDir);

    float fresnel = 0.0;
    if(uEnableFresnel) {
        fresnel = clamp(1.0 - dot(n, -eye), 0.0, 1.0);
        fresnel = pow(fresnel, 3.0) * 0.5;
    }

    // Reflected sky (already physically correct: includes Rayleigh/Mie/sunset)
    vec3 reflectedDir = reflect(eye, n);
    vec3 reflected = getSkyColor(reflectedDir, sunDir);

    // Deep water absorption — modulated by ambient so it goes near-black at night
    vec3 seaBase = uOceanDeepColor * (ambient * 1.5 + 0.05);
    vec3 seaWaterColor = uOceanColor * 1.5 + vec3(0.0, 0.1, 0.05);
    vec3 refracted = seaBase + oceanDiffuse(n, sunDir, 80.0) * seaWaterColor * 0.12 * (sunLight * 0.5 + ambient);

    vec3 color = mix(refracted, reflected, fresnel);

    float waveHeight = oceanMapDetailed(p);
    float heightBoost = max(p.y - waveHeight, 0.0);
    float atten = max(1.0 - dist * dist * 0.0000015, 0.0);
    color += seaWaterColor * heightBoost * 0.18 * atten * (sunLight * 0.4 + ambient * 0.6);

    if(uEnableSSS) {
        float sss = pow(saturate(dot(-eye, sunDir + n * 0.4)), 3.0);
        vec3 sssColor = vec3(0.0, 0.15, 0.1) * sss * uSSSIntensity * atten * sunLight;
        color += sssColor;
    }

    // Specular sun glitter — uses physical sun color so it reddens at sunset, vanishes at night
    float spec = oceanSpecular(n, sunDir, eye, 60.0);
    color += spec * sunLight;

    if(uEnableCaustics) {
        float caustics = getCaustics(p, iTime) * uCausticsIntensity * 0.08;
        color += caustics * sunLight * atten;
    }

    float waveH = oceanMapDetailed(p);
    vec3 foamContribution = computeAllFoam(p, n, sunDir, vec3(0.0), dist, max(p.y - waveH, 0.0));
    color += foamContribution;

    // Aerial perspective: distant water blends with sky
    vec3 inscatterColor = getSkyColor(eye, sunDir);
    color = applyAerialPerspective(color, uCameraPos, eye, dist, sunDir, inscatterColor);

    return color;
}

// ═══════════════════════════════════════════════════════════════════════════
// UNDERWATER RENDERING
// ═══════════════════════════════════════════════════════════════════════════

vec4 renderUnderwater(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor) {
    float underwaterGodRays = 0.0;
    if(uEnableUnderwaterGodRays && uUnderwaterGodRayStrength > 0.0) {
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
    float caustics = 0.0;
    if(uEnableUnderwaterCaustics) {
        caustics = getCaustics(surfacePos, iTime) * uUnderwaterCausticsStrength;
    }
    
    float fogFactor = 1.0 - exp(-depth * uUnderwaterFogDensity * 0.005);
    vec3 underwaterFog = uUnderwaterFogColor * (1.0 + caustics * 0.5);
    
    float bubbles = 0.0;
    if(uEnableUnderwaterBubbles && uUnderwaterBubbleCount > 0.0) {
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

vec4 renderOcean(vec3 ro, vec3 rd, vec3 sunDir, vec3 lightColor, vec3 skyColor, float terrainDist) {
    if(!uShowOcean) return vec4(0.0);
    
    bool isUnderwater = ro.y < uOceanLevel;
    
    if(isUnderwater) {
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
    
    if(rd.y > 0.3) return vec4(0.0);
    
    vec3 hitPoint;
    float t = heightMapTracing(ro, rd, hitPoint);
    
    if(t > 1999.0) return vec4(0.0);
    if(terrainDist > 0.0 && t > terrainDist) return vec4(0.0);
    
    float eps = max(0.01, t * 0.002);
    vec3 normal = getOceanNormal(hitPoint, eps);
    
    vec3 oceanColor = getOceanColor(hitPoint, normal, sunDir, lightColor, rd, t);
    
    return vec4(oceanColor, t);
}
`;

export const OCEAN_DEFAULTS = {
  oceanLevel: 0,
  oceanColor: [0.0, 0.09, 0.18] as [number, number, number],
  oceanDeepColor: [0.0, 0.04, 0.1] as [number, number, number],
  waveHeight: 0.6,
  waveFrequency: 1.0,
  waveSpeed: 0.8,
  oceanFresnel: 0.04,
  oceanRoughness: 0.3,
  foamIntensity: 0.3,
  foamJacobianStrength: 0.8,
  foamShorelineStrength: 0.6,
  foamTurbulentStrength: 0.5,
  foamWindstreakStrength: 0.4,
  foamSprayStrength: 0.3,
  foamVoronoiStrength: 0.5,
  foamShorelineWidth: 50,
  foamDecay: 0.5,
  foamScale: 1.0,
  causticsIntensity: 0.3,
  bubbleIntensity: 0.15,
  sssIntensity: 0.4,
  underwaterFogDensity: 0.5,
  underwaterFogColor: [0.0, 0.2, 0.4] as [number, number, number],
  underwaterCausticsStrength: 1.0,
  underwaterGodRayStrength: 0.5,
  underwaterBubbleCount: 1.0,
  enableWaves: true,
  enableFresnel: true,
  enableCaustics: true,
  enableFoam: true,
  enableFoamJacobian: true,
  enableFoamShoreline: true,
  enableFoamTurbulent: true,
  enableFoamWindstreak: true,
  enableFoamSpray: true,
  enableFoamVoronoi: true,
  enableSSS: true,
  enableBubbles: true,
  enableUnderwaterCaustics: true,
  enableUnderwaterGodRays: true,
  enableUnderwaterBubbles: true,
};
