# PROCEDURAL EARTH ENGINE - QUICK REFERENCE
## Distilled Guide for Implementation

---

## 🎯 EXECUTIVE VISION

Build the most advanced real-time procedural Earth visualization for web platform combining:
- **Volumetric Clouds** (al-ro Shadertoy methodology)
- **GPT Waves V7 Ocean** (height-field simulation, caustics, bubbles)
- **WebGPU-Ready Terrain** (multi-LOD, biomes, erosion)
- **Atmospheric Scattering** (Rayleigh, Mie, ozone)
- **Dynamic Weather** (precipitation, storms, wind)
- **Volumetric Lighting** (god rays, shadows)
- **Day/Night Cycle** (sun, moon, stars, auroras)

---

## 🏗️ CORE PRINCIPLES

1. **PHYSICAL ACCURACY** - All phenomena based on real physics equations
2. **TEMPORAL COHERENCE** - Smooth transitions, TAA, motion-aware rendering
3. **SCALE INVARIANCE** - Works from orbital to ground-level views
4. **PERFORMANCE FIRST** - 60fps target with adaptive quality
5. **MODULARITY** - Independent systems that compose beautifully
6. **INTERACTIVITY** - Real-time parameter control for all systems

---

## 📐 MULTI-PASS RENDERING PIPELINE

```
Pass 0: Depth Pre-Pass (occlusion culling)
Pass 1: Shadow Map Generation (cascaded + volumetric)
Pass 2: G-Buffer (terrain, ocean surface, objects)
Pass 3: Volumetric Clouds (raymarching)
Pass 4: Atmospheric Scattering (sky, fog)
Pass 5: Ocean Subsurface (underwater, caustics)
Pass 6: Volumetric Lighting (god rays)
Pass 7: Weather Effects (rain, snow, fog particles)
Pass 8: Composite + HDR Tonemapping
Pass 9: Post-Processing (TAA, bloom, color grading)
```

---

## ☁️ VOLUMETRIC CLOUD ENGINE

### Core Algorithm: Raymarching with Beer-Powder Scattering

**Density Sampling:**
```glsl
float sampleCloudDensity(vec3 pos, bool cheap) {
    // 1. Height gradient (cumulus profile)
    float heightGrad = getCloudHeightGradient(pos);
    
    // 2. Shape noise (Perlin-Worley)
    float shape = perlinWorley(pos * shapeScale, 4);
    
    // 3. Apply coverage
    float density = remap(shape * heightGrad, 1.0 - coverage, 1.0, 0.0, 1.0);
    
    // 4. Detail erosion (expensive)
    if (!cheap && density > 0.0) {
        float detail = fbm(pos * detailScale, 3);
        density = remap(density, detail * 0.2, 1.0, 0.0, 1.0);
    }
    
    return density * globalDensity;
}
```

**Beer-Powder Scattering:**
```glsl
float beerPowder(float depth) {
    float beer = exp(-depth);
    float powder = 1.0 - exp(-depth * 2.0);
    return beer * mix(1.0, powder, powderStrength);
}
```

**Phase Function (Henyey-Greenstein):**
```glsl
float hgPhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}
```

### Key Uniforms (60+ Parameters)
- Volume: cloudBase, cloudTop, cloudExtent
- Density: cloudDensity (0.01-0.2), cloudCoverage (0-1), absorption
- Shape: shapeScale (0.01-0.1), shapeSpeed, shapeOctaves
- Detail: detailScale (0.1-0.5), detailStrength (0.1-0.4)
- Lighting: powderStrength, silverLiningIntensity, ambientStrength
- Phase: forwardG (0.6-0.9), backwardG (-0.3 to -0.6)
- Quality: primarySteps (32-128), lightSteps (6-16)

---

## 🌊 OCEAN & WAVE SIMULATION

### Height-Field Wave Equation
```glsl
// Finite difference wave simulation
float laplacian = (left + right + up + down) / 4.0 - center;
float newVelocity = velocity + laplacian * waveSpeed² * dt;
newVelocity *= damping;
float newHeight = height + newVelocity * dt;
```

