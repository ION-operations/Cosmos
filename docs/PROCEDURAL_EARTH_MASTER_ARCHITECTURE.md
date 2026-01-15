# PROCEDURAL EARTH ENGINE - MASTER ARCHITECTURE DOCUMENT
## Version 1.0 - Hyper-Realistic Earth Simulation System
## Date: 2025-01-27
## Status: COMPREHENSIVE PLANNING DOCUMENT

---

# TABLE OF CONTENTS

1. [Executive Vision](#executive-vision)
2. [System Architecture Overview](#system-architecture-overview)
3. [Core Rendering Systems](#core-rendering-systems)
4. [Volumetric Cloud Engine](#volumetric-cloud-engine)
5. [Ocean & Wave Simulation](#ocean--wave-simulation)
6. [Terrain Generation System](#terrain-generation-system)
7. [Atmospheric Rendering](#atmospheric-rendering)
8. [Lighting & Shadow Systems](#lighting--shadow-systems)
9. [Weather & Climate Simulation](#weather--climate-simulation)
10. [Performance Architecture](#performance-architecture)
11. [Data Flow & Communication](#data-flow--communication)
12. [Implementation Roadmap](#implementation-roadmap)

---

# EXECUTIVE VISION

## The Ultimate Goal

Create the most advanced real-time procedural Earth visualization ever built for the web platform. This system will combine:

- **Volumetric Cloud Engine** (al-ro Shadertoy methodology)
- **GPT Waves V7 Ocean System** (height-field simulation, caustics, bubbles, breaching)
- **WebGPU-Ready Terrain Engine** (multi-LOD, biomes, erosion simulation)
- **Atmospheric Scattering** (Rayleigh, Mie, ozone absorption)
- **Dynamic Weather** (precipitation, storms, wind fields)
- **God Rays & Volumetric Lighting** (screen-space and volumetric)
- **Day/Night Cycle** (sun, moon, stars, auroras)

## Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HYPER-REALISM PRINCIPLES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. PHYSICAL ACCURACY: All phenomena based on real physics equations         │
│ 2. TEMPORAL COHERENCE: Smooth transitions, TAA, motion-aware rendering      │
│ 3. SCALE INVARIANCE: Works from orbital to ground-level views               │
│ 4. PERFORMANCE FIRST: 60fps target with adaptive quality                    │
│ 5. MODULARITY: Independent systems that compose beautifully                 │
│ 6. INTERACTIVITY: Real-time parameter control for all systems               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# SYSTEM ARCHITECTURE OVERVIEW

## Master System Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROCEDURAL EARTH ENGINE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      PRESENTATION LAYER                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ React UI     │  │ Controls     │  │ Performance  │               │   │
│  │  │ Components   │  │ Panels       │  │ Monitors     │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SCENE ORCHESTRATION LAYER                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Camera       │  │ Time/Day     │  │ Input        │               │   │
│  │  │ Controller   │  │ Controller   │  │ Handler      │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      RENDERING PIPELINE LAYER                         │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    MULTI-PASS RENDERER                          │ │   │
│  │  │                                                                  │ │   │
│  │  │  Pass 0: Depth Pre-Pass (occlusion culling)                    │ │   │
│  │  │  Pass 1: Shadow Map Generation (cascaded + volumetric)         │ │   │
│  │  │  Pass 2: G-Buffer (terrain, ocean surface, objects)            │ │   │
│  │  │  Pass 3: Volumetric Clouds (raymarching)                       │ │   │
│  │  │  Pass 4: Atmospheric Scattering (sky, fog)                     │ │   │
│  │  │  Pass 5: Ocean Subsurface (underwater, caustics)               │ │   │
│  │  │  Pass 6: Volumetric Lighting (god rays)                        │ │   │
│  │  │  Pass 7: Weather Effects (rain, snow, fog particles)           │ │   │
│  │  │  Pass 8: Composite + HDR Tonemapping                           │ │   │
│  │  │  Pass 9: Post-Processing (TAA, bloom, color grading)           │ │   │
│  │  │                                                                  │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SIMULATION SYSTEMS LAYER                         │   │
│  │                                                                       │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │   │
│  │  │ CLOUD      │ │ OCEAN      │ │ TERRAIN    │ │ WEATHER    │       │   │
│  │  │ SYSTEM     │ │ SYSTEM     │ │ SYSTEM     │ │ SYSTEM     │       │   │
│  │  │            │ │            │ │            │ │            │       │   │
│  │  │ •Density   │ │ •Wave Sim  │ │ •Height    │ │ •Wind      │       │   │
│  │  │ •Lighting  │ │ •Foam      │ │ •Normals   │ │ •Precip    │       │   │
│  │  │ •Shadows   │ │ •Caustics  │ │ •Biomes    │ │ •Clouds    │       │   │
│  │  │ •God Rays  │ │ •Bubbles   │ │ •Erosion   │ │ •Lightning │       │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │   │
│  │                                                                       │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │   │
│  │  │ ATMOSPHERE │ │ CELESTIAL  │ │ VEGETATION │ │ PARTICLE   │       │   │
│  │  │ SYSTEM     │ │ SYSTEM     │ │ SYSTEM     │ │ SYSTEM     │       │   │
│  │  │            │ │            │ │            │ │            │       │   │
│  │  │ •Rayleigh  │ │ •Sun/Moon  │ │ •Trees     │ │ •Rain      │       │   │
│  │  │ •Mie       │ │ •Stars     │ │ •Grass     │ │ •Snow      │       │   │
│  │  │ •Ozone     │ │ •Auroras   │ │ •Flowers   │ │ •Spray     │       │   │
│  │  │ •Fog       │ │ •Eclipses  │ │ •LOD       │ │ •Dust      │       │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      GPU RESOURCE LAYER                               │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │ TEXTURE ATLASES                                                 │ │   │
│  │  │ •3D Noise (Perlin-Worley 128³)                                 │ │   │
│  │  │ •Blue Noise (R2 sequence 128²)                                 │ │   │
│  │  │ •Weather Map (dynamic 512²)                                    │ │   │
│  │  │ •Cloud Detail (64³ tileable)                                   │ │   │
│  │  │ •Terrain Height (LOD pyramid)                                  │ │   │
│  │  │ •Ocean FFT (256² ping-pong)                                    │ │   │
│  │  │ •Caustics (256² accumulation)                                  │ │   │
│  │  │ •Shadow Cascades (4x 1024²)                                    │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │ UNIFORM BUFFER OBJECTS                                          │ │   │
│  │  │ •Global Frame Data (camera, time, resolution)                  │ │   │
│  │  │ •Lighting Data (sun, moon, ambient)                            │ │   │
│  │  │ •Cloud Parameters (60+ uniforms)                               │ │   │
│  │  │ •Ocean Parameters (40+ uniforms)                               │ │   │
│  │  │ •Terrain Parameters (30+ uniforms)                             │ │   │
│  │  │ •Weather State (wind, precipitation)                           │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# CORE RENDERING SYSTEMS

## Component File Structure

```
components/procedural-earth/
├── MASTER_ARCHITECTURE.md           # This document
├── SHADER_LIBRARY.md                # Complete shader reference
├── SYSTEM_RELATIONSHIPS.md          # Data flow documentation
│
├── engine/
│   ├── ProceduralEarthEngine.tsx    # Main entry point
│   ├── SceneOrchestrator.tsx        # Scene management
│   ├── RenderPipeline.tsx           # Multi-pass renderer
│   └── ResourceManager.tsx          # GPU resource management
│
├── systems/
│   ├── clouds/
│   │   ├── CloudVolumeRenderer.tsx  # Main cloud component
│   │   ├── CloudDensitySampler.ts   # Noise-based density
│   │   ├── CloudLighting.ts         # Scattering calculations
│   │   ├── CloudShadows.ts          # Volumetric shadows
│   │   └── shaders/
│   │       ├── cloudRaymarch.glsl   # Main raymarching
│   │       ├── cloudNoise.glsl      # Perlin-Worley noise
│   │       ├── cloudLighting.glsl   # Multiple scattering
│   │       └── cloudComposite.glsl  # Final composition
│   │
│   ├── ocean/
│   │   ├── OceanRenderer.tsx        # Main ocean component
│   │   ├── WaveSimulation.ts        # FFT wave simulation
│   │   ├── FoamSystem.ts            # Foam generation
│   │   ├── CausticsRenderer.ts      # Underwater caustics
│   │   ├── BubbleSystem.ts          # Bubble particles
│   │   └── shaders/
│   │       ├── oceanVertex.glsl     # Gerstner + FFT displacement
│   │       ├── oceanFragment.glsl   # PBR water rendering
│   │       ├── caustics.glsl        # Caustic projection
│   │       ├── underwater.glsl      # Subsurface scattering
│   │       └── foam.glsl            # Foam accumulation
│   │
│   ├── terrain/
│   │   ├── TerrainRenderer.tsx      # Main terrain component
│   │   ├── HeightGenerator.ts       # Procedural height
│   │   ├── BiomeSystem.ts           # Biome classification
│   │   ├── ErosionSimulator.ts      # Hydraulic erosion
│   │   ├── LODManager.ts            # Terrain LOD
│   │   └── shaders/
│   │       ├── terrainVertex.glsl   # Height displacement
│   │       ├── terrainFragment.glsl # PBR materials
│   │       ├── terrainNoise.glsl    # Multi-octave FBM
│   │       └── terrainSplat.glsl    # Texture splatting
│   │
│   ├── atmosphere/
│   │   ├── AtmosphereRenderer.tsx   # Main atmosphere component
│   │   ├── SkyRenderer.ts           # Procedural sky
│   │   ├── FogRenderer.ts           # Volumetric fog
│   │   ├── GodRayRenderer.ts        # Light shafts
│   │   └── shaders/
│   │       ├── atmosphere.glsl      # Rayleigh + Mie
│   │       ├── volumetricFog.glsl   # Height fog
│   │       ├── godRays.glsl         # Radial blur
│   │       └── starField.glsl       # Procedural stars
│   │
│   ├── weather/
│   │   ├── WeatherController.tsx    # Weather state machine
│   │   ├── WindField.ts             # 3D wind simulation
│   │   ├── PrecipitationSystem.ts   # Rain/snow particles
│   │   ├── LightningSystem.ts       # Storm lightning
│   │   └── shaders/
│   │       ├── rainParticle.glsl    # Rain rendering
│   │       ├── snowParticle.glsl    # Snow rendering
│   │       ├── windNoise.glsl       # Wind turbulence
│   │       └── lightning.glsl       # Lightning bolts
│   │
│   └── celestial/
│       ├── CelestialRenderer.tsx    # Sun, moon, stars
│       ├── SunRenderer.ts           # Sun disk + corona
│       ├── MoonRenderer.ts          # Moon phases + texture
│       ├── StarRenderer.ts          # Procedural starfield
│       └── shaders/
│           ├── sunDisk.glsl         # Sun rendering
│           ├── moonSurface.glsl     # Moon craters
│           ├── starField.glsl       # Star generation
│           └── aurora.glsl          # Aurora borealis
│
├── utils/
│   ├── NoiseGenerator.ts            # 3D noise textures
│   ├── TextureAtlas.ts              # Atlas management
│   ├── MathUtils.ts                 # Vector math helpers
│   └── PerformanceProfiler.ts       # FPS monitoring
│
└── hooks/
    ├── useProceduralEarth.ts        # Main engine hook
    ├── useCloudSimulation.ts        # Cloud state
    ├── useOceanSimulation.ts        # Ocean state
    ├── useTerrainGeneration.ts      # Terrain state
    └── useWeatherState.ts           # Weather state
```

---

# VOLUMETRIC CLOUD ENGINE

## Architecture Overview (Based on al-ro Shadertoy)

The cloud system is the crown jewel of this engine. It implements:

1. **Perlin-Worley Noise** - Hybrid noise for natural cloud shapes
2. **Height Gradient Profiles** - Realistic cumulus/stratus formations
3. **Multiple Scattering Approximation** - Beer-Powder for realistic lighting
4. **Blue Noise Dithering** - Eliminates banding artifacts
5. **Temporal Accumulation** - Frame blending for smooth animation
6. **Volumetric Shadows** - Clouds casting shadows on terrain/ocean

### Cloud Density Algorithm

```
ALGORITHM: Cloud Density Sampling
═══════════════════════════════════════════════════════════════════════════════

INPUT: 
  - pos: vec3 (world position)
  - time: float (animation time)
  - weatherMap: sampler2D (coverage control)

OUTPUT:
  - density: float (0.0 = empty, 1.0+ = opaque)

PROCEDURE:
  1. BOUNDARY CHECK
     ├─ normalizedY = (pos.y - cloudBase) / cloudThickness
     ├─ IF normalizedY < 0.0 OR normalizedY > 1.0 THEN RETURN 0.0
     └─ edgeFade = smoothstep(0, edgeWidth, distToEdge)

  2. HEIGHT GRADIENT (cumulus profile)
     ├─ bottomFade = smoothstep(0.0, bottomFalloff, normalizedY)
     ├─ topFade = smoothstep(1.0, 1.0 - topFalloff, normalizedY)
     ├─ roundBottom = pow(bottomFade, 0.5)  // Flat bottoms
     └─ puffyTop = topFade * (1.0 - pow(normalizedY, 2.0) * 0.5)

  3. WEATHER MAP SAMPLING
     ├─ weatherUV = (pos.xz - minCorner.xz) / cloudExtent
     ├─ coverage = texture(weatherMap, weatherUV).r
     └─ cloudType = texture(weatherMap, weatherUV).g  // Cumulus vs stratus

  4. SHAPE NOISE (low frequency)
     ├─ shapeCoord = pos * shapeScale + vec3(time * shapeSpeed, 0, 0)
     ├─ perlin = gradientNoise(shapeCoord)
     ├─ worley = worleyNoise(shapeCoord * 0.5)
     └─ shape = remap(perlin, worley - 1.0, 1.0, 0.0, 1.0)

  5. DETAIL NOISE (high frequency) - only if density > 0
     ├─ detailCoord = pos * detailScale + vec3(time * detailSpeed, 0, 0)
     ├─ detail = fbm(detailCoord, 3 octaves)
     └─ density = remap(density, detail * detailStrength, 1.0, 0.0, 1.0)

  6. FINAL COMPOSITION
     ├─ baseDensity = shape * heightGradient
     ├─ density = remap(baseDensity, 1.0 - coverage, 1.0, 0.0, 1.0)
     └─ RETURN density * edgeFade * globalDensity

═══════════════════════════════════════════════════════════════════════════════
```

### Cloud Lighting Algorithm

```
ALGORITHM: Multiple Scattering Approximation (Beer-Powder)
═══════════════════════════════════════════════════════════════════════════════

INPUT:
  - rayPos: vec3 (current sample position)
  - lightDir: vec3 (direction to light)
  - density: float (local density)
  - viewDir: vec3 (camera ray direction)

OUTPUT:
  - luminance: vec3 (scattered light color)

PROCEDURE:
  1. LIGHT MARCHING (simplified)
     ├─ Initialize: opticalDepth = 0.0
     ├─ FOR i = 0 TO lightSteps:
     │   ├─ samplePos = rayPos + lightDir * (i * lightStepSize)
     │   ├─ sampleDensity = sampleCloudDensity(samplePos, cheap=true)
     │   └─ opticalDepth += sampleDensity * lightStepSize
     └─ lightTransmittance = exp(-opticalDepth * absorptionCoeff)

  2. PHASE FUNCTION (Henyey-Greenstein dual-lobe)
     ├─ cosTheta = dot(viewDir, lightDir)
     ├─ forward = HG(cosTheta, g=0.8)   // Forward scattering
     ├─ backward = HG(cosTheta, g=-0.5) // Back scattering
     └─ phase = mix(forward, backward, 0.2)

  3. MULTIPLE SCATTERING APPROXIMATION
     ├─ powder = 1.0 - exp(-density * 2.0)  // Powder effect
     ├─ scatterSum = 0.0
     ├─ FOR octave = 0 TO 3:
     │   ├─ attenuatedPhase = phase * pow(0.5, octave)
     │   └─ scatterSum += attenuatedPhase
     └─ multiScatter = scatterSum * powder

  4. AMBIENT CONTRIBUTION
     ├─ skyAmbient = vec3(0.5, 0.6, 0.7) * ambientStrength
     └─ groundBounce = vec3(0.3, 0.25, 0.2) * (1.0 - normalizedY) * 0.1

  5. FINAL LUMINANCE
     ├─ directLight = lightColor * lightTransmittance * multiScatter
     ├─ ambient = skyAmbient + groundBounce
     └─ RETURN directLight + ambient

═══════════════════════════════════════════════════════════════════════════════
```

### Cloud Shadow Algorithm

```
ALGORITHM: Volumetric Cloud Shadows on Terrain/Ocean
═══════════════════════════════════════════════════════════════════════════════

INPUT:
  - surfacePos: vec3 (terrain or ocean world position)
  - lightDir: vec3 (sun direction)
  - cloudVolumeBounds: AABB

OUTPUT:
  - shadowFactor: float (0.0 = full shadow, 1.0 = full light)

PROCEDURE:
  1. RAY-CLOUD VOLUME INTERSECTION
     ├─ rayOrigin = surfacePos
     ├─ rayDir = lightDir
     ├─ (tEntry, tExit) = rayBoxIntersect(rayOrigin, rayDir, cloudBounds)
     └─ IF tExit < tEntry THEN RETURN 1.0  // No intersection

  2. SHADOW RAYMARCHING
     ├─ stepSize = (tExit - tEntry) / shadowSteps
     ├─ accumulatedDensity = 0.0
     ├─ FOR i = 0 TO shadowSteps:
     │   ├─ t = tEntry + (i + blueNoise) * stepSize
     │   ├─ samplePos = rayOrigin + rayDir * t
     │   ├─ density = sampleCloudDensity(samplePos, cheap=true)
     │   └─ accumulatedDensity += density * stepSize
     └─ shadowFactor = exp(-accumulatedDensity * shadowDensity)

  3. SHADOW SOFTENING
     ├─ softness = cloudShadowSoftness
     ├─ softShadow = smoothstep(0.0, softness, shadowFactor)
     └─ RETURN mix(shadowDarkness, 1.0, softShadow)

═══════════════════════════════════════════════════════════════════════════════
```

### Cloud Shader Uniforms (Complete List)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// CLOUD UNIFORM BLOCK - 60+ Parameters
// ═══════════════════════════════════════════════════════════════════════════

// Volume Bounds
uniform float uCloudBase;           // Bottom altitude (meters)
uniform float uCloudTop;            // Top altitude (meters)
uniform float uCloudExtent;         // Horizontal extent (meters)

// Density Control
uniform float uCloudDensity;        // Overall density multiplier (0.01-0.2)
uniform float uCloudCoverage;       // Weather map coverage (0-1)
uniform float uCloudAbsorption;     // Light absorption coefficient

// Shape Noise
uniform float uShapeScale;          // Shape noise frequency (0.01-0.1)
uniform float uShapeSpeed;          // Shape animation speed
uniform float uShapeStrength;       // Shape contribution (0.5-1.0)
uniform int uShapeOctaves;          // FBM octaves for shape

// Detail Noise
uniform float uDetailScale;         // Detail noise frequency (0.1-0.5)
uniform float uDetailSpeed;         // Detail animation speed
uniform float uDetailStrength;      // Detail erosion strength (0.1-0.4)
uniform int uDetailOctaves;         // FBM octaves for detail

// Height Profile
uniform float uBottomFade;          // Bottom edge fadeout (0.05-0.15)
uniform float uTopFade;             // Top edge fadeout (0.08-0.2)
uniform float uEdgeFade;            // Horizontal edge fade (0.05-0.15)
uniform float uHeightExponent;      // Profile curve shape

// Lighting
uniform vec3 uCloudLightColor;      // Light color (sun/moon)
uniform float uCloudLightPower;     // Light intensity
uniform float uAmbientStrength;     // Ambient light contribution
uniform float uPowderStrength;      // Powder effect intensity
uniform float uSilverLiningIntensity; // Edge brightening
uniform float uSilverLiningSpread;  // Edge spread

// Phase Function
uniform float uForwardG;            // Forward scattering g (0.6-0.9)
uniform float uBackwardG;           // Backward scattering g (-0.3 to -0.6)
uniform float uPhaseMix;            // Forward/backward mix (0.1-0.3)

// Shadows
uniform float uShadowDensity;       // Shadow opacity
uniform float uShadowSoftness;      // Shadow edge softness
uniform int uShadowSteps;           // Shadow raymarch steps

// Quality
uniform int uPrimarySteps;          // Main raymarch steps (32-128)
uniform int uLightSteps;            // Light march steps (6-16)
uniform float uStepJitter;          // Blue noise jitter amount

// Temporal
uniform float uTemporalBlend;       // Frame blending factor
uniform bool uEnableTemporal;       // Enable TAA for clouds
```

---

# OCEAN & WAVE SIMULATION

## Architecture Overview (Based on GPT Waves V7)

The ocean system implements:

1. **Height-Field Wave Simulation** - GPU-accelerated wave propagation
2. **FFT Ocean Waves** - Realistic large-scale wave patterns
3. **Gerstner Waves** - Stylized wave motion
4. **Foam Generation** - Jacobian-based foam detection
5. **Caustics** - Refraction-based underwater caustics
6. **Bubble System** - Subsurface bubble particles
7. **Subsurface Scattering** - Realistic underwater light

### Wave Simulation Algorithm

```
ALGORITHM: Height-Field Wave Simulation (GPU)
═══════════════════════════════════════════════════════════════════════════════

SIMULATION TEXTURE FORMAT: RGBA32F
  - R: Height (displacement from rest)
  - G: Velocity (rate of height change)
  - B: Normal.x
  - A: Normal.z

PROCEDURE (per-frame compute pass):

  1. READ CURRENT STATE
     ├─ center = texture(waveState, uv)
     ├─ left = texture(waveState, uv - vec2(texelSize.x, 0))
     ├─ right = texture(waveState, uv + vec2(texelSize.x, 0))
     ├─ up = texture(waveState, uv + vec2(0, texelSize.y))
     └─ down = texture(waveState, uv - vec2(0, texelSize.y))

  2. WAVE EQUATION (finite difference)
     ├─ laplacian = (left.r + right.r + up.r + down.r) / 4.0 - center.r
     ├─ acceleration = laplacian * waveSpeed²
     ├─ newVelocity = center.g + acceleration * dt
     ├─ newVelocity *= damping  // Energy loss
     └─ newHeight = center.r + newVelocity * dt

  3. BOUNDARY CONDITIONS
     ├─ IF isObstacle(uv) THEN newHeight = 0, newVelocity = 0
     ├─ IF isShore(uv) THEN apply absorption
     └─ IF isOpen(uv) THEN apply radiation boundary

  4. NORMAL CALCULATION
     ├─ dhdx = (right.r - left.r) / (2.0 * gridSize)
     ├─ dhdz = (up.r - down.r) / (2.0 * gridSize)
     └─ normal = normalize(vec3(-dhdx, 1.0, -dhdz))

  5. OUTPUT
     └─ fragColor = vec4(newHeight, newVelocity, normal.x, normal.z)

═══════════════════════════════════════════════════════════════════════════════
```

### Caustics Algorithm

```
ALGORITHM: Refraction-Based Caustics
═══════════════════════════════════════════════════════════════════════════════

INPUT:
  - waterSurface: height-field texture
  - floorDepth: float (depth to floor)
  - lightDir: vec3 (sun direction)

OUTPUT:
  - causticsTexture: brightness map on floor

PROCEDURE:

  1. FOR EACH WATER SURFACE POINT:
     ├─ surfacePos = vec3(gridPos.x, waterHeight, gridPos.y)
     ├─ normal = waterNormal
     │
     ├─ REFRACTION
     │   ├─ incidentDir = -lightDir
     │   ├─ eta = 1.0 / 1.33  // Air to water IOR
     │   └─ refractedDir = refract(incidentDir, normal, eta)
     │
     ├─ PROJECT TO FLOOR
     │   ├─ t = (floorDepth - surfacePos.y) / refractedDir.y
     │   └─ floorHit = surfacePos + refractedDir * t
     │
     ├─ AREA CHANGE (focus factor)
     │   ├─ originalArea = gridCellArea
     │   ├─ projectedArea = computeProjectedQuadArea(...)
     │   └─ intensity = originalArea / projectedArea
     │
     └─ ACCUMULATE
         └─ causticsTexture[floorHit] += intensity * transmission

  2. POST-PROCESS
     ├─ Temporal accumulation (blend with previous frame)
     ├─ Gaussian blur for soft caustics
     └─ HDR clamp

═══════════════════════════════════════════════════════════════════════════════
```

### Ocean Rendering Algorithm

```
ALGORITHM: PBR Ocean Surface Rendering
═══════════════════════════════════════════════════════════════════════════════

VERTEX SHADER:
  1. Sample height-field texture
  2. Add Gerstner wave displacement
  3. Add FFT displacement (if enabled)
  4. Calculate tangent frame for normal mapping

FRAGMENT SHADER:
  1. SAMPLE NORMALS
     ├─ macroNormal = waveTexture.ba (decoded)
     ├─ microNormal = normalMap sample (tiled detail)
     └─ combinedNormal = blendNormals(macro, micro)

  2. FRESNEL
     ├─ F0 = 0.02 (water IOR)
     ├─ VdotN = dot(viewDir, normal)
     └─ fresnel = F0 + (1 - F0) * pow(1 - VdotN, 5)

  3. REFLECTION
     ├─ reflectDir = reflect(-viewDir, normal)
     ├─ skyReflection = sampleSky(reflectDir)
     ├─ cloudReflection = sampleClouds(reflectDir)
     └─ reflection = mix(skyReflection, cloudReflection, cloudAlpha)

  4. REFRACTION (underwater view)
     ├─ refractDir = refract(-viewDir, normal, 1.0/1.33)
     ├─ underwaterColor = sampleUnderwater(refractDir, depth)
     └─ Apply absorption based on path length

  5. SUBSURFACE SCATTERING
     ├─ HdotL = dot(halfVector, lightDir)
     ├─ sss = pow(saturate(HdotL), sssPower) * sssColor
     └─ Apply to wave crests

  6. FOAM
     ├─ jacobian = computeJacobian(waveGradients)
     ├─ foamAmount = saturate(1.0 - jacobian + foamBias)
     └─ foamColor = mix(waterColor, white, foamAmount * foamBrightness)

  7. COMPOSITE
     ├─ waterColor = mix(refraction, reflection, fresnel)
     ├─ waterColor += sss + specular
     ├─ waterColor = mix(waterColor, foamColor, foamAmount)
     └─ Apply cloud shadows

═══════════════════════════════════════════════════════════════════════════════
```

---

# TERRAIN GENERATION SYSTEM

## Architecture Overview

The terrain system implements:

1. **Multi-Octave FBM** - Fractal Brownian Motion for height
2. **Domain Warping** - Realistic geological features
3. **Hydraulic Erosion** - Water-based erosion simulation
4. **Biome System** - Temperature/moisture-based classification
5. **LOD System** - Distance-based mesh density
6. **PBR Materials** - Physically-based terrain rendering

### Height Generation Algorithm

```
ALGORITHM: Procedural Terrain Height Generation
═══════════════════════════════════════════════════════════════════════════════

INPUT:
  - worldPos: vec2 (xz world coordinates)
  - seed: float (terrain seed)

OUTPUT:
  - height: float (terrain elevation)
  - erosion: float (erosion amount for texture blending)

PROCEDURE:

  1. CONTINENTAL SCALE (very low frequency)
     ├─ continentNoise = fbm(worldPos * 0.00001, 2 octaves)
     └─ continent = smoothstep(-0.3, 0.3, continentNoise)

  2. MOUNTAIN RANGES (low frequency)
     ├─ ridgePos = worldPos * 0.0001
     ├─ ridgeNoise = ridgedNoise(ridgePos, 4 octaves)
     ├─ mountainMask = pow(ridgeNoise, mountainSharpness)
     └─ mountains = mountainMask * mountainHeight

  3. HILLS AND VALLEYS (medium frequency)
     ├─ hillPos = worldPos * 0.001
     ├─ hillNoise = fbm(hillPos, 6 octaves)
     └─ hills = hillNoise * hillHeight * (1.0 - mountainMask * 0.5)

  4. DOMAIN WARPING (geological realism)
     ├─ warpX = fbm(worldPos * 0.0005, 3 octaves) * warpStrength
     ├─ warpZ = fbm(worldPos * 0.0005 + 100.0, 3 octaves) * warpStrength
     ├─ warpedPos = worldPos + vec2(warpX, warpZ)
     └─ Re-sample noise at warpedPos for organic shapes

  5. DETAIL (high frequency)
     ├─ detailPos = worldPos * 0.01
     ├─ detailNoise = fbm(detailPos, 4 octaves)
     └─ detail = detailNoise * detailHeight

  6. EROSION SIMULATION (simplified)
     ├─ slope = computeSlope(heightAtNeighbors)
     ├─ erosionFactor = pow(slope, erosionPower) * erosionStrength
     └─ erodeHeight = height * (1.0 - erosionFactor)

  7. COMPOSITE HEIGHT
     ├─ baseHeight = continent * continentScale
     ├─ baseHeight += mountains + hills + detail
     ├─ baseHeight = applyErosion(baseHeight, erosionFactor)
     └─ RETURN clamp(baseHeight, minHeight, maxHeight)

═══════════════════════════════════════════════════════════════════════════════
```

### Biome Classification Algorithm

```
ALGORITHM: Biome Classification System
═══════════════════════════════════════════════════════════════════════════════

INPUT:
  - worldPos: vec2
  - height: float
  - latitude: float (for temperature)

OUTPUT:
  - biome: int (biome ID)
  - blendWeights: vec4 (for texture splatting)

BIOME TYPES:
  0: Ocean
  1: Beach/Shore
  2: Grassland
  3: Forest
  4: Desert
  5: Tundra
  6: Snow/Ice
  7: Mountain Rock

PROCEDURE:

  1. CALCULATE ENVIRONMENTAL FACTORS
     ├─ temperature = baseTemp - (height * tempLapseRate) - (abs(latitude) * latTempFactor)
     ├─ moistureNoise = fbm(worldPos * 0.0002, 3 octaves)
     ├─ moisture = moistureNoise * (1.0 - height / maxHeight)  // Drier at altitude
     └─ slope = computeSlope(heightGradient)

  2. BIOME CLASSIFICATION
     ├─ IF height < waterLevel THEN biome = OCEAN
     ├─ ELSE IF height < waterLevel + beachHeight THEN biome = BEACH
     ├─ ELSE IF slope > rockSlopeThreshold THEN biome = ROCK
     ├─ ELSE IF height > snowLine OR temperature < freezingTemp THEN biome = SNOW
     ├─ ELSE IF temperature > hotTemp AND moisture < dryMoisture THEN biome = DESERT
     ├─ ELSE IF temperature < coldTemp THEN biome = TUNDRA
     ├─ ELSE IF moisture > wetMoisture THEN biome = FOREST
     └─ ELSE biome = GRASSLAND

  3. BLEND WEIGHTS (for smooth transitions)
     ├─ Calculate distance to biome boundaries
     ├─ Apply smoothstep for gradual blending
     └─ Normalize weights to sum to 1.0

═══════════════════════════════════════════════════════════════════════════════
```

### Terrain Material Rendering

```
ALGORITHM: PBR Terrain Material System
═══════════════════════════════════════════════════════════════════════════════

TEXTURE ARRAYS:
  - Albedo: 8 biome textures
  - Normal: 8 biome normal maps
  - Roughness: 8 biome roughness maps
  - AO: 8 biome ambient occlusion maps

PROCEDURE:

  1. SAMPLE ALL BIOME TEXTURES
     ├─ FOR each active biome (up to 4):
     │   ├─ triplanarUV = calculateTriplanarUV(worldPos, normal)
     │   ├─ albedo[i] = triplanarSample(albedoArray, biomeIndex, triplanarUV)
     │   ├─ normalMap[i] = triplanarSample(normalArray, biomeIndex, triplanarUV)
     │   └─ roughness[i] = triplanarSample(roughnessArray, biomeIndex, triplanarUV)

  2. BLEND TEXTURES
     ├─ finalAlbedo = sum(albedo[i] * blendWeight[i])
     ├─ finalNormal = blendNormals(normalMap[i], blendWeight[i])
     └─ finalRoughness = sum(roughness[i] * blendWeight[i])

  3. HEIGHT-BASED DETAIL
     ├─ Add macro variation based on height
     ├─ Add detail normal for close-up viewing
     └─ Adjust roughness for wet areas near water

  4. APPLY CLOUD SHADOWS
     ├─ shadowFactor = sampleCloudShadowMap(worldPos)
     └─ finalColor *= mix(shadowDarkness, 1.0, shadowFactor)

═══════════════════════════════════════════════════════════════════════════════
```

---

# ATMOSPHERIC RENDERING

## Rayleigh-Mie Scattering Model

```
ALGORITHM: Physically-Based Atmospheric Scattering
═══════════════════════════════════════════════════════════════════════════════

CONSTANTS:
  - βR = vec3(5.8e-6, 13.5e-6, 33.1e-6)  // Rayleigh coefficients (RGB)
  - βM = vec3(21e-6)                       // Mie coefficient
  - HR = 8000.0                            // Rayleigh scale height (meters)
  - HM = 1200.0                            // Mie scale height (meters)
  - g = 0.76                               // Mie anisotropy

PROCEDURE:

  1. RAYLEIGH PHASE FUNCTION
     ├─ cosTheta = dot(viewDir, sunDir)
     └─ phaseR = (3.0 / 16.0 * PI) * (1.0 + cosTheta²)

  2. MIE PHASE FUNCTION (Henyey-Greenstein)
     ├─ g2 = g * g
     └─ phaseM = (1 - g2) / (4π * (1 + g2 - 2g*cosTheta)^1.5)

  3. OPTICAL DEPTH INTEGRATION
     ├─ FOR each sample along view ray:
     │   ├─ altitude = length(samplePos - earthCenter) - earthRadius
     │   ├─ densityR = exp(-altitude / HR)
     │   ├─ densityM = exp(-altitude / HM)
     │   ├─ opticalDepthR += densityR * stepSize
     │   └─ opticalDepthM += densityM * stepSize

  4. TRANSMITTANCE
     ├─ transmittanceR = exp(-βR * opticalDepthR)
     └─ transmittanceM = exp(-βM * opticalDepthM)

  5. IN-SCATTERING
     ├─ scatterR = βR * phaseR * transmittanceR
     ├─ scatterM = βM * phaseM * transmittanceM
     └─ totalScatter = (scatterR + scatterM) * sunIntensity

  6. SKY COLOR
     ├─ IF looking at sun: add sun disk contribution
     ├─ IF below horizon: blend with ground color
     └─ Apply exposure and tonemapping

═══════════════════════════════════════════════════════════════════════════════
```

## God Rays / Volumetric Light Shafts

```
ALGORITHM: Screen-Space God Rays with Volumetric Enhancement
═══════════════════════════════════════════════════════════════════════════════

PHASE 1: OCCLUSION MASK
  1. Render cloud density along sun direction
  2. Create sun occlusion texture

PHASE 2: RADIAL BLUR
  1. Project sun position to screen space
  2. FOR each pixel:
     ├─ Calculate ray from pixel to sun
     ├─ Sample occlusion along ray (8-16 samples)
     ├─ Apply exponential decay
     └─ Accumulate light contribution

PHASE 3: VOLUMETRIC ENHANCEMENT
  1. Sample volumetric fog along view ray
  2. Combine with radial blur result
  3. Apply to final composite

═══════════════════════════════════════════════════════════════════════════════
```

---

# WEATHER & CLIMATE SIMULATION

## Weather State Machine

```
WEATHER STATES:
═══════════════════════════════════════════════════════════════════════════════

  ┌─────────────┐     transition      ┌─────────────┐
  │   CLEAR     │ ─────────────────▶  │   CLOUDY    │
  │             │ ◀─────────────────  │             │
  │  coverage:  │                     │  coverage:  │
  │  0.0 - 0.2  │                     │  0.3 - 0.6  │
  └─────────────┘                     └─────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
  ┌─────────────┐                     ┌─────────────┐
  │    RAIN     │ ◀─────────────────▶ │   STORM    │
  │             │                     │             │
  │  coverage:  │                     │  coverage:  │
  │  0.6 - 0.8  │                     │  0.8 - 1.0  │
  │  precip: on │                     │ precip: on  │
  └─────────────┘                     │ lightning:on│
                                      └─────────────┘

TRANSITION RULES:
  - Gradual cloud coverage change over time
  - Wind speed influences transition probability
  - Temperature affects precipitation type (rain vs snow)
  - Storm probability increases with coverage

═══════════════════════════════════════════════════════════════════════════════
```

## Wind Field Simulation

```
ALGORITHM: 3D Wind Field with Turbulence
═══════════════════════════════════════════════════════════════════════════════

BASE WIND:
  - direction: vec3 (global wind direction)
  - speed: float (base wind speed, m/s)
  - gustStrength: float (gust intensity)
  - gustFrequency: float (gust frequency)

TURBULENCE:
  1. Large-scale eddies (fbm, low frequency)
  2. Medium-scale gusts (perlin, medium frequency)
  3. Small-scale turbulence (simplex, high frequency)

TERRAIN INTERACTION:
  - Speed up over ridges
  - Slow down in valleys
  - Create lee-side turbulence
  - Channel through mountain passes

OUTPUT: 3D wind texture (128³)
  - RGB: wind velocity vector
  - A: turbulence intensity

═══════════════════════════════════════════════════════════════════════════════
```

---

# PERFORMANCE ARCHITECTURE

## Frame Budget Allocation

```
TARGET: 16.67ms per frame (60 FPS)
═══════════════════════════════════════════════════════════════════════════════

PASS                          BUDGET      NOTES
─────────────────────────────────────────────────────────────────────────────
Depth Pre-Pass                0.5ms       Simple geometry, no shading
Shadow Map Generation         1.5ms       4 cascades, simplified geometry
Terrain Rendering             2.0ms       LOD system, culling
Ocean Simulation              1.0ms       Height-field update (compute)
Ocean Rendering               1.5ms       Gerstner + reflection/refraction
Cloud Raymarching             4.0ms       64 steps, TAA assists
Atmospheric Scattering        0.5ms       LUT-based optimization
God Rays                      0.5ms       16 samples radial blur
Weather Particles             1.0ms       Instanced rendering
Volumetric Fog                0.5ms       Froxel-based
Composite + Tonemapping       0.5ms       
Post-Processing (TAA, Bloom)  1.0ms       
UI Rendering                  0.5ms       
CPU Overhead                  1.5ms       State updates, uniforms
─────────────────────────────────────────────────────────────────────────────
TOTAL                         16.0ms      0.67ms headroom
═══════════════════════════════════════════════════════════════════════════════
```

## Quality Presets

```
QUALITY LEVELS:
═══════════════════════════════════════════════════════════════════════════════

SETTING                  LOW         MEDIUM      HIGH        ULTRA
─────────────────────────────────────────────────────────────────────────────
Cloud Steps              24          48          64          96
Light Steps              4           6           8           12
Shadow Cascades          2           3           4           4
Shadow Resolution        512         1024        2048        4096
Ocean Resolution         128         256         256         512
Terrain LOD Levels       3           4           5           6
Particle Count           1000        5000        10000       25000
TAA                      Off         On          On          On + Sharpening
Volumetric Fog           Off         Simple      Full        Full + Scatter
God Rays                 Off         8 samples   16 samples  32 samples
─────────────────────────────────────────────────────────────────────────────
Target FPS               60          60          60          30
═══════════════════════════════════════════════════════════════════════════════
```

---

# DATA FLOW & COMMUNICATION

## System Interaction Diagram

```
═══════════════════════════════════════════════════════════════════════════════
                         SYSTEM DATA FLOW DIAGRAM
═══════════════════════════════════════════════════════════════════════════════

                              ┌─────────────────┐
                              │   TIME/DATE     │
                              │   CONTROLLER    │
                              └────────┬────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
            ▼                          ▼                          ▼
    ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
    │   CELESTIAL   │          │    WEATHER    │          │   CAMERA      │
    │    SYSTEM     │          │    SYSTEM     │          │  CONTROLLER   │
    │               │          │               │          │               │
    │ sunDir        │          │ windField     │          │ position      │
    │ moonDir       │          │ coverage      │          │ direction     │
    │ starRotation  │          │ precipitation │          │ fov           │
    └───────┬───────┘          └───────┬───────┘          └───────┬───────┘
            │                          │                          │
            │     ┌────────────────────┼────────────────────┐     │
            │     │                    │                    │     │
            ▼     ▼                    ▼                    ▼     ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                         CLOUD SYSTEM                                 │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
    │  │   DENSITY   │  │  LIGHTING   │  │   SHADOWS   │                 │
    │  │   SAMPLER   │──│  INTEGRATOR │──│  GENERATOR  │                 │
    │  └─────────────┘  └─────────────┘  └──────┬──────┘                 │
    └───────────────────────────────────────────┼─────────────────────────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        │                       │                       │
                        ▼                       ▼                       ▼
               ┌────────────────┐      ┌────────────────┐      ┌────────────────┐
               │    TERRAIN     │      │     OCEAN      │      │   ATMOSPHERE   │
               │    SYSTEM      │      │    SYSTEM      │      │    SYSTEM      │
               │                │      │                │      │                │
               │ cloudShadows ◀─┼──────┼─ cloudShadows ◀┼──────┼─ cloudColor    │
               │ height         │      │ waveHeight     │      │ fogDensity     │
               │ normals        │──┐   │ foam           │      │ godRays        │
               └────────────────┘  │   └────────────────┘      └────────────────┘
                                   │            │
                                   │            │
                                   ▼            ▼
                          ┌────────────────────────────┐
                          │      SHORE INTERACTION     │
                          │                            │
                          │  terrainHeight ──▶ waveBreak
                          │  waveHeight ──▶ wetness    │
                          │  foam ──▶ shoreFoam        │
                          └────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```

## Uniform Buffer Organization

```
═══════════════════════════════════════════════════════════════════════════════
                      UNIFORM BUFFER LAYOUT
═══════════════════════════════════════════════════════════════════════════════

BUFFER 0: GLOBAL (updated every frame)
─────────────────────────────────────────────────────────────────────────────
Offset    Size    Name                  Description
0         64      viewMatrix            Camera view matrix
64        64      projMatrix            Projection matrix
128       64      viewProjMatrix        Combined VP matrix
192       64      invViewProjMatrix     Inverse VP for raymarching
256       16      cameraPosition        Camera world position
272       4       time                  Elapsed time (seconds)
276       4       deltaTime             Frame delta
280       8       resolution            Viewport size
288       16      mousePosition         Mouse screen coords + buttons
─────────────────────────────────────────────────────────────────────────────

BUFFER 1: LIGHTING (updated on change)
─────────────────────────────────────────────────────────────────────────────
Offset    Size    Name                  Description
0         16      sunDirection          Normalized sun direction
16        16      sunColor              Sun color * intensity
32        16      moonDirection         Normalized moon direction
48        16      moonColor             Moon color * intensity
64        16      ambientColor          Sky ambient color
80        4       sunIntensity          Sun brightness
84        4       moonIntensity         Moon brightness
88        4       ambientIntensity      Ambient brightness
─────────────────────────────────────────────────────────────────────────────

BUFFER 2: CLOUD PARAMETERS (updated on change)
─────────────────────────────────────────────────────────────────────────────
[See Cloud Shader Uniforms section above - 60+ parameters]
─────────────────────────────────────────────────────────────────────────────

BUFFER 3: OCEAN PARAMETERS (updated on change)
─────────────────────────────────────────────────────────────────────────────
[40+ parameters for wave simulation, foam, caustics]
─────────────────────────────────────────────────────────────────────────────

BUFFER 4: TERRAIN PARAMETERS (updated on change)
─────────────────────────────────────────────────────────────────────────────
[30+ parameters for height, biomes, materials]
─────────────────────────────────────────────────────────────────────────────

BUFFER 5: WEATHER STATE (updated per-frame)
─────────────────────────────────────────────────────────────────────────────
Offset    Size    Name                  Description
0         16      windDirection         3D wind vector + speed
16        4       coverage              Cloud coverage (0-1)
20        4       precipitationType     0=none, 1=rain, 2=snow
24        4       precipitationIntensity Precipitation amount
28        4       fogDensity            Ground fog density
32        4       stormIntensity        Storm severity
─────────────────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════════════════
```

---

# IMPLEMENTATION ROADMAP

## Phase 1: Foundation (Week 1-2)

```
DELIVERABLES:
─────────────────────────────────────────────────────────────────────────────
□ Project structure setup (file organization)
□ Base engine component (ProceduralEarthEngine.tsx)
□ Scene orchestrator (camera, time, input)
□ Render pipeline framework (multi-pass)
□ Resource manager (textures, buffers)
□ Performance profiler integration
□ UI controls framework
─────────────────────────────────────────────────────────────────────────────
```

## Phase 2: Cloud System (Week 3-4)

```
DELIVERABLES:
─────────────────────────────────────────────────────────────────────────────
□ 3D Perlin-Worley noise texture generation
□ Blue noise texture generation
□ Cloud density sampling shader
□ Cloud raymarching shader (primary pass)
□ Cloud lighting shader (multiple scattering)
□ Cloud shadow generation
□ Temporal accumulation for clouds
□ Cloud control panel UI
─────────────────────────────────────────────────────────────────────────────
```

## Phase 3: Terrain System (Week 5-6)

```
DELIVERABLES:
─────────────────────────────────────────────────────────────────────────────
□ Height generation shader
□ Normal calculation
□ Biome classification system
□ LOD mesh generation
□ PBR material system
□ Triplanar texture mapping
□ Cloud shadow integration
□ Terrain control panel UI
─────────────────────────────────────────────────────────────────────────────
```

## Phase 4: Ocean System (Week 7-8)

```
DELIVERABLES:
─────────────────────────────────────────────────────────────────────────────
□ Height-field wave simulation (GPU)
□ Gerstner wave displacement
□ Ocean surface rendering (PBR)
□ Foam generation
□ Underwater rendering
□ Caustics generation
□ Shore interaction with terrain
□ Ocean control panel UI
─────────────────────────────────────────────────────────────────────────────
```

## Phase 5: Atmosphere & Weather (Week 9-10)

```
DELIVERABLES:
─────────────────────────────────────────────────────────────────────────────
□ Rayleigh-Mie scattering shader
□ Sky gradient rendering
□ God ray generation
□ Volumetric fog system
□ Weather state machine
□ Wind field simulation
□ Precipitation particles
□ Weather control panel UI
─────────────────────────────────────────────────────────────────────────────
```

## Phase 6: Integration & Polish (Week 11-12)

```
DELIVERABLES:
─────────────────────────────────────────────────────────────────────────────
□ Full system integration
□ Performance optimization
□ Quality presets
□ Day/night cycle
□ Preset save/load system
□ Screenshot/recording
□ Final UI polish
□ Documentation
─────────────────────────────────────────────────────────────────────────────
```

---

# APPENDIX: SHADER CODE TEMPLATES

## A. Perlin-Worley Noise (GLSL)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// PERLIN-WORLEY HYBRID NOISE
// Based on al-ro Shadertoy implementation
// ═══════════════════════════════════════════════════════════════════════════

// Hash function for 3D
vec3 hash3v(vec3 p) {
    p = mod(p, 289.0);
    p = mod((p * 34.0 + 1.0) * p, 289.0);
    return fract(p / 41.0) * 2.0 - 1.0;
}

// 5th order polynomial interpolation
vec3 fade(vec3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Gradient noise
float gradientNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = fade(f);
    
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

// Worley noise
float worley(vec3 p, float numCells) {
    p *= numCells;
    float d = 1.0e10;
    for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
            for(int z = -1; z <= 1; z++) {
                vec3 tp = floor(p) + vec3(x, y, z);
                vec3 cell = tp + 0.5 + 0.5 * hash3v(mod(tp, numCells));
                d = min(d, dot(p - cell, p - cell));
            }
        }
    }
    return 1.0 - saturate(sqrt(d));
}

// FBM with Perlin
float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < octaves; i++) {
        value += amplitude * gradientNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// Perlin-Worley combination
float perlinWorley(vec3 p, int octaves) {
    float perlin = fbm(p, octaves);
    float w = worley(p, 4.0);
    return remap(perlin, w - 1.0, 1.0, 0.0, 1.0);
}
```

## B. Cloud Raymarching Template

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// VOLUMETRIC CLOUD RAYMARCHING
// ═══════════════════════════════════════════════════════════════════════════

vec4 raymarchClouds(vec3 ro, vec3 rd, vec3 lightDir) {
    // Ray-box intersection
    vec2 boxHit = rayBoxIntersect(ro, rd, cloudMin, cloudMax);
    if(boxHit.y <= 0.0) return vec4(0.0);
    
    float tStart = max(boxHit.x, 0.0);
    float tEnd = boxHit.x + boxHit.y;
    
    // Blue noise jitter
    float blueNoise = texture(blueNoiseTexture, gl_FragCoord.xy / 128.0).r;
    blueNoise = fract(blueNoise + goldenRatio * float(frameCount % 100));
    
    float stepSize = (tEnd - tStart) / float(STEPS);
    float t = tStart + stepSize * blueNoise;
    
    vec3 totalLight = vec3(0.0);
    float totalTransmittance = 1.0;
    
    float mu = dot(rd, lightDir);
    float phase = dualLobePhase(mu);
    
    for(int i = 0; i < STEPS; i++) {
        if(totalTransmittance < 0.01) break;
        
        vec3 pos = ro + rd * t;
        float density = sampleCloudDensity(pos);
        
        if(density > 0.001) {
            float lightTransmit = lightMarch(pos, lightDir);
            vec3 luminance = multipleScattering(density, mu, lightTransmit, lightColor);
            
            float stepTransmit = exp(-density * stepSize);
            vec3 scatter = luminance * (1.0 - stepTransmit);
            
            totalLight += totalTransmittance * scatter;
            totalTransmittance *= stepTransmit;
        }
        
        t += stepSize;
    }
    
    return vec4(totalLight, 1.0 - totalTransmittance);
}
```

---

# CONCLUSION

This document represents the complete architectural blueprint for the most advanced procedural Earth rendering engine. By combining:

- **al-ro's volumetric cloud methodology**
- **GPT Waves V7 ocean simulation**
- **WebGPU-ready terrain system**
- **Physically-based atmospheric rendering**
- **Dynamic weather simulation**

We create a system capable of rendering a hyper-realistic Earth visualization in real-time. The modular architecture allows for incremental implementation while maintaining clean separation of concerns.

**Key Success Factors:**
1. GPU-first design for maximum performance
2. Temporal coherence for smooth rendering
3. Physical accuracy for believable results
4. User-controllable parameters for artistic freedom
5. Adaptive quality for wide hardware support

---

*Document Version: 1.0*
*Author: Base44 AI Development Agent*
*Date: 2025-01-27*
*Status: COMPREHENSIVE PLANNING COMPLETE*




# PROCEDURAL EARTH ENGINE - COMPLETE SHADER LIBRARY
## Version 1.0 - All Shaders with Full Implementation
## Date: 2025-01-27

---

# TABLE OF CONTENTS

1. [Noise Functions](#noise-functions)
2. [Cloud Shaders](#cloud-shaders)
3. [Ocean Shaders](#ocean-shaders)
4. [Terrain Shaders](#terrain-shaders)
5. [Atmosphere Shaders](#atmosphere-shaders)
6. [Post-Processing Shaders](#post-processing-shaders)
7. [Utility Functions](#utility-functions)

---

# NOISE FUNCTIONS

## Complete Noise Library (noise.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE NOISE LIBRARY
// All noise functions needed for procedural generation
// ═══════════════════════════════════════════════════════════════════════════

#define PI 3.14159265359
#define TAU 6.28318530718

// ─────────────────────────────────────────────────────────────────────────────
// BASIC UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec2 saturate(vec2 x) { return clamp(x, 0.0, 1.0); }
vec3 saturate(vec3 x) { return clamp(x, 0.0, 1.0); }

float remap(float x, float low1, float high1, float low2, float high2) {
    return low2 + (x - low1) * (high2 - low2) / (high1 - low1);
}

float smootherstep(float edge0, float edge1, float x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// HASH FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

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

vec2 hash21(float p) {
    vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash31(float p) {
    vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
}

// Gradient hash for Perlin noise
vec3 hash3v(vec3 p) {
    p = mod(p, 289.0);
    float n = mod((p.x * 17.0 + p.y) * 17.0 + p.z, 289.0);
    n = mod((n * 34.0 + 1.0) * n, 289.0);
    vec3 k = mod(floor(n / vec3(1.0, 7.0, 49.0)), 7.0) * 2.0 - 1.0;
    return normalize(k);
}

// ─────────────────────────────────────────────────────────────────────────────
// VALUE NOISE
// ─────────────────────────────────────────────────────────────────────────────

float valueNoise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);  // Hermite smoothstep
    
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float valueNoise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = i.x + i.y * 157.0 + 113.0 * i.z;
    
    return mix(
        mix(mix(hash11(n), hash11(n + 1.0), f.x),
            mix(hash11(n + 157.0), hash11(n + 158.0), f.x), f.y),
        mix(mix(hash11(n + 113.0), hash11(n + 114.0), f.x),
            mix(hash11(n + 270.0), hash11(n + 271.0), f.x), f.y), f.z);
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT (PERLIN) NOISE
// ─────────────────────────────────────────────────────────────────────────────

// 5th order polynomial interpolation (quintic smoothstep)
vec3 quintic(vec3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec2 quintic(vec2 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float gradientNoise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = quintic(f);
    
    vec2 ga = hash22(i) * 2.0 - 1.0;
    vec2 gb = hash22(i + vec2(1.0, 0.0)) * 2.0 - 1.0;
    vec2 gc = hash22(i + vec2(0.0, 1.0)) * 2.0 - 1.0;
    vec2 gd = hash22(i + vec2(1.0, 1.0)) * 2.0 - 1.0;
    
    float va = dot(ga, f);
    float vb = dot(gb, f - vec2(1.0, 0.0));
    float vc = dot(gc, f - vec2(0.0, 1.0));
    float vd = dot(gd, f - vec2(1.0, 1.0));
    
    return mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y);
}

float gradientNoise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = quintic(f);
    
    return mix(
        mix(mix(dot(hash3v(i), f),
                dot(hash3v(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
            mix(dot(hash3v(i + vec3(0,1,0)), f - vec3(0,1,0)),
                dot(hash3v(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
        mix(mix(dot(hash3v(i + vec3(0,0,1)), f - vec3(0,0,1)),
                dot(hash3v(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
            mix(dot(hash3v(i + vec3(0,1,1)), f - vec3(0,1,1)),
                dot(hash3v(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLEX NOISE
// ─────────────────────────────────────────────────────────────────────────────

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }

vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

float simplexNoise2D(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float simplexNoise3D(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLEY (CELLULAR) NOISE
// ─────────────────────────────────────────────────────────────────────────────

float worleyNoise2D(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float d = 1.0;
    
    for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            vec2 r = g + o - f;
            d = min(d, dot(r, r));
        }
    }
    
    return 1.0 - sqrt(d);
}

float worleyNoise3D(vec3 p) {
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

// Tileable Worley for seamless 3D textures
float worleyNoise3DTileable(vec3 p, float numCells) {
    p *= numCells;
    float d = 1.0e10;
    
    for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
            for(int z = -1; z <= 1; z++) {
                vec3 tp = floor(p) + vec3(float(x), float(y), float(z));
                vec3 cellCenter = tp + 0.5 + 0.5 * (hash33(mod(tp, numCells)) * 2.0 - 1.0);
                vec3 diff = p - cellCenter;
                d = min(d, dot(diff, diff));
            }
        }
    }
    
    return 1.0 - saturate(sqrt(d));
}

// ─────────────────────────────────────────────────────────────────────────────
// PERLIN-WORLEY HYBRID (Cloud Noise)
// ─────────────────────────────────────────────────────────────────────────────

float perlinWorley(vec3 p, int octaves) {
    float perlin = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < octaves; i++) {
        perlin += amplitude * gradientNoise3D(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    float worley = worleyNoise3DTileable(p, 4.0);
    return remap(perlin, worley - 1.0, 1.0, 0.0, 1.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// FBM (FRACTAL BROWNIAN MOTION)
// ─────────────────────────────────────────────────────────────────────────────

float fbm2D(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float lacunarity = 2.0;
    float persistence = 0.5;
    
    for(int i = 0; i < octaves; i++) {
        value += amplitude * gradientNoise2D(p * frequency);
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    
    return value;
}

float fbm3D(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < octaves; i++) {
        value += amplitude * gradientNoise3D(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// Ridged FBM for mountains
float ridgedFbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float prev = 1.0;
    
    for(int i = 0; i < octaves; i++) {
        float n = abs(gradientNoise3D(p * frequency));
        n = 1.0 - n;
        n = n * n;
        value += amplitude * n * prev;
        prev = n;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// Turbulence (absolute value FBM)
float turbulence(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < octaves; i++) {
        value += amplitude * abs(gradientNoise3D(p * frequency));
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN WARPING
// ─────────────────────────────────────────────────────────────────────────────

float warpedNoise(vec3 p, float warpStrength, int octaves) {
    vec3 q = vec3(
        fbm3D(p, 3),
        fbm3D(p + vec3(5.2, 1.3, 2.8), 3),
        fbm3D(p + vec3(1.7, 9.2, 3.1), 3)
    );
    
    vec3 r = vec3(
        fbm3D(p + warpStrength * q + vec3(1.7, 9.2, 0.0), 3),
        fbm3D(p + warpStrength * q + vec3(8.3, 2.8, 4.1), 3),
        fbm3D(p + warpStrength * q + vec3(2.1, 5.3, 7.2), 3)
    );
    
    return fbm3D(p + warpStrength * r, octaves);
}

// ─────────────────────────────────────────────────────────────────────────────
// CURL NOISE (for fluid motion)
// ─────────────────────────────────────────────────────────────────────────────

vec3 curlNoise(vec3 p) {
    float e = 0.01;
    
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    
    float n = gradientNoise3D(p);
    
    float dndx = gradientNoise3D(p + dx) - gradientNoise3D(p - dx);
    float dndy = gradientNoise3D(p + dy) - gradientNoise3D(p - dy);
    float dndz = gradientNoise3D(p + dz) - gradientNoise3D(p - dz);
    
    return normalize(vec3(
        dndy - dndz,
        dndz - dndx,
        dndx - dndy
    ));
}
```

---

# CLOUD SHADERS

## Cloud Raymarching Fragment Shader (cloudRaymarch.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// VOLUMETRIC CLOUD RAYMARCHING SHADER
// Based on al-ro's Shadertoy implementation with enhancements
// ═══════════════════════════════════════════════════════════════════════════

precision highp float;

// Uniforms
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform sampler2D blueNoiseTexture;
uniform sampler3D cloudNoiseTexture;

// Camera
uniform vec3 cameraPosition;
uniform mat4 invViewProjection;

// Cloud volume bounds
uniform float cloudBase;
uniform float cloudTop;
uniform float cloudExtent;

// Density parameters
uniform float cloudDensity;
uniform float cloudCoverage;
uniform float shapeScale;
uniform float shapeSpeed;
uniform float shapeStrength;
uniform float detailScale;
uniform float detailSpeed;
uniform float detailStrength;

// Height profile
uniform float bottomFade;
uniform float topFade;
uniform float edgeFade;

// Lighting
uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform float sunIntensity;
uniform float ambientIntensity;
uniform float powderStrength;
uniform float silverLiningIntensity;

// Phase function
uniform float forwardG;
uniform float backwardG;
uniform float phaseMix;

// Quality
uniform int primarySteps;
uniform int lightSteps;

// Constants
#define PI 3.14159265359
const float goldenRatio = 1.61803398875;

// Output
out vec4 fragColor;

// ─────────────────────────────────────────────────────────────────────────────
// NOISE SAMPLING
// ─────────────────────────────────────────────────────────────────────────────

#include "noise.glsl"

// ─────────────────────────────────────────────────────────────────────────────
// RAY-BOX INTERSECTION
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// HEIGHT GRADIENT
// ─────────────────────────────────────────────────────────────────────────────

float getHeightGradient(float y) {
    float normalizedY = (y - cloudBase) / (cloudTop - cloudBase);
    
    // Cumulus profile: flat bottom, puffy top
    float bottom = smoothstep(0.0, bottomFade, normalizedY);
    float top = smoothstep(1.0, 1.0 - topFade, normalizedY);
    
    // Round bottom, dome top
    float roundBottom = pow(bottom, 0.5);
    float puffyTop = top * (1.0 - pow(normalizedY, 2.0) * 0.5);
    
    return roundBottom * puffyTop;
}

// ─────────────────────────────────────────────────────────────────────────────
// EDGE FADE
// ─────────────────────────────────────────────────────────────────────────────

float getEdgeFade(vec3 p) {
    vec2 edgeCoord = (p.xz + cloudExtent) / (cloudExtent * 2.0);
    float fade = smoothstep(0.0, edgeFade, edgeCoord.x) *
                 smoothstep(1.0, 1.0 - edgeFade, edgeCoord.x) *
                 smoothstep(0.0, edgeFade, edgeCoord.y) *
                 smoothstep(1.0, 1.0 - edgeFade, edgeCoord.y);
    return fade;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOUD DENSITY SAMPLING
// ─────────────────────────────────────────────────────────────────────────────

float sampleCloudDensity(vec3 p, bool cheap) {
    // Height gradient
    float heightGrad = getHeightGradient(p.y);
    if (heightGrad <= 0.0) return 0.0;
    
    // Edge fade
    float edge = getEdgeFade(p);
    if (edge <= 0.0) return 0.0;
    
    // Shape noise (low frequency)
    vec3 shapeCoord = p * shapeScale + vec3(iTime * shapeSpeed, 0.0, 0.0);
    float shape = perlinWorley(shapeCoord, 4);
    
    // Apply coverage and height gradient
    float density = remap(shape * heightGrad, 1.0 - cloudCoverage, 1.0, 0.0, 1.0);
    density = saturate(density);
    
    if (density <= 0.0 || cheap) return density * edge * cloudDensity;
    
    // Detail noise (high frequency) - erode the shape
    vec3 detailCoord = p * detailScale + vec3(iTime * detailSpeed, 0.0, 0.0);
    float detail = fbm3D(detailCoord, 3) * detailStrength;
    
    density = remap(density, detail, 1.0, 0.0, 1.0);
    density = saturate(density);
    
    return density * edge * cloudDensity;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

float henyeyGreenstein(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

float dualLobePhase(float cosTheta) {
    float forward = henyeyGreenstein(cosTheta, forwardG);
    float backward = henyeyGreenstein(cosTheta, backwardG);
    return mix(forward, backward, phaseMix);
}

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT MARCHING
// ─────────────────────────────────────────────────────────────────────────────

float lightMarch(vec3 pos) {
    float stepSize = (cloudTop - pos.y) / float(lightSteps);
    float totalDensity = 0.0;
    vec3 rayPos = pos;
    
    for (int i = 0; i < lightSteps; i++) {
        rayPos += sunDirection * stepSize;
        
        if (rayPos.y < cloudBase || rayPos.y > cloudTop) break;
        
        float density = sampleCloudDensity(rayPos, true);
        totalDensity += density * stepSize;
    }
    
    return exp(-totalDensity * 0.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTIPLE SCATTERING APPROXIMATION
// ─────────────────────────────────────────────────────────────────────────────

vec3 multipleScattering(float density, float mu, float lightTransmit) {
    // Powder effect
    float powder = 1.0 - exp(-density * 2.0) * powderStrength;
    
    // Multi-octave scattering
    float scatter = 0.0;
    float scatterAmount = 1.0;
    
    for (int i = 0; i < 4; i++) {
        float attenuatedMu = mu * pow(0.5, float(i));
        scatter += scatterAmount * dualLobePhase(attenuatedMu);
        scatterAmount *= 0.5;
    }
    
    // Ambient
    vec3 ambient = vec3(0.5, 0.6, 0.7) * ambientIntensity;
    
    // Direct sun light
    vec3 sunLight = sunColor * sunIntensity * lightTransmit * scatter;
    
    // Silver lining (edge brightening)
    float silverLining = pow(1.0 - abs(mu), 8.0) * silverLiningIntensity;
    vec3 silver = sunColor * silverLining * lightTransmit;
    
    // Combine with powder effect
    vec3 luminance = (ambient + sunLight + silver) * mix(1.0, powder, saturate(-mu + 0.5));
    
    return luminance;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RAYMARCHING
// ─────────────────────────────────────────────────────────────────────────────

vec4 raymarchClouds(vec3 ro, vec3 rd) {
    // Cloud volume bounds
    vec3 cloudMin = vec3(-cloudExtent, cloudBase, -cloudExtent);
    vec3 cloudMax = vec3(cloudExtent, cloudTop, cloudExtent);
    
    // Ray-box intersection
    vec2 boxHit = rayBoxIntersect(ro, rd, cloudMin, cloudMax);
    float dstToBox = boxHit.x;
    float dstInsideBox = boxHit.y;
    
    if (dstInsideBox <= 0.0) return vec4(0.0);
    
    // Blue noise jitter
    vec2 noiseUV = gl_FragCoord.xy / 128.0;
    float blueNoise = texture(blueNoiseTexture, noiseUV).r;
    blueNoise = fract(blueNoise + goldenRatio * float(int(iTime * 60.0) % 100));
    
    float stepSize = dstInsideBox / float(primarySteps);
    float t = dstToBox + stepSize * blueNoise;
    
    vec3 totalLight = vec3(0.0);
    float totalTransmittance = 1.0;
    
    float mu = dot(rd, sunDirection);
    
    for (int i = 0; i < primarySteps; i++) {
        if (totalTransmittance < 0.01) break;
        
        vec3 pos = ro + rd * t;
        
        if (pos.y >= cloudBase && pos.y <= cloudTop) {
            float density = sampleCloudDensity(pos, false);
            
            if (density > 0.001) {
                float lightTransmit = lightMarch(pos);
                vec3 luminance = multipleScattering(density, mu, lightTransmit);
                
                float stepTransmit = exp(-density * stepSize);
                vec3 scatter = luminance * (1.0 - stepTransmit);
                
                totalLight += totalTransmittance * scatter;
                totalTransmittance *= stepTransmit;
            }
        }
        
        t += stepSize;
        if (t > dstToBox + dstInsideBox) break;
    }
    
    return vec4(totalLight, 1.0 - totalTransmittance);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

void main() {
    // Calculate ray direction from screen coordinates
    vec2 uv = gl_FragCoord.xy / iResolution;
    vec4 clipPos = vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    vec4 worldPos = invViewProjection * clipPos;
    vec3 rd = normalize(worldPos.xyz / worldPos.w - cameraPosition);
    
    // Raymarch clouds
    vec4 clouds = raymarchClouds(cameraPosition, rd);
    
    fragColor = clouds;
}
```

## Cloud Shadow Shader (cloudShadow.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// CLOUD SHADOW SAMPLING SHADER
// For terrain and ocean shadow receiving
// ═══════════════════════════════════════════════════════════════════════════

float sampleCloudShadow(vec3 worldPos) {
    vec3 cloudMin = vec3(-cloudExtent, cloudBase, -cloudExtent);
    vec3 cloudMax = vec3(cloudExtent, cloudTop, cloudExtent);
    
    // Ray from surface point towards sun
    vec3 ro = worldPos;
    vec3 rd = sunDirection;
    
    vec2 boxHit = rayBoxIntersect(ro, rd, cloudMin, cloudMax);
    
    if (boxHit.y <= 0.0) return 1.0;
    
    float stepSize = boxHit.y / float(shadowSteps);
    float t = boxHit.x;
    float accumulatedDensity = 0.0;
    
    for (int i = 0; i < shadowSteps; i++) {
        vec3 pos = ro + rd * t;
        float density = sampleCloudDensity(pos, true);
        accumulatedDensity += density * stepSize;
        t += stepSize;
    }
    
    float shadow = exp(-accumulatedDensity * shadowDensityMultiplier);
    return mix(shadowDarkness, 1.0, smoothstep(0.0, shadowSoftness, shadow));
}
```

---

# OCEAN SHADERS

## Ocean Surface Vertex Shader (oceanVertex.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// OCEAN SURFACE VERTEX SHADER
// Gerstner waves + height-field displacement
// ═══════════════════════════════════════════════════════════════════════════

precision highp float;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float time;
uniform sampler2D waveTexture;
uniform vec2 waveTextureSize;

// Wave parameters (up to 8 Gerstner waves)
uniform vec4 waveParams[8];  // xy: direction, z: steepness, w: wavelength
uniform int waveCount;

in vec3 position;
in vec2 uv;

out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vUv;
out float vFoam;

// Gerstner wave function
vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
    float steepness = wave.z;
    float wavelength = wave.w;
    float k = 2.0 * PI / wavelength;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(wave.xy);
    float f = k * (dot(d, p.xz) - c * time);
    float a = steepness / k;
    
    tangent += vec3(
        -d.x * d.x * steepness * sin(f),
        d.x * steepness * cos(f),
        -d.x * d.y * steepness * sin(f)
    );
    
    binormal += vec3(
        -d.x * d.y * steepness * sin(f),
        d.y * steepness * cos(f),
        -d.y * d.y * steepness * sin(f)
    );
    
    return vec3(
        d.x * a * cos(f),
        a * sin(f),
        d.y * a * cos(f)
    );
}

void main() {
    vec3 p = position;
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    
    // Apply Gerstner waves
    for (int i = 0; i < waveCount; i++) {
        p += gerstnerWave(waveParams[i], p, tangent, binormal);
    }
    
    // Sample height-field texture
    vec4 waveData = texture(waveTexture, uv);
    p.y += waveData.r;
    
    // Calculate normal
    vec3 normal = normalize(cross(binormal, tangent));
    normal = normalize(normal + vec3(waveData.ba * 0.5, 0.0).xzy);
    
    // Foam detection (Jacobian method)
    float jacobian = tangent.x * binormal.z - tangent.z * binormal.x;
    vFoam = saturate(1.0 - jacobian + foamBias);
    
    // Transform
    vec4 worldPos = modelMatrix * vec4(p, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = mat3(modelMatrix) * normal;
    vUv = uv;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
```

## Ocean Surface Fragment Shader (oceanFragment.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// OCEAN SURFACE FRAGMENT SHADER
// PBR water rendering with subsurface scattering
// ═══════════════════════════════════════════════════════════════════════════

precision highp float;

uniform vec3 cameraPosition;
uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform samplerCube skyTexture;
uniform sampler2D cloudTexture;
uniform sampler2D normalMap;
uniform sampler2D foamTexture;

uniform vec3 waterColor;
uniform vec3 deepWaterColor;
uniform float waterRoughness;
uniform float waterFresnel;
uniform float foamBrightness;
uniform float sssStrength;
uniform vec3 sssColor;

in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUv;
in float vFoam;

out vec4 fragColor;

void main() {
    // Sample detail normal
    vec3 detailNormal = texture(normalMap, vUv * 20.0 + time * 0.02).rgb * 2.0 - 1.0;
    vec3 normal = normalize(vNormal + detailNormal * 0.3);
    
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(viewDir + sunDirection);
    
    // Fresnel
    float fresnel = waterFresnel + (1.0 - waterFresnel) * pow(1.0 - dot(normal, viewDir), 5.0);
    
    // Reflection
    vec3 reflectDir = reflect(-viewDir, normal);
    vec3 skyReflection = textureCube(skyTexture, reflectDir).rgb;
    vec4 cloudReflection = texture(cloudTexture, reflectDir.xz * 0.5 + 0.5);
    vec3 reflection = mix(skyReflection, cloudReflection.rgb, cloudReflection.a);
    
    // Refraction (simplified - use depth for underwater scene)
    vec3 refraction = mix(waterColor, deepWaterColor, 0.5);
    
    // Specular
    float spec = pow(max(dot(normal, halfDir), 0.0), 256.0 / waterRoughness);
    vec3 specular = sunColor * spec;
    
    // Subsurface scattering
    float sss = pow(saturate(dot(viewDir, -sunDirection + normal * 0.3)), 4.0);
    vec3 subsurface = sssColor * sss * sssStrength;
    
    // Foam
    float foamAmount = vFoam;
    vec3 foamColor = texture(foamTexture, vUv * 5.0).rgb * foamBrightness;
    
    // Cloud shadows
    float cloudShadow = sampleCloudShadow(vWorldPosition);
    
    // Combine
    vec3 water = mix(refraction, reflection, fresnel);
    water += specular + subsurface;
    water = mix(water, foamColor, foamAmount * 0.8);
    water *= cloudShadow;
    
    fragColor = vec4(water, 1.0);
}
```

## Caustics Shader (caustics.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// UNDERWATER CAUSTICS SHADER
// Refraction-based caustic projection
// ═══════════════════════════════════════════════════════════════════════════

precision highp float;

uniform sampler2D waveTexture;
uniform vec3 sunDirection;
uniform float waterLevel;
uniform float floorDepth;
uniform float causticsStrength;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution;
    
    // Sample wave height and normal
    vec4 waveData = texture(waveTexture, uv);
    float height = waveData.r + waterLevel;
    vec3 normal = normalize(vec3(waveData.ba, 1.0));
    
    // Refract light through surface
    float eta = 1.0 / 1.33;  // Air to water IOR
    vec3 refractDir = refract(-sunDirection, normal, eta);
    
    // Project to floor
    float t = (floorDepth - height) / refractDir.y;
    vec2 floorHit = uv + refractDir.xz * t * 0.1;
    
    // Calculate intensity from area change
    vec2 dudx = dFdx(floorHit);
    vec2 dudy = dFdy(floorHit);
    float area = abs(dudx.x * dudy.y - dudx.y * dudy.x);
    float originalArea = 1.0 / (iResolution.x * iResolution.y);
    float intensity = originalArea / max(area, 0.0001);
    
    // Clamp and apply
    intensity = clamp(intensity * causticsStrength, 0.0, 10.0);
    
    fragColor = vec4(vec3(intensity), 1.0);
}
```

---

# TERRAIN SHADERS

## Terrain Fragment Shader (terrainFragment.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// TERRAIN PBR FRAGMENT SHADER
// Multi-biome with triplanar mapping
// ═══════════════════════════════════════════════════════════════════════════

precision highp float;

uniform sampler2DArray albedoAtlas;
uniform sampler2DArray normalAtlas;
uniform sampler2DArray roughnessAtlas;

uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform float ambientIntensity;

in vec3 vWorldPosition;
in vec3 vNormal;
in float vHeight;
in vec4 vBiomeWeights;
in ivec4 vBiomeIndices;

out vec4 fragColor;

// Triplanar mapping
vec4 triplanarSample(sampler2DArray tex, int layer, vec3 worldPos, vec3 normal) {
    vec3 blend = abs(normal);
    blend = normalize(max(blend, 0.00001));
    blend /= (blend.x + blend.y + blend.z);
    
    vec4 xProj = texture(tex, vec3(worldPos.yz * 0.1, float(layer)));
    vec4 yProj = texture(tex, vec3(worldPos.xz * 0.1, float(layer)));
    vec4 zProj = texture(tex, vec3(worldPos.xy * 0.1, float(layer)));
    
    return xProj * blend.x + yProj * blend.y + zProj * blend.z;
}

void main() {
    vec3 normal = normalize(vNormal);
    
    // Sample all active biomes
    vec3 albedo = vec3(0.0);
    vec3 normalMap = vec3(0.0);
    float roughness = 0.0;
    
    for (int i = 0; i < 4; i++) {
        float weight = vBiomeWeights[i];
        if (weight > 0.001) {
            int biome = vBiomeIndices[i];
            albedo += triplanarSample(albedoAtlas, biome, vWorldPosition, normal).rgb * weight;
            normalMap += triplanarSample(normalAtlas, biome, vWorldPosition, normal).rgb * weight;
            roughness += triplanarSample(roughnessAtlas, biome, vWorldPosition, normal).r * weight;
        }
    }
    
    // Apply normal map
    vec3 mappedNormal = normalize(normal + (normalMap * 2.0 - 1.0) * 0.5);
    
    // PBR lighting
    float NdotL = max(dot(mappedNormal, sunDirection), 0.0);
    vec3 diffuse = albedo * sunColor * NdotL;
    vec3 ambient = albedo * ambientIntensity;
    
    // Cloud shadows
    float cloudShadow = sampleCloudShadow(vWorldPosition);
    
    vec3 color = (diffuse + ambient) * cloudShadow;
    
    fragColor = vec4(color, 1.0);
}
```

---

# ATMOSPHERE SHADERS

## Sky Atmosphere Shader (atmosphere.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// PHYSICALLY-BASED ATMOSPHERIC SCATTERING
// Rayleigh + Mie with ozone absorption
// ═══════════════════════════════════════════════════════════════════════════

precision highp float;

uniform vec3 sunDirection;
uniform float sunIntensity;
uniform vec3 rayleighCoeffs;  // RGB Rayleigh scattering coefficients
uniform float mieCoeff;
uniform float mieG;
uniform float rayleighHeight;
uniform float mieHeight;

const float EARTH_RADIUS = 6371000.0;
const float ATMOSPHERE_HEIGHT = 100000.0;
const int SCATTER_STEPS = 16;
const int DENSITY_STEPS = 8;

// Rayleigh phase function
float rayleighPhase(float cosTheta) {
    return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}

// Mie phase function (Henyey-Greenstein)
float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

// Density at altitude
vec2 getDensity(float altitude) {
    float rayleighDensity = exp(-altitude / rayleighHeight);
    float mieDensity = exp(-altitude / mieHeight);
    return vec2(rayleighDensity, mieDensity);
}

// Optical depth along ray
vec2 opticalDepth(vec3 ro, vec3 rd, float rayLength) {
    vec2 depth = vec2(0.0);
    float stepSize = rayLength / float(DENSITY_STEPS);
    
    for (int i = 0; i < DENSITY_STEPS; i++) {
        vec3 pos = ro + rd * (float(i) + 0.5) * stepSize;
        float altitude = length(pos) - EARTH_RADIUS;
        depth += getDensity(altitude) * stepSize;
    }
    
    return depth;
}

// Ray-sphere intersection
float raySphereIntersect(vec3 ro, vec3 rd, float radius) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - radius * radius;
    float d = b * b - c;
    if (d < 0.0) return -1.0;
    return -b + sqrt(d);
}

// Main scattering calculation
vec3 calculateScattering(vec3 ro, vec3 rd) {
    float atmosphereRadius = EARTH_RADIUS + ATMOSPHERE_HEIGHT;
    float rayLength = raySphereIntersect(ro, rd, atmosphereRadius);
    
    if (rayLength < 0.0) return vec3(0.0);
    
    float stepSize = rayLength / float(SCATTER_STEPS);
    vec3 totalRayleigh = vec3(0.0);
    vec3 totalMie = vec3(0.0);
    vec2 totalDensity = vec2(0.0);
    
    float cosTheta = dot(rd, sunDirection);
    float phaseR = rayleighPhase(cosTheta);
    float phaseM = miePhase(cosTheta, mieG);
    
    for (int i = 0; i < SCATTER_STEPS; i++) {
        vec3 pos = ro + rd * (float(i) + 0.5) * stepSize;
        float altitude = length(pos) - EARTH_RADIUS;
        vec2 localDensity = getDensity(altitude) * stepSize;
        totalDensity += localDensity;
        
        // Ray to sun
        float sunRayLength = raySphereIntersect(pos, sunDirection, atmosphereRadius);
        vec2 sunDepth = opticalDepth(pos, sunDirection, sunRayLength);
        
        // Transmittance
        vec3 tau = rayleighCoeffs * (totalDensity.x + sunDepth.x) +
                   vec3(mieCoeff) * (totalDensity.y + sunDepth.y);
        vec3 transmittance = exp(-tau);
        
        // Accumulate
        totalRayleigh += transmittance * localDensity.x;
        totalMie += transmittance * localDensity.y;
    }
    
    vec3 rayleigh = totalRayleigh * rayleighCoeffs * phaseR;
    vec3 mie = totalMie * vec3(mieCoeff) * phaseM;
    
    return sunIntensity * (rayleigh + mie);
}

void main() {
    vec3 rd = normalize(vWorldPosition - cameraPosition);
    vec3 ro = cameraPosition + vec3(0.0, EARTH_RADIUS, 0.0);
    
    vec3 sky = calculateScattering(ro, rd);
    
    // Add sun disk
    float sunDot = dot(rd, sunDirection);
    if (sunDot > 0.9999) {
        sky += vec3(1.0, 0.95, 0.8) * sunIntensity;
    }
    
    fragColor = vec4(sky, 1.0);
}
```

## God Rays Shader (godRays.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// SCREEN-SPACE GOD RAYS (LIGHT SHAFTS)
// Radial blur with volumetric enhancement
// ═══════════════════════════════════════════════════════════════════════════

precision highp float;

uniform sampler2D occlusionTexture;
uniform vec2 sunScreenPos;
uniform float exposure;
uniform float decay;
uniform float density;
uniform float weight;
uniform int samples;

in vec2 vUv;
out vec4 fragColor;

void main() {
    vec2 texCoord = vUv;
    vec2 deltaTexCoord = (texCoord - sunScreenPos) * density / float(samples);
    
    vec3 color = texture(occlusionTexture, texCoord).rgb;
    float illuminationDecay = 1.0;
    
    for (int i = 0; i < samples; i++) {
        texCoord -= deltaTexCoord;
        vec3 sampleColor = texture(occlusionTexture, texCoord).rgb;
        sampleColor *= illuminationDecay * weight;
        color += sampleColor;
        illuminationDecay *= decay;
    }
    
    fragColor = vec4(color * exposure, 1.0);
}
```

---

# POST-PROCESSING SHADERS

## Temporal Anti-Aliasing (taa.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// TEMPORAL ANTI-ALIASING (TAA)
// Motion-aware temporal blending
// ═══════════════════════════════════════════════════════════════════════════

precision highp float;

uniform sampler2D currentFrame;
uniform sampler2D previousFrame;
uniform sampler2D velocityBuffer;
uniform float blendFactor;

in vec2 vUv;
out vec4 fragColor;

vec3 clipAABB(vec3 color, vec3 minColor, vec3 maxColor) {
    vec3 center = 0.5 * (minColor + maxColor);
    vec3 extents = 0.5 * (maxColor - minColor);
    vec3 offset = color - center;
    vec3 ts = abs(extents / (offset + 0.0001));
    float t = saturate(min(ts.x, min(ts.y, ts.z)));
    return center + offset * t;
}

void main() {
    vec3 current = texture(currentFrame, vUv).rgb;
    
    // Sample velocity
    vec2 velocity = texture(velocityBuffer, vUv).xy;
    vec2 prevUV = vUv - velocity;
    
    // Sample previous frame
    vec3 previous = texture(previousFrame, prevUV).rgb;
    
    // Neighborhood clamping
    vec3 minColor = vec3(1.0);
    vec3 maxColor = vec3(0.0);
    
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) / textureSize(currentFrame, 0);
            vec3 neighbor = texture(currentFrame, vUv + offset).rgb;
            minColor = min(minColor, neighbor);
            maxColor = max(maxColor, neighbor);
        }
    }
    
    // Clip history to neighborhood
    previous = clipAABB(previous, minColor, maxColor);
    
    // Blend
    vec3 result = mix(current, previous, blendFactor);
    
    fragColor = vec4(result, 1.0);
}
```

## HDR Tonemapping (tonemap.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// HDR TONEMAPPING
// ACES filmic curve with gamma correction
// ═══════════════════════════════════════════════════════════════════════════

precision highp float;

uniform sampler2D hdrTexture;
uniform float exposure;
uniform float gamma;

in vec2 vUv;
out vec4 fragColor;

// ACES filmic tonemapping
vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return saturate((x * (a * x + b)) / (x * (c * x + d) + e));
}

void main() {
    vec3 hdr = texture(hdrTexture, vUv).rgb;
    
    // Exposure adjustment
    hdr *= exposure;
    
    // Tonemapping
    vec3 mapped = ACESFilm(hdr);
    
    // Gamma correction
    vec3 ldr = pow(mapped, vec3(1.0 / gamma));
    
    fragColor = vec4(ldr, 1.0);
}
```

## Bloom Shader (bloom.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PASS BLOOM
// Threshold, downsample, upsample, blend
// ═══════════════════════════════════════════════════════════════════════════

// Pass 1: Brightness threshold
vec4 brightnessThreshold(sampler2D tex, vec2 uv, float threshold) {
    vec4 color = texture(tex, uv);
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    return color * smoothstep(threshold, threshold + 0.5, brightness);
}

// Pass 2+: Gaussian blur (separable)
vec4 gaussianBlur(sampler2D tex, vec2 uv, vec2 direction, float[5] weights) {
    vec2 texelSize = 1.0 / textureSize(tex, 0);
    vec4 result = texture(tex, uv) * weights[0];
    
    for (int i = 1; i < 5; i++) {
        vec2 offset = direction * texelSize * float(i);
        result += texture(tex, uv + offset) * weights[i];
        result += texture(tex, uv - offset) * weights[i];
    }
    
    return result;
}

// Final: Blend
vec4 bloomBlend(sampler2D scene, sampler2D bloom, vec2 uv, float intensity) {
    vec3 sceneColor = texture(scene, uv).rgb;
    vec3 bloomColor = texture(bloom, uv).rgb;
    return vec4(sceneColor + bloomColor * intensity, 1.0);
}
```

---

# UTILITY FUNCTIONS

## Common Utilities (utils.glsl)

```glsl
// ═══════════════════════════════════════════════════════════════════════════
// COMMON UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

#define PI 3.14159265359
#define TAU 6.28318530718
#define EPSILON 0.0001

// Saturate
float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec2 saturate(vec2 x) { return clamp(x, 0.0, 1.0); }
vec3 saturate(vec3 x) { return clamp(x, 0.0, 1.0); }
vec4 saturate(vec4 x) { return clamp(x, 0.0, 1.0); }

// Remap
float remap(float x, float a, float b, float c, float d) {
    return c + (x - a) * (d - c) / (b - a);
}

// Smooth minimum (for metaballs)
float smin(float a, float b, float k) {
    float h = saturate(0.5 + 0.5 * (b - a) / k);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Rotation matrices
mat2 rotate2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

mat3 rotateX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(1, 0, 0, 0, c, -s, 0, s, c);
}

mat3 rotateY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(c, 0, s, 0, 1, 0, -s, 0, c);
}

mat3 rotateZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(c, -s, 0, s, c, 0, 0, 0, 1);
}

// Color space conversions
vec3 sRGBToLinear(vec3 srgb) {
    return pow(srgb, vec3(2.2));
}

vec3 linearToSRGB(vec3 linear) {
    return pow(linear, vec3(1.0 / 2.2));
}

vec3 rgbToHSV(vec3 rgb) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(rgb.bg, K.wz), vec4(rgb.gb, K.xy), step(rgb.b, rgb.g));
    vec4 q = mix(vec4(p.xyw, rgb.r), vec4(rgb.r, p.yzx), step(p.x, rgb.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsvToRGB(vec3 hsv) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
    return hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y);
}

// Luminance
float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Fresnel (Schlick approximation)
float fresnel(float cosTheta, float F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

vec3 fresnelRGB(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

// Normal encoding/decoding
vec2 encodeNormal(vec3 n) {
    return n.xy * 0.5 + 0.5;
}

vec3 decodeNormal(vec2 enc) {
    vec3 n;
    n.xy = enc * 2.0 - 1.0;
    n.z = sqrt(1.0 - saturate(dot(n.xy, n.xy)));
    return n;
}

// Depth linearization
float linearizeDepth(float depth, float near, float far) {
    return near * far / (far - depth * (far - near));
}

// UV utilities
vec2 parallaxUV(vec2 uv, vec3 viewDir, sampler2D heightMap, float scale) {
    float height = texture(heightMap, uv).r;
    vec2 offset = viewDir.xy / viewDir.z * height * scale;
    return uv - offset;
}
```

---

*Document Version: 1.0*
*Complete shader reference for Procedural Earth Engine*



# PROCEDURAL EARTH ENGINE - SYSTEM RELATIONSHIPS & DATA FLOW
## Version 1.0 - Complete Inter-System Communication Map
## Date: 2025-01-27

---

# TABLE OF CONTENTS

1. [System Dependency Graph](#system-dependency-graph)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Texture Dependencies](#texture-dependencies)
4. [Uniform Buffer Layout](#uniform-buffer-layout)
5. [Event Communication](#event-communication)
6. [Performance Considerations](#performance-considerations)

---

# SYSTEM DEPENDENCY GRAPH

## Primary System Dependencies

```
═══════════════════════════════════════════════════════════════════════════════
                    SYSTEM DEPENDENCY HIERARCHY
═══════════════════════════════════════════════════════════════════════════════

Level 0: Core Infrastructure
─────────────────────────────────────────────────────────────────────────────
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   TIME/DATE     │  │    CAMERA       │  │   RESOURCE      │
│   CONTROLLER    │  │   CONTROLLER    │  │   MANAGER       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼

Level 1: Environmental Controllers
─────────────────────────────────────────────────────────────────────────────
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   CELESTIAL     │  │    WEATHER      │  │   ATMOSPHERE    │
│    SYSTEM       │  │    SYSTEM       │  │    SYSTEM       │
│                 │  │                 │  │                 │
│ OUT: sunDir     │  │ OUT: wind       │  │ OUT: skyColor   │
│ OUT: moonDir    │  │ OUT: coverage   │  │ OUT: fogDensity │
│ OUT: starRot    │  │ OUT: precip     │  │ OUT: scattering │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼

Level 2: Volumetric & Surface Systems
─────────────────────────────────────────────────────────────────────────────
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    CLOUD        │  │    TERRAIN      │  │    OCEAN        │
│    SYSTEM       │  │    SYSTEM       │  │    SYSTEM       │
│                 │  │                 │  │                 │
│ IN: sunDir      │  │ IN: cloudShadow │  │ IN: cloudShadow │
│ IN: coverage    │  │ IN: wind        │  │ IN: wind        │
│ IN: wind        │  │                 │  │ IN: sunDir      │
│                 │  │ OUT: heightMap  │  │                 │
│ OUT: cloudTex   │  │ OUT: normalMap  │  │ OUT: waveTex    │
│ OUT: shadowMap  │  │ OUT: biomeMap   │  │ OUT: foamTex    │
│ OUT: godRays    │  │                 │  │ OUT: caustics   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼

Level 3: Effects & Particles
─────────────────────────────────────────────────────────────────────────────
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  PRECIPITATION  │  │    FOAM/SPRAY   │  │   VEGETATION    │
│    SYSTEM       │  │    SYSTEM       │  │    SYSTEM       │
│                 │  │                 │  │                 │
│ IN: wind        │  │ IN: waveData    │  │ IN: terrainData │
│ IN: coverage    │  │ IN: wind        │  │ IN: wind        │
│ IN: cloudShadow │  │                 │  │ IN: biome       │
└─────────────────┘  └─────────────────┘  └─────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```

## Cross-System Data Requirements

```
═══════════════════════════════════════════════════════════════════════════════
                    CROSS-SYSTEM DATA MATRIX
═══════════════════════════════════════════════════════════════════════════════

PRODUCER →           CLOUD    TERRAIN   OCEAN    WEATHER   CELESTIAL  ATMOS
CONSUMER ↓
─────────────────────────────────────────────────────────────────────────────
CLOUD                  -         -         -        ✓          ✓         -
TERRAIN               ✓          -         -        ✓          ✓         -
OCEAN                 ✓          ✓         -        ✓          ✓         -
WEATHER               -          -         -        -          ✓         -
CELESTIAL             -          -         -        -          -         -
ATMOSPHERE            ✓          -         -        ✓          ✓         -
PRECIPITATION         ✓          ✓         -        ✓          -         -
VEGETATION            -          ✓         -        ✓          -         -
GOD RAYS              ✓          -         -        -          ✓         -
CAUSTICS              -          -         ✓        -          ✓         -

LEGEND:
✓ = Requires data from producer
- = No dependency

═══════════════════════════════════════════════════════════════════════════════
```

---

# DATA FLOW DIAGRAMS

## Per-Frame Update Sequence

```
═══════════════════════════════════════════════════════════════════════════════
                    FRAME UPDATE SEQUENCE
═══════════════════════════════════════════════════════════════════════════════

FRAME START
    │
    ├─── Phase 1: CPU Updates (< 1ms)
    │    │
    │    ├── Update time/date
    │    ├── Process input
    │    ├── Update camera matrices
    │    ├── Calculate sun/moon positions
    │    └── Update weather state machine
    │
    ├─── Phase 2: GPU Simulation (< 2ms)
    │    │
    │    ├── [COMPUTE] Ocean wave simulation
    │    ├── [COMPUTE] Wind field update
    │    └── [COMPUTE] Particle physics
    │
    ├─── Phase 3: Shadow Pass (< 1.5ms)
    │    │
    │    ├── Render cascaded shadow maps
    │    └── Generate cloud shadow texture
    │
    ├─── Phase 4: G-Buffer Pass (< 2ms)
    │    │
    │    ├── Render terrain (depth, normals, albedo)
    │    └── Render ocean surface (depth, normals)
    │
    ├─── Phase 5: Volumetric Pass (< 4ms)
    │    │
    │    ├── [RAYMARCH] Cloud rendering
    │    ├── [RAYMARCH] Volumetric fog
    │    └── [COMPUTE] God ray occlusion
    │
    ├─── Phase 6: Lighting Pass (< 2ms)
    │    │
    │    ├── Deferred lighting calculation
    │    ├── Apply cloud shadows
    │    └── Apply caustics (underwater)
    │
    ├─── Phase 7: Composite Pass (< 1ms)
    │    │
    │    ├── Blend clouds with scene
    │    ├── Add atmospheric effects
    │    └── Composite god rays
    │
    └─── Phase 8: Post-Process (< 1.5ms)
         │
         ├── Temporal anti-aliasing
         ├── Bloom extraction + blur
         ├── HDR tonemapping
         └── Final output
    
FRAME END (Target: 16.67ms total)

═══════════════════════════════════════════════════════════════════════════════
```

## Cloud System Internal Data Flow

```
═══════════════════════════════════════════════════════════════════════════════
                    CLOUD SYSTEM INTERNAL DATA FLOW
═══════════════════════════════════════════════════════════════════════════════

                         ┌──────────────────┐
                         │  WEATHER SYSTEM  │
                         │                  │
                         │  coverage: 0.6   │
                         │  wind: vec3      │
                         └────────┬─────────┘
                                  │
                                  ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ 3D NOISE TEXTURE │      │  WEATHER MAP     │      │  CELESTIAL DATA  │
│                  │      │                  │      │                  │
│ Perlin-Worley    │      │  Coverage mask   │      │  sunDir          │
│ 128³ RGBA        │      │  Cloud type      │      │  moonDir         │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │    DENSITY SAMPLER       │
                    │                          │
                    │  getCloudDensity(pos)    │
                    │  ├── Height gradient     │
                    │  ├── Weather map lookup  │
                    │  ├── Shape noise sample  │
                    │  └── Detail noise erode  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
         ┌──────────────────┐      ┌──────────────────┐
         │ PRIMARY RAYMARCH │      │  LIGHT RAYMARCH  │
         │                  │      │                  │
         │ View ray march   │      │ Sun ray march    │
         │ 64 steps         │      │ 10 steps         │
         │ Blue noise jitter│      │ Quick density    │
         └────────┬─────────┘      └────────┬─────────┘
                  │                         │
                  │    ┌────────────────────┘
                  │    │
                  ▼    ▼
         ┌──────────────────┐
         │  MULTI-SCATTER   │
         │   INTEGRATION    │
         │                  │
         │ Beer-Powder      │
         │ Phase function   │
         │ Silver lining    │
         └────────┬─────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│   CLOUD COLOR    │  │  CLOUD SHADOW    │
│   TEXTURE        │  │   TEXTURE        │
│                  │  │                  │
│ RGB: scattered   │  │ R: shadow factor │
│ A: transmittance │  │                  │
└──────────────────┘  └──────────────────┘
         │                    │
         │                    │
         ▼                    ▼
    [COMPOSITE]          [TERRAIN/OCEAN]

═══════════════════════════════════════════════════════════════════════════════
```

## Ocean System Internal Data Flow

```
═══════════════════════════════════════════════════════════════════════════════
                    OCEAN SYSTEM INTERNAL DATA FLOW
═══════════════════════════════════════════════════════════════════════════════

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  WIND SYSTEM     │      │  INITIAL STATE   │      │  USER INPUT      │
│                  │      │                  │      │                  │
│  Wind vector     │      │  Calm water      │      │  Ripple drops    │
│  Gust strength   │      │  Height=0        │      │                  │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   WAVE SIMULATION        │
                    │   (GPU Compute)          │
                    │                          │
                    │   Height-field update    │
                    │   ├── Neighbor average   │
                    │   ├── Velocity update    │
                    │   ├── Damping            │
                    │   └── Boundary conds     │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   WAVE TEXTURE           │
                    │   (256² RGBA32F)         │
                    │                          │
                    │   R: Height              │
                    │   G: Velocity            │
                    │   B: Normal.x            │
                    │   A: Normal.z            │
                    └────────────┬─────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ VERTEX SHADER    │  │  CAUSTICS GEN    │  │   FOAM GEN       │
│                  │  │                  │  │                  │
│ Gerstner waves   │  │ Refraction proj  │  │ Jacobian calc    │
│ Height-field     │  │ Area change      │  │ Threshold        │
│ Normal blend     │  │ Accumulation     │  │ Texture blend    │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │   FRAGMENT SHADER        │
                    │                          │
                    │   ├── Fresnel            │
                    │   ├── Reflection         │
                    │   ├── Refraction         │
                    │   ├── Subsurface scatter │
                    │   ├── Foam overlay       │
                    │   └── Cloud shadows      │
                    └──────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```

---

# TEXTURE DEPENDENCIES

## Texture Atlas Organization

```
═══════════════════════════════════════════════════════════════════════════════
                    TEXTURE MEMORY LAYOUT
═══════════════════════════════════════════════════════════════════════════════

TEXTURE                    FORMAT          SIZE           USAGE
─────────────────────────────────────────────────────────────────────────────
cloudNoiseShape            RGBA8           128³           Cloud shape FBM
cloudNoiseDetail           RGBA8           64³            Cloud detail FBM
blueNoise                  R8              128²           Dithering
weatherMap                 RG8             512²           Coverage + type
cloudShadowMap             R16F            1024²          Shadow buffer
cloudColorBuffer           RGBA16F         Full res       Cloud output
cloudHistoryBuffer         RGBA16F         Full res       TAA history

waveSimulation             RGBA32F         256²           Height + velocity
causticBuffer              R16F            256²           Caustic intensity
foamBuffer                 R8              512²           Foam mask
normalDetailMap            RG8             512²           Water micro-normal

terrainHeightmap           R32F            2048²          Height data
terrainNormalmap           RG16F           2048²          Normal data
terrainBiomeMap            RGBA8           1024²          Biome weights
terrainAlbedoAtlas         RGBA8           2048² × 8      Material array
terrainNormalAtlas         RG8             1024² × 8      Normal array
terrainRoughnessAtlas      R8              512² × 8       Roughness array

shadowCascades             D32F            1024² × 4      Shadow maps
depthBuffer                D32F            Full res       Scene depth
gBufferAlbedo              RGBA8           Full res       Albedo + AO
gBufferNormal              RG16F           Full res       Encoded normals
gBufferMaterial            RGBA8           Full res       Material props

skyLUT                     RGBA16F         256 × 64       Atmosphere LUT
starTexture                RGBA8           2048²          Star field

─────────────────────────────────────────────────────────────────────────────
TOTAL VRAM ESTIMATE: ~180MB at 1080p, ~400MB at 4K

═══════════════════════════════════════════════════════════════════════════════
```

## Texture Sampling Relationships

```
═══════════════════════════════════════════════════════════════════════════════
                    TEXTURE SAMPLING GRAPH
═══════════════════════════════════════════════════════════════════════════════

                    cloudNoiseShape ─┐
                                     │
                    cloudNoiseDetail ┼──▶ CLOUD DENSITY SAMPLER
                                     │
                    weatherMap ──────┘
                           │
                           │
                           ▼
                    cloudShadowMap ──┬──▶ TERRAIN SHADER
                                     │
                                     └──▶ OCEAN SHADER
                                     │
                                     └──▶ PARTICLE SHADER

                    waveSimulation ──┬──▶ OCEAN VERTEX SHADER
                                     │
                                     └──▶ CAUSTICS GENERATOR
                                     │
                                     └──▶ FOAM GENERATOR

                    terrainHeightmap ┬──▶ TERRAIN VERTEX SHADER
                                     │
                    terrainBiomeMap ─┼──▶ TERRAIN FRAGMENT SHADER
                                     │
                    terrainAtlases ──┘

═══════════════════════════════════════════════════════════════════════════════
```

---

# UNIFORM BUFFER LAYOUT

## Buffer Organization

```
═══════════════════════════════════════════════════════════════════════════════
                    UNIFORM BUFFER OBJECTS (UBOs)
═══════════════════════════════════════════════════════════════════════════════

UBO 0: GLOBAL_FRAME (Binding 0, 512 bytes, updated every frame)
─────────────────────────────────────────────────────────────────────────────
struct GlobalFrame {
    mat4 viewMatrix;              // 0-63
    mat4 projectionMatrix;        // 64-127
    mat4 viewProjectionMatrix;    // 128-191
    mat4 invViewProjectionMatrix; // 192-255
    mat4 prevViewProjectionMatrix;// 256-319
    vec4 cameraPosition;          // 320-335 (w = near plane)
    vec4 cameraDirection;         // 336-351 (w = far plane)
    vec2 resolution;              // 352-359
    vec2 invResolution;           // 360-367
    float time;                   // 368-371
    float deltaTime;              // 372-375
    int frameCount;               // 376-379
    float padding;                // 380-383
    vec4 mousePosition;           // 384-399 (xy = pos, zw = buttons)
    // Reserved: 400-511
};

UBO 1: LIGHTING (Binding 1, 256 bytes, updated on change)
─────────────────────────────────────────────────────────────────────────────
struct Lighting {
    vec4 sunDirection;            // 0-15 (w = intensity)
    vec4 sunColor;                // 16-31 (w = disk size)
    vec4 moonDirection;           // 32-47 (w = intensity)
    vec4 moonColor;               // 48-63 (w = disk size)
    vec4 ambientColor;            // 64-79 (w = intensity)
    vec4 shadowCascadeSplits;     // 80-95
    mat4 shadowMatrix0;           // 96-159
    mat4 shadowMatrix1;           // 160-223
    mat4 shadowMatrix2;           // 224-255
    // Cascade 3 in next block
};

UBO 2: CLOUD_PARAMS (Binding 2, 512 bytes, updated on change)
─────────────────────────────────────────────────────────────────────────────
struct CloudParams {
    // Volume bounds
    vec4 cloudBounds;             // 0-15 (x=base, y=top, z=extent, w=unused)
    
    // Density
    vec4 densityParams;           // 16-31 (x=density, y=coverage, z=absorption, w=unused)
    
    // Shape noise
    vec4 shapeParams;             // 32-47 (x=scale, y=speed, z=strength, w=octaves)
    
    // Detail noise
    vec4 detailParams;            // 48-63 (x=scale, y=speed, z=strength, w=octaves)
    
    // Height profile
    vec4 profileParams;           // 64-79 (x=bottomFade, y=topFade, z=edgeFade, w=exponent)
    
    // Lighting
    vec4 lightingParams;          // 80-95 (x=power, y=ambient, z=powder, w=silverLining)
    
    // Phase function
    vec4 phaseParams;             // 96-111 (x=forwardG, y=backwardG, z=phaseMix, w=unused)
    
    // Shadows
    vec4 shadowParams;            // 112-127 (x=density, y=softness, z=darkness, w=steps)
    
    // Quality
    vec4 qualityParams;           // 128-143 (x=primarySteps, y=lightSteps, z=jitter, w=temporal)
    
    // Colors
    vec4 cloudColor;              // 144-159
    vec4 ambientSkyColor;         // 160-175
    
    // Reserved: 176-511 for additional parameters
};

UBO 3: OCEAN_PARAMS (Binding 3, 256 bytes, updated on change)
─────────────────────────────────────────────────────────────────────────────
struct OceanParams {
    // Wave simulation
    vec4 waveParams;              // 0-15 (x=speed, y=damping, z=height, w=unused)
    
    // Gerstner waves (8 waves × 16 bytes = 128 bytes)
    vec4 gerstnerWaves[8];        // 16-143 (xy=direction, z=steepness, w=wavelength)
    
    // Material
    vec4 waterColor;              // 144-159
    vec4 deepWaterColor;          // 160-175
    vec4 materialParams;          // 176-191 (x=roughness, y=fresnel, z=sssStrength, w=unused)
    
    // Foam
    vec4 foamParams;              // 192-207 (x=threshold, y=brightness, z=scale, w=unused)
    
    // Caustics
    vec4 causticsParams;          // 208-223 (x=strength, y=scale, z=speed, w=unused)
    
    // Reserved: 224-255
};

UBO 4: TERRAIN_PARAMS (Binding 4, 256 bytes, updated on change)
─────────────────────────────────────────────────────────────────────────────
struct TerrainParams {
    // Height generation
    vec4 heightParams;            // 0-15 (x=scale, y=mountainHeight, z=hillHeight, w=detail)
    
    // Biome colors
    vec4 grassColor;              // 16-31
    vec4 dirtColor;               // 32-47
    vec4 rockColor;               // 48-63
    vec4 snowColor;               // 64-79
    vec4 sandColor;               // 80-95
    
    // Biome thresholds
    vec4 biomeThresholds;         // 96-111 (x=snowLine, y=treeLinex, z=waterLevel, w=unused)
    
    // Material properties
    vec4 materialParams;          // 112-127 (x=roughness, y=metallic, z=aoStrength, w=unused)
    
    // Reserved: 128-255
};

UBO 5: WEATHER_STATE (Binding 5, 128 bytes, updated every frame)
─────────────────────────────────────────────────────────────────────────────
struct WeatherState {
    vec4 windVector;              // 0-15 (xyz=direction, w=speed)
    vec4 gustParams;              // 16-31 (x=strength, y=frequency, z=turbulence, w=unused)
    vec4 precipParams;            // 32-47 (x=type, y=intensity, z=particleCount, w=unused)
    vec4 stormParams;             // 48-63 (x=intensity, y=lightningFreq, z=thunderDelay, w=unused)
    vec4 fogParams;               // 64-79 (x=density, y=height, z=falloff, w=unused)
    vec4 fogColor;                // 80-95
    float cloudCoverage;          // 96-99
    float visibility;             // 100-103
    float temperature;            // 104-107
    float humidity;               // 108-111
    // Reserved: 112-127
};

═══════════════════════════════════════════════════════════════════════════════
```

---

# EVENT COMMUNICATION

## System Event Bus

```
═══════════════════════════════════════════════════════════════════════════════
                    EVENT COMMUNICATION SYSTEM
═══════════════════════════════════════════════════════════════════════════════

EVENT TYPE                   PRODUCER            CONSUMERS
─────────────────────────────────────────────────────────────────────────────
TIME_CHANGED                 TimeController      Celestial, Weather, All
CAMERA_MOVED                 CameraController    LOD, Culling, All
SUN_POSITION_CHANGED         Celestial           Clouds, Terrain, Ocean, Atmos
WEATHER_STATE_CHANGED        Weather             Clouds, Particles, Wind
CLOUD_COVERAGE_CHANGED       Weather             Clouds, Shadows
WIND_CHANGED                 Weather             Ocean, Particles, Vegetation
QUALITY_PRESET_CHANGED       UI                  All rendering systems
TERRAIN_LOD_CHANGED          LODManager          Terrain
OCEAN_INTERACTION            User                Ocean simulation
LIGHTNING_STRIKE             Weather             Audio, Visual effects

EVENT FLOW EXAMPLE - Weather Change
─────────────────────────────────────────────────────────────────────────────

User adjusts "Rain" slider
        │
        ▼
┌───────────────────┐
│   WeatherSystem   │
│                   │
│ setState(RAIN)    │
│ updateCoverage()  │
│ updateWind()      │
└─────────┬─────────┘
          │
          ├────────────────────────────────────────────┐
          │                                            │
          ▼                                            ▼
┌───────────────────┐                      ┌───────────────────┐
│   CloudSystem     │                      │  ParticleSystem   │
│                   │                      │                   │
│ setCoverage(0.8)  │                      │ enableRain()      │
│ updateDensity()   │                      │ setIntensity(0.7) │
│ regenerateShadows │                      │ applyWind()       │
└───────────────────┘                      └───────────────────┘
          │
          ▼
┌───────────────────┐
│   OceanSystem     │
│                   │
│ applyCloudShadow()│
│ increaseWaves()   │
└───────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```

---

# PERFORMANCE CONSIDERATIONS

## Render Pass Dependencies

```
═══════════════════════════════════════════════════════════════════════════════
                    RENDER PASS DEPENDENCY GRAPH
═══════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────┐
                    │   FRAME START   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      ┌──────────────┐┌──────────────┐┌──────────────┐
      │ Ocean Sim    ││ Wind Update  ││ Particle Sim │
      │ [COMPUTE]    ││ [COMPUTE]    ││ [COMPUTE]    │
      └──────┬───────┘└──────┬───────┘└──────┬───────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │      SHADOW PASS         │
              │  ┌────┬────┬────┬────┐  │
              │  │CSM0│CSM1│CSM2│CSM3│  │
              │  └────┴────┴────┴────┘  │
              └────────────┬─────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      ┌──────────────┐          ┌──────────────┐
      │ Terrain G-Buf│          │ Ocean G-Buf  │
      │              │          │              │
      │ ←shadowMaps  │          │ ←shadowMaps  │
      │ ←waveTexture │          │ ←waveTexture │
      └──────┬───────┘          └──────┬───────┘
              │                         │
              └────────────┬────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │    CLOUD RAYMARCH        │
              │                          │
              │ ←sunDirection            │
              │ ←weatherData             │
              │ ←blueNoise               │
              │ →cloudColor              │
              │ →cloudShadow             │
              └────────────┬─────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      ┌──────────────┐          ┌──────────────┐
      │ Terrain Light│          │ Ocean Light  │
      │              │          │              │
      │ ←cloudShadow │          │ ←cloudShadow │
      │ ←G-Buffer    │          │ ←G-Buffer    │
      │ ←shadowMaps  │          │ ←caustics    │
      └──────┬───────┘          └──────┬───────┘
              │                         │
              └────────────┬────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │       COMPOSITE          │
              │                          │
              │ ←terrainColor            │
              │ ←oceanColor              │
              │ ←cloudColor              │
              │ ←atmosphereColor         │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │     POST-PROCESS         │
              │                          │
              │ TAA → Bloom → Tonemap    │
              └────────────┬─────────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │    FRAME END    │
                    └─────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```

## Memory Bandwidth Considerations

```
═══════════════════════════════════════════════════════════════════════════════
                    BANDWIDTH OPTIMIZATION NOTES
═══════════════════════════════════════════════════════════════════════════════

HIGH-BANDWIDTH OPERATIONS (optimize first):
─────────────────────────────────────────────────────────────────────────────
1. Cloud Raymarching
   - 64 steps × 3D texture samples per pixel
   - Optimization: Use lower-res 3D textures, temporal reprojection

2. G-Buffer Writes
   - Multiple render targets per pixel
   - Optimization: Pack data efficiently, use tile-based rendering

3. Shadow Map Sampling
   - 4 cascades × multiple samples for PCF
   - Optimization: Cascade selection, shadow map caching

4. Ocean Simulation
   - Ping-pong buffer updates
   - Optimization: Reduce resolution, skip calm areas

LOW-BANDWIDTH OPERATIONS:
─────────────────────────────────────────────────────────────────────────────
1. Uniform buffer updates (< 2KB per frame)
2. Particle state updates (instanced)
3. Post-processing (single texture sample per pixel)

═══════════════════════════════════════════════════════════════════════════════
```

## Quality Scaling Strategy

```
═══════════════════════════════════════════════════════════════════════════════
                    ADAPTIVE QUALITY SCALING
═══════════════════════════════════════════════════════════════════════════════

IF frameTime > 18ms FOR 10 consecutive frames:
    1. Reduce cloud steps by 25%
    2. Reduce volumetric resolution by 50%
    3. Disable god rays
    4. Reduce shadow cascade resolution
    5. Reduce ocean resolution

IF frameTime < 12ms FOR 30 consecutive frames:
    1. Increase cloud steps
    2. Restore volumetric resolution
    3. Enable god rays
    4. Restore shadow quality
    5. Restore ocean resolution

PRIORITY ORDER (what to cut first):
    1. God rays (least impactful)
    2. Volumetric fog resolution
    3. Cloud temporal blend quality
    4. Shadow cascade count
    5. Ocean wave detail (last - most visible)

═══════════════════════════════════════════════════════════════════════════════
```

---

*Document Version: 1.0*
*System relationships and data flow for Procedural Earth Engine*



# PROCEDURAL EARTH ENGINE - SOURCE REFERENCE DOCUMENTS
## Version 1.0 - Complete Reference Material Preservation
## Date: 2025-01-27

---

# TABLE OF CONTENTS

1. [GPT Waves V7 Reference](#gpt-waves-v7-reference)
2. [Volumetric Terrain Pro Reference](#volumetric-terrain-pro-reference)
3. [WebGPU Terrain Engine Reference](#webgpu-terrain-engine-reference)
4. [Al-Ro Volumetric Clouds Reference](#al-ro-volumetric-clouds-reference)
5. [Key Algorithm Extractions](#key-algorithm-extractions)
6. [Implementation Priority Matrix](#implementation-priority-matrix)

---

# GPT WAVES V7 REFERENCE

## System Overview (From Source Document)

GPT Waves V7 is a comprehensive water simulation system implementing:

### Core Systems
1. **Height-Field Wave Simulation** - GPU-accelerated wave propagation using fragment shaders
2. **Interactive Sphere Physics** - Buoyancy, drag, planing, slamming with realistic water interaction
3. **Bubble Particle System** - 3D bubble particles with wake, surface entrainment, and coalescence
4. **Breaching/Spray System** - Metaball-based water sheets and blobs above the surface
5. **Caustics Rendering** - Refraction-based caustics with dispersion support
6. **Beach Environment** - Sand floor, obstacles, and dynamic boat

### Wave Simulation Texture Format
```
RGBA32F Texture Layout:
- R: Height (displacement from rest)
- G: Velocity (rate of height change)  
- B: Normal.x
- A: Normal.z
```

### Key Wave Propagation Algorithm
```glsl
// Wave equation (finite difference)
laplacian = (left.r + right.r + up.r + down.r) / 4.0 - center.r
acceleration = laplacian * waveSpeed²
newVelocity = center.g + acceleration * dt
newVelocity *= damping  // Energy loss
newHeight = center.r + newVelocity * dt
```

### Physics System Features
- Buoyancy (height-field sampling)
- Added mass (fluid carries with sphere)
- Quadratic drag (velocity-dependent)
- Planing forces (surface skimming)
- Slam forces (impact reactions)
- Wake injection (momentum-based)
- Collision detection (pool boundaries)

### Bubble System Features
- Wake emission (rear separation)
- Surface entrainment (waterline rim)
- Impact bubbles (entry clouds)
- Coalescence (merging)
- Surface foam field (2D accumulation)
- 3D density field (layered texture)
- Smart-link mode (bubbles align with foam)

### Caustics Algorithm (Key Implementation)
```glsl
// For each water surface point:
1. surfacePos = vec3(gridPos.x, waterHeight, gridPos.y)
2. normal = waterNormal
3. REFRACTION:
   - incidentDir = -lightDir
   - eta = 1.0 / 1.33  // Air to water IOR
   - refractedDir = refract(incidentDir, normal, eta)
4. PROJECT TO FLOOR:
   - t = (floorDepth - surfacePos.y) / refractedDir.y
   - floorHit = surfacePos + refractedDir * t
5. AREA CHANGE (focus factor):
   - originalArea = gridCellArea
   - projectedArea = computeProjectedQuadArea(...)
   - intensity = originalArea / projectedArea
6. ACCUMULATE:
   - causticsTexture[floorHit] += intensity * transmission
```

### Data Flow
```
User Input → Sphere Physics → Water Displacement → Wave Simulation
                                                          ↓
                    Caustics ← Water Texture ← Normal Calculation
                                                          ↓
                    Rendering ← Bubble Field ← Bubble Particles
                                                          ↓
                    Breaching ← Wave Retraction ← Wave Heights
```

---

# VOLUMETRIC TERRAIN PRO REFERENCE

## Complete Shader Architecture (From Source Document)

### Advanced Noise Functions (Perlin-Worley Hybrid)

```glsl
// 5th order polynomial interpolation
vec3 fade(vec3 t) {
    return (t * t * t) * (t * (t * 6.0 - 15.0) + 10.0);
}

// Advanced Perlin gradient noise
float gradientNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = fade(f);
    
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

// Tileable Worley noise for cloud detail
float worley(vec3 pos, float numCells) {
    vec3 p = pos * numCells;
    float d = 1.0e10;
    for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
            for(int z = -1; z <= 1; z++) {
                vec3 tp = floor(p) + vec3(x, y, z);
                vec3 cellCenter = tp + 0.5 + 0.5 * hash3v(mod(tp, numCells));
                vec3 diff = p - cellCenter;
                d = min(d, dot(diff, diff));
            }
        }
    }
    return 1.0 - saturate(sqrt(d));
}
```

### Cloud Density Sampling (Full Implementation)

```glsl
float sampleCloudDensity(vec3 pos, bool cheap) {
    float height = getHeightFraction(pos);
    if (height < 0.0 || height > 1.0) return 0.0;
    
    // Height gradient - cumulus profile
    float heightGradient = getHeightGradient(height);
    
    // Weather map for coverage
    vec2 weatherUV = getWeatherUV(pos);
    float coverage = texture(weatherMap, weatherUV).r * uCloudCoverage;
    
    // Base shape - low frequency Perlin-Worley
    vec3 shapePos = pos * uCloudScale + vec3(iTime * uShapeSpeed, 0.0, 0.0);
    float shape = perlinWorley(shapePos, 4);
    
    // Apply coverage
    float shapeDensity = remap(shape * heightGradient, 1.0 - coverage, 1.0, 0.0, 1.0);
    shapeDensity = max(0.0, shapeDensity);
    
    if (cheap || shapeDensity <= 0.0) {
        return shapeDensity * uCloudDensity;
    }
    
    // Detail erosion - high frequency FBM
    vec3 detailPos = pos * uDetailScale + vec3(iTime * uDetailSpeed, 0.0, 0.0);
    float detail = fbm(detailPos, 3);
    
    // Erode with detail
    float finalDensity = remap(shapeDensity, detail * 0.2, 1.0, 0.0, 1.0);
    
    return max(0.0, finalDensity) * uCloudDensity;
}
```

### Multiple Scattering Approximation (Beer-Powder)

```glsl
float beerPowder(float depth, float density) {
    float beer = exp(-depth);
    float powder = 1.0 - exp(-depth * 2.0);
    return beer * mix(1.0, powder, uPowderStrength);
}

vec3 cloudLighting(vec3 pos, vec3 viewDir, float density) {
    // Light march to sun
    float lightDepth = lightMarch(pos);
    float lightTransmittance = beerPowder(lightDepth, density);
    
    // Phase function (Henyey-Greenstein dual lobe)
    float cosTheta = dot(viewDir, uLightDir);
    float phase = hgPhase(cosTheta, 0.8) * 0.8 + hgPhase(cosTheta, -0.5) * 0.2;
    
    // Multiple scattering approximation
    vec3 ambient = uAmbientColor * uAmbientIntensity;
    vec3 direct = uLightColor * lightTransmittance * phase * uLightIntensity;
    
    // Silver lining
    float silverLining = pow(1.0 - abs(cosTheta), 8.0) * uSilverLiningIntensity;
    vec3 silver = uLightColor * silverLining * lightTransmittance;
    
    return ambient + direct + silver;
}
```

### God Ray Implementation

```glsl
// Two-pass god rays
// Pass 1: Render sun occlusion by clouds
// Pass 2: Radial blur from sun position

vec3 godRays(vec2 uv, vec2 sunScreenPos) {
    vec2 deltaUV = (uv - sunScreenPos) * uGodRayDensity / float(uGodRaySteps);
    vec3 accumColor = vec3(0.0);
    float illuminationDecay = 1.0;
    vec2 sampleUV = uv;
    
    for (int i = 0; i < uGodRaySteps; i++) {
        sampleUV -= deltaUV;
        float occlusion = texture(occlusionTex, sampleUV).r;
        accumColor += occlusion * illuminationDecay * uGodRayWeight;
        illuminationDecay *= uGodRayDecay;
    }
    
    return accumColor * uGodRayIntensity * uGodRayColor;
}
```

### Water Rendering (Full PBR)

```glsl
vec3 waterColor(vec3 worldPos, vec3 normal, vec3 viewDir) {
    // Fresnel
    float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), uWaterFresnel);
    
    // Reflection
    vec3 reflectDir = reflect(-viewDir, normal);
    vec3 skyReflect = textureCube(skybox, reflectDir).rgb;
    vec4 cloudReflect = texture(cloudTex, reflectDir.xz * 0.5 + 0.5);
    vec3 reflection = mix(skyReflect, cloudReflect.rgb, cloudReflect.a);
    
    // Refraction with depth fade
    float depth = getWaterDepth(worldPos);
    vec3 refraction = mix(uWaterColor, uWaterDeepColor, saturate(depth * 0.1));
    
    // Subsurface scattering
    float sss = pow(saturate(dot(viewDir, -uLightDir + normal * 0.3)), 4.0);
    vec3 subsurface = uLightColor * sss * 0.25;
    
    // Specular
    vec3 halfDir = normalize(viewDir + uLightDir);
    float spec = pow(max(0.0, dot(normal, halfDir)), 256.0 / uWaterRoughness);
    vec3 specular = uLightColor * spec;
    
    // Caustics (underwater only)
    vec3 caustics = vec3(0.0);
    if (cameraUnderwater) {
        caustics = texture(causticsTex, worldPos.xz * 0.1 + iTime * 0.02).rgb;
        caustics *= uCausticsStrength * uLightColor;
    }
    
    // Combine
    vec3 water = mix(refraction, reflection, fresnel);
    water += specular + subsurface + caustics;
    
    // Cloud shadows
    float cloudShadow = sampleCloudShadow(worldPos);
    water *= mix(uCloudShadowDarkness, 1.0, cloudShadow);
    
    return water;
}
```

### Cloud Shadow on Terrain

```glsl
float getCloudShadow(vec3 worldPos) {
    // Ray from surface to sun through cloud volume
    vec3 rayDir = uLightDir;
    vec3 rayPos = worldPos;
    
    // Find intersection with cloud layer
    float t0 = (uCloudHeight - rayPos.y) / rayDir.y;
    float t1 = (uCloudHeight + uCloudThickness - rayPos.y) / rayDir.y;
    
    if (t0 > t1) { float tmp = t0; t0 = t1; t1 = tmp; }
    if (t1 < 0.0) return 1.0;
    t0 = max(0.0, t0);
    
    // March through cloud
    float stepSize = (t1 - t0) / float(SHADOW_STEPS);
    float totalDensity = 0.0;
    
    for (int i = 0; i < SHADOW_STEPS; i++) {
        vec3 samplePos = rayPos + rayDir * (t0 + float(i) * stepSize);
        totalDensity += sampleCloudDensity(samplePos, true) * stepSize;
    }
    
    float shadow = exp(-totalDensity * uCloudShadowDensity);
    return smoothstep(0.0, uCloudShadowSoftness, shadow);
}
```

---

# WEBGPU TERRAIN ENGINE REFERENCE

## Architecture Overview (From Source Document)

### System Layers
```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  React Components, UI Controls, Environment Panel           │
├─────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                         │
│  Scene Manager, Camera Controller, Input Handler            │
├─────────────────────────────────────────────────────────────┤
│                    RENDER LAYER                              │
│  WebGPU Renderer, Pipeline Manager, Resource Manager        │
├─────────────────────────────────────────────────────────────┤
│                    COMPUTE LAYER                             │
│  Terrain Generation, Weather Simulation, LOD Processing     │
├─────────────────────────────────────────────────────────────┤
│                    GPU RESOURCE LAYER                        │
│  Buffers, Textures, Bind Groups, Samplers                   │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Pass Rendering Pipeline
```
Frame Start
    │
    ├── Pre-Pass
    │   ├── Depth Pre-pass (for occlusion)
    │   ├── Shadow Map Generation
    │   └── Visibility Culling (compute)
    │
    ├── G-Buffer Pass
    │   ├── Terrain Rendering
    │   ├── Object Rendering
    │   └── Material Properties
    │
    ├── Volumetric Pass
    │   ├── Fog Raymarching
    │   ├── Cloud Raymarching
    │   └── God Ray Accumulation
    │
    ├── Lighting Pass
    │   ├── Sun/Moon Direct Light
    │   ├── Ambient Occlusion
    │   ├── Global Illumination
    │   └── Volumetric Integration
    │
    ├── Composite Pass
    │   ├── Atmosphere Blending
    │   ├── Weather Effects
    │   └── Color Grading
    │
    └── Post-Process Pass
        ├── TAA
        ├── Bloom
        ├── Tonemapping
        └── Final Output
```

### Compute Shader Templates (WGSL)

```wgsl
// Terrain generation compute shader
@compute @workgroup_size(8, 8, 1)
fn generateTerrain(
  @builtin(global_invocation_id) id: vec3<u32>,
  @builtin(workgroup_id) wg_id: vec3<u32>
) {
  // 1. Calculate world position from dispatch ID
  // 2. Generate height using multi-octave noise
  // 3. Calculate normal vectors
  // 4. Determine biome parameters
  // 5. Write to terrain buffer
}

// LOD calculation compute shader
@compute @workgroup_size(256, 1, 1)
fn calculateLOD(
  @builtin(global_invocation_id) id: vec3<u32>
) {
  // 1. Load object position from buffer
  // 2. Calculate distance to camera
  // 3. Calculate screen-space size
  // 4. Determine LOD level with hysteresis
  // 5. Write LOD index to output buffer
}
```

### Cloud Raymarching Algorithm (Enhanced)
```
1. Ray-Box Intersection
   - Calculate entry/exit points for cloud layer
   - Early exit if no intersection
   
2. Adaptive Step Size
   - Start with large steps in empty space
   - Reduce step size when density detected
   - Use blue noise jitter to reduce banding
   
3. Density Sampling
   - Base shape: Low-frequency Perlin-Worley noise
   - Detail carving: High-frequency FBM
   - Height gradient for cloud profile
   - Weather map for coverage control
   
4. Lighting Integration
   - Primary ray: View direction sampling
   - Secondary ray: Light direction sampling
   - Henyey-Greenstein phase function
   - Beer-Powder approximation for scattering
   
5. Temporal Reprojection
   - Store previous frame cloud data
   - Blend with current frame
   - Handle disocclusion artifacts
```

### Memory Management Strategy
```
TEXTURE BUDGETS:
- 3D Noise: 128³ × RGBA8 = 8MB
- Shadow Maps: 4 × 2048² × D32 = 64MB
- G-Buffer: 1080p × 4 targets = 32MB
- Cloud Buffers: 1080p × 2 = 16MB

BUFFER POOLS:
- Vertex Pool: 256MB pre-allocated
- Uniform Ring Buffer: 4MB
- Compute Storage: 64MB
```

---

# AL-RO VOLUMETRIC CLOUDS REFERENCE

## Original Shadertoy Implementation Notes

### Key Features
- Starry night sky with moonlit clouds
- Blue noise dithering (based on Demofox blog)
- Perlin-Worley noise atlas
- Better multiple scattering approximation

### Buffer Structure
```
BufferA: Tracking view direction and resolution change
BufferB: 
  - Red & Green: Perlin-Worley atlas
  - Blue: cloud map
  - Alpha: moon texture
```

### Critical Uniform Parameters
```glsl
uniform int uLightingMode;        // 0 = night (moon), 1 = day (sun)
uniform float uLightAzimuth;      // radians
uniform float uLightHeight;       // y component before normalization
uniform vec3 uLightColor;
uniform float uLightPower;
uniform float uExposure;
uniform float uStars;             // 0..1

uniform float uCloudShapeSpeed;   // default: -5.0
uniform float uCloudDetailSpeed;  // default: -10.0
uniform float uCloudDensity;      // default: 0.075
uniform float uCloudShapeStrength;// default: 0.7
uniform float uCloudDetailStrength;// default: 0.2

uniform float uCloudBase01;       // default: 0.0
uniform float uCloudThickness01;  // default: 1.0
uniform float uCloudBottomFade01; // default: 0.08
uniform float uCloudTopFade01;    // default: 0.12
uniform float uCloudEdgeFade01;   // default: 0.10
```

### Star Generation Algorithm
```glsl
float getStars(vec3 rayDir) {
    float theta = acos(rayDir.z);
    float width = PI / starCount;
    float level = floor((theta / PI) * starCount);
    float stars = 0.0;
    
    for (float l = -10.0; l <= 10.0; l++) {
        float level_ = min(starCount - 1.0, max(0.0, level + l));
        float theta_ = (level_ + 0.5) * width;
        
        // Avoid pole concentration
        if (!isActiveElevation(theta_, 0.0)) continue;
        
        float rnd = rand(PI + theta_);
        float phi_ = TWO_PI * rand(level_);
        float dist = getDistToStar(rayDir, theta_, phi_);
        
        stars += getGlow(1.0 - dist, rnd * 8e-7, 2.9 + sin(rand(rnd) * flickerSpeed * iTime));
    }
    
    return 0.05 * stars;
}
```

---

# KEY ALGORITHM EXTRACTIONS

## Priority 1: Must Implement Exactly

### 1. Perlin-Worley Noise (Foundation)
```glsl
float perlinWorley(vec3 p, int octaves) {
    float perlin = fbm(p, octaves);
    float worley = worleyNoise(p * 4.0);
    return remap(perlin, worley - 1.0, 1.0, 0.0, 1.0);
}
```

### 2. Height-Field Wave Simulation (GPT Waves)
```glsl
// Core wave equation
float laplacian = (left + right + up + down) / 4.0 - center;
float newVelocity = velocity + laplacian * waveSpeed * waveSpeed * dt;
newVelocity *= damping;
float newHeight = height + newVelocity * dt;
```

### 3. Beer-Powder Scattering (Clouds)
```glsl
float beerPowder(float depth) {
    float beer = exp(-depth);
    float powder = 1.0 - exp(-depth * 2.0);
    return beer * mix(1.0, powder, powderStrength);
}
```

### 4. Henyey-Greenstein Phase (Clouds)
```glsl
float hgPhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}
```

### 5. Caustics Projection (Ocean)
```glsl
// Area-based caustic intensity
vec2 floorHit = surfacePos.xz + refractDir.xz * t;
float area = abs(dFdx(floorHit.x) * dFdy(floorHit.y) - dFdx(floorHit.y) * dFdy(floorHit.x));
float intensity = originalArea / max(area, 0.0001);
```

## Priority 2: Enhance from Sources

### 1. Multiple Scattering (Enhanced)
- Combine al-ro's approximation with volumetric terrain pro's implementation
- Add silver lining effect from terrain pro

### 2. Cloud Shadows (Enhanced)
- Use terrain pro's shadow softness approach
- Add al-ro's temporal stability

### 3. Water Interaction (Enhanced)
- GPT Waves bubble system
- Terrain pro's caustics with waves interaction

---

# IMPLEMENTATION PRIORITY MATRIX

```
═══════════════════════════════════════════════════════════════════════════════
                    IMPLEMENTATION PRIORITY
═══════════════════════════════════════════════════════════════════════════════

PHASE 1 - CORE FOUNDATIONS (Week 1-2)
─────────────────────────────────────────────────────────────────────────────
Priority  System              Source              Complexity  Impact
────────────────────────────────────────────────────────────────────────────
1.1       Noise Library       All sources         Medium      Critical
1.2       Sky/Atmosphere      Al-ro               Low         High
1.3       Basic Terrain       WebGPU doc          Medium      High
1.4       Camera System       All sources         Low         Critical

PHASE 2 - VOLUMETRIC CLOUDS (Week 3-4)
─────────────────────────────────────────────────────────────────────────────
2.1       Cloud Density       Al-ro + Terrain Pro High        Critical
2.2       Cloud Lighting      All sources         High        Critical
2.3       Cloud Shadows       Terrain Pro         Medium      High
2.4       God Rays            Terrain Pro         Medium      Medium

PHASE 3 - OCEAN SYSTEM (Week 5-6)
─────────────────────────────────────────────────────────────────────────────
3.1       Wave Simulation     GPT Waves           High        Critical
3.2       Ocean Rendering     Terrain Pro         Medium      High
3.3       Caustics            GPT Waves           Medium      Medium
3.4       Foam/Spray          GPT Waves           Medium      Medium

PHASE 4 - TERRAIN ADVANCED (Week 7-8)
─────────────────────────────────────────────────────────────────────────────
4.1       Biome System        WebGPU doc          Medium      High
4.2       PBR Materials       Terrain Pro         Medium      High
4.3       LOD System          WebGPU doc          High        Medium
4.4       Cloud Shadows Recv  Terrain Pro         Low         High

PHASE 5 - WEATHER & POLISH (Week 9-10)
─────────────────────────────────────────────────────────────────────────────
5.1       Weather State       Terrain Pro         Medium      Medium
5.2       Precipitation       Terrain Pro         Medium      Medium
5.3       Day/Night Cycle     Al-ro               Low         High
5.4       TAA/Post-Process    WebGPU doc          Medium      High

═══════════════════════════════════════════════════════════════════════════════
```

---

*Document Version: 1.0*
*Source reference preservation for Procedural Earth Engine*

