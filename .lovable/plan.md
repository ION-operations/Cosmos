

# Procedural Earth Engine: Layer Isolation, Diagnostics, and Globe LOD System

## Problem Summary

The current engine is a single 3560-line monolithic file (`ProceduralEarth.tsx`) containing all layers (sky, clouds, terrain, ocean, vegetation, weather, fog, god rays) in one massive fragment shader. This makes it impossible to isolate performance bottlenecks, iterate on individual effects, or implement the spherical globe + LOD system needed for Google Earth-style zoom.

## Architecture Plan

### Phase 1: Layer Isolation Pages

Create a dedicated route and page for each rendering layer. Each page will contain **only** the shader code relevant to that layer, plus shared utilities (noise, hashing, ray math). The main composite page stays as-is.

**New pages:**
- `/sky` - Sky, stars, sun/moon disk, atmospheric scattering
- `/clouds` - Volumetric cloud system only
- `/terrain` - Terrain raymarching, materials, erosion
- `/ocean` - Ocean waves, foam (all 6 types), caustics, SSS, underwater
- `/vegetation` - Trees, grass, flowers, wind
- `/weather` - Rain, snow, lightning particles
- `/effects` - Fog, god rays, post-processing (bloom, TAA, color grading)

Each page renders against a simple background (flat color or basic sky) so the layer runs in complete isolation.

**Implementation approach:**
- Extract shared GLSL utilities (noise, hash, ray functions, ~lines 206-446) into a `const SHARED_GLSL` string
- Extract each layer's shader code into its own fragment shader constant
- Each page gets its own subset of uniforms/settings relevant only to that layer
- Reuse the existing `SliderSetting`, `SettingSection`, `LayerToggle` UI components (extract to shared file)

### Phase 2: Per-Page Diagnostics System

Each isolated layer page will include a built-in diagnostics HUD overlay showing:

- **FPS counter** with frame time graph (rolling 120-frame history rendered on a mini canvas)
- **GPU timing** via `EXT_disjoint_timer_query_webgl2` where available, falling back to frame-delta measurement
- **Shader instruction count** (displayed from compile info via `getShaderInfoLog` / `getExtension('WEBGL_debug_shaders')`)
- **Uniform inspector** showing all active uniform values live
- **Render pass timeline** - horizontal bar showing relative time per pass (when multi-pass is used)
- **Memory estimate** - texture sizes, render target sizes
- **Draw call count** and triangle count

This will be a reusable `<DiagnosticsOverlay>` React component that accepts a `WebGLRenderer` ref and renders the overlay.

### Phase 3: Shared Module Extraction

Refactor the monolith into importable modules:

```
src/
  shaders/
    shared.glsl.ts          -- noise, hash, ray utilities
    sky.glsl.ts             -- atmospheric scattering, stars, sun/moon
    clouds.glsl.ts          -- volumetric clouds
    terrain.glsl.ts         -- terrain height, materials, erosion
    ocean.glsl.ts           -- waves, foam, caustics, underwater
    vegetation.glsl.ts      -- trees, grass, wind
    weather.glsl.ts         -- rain, snow, lightning
    postprocess.glsl.ts     -- TAA, bloom, tonemapping, god rays, fog
  components/
    DiagnosticsOverlay.tsx   -- FPS, GPU timing, shader stats
    SettingsPanel.tsx        -- SliderSetting, SettingSection, LayerToggle
    ShaderRenderer.tsx       -- Reusable fullscreen quad + WebGL setup
  pages/
    Index.tsx               -- Main composite (imports all shaders)
    SkyLab.tsx
    CloudLab.tsx
    TerrainLab.tsx
    OceanLab.tsx
    VegetationLab.tsx
    WeatherLab.tsx
    EffectsLab.tsx
    ProceduralEarthGPU.tsx  -- WebGPU version (unchanged for now)
```

### Phase 4: Globe Geometry + LOD System

Transform the rendering from a flat raymarched plane to a spherical globe with multi-resolution LOD:

**Spherical mapping:**
- Camera orbits a sphere of radius `EARTH_RADIUS` (6,371,000 units)
- At close range (altitude < ~10km), the curvature is imperceptible -- terrain renders as a flat plane (current behavior)
- At medium range (10km-500km), a curved horizon becomes visible -- apply spherical correction to ray direction
- At far range (500km+), render the full globe as a sphere with atmosphere shell

**LOD chunking system (Google Earth style):**
- Divide the sphere into a quadtree of tiles at multiple zoom levels
- Each tile has a detail level (0 = continental, 6 = ground-level)
- Only tiles visible in the frustum and close enough to the camera get rendered at high detail
- Shader complexity scales with LOD level (fewer noise octaves at distance)

**Camera system upgrade:**
- Orbital camera mode: rotate around globe center, scroll to zoom in/out
- Transition to first-person WASD mode when close to surface (altitude < 5km)
- Smooth interpolation between orbital and surface modes
- No zoom limits -- can zoom from millions of km out to ground level

**Implementation detail:**
- Add `uniform float uCameraAltitude` and `uniform int uLODLevel` to shaders
- LOD 0-1: Simple sphere with atmospheric scattering, no terrain detail
- LOD 2-3: Low-octave terrain, basic ocean color, cloud layer as flat texture
- LOD 4-5: Full terrain raymarching, ocean waves, volumetric clouds
- LOD 6: Current full-detail mode with all effects

### Routing

```
/           -- Main composite page (all layers)
/sky        -- Sky isolation lab
/clouds     -- Cloud isolation lab  
/terrain    -- Terrain isolation lab
/ocean      -- Ocean isolation lab
/vegetation -- Vegetation isolation lab
/weather    -- Weather isolation lab
/effects    -- Effects isolation lab
/gpu        -- WebGPU version (existing)
```

### Implementation Order

1. Extract shared UI components (`SettingsPanel.tsx`, `ShaderRenderer.tsx`)
2. Extract shader code into `src/shaders/*.glsl.ts` modules
3. Create `DiagnosticsOverlay.tsx` component
4. Build the 7 isolation lab pages, one at a time (sky first, then ocean, terrain, clouds, vegetation, weather, effects)
5. Refactor `ProceduralEarth.tsx` to import from shared modules
6. Implement globe camera system with orbital/surface transition
7. Add quadtree LOD tile system
8. Wire LOD level into shader complexity scaling

### Key Constraints

- Each lab page must compile and render independently -- no dependencies on other layers
- The DiagnosticsOverlay must not impact rendering performance (requestAnimationFrame-based sampling, not per-frame DOM updates)
- Globe LOD transitions must be seamless -- no popping or visible seams between detail levels
- The shader instruction count must stay within WebGL limits (~65K instructions on most GPUs) per page