### Gerstner Waves
```glsl
vec3 gerstnerWave(vec2 pos, float time, vec2 dir, float steepness, float wavelength) {
    float k = TAU / wavelength;
    float c = sqrt(9.8 / k);
    float f = k * (dot(dir, pos) - c * time);
    float a = steepness / k;
    return vec3(dir.x * a * cos(f), a * sin(f), dir.y * a * cos(f));
}
```

### Caustics (Refraction-Based)
```glsl
// Project refracted light to floor
vec3 refractDir = refract(-lightDir, normal, 1.0/1.33);
float t = (floorDepth - surfacePos.y) / refractDir.y;
vec2 floorHit = surfacePos.xz + refractDir.xz * t;

// Intensity from area change
float area = abs(dFdx(floorHit.x) * dFdy(floorHit.y) - dFdx(floorHit.y) * dFdy(floorHit.x));
float intensity = originalArea / max(area, 0.0001);
```

### PBR Water Surface
1. **Fresnel**: F0 = 0.02 (water IOR)
2. **Reflection**: Sky + clouds
3. **Refraction**: Underwater color with depth fade
4. **Subsurface Scattering**: Wave crest light transmission
5. **Foam**: Jacobian-based detection
6. **Cloud Shadows**: Sample shadow map

---

## ⛰️ TERRAIN GENERATION

### Height Generation
```glsl
float getTerrainHeight(vec2 pos) {
    // Continental scale
    float continent = fbm(pos * 0.5, 2);
    
    // Mountain ridges (ridged FBM)
    float mountains = ridgedFbm(pos * 2.0, 5);
    
    // Hills
    float hills = fbm(pos * 4.0, 4);
    
    // Detail
    float detail = fbm(pos * 16.0, 3);
    
    return continent * (mountains + hills + detail);
}
```

### Biome Classification
- Beach: Near water level, low slope
- Grass: Low elevation, low slope
- Rock: Steep slopes or high altitude
- Snow: Above snow line, moderate slope

### Triplanar Mapping
```glsl
vec4 triplanarSample(sampler2DArray tex, int layer, vec3 worldPos, vec3 normal) {
    vec3 blend = abs(normal);
    blend /= (blend.x + blend.y + blend.z);
    
    vec4 xProj = texture(tex, vec3(worldPos.yz, layer));
    vec4 yProj = texture(tex, vec3(worldPos.xz, layer));
    vec4 zProj = texture(tex, vec3(worldPos.xy, layer));
    
    return xProj * blend.x + yProj * blend.y + zProj * blend.z;
}
```

---

## 🌤️ ATMOSPHERIC SCATTERING

### Constants
```glsl
vec3 βR = vec3(5.8e-6, 13.5e-6, 33.1e-6);  // Rayleigh coefficients
vec3 βM = vec3(21e-6);                       // Mie coefficient
float HR = 8000.0;                           // Rayleigh scale height
float HM = 1200.0;                           // Mie scale height
float g = 0.76;                              // Mie anisotropy
```

### Rayleigh Phase
```glsl
float rayleighPhase(float cosTheta) {
    return (3.0 / 16.0 * PI) * (1.0 + cosTheta * cosTheta);
}
```

### Mie Phase (Henyey-Greenstein)
```glsl
float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}
```

---

## ☀️ GOD RAYS

### Screen-Space Radial Blur
```glsl
vec3 godRays(vec2 uv, vec2 sunScreenPos) {
    vec2 deltaUV = (uv - sunScreenPos) * density / float(samples);
    vec3 accumColor = vec3(0.0);
    float illuminationDecay = 1.0;
    
    for (int i = 0; i < samples; i++) {
        uv -= deltaUV;
        float occlusion = texture(occlusionTex, uv).r;
        accumColor += occlusion * illuminationDecay * weight;
        illuminationDecay *= decay;
    }
    
    return accumColor * intensity;
}
```

---

## 📊 NOISE FUNCTIONS

### Hash Functions
```glsl
float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}
```

### Gradient (Perlin) Noise
```glsl
float gradientNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // Quintic
    
    // 8-corner dot products with gradients
    return mix(mix(mix(...), u.z);
}
```

### Worley (Cellular) Noise
```glsl
float worleyNoise(vec3 p) {
    vec3 n = floor(p);
    vec3 f = fract(p);
    float d = 1.0;
    
    for(int k = -1; k <= 1; k++)
    for(int j = -1; j <= 1; j++)
    for(int i = -1; i <= 1; i++) {
        vec3 g = vec3(i, j, k);
        vec3 o = hash33(n + g);
        vec3 r = g + o - f;
        d = min(d, dot(r, r));
    }
    
    return 1.0 - sqrt(d);
}
```

### Perlin-Worley Hybrid (Clouds)
```glsl
float perlinWorley(vec3 p, int octaves) {
    float perlin = fbm(p, octaves);
    float worley = worleyNoise(p * 4.0);
    return remap(perlin, worley - 1.0, 1.0, 0.0, 1.0);
}
```

### Ridged FBM (Mountains)
```glsl
float ridgedFbm(vec3 p, int octaves) {
    float value = 0.0, amplitude = 0.5, frequency = 1.0, prev = 1.0;
    
    for(int i = 0; i < octaves; i++) {
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
```

---

## ⚡ PERFORMANCE TARGETS

### Frame Budget (16.67ms @ 60fps)
| Pass | Budget |
|------|--------|
| Depth Pre-Pass | 0.5ms |
| Shadow Maps | 1.5ms |
| Terrain | 2.0ms |
| Ocean | 2.5ms |
| Clouds | 4.0ms |
| Atmosphere | 0.5ms |
| God Rays | 0.5ms |
| Weather | 1.0ms |
| Post-Process | 2.0ms |
| CPU | 1.5ms |

### Quality Presets
| Setting | Low | Medium | High | Ultra |
|---------|-----|--------|------|-------|
| Cloud Steps | 24 | 48 | 64 | 96 |
| Light Steps | 4 | 6 | 8 | 12 |
| Shadow Res | 512 | 1024 | 2048 | 4096 |
| Ocean Res | 128 | 256 | 256 | 512 |

---

## 🎨 TEXTURE MEMORY

| Texture | Format | Size | Purpose |
|---------|--------|------|---------|
| cloudNoiseShape | RGBA8 | 128³ | Cloud FBM |
| cloudNoiseDetail | RGBA8 | 64³ | Detail FBM |
| blueNoise | R8 | 128² | Dithering |
| waveSimulation | RGBA32F | 256² | Height + velocity |
| terrainHeight | R32F | 2048² | Height data |
| shadowCascades | D32F | 1024² × 4 | Shadows |

**Total VRAM**: ~180MB @ 1080p, ~400MB @ 4K

---

## 🔄 SYSTEM DEPENDENCIES

```
Level 0: Time/Date → Camera → Resources
    ↓
Level 1: Celestial → Weather → Atmosphere
    ↓
Level 2: Clouds → Terrain → Ocean
    ↓
Level 3: Precipitation → Foam/Spray → Vegetation
```

**Cross-System Data Flow:**
- Celestial → ALL: sunDir, moonDir, time
- Weather → Clouds, Ocean, Particles: wind, coverage, precip
- Clouds → Terrain, Ocean: shadowMap, cloudColor

---

## 📋 IMPLEMENTATION PHASES

### Phase 1: Core Foundations (Week 1-2)
1. Noise library (Perlin, Worley, FBM)
2. Basic cloud raymarching
3. Terrain height generation
4. Ocean surface (Gerstner waves)

### Phase 2: Lighting & Atmosphere (Week 2-3)
1. Atmospheric scattering
2. Cloud lighting (Beer-Powder)
3. Cloud shadows
4. God rays

### Phase 3: Ocean Enhancement (Week 3-4)
1. Height-field simulation
2. Caustics
3. Foam system
4. Subsurface scattering

### Phase 4: Weather & Polish (Week 4+)
1. Weather state machine
2. Precipitation particles
3. Wind field
4. TAA & post-processing

---

## 🔧 KEY FILES

- `docs/PROCEDURAL_EARTH_MASTER_ARCHITECTURE.md` - Complete 4000+ line architecture document
- `docs/PROCEDURAL_EARTH_IMPLEMENTATION.tsx` - Working React/Three.js implementation
- `docs/PROCEDURAL_EARTH_QUICK_REFERENCE.md` - This file

---

*Use these docs as your guiding light for building the most advanced procedural Earth system on WebGPU!*
