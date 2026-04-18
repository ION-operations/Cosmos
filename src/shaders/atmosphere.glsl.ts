// ═══════════════════════════════════════════════════════════════════════════════
// ATMOSPHERE GLSL - Unified physical lighting for sun, sky, Earth shadow, fog
// Shared by: SKY, CLOUDS, OCEAN, TERRAIN
// Depends on: SHARED_GLSL (PI, EARTH_RADIUS, saturate, raySphereIntersect)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Physical model (simplified but consistent):
//   - Earth modeled as a sphere of radius EARTH_RADIUS centered at (0,-EARTH_RADIUS,0)
//     so y=0 = sea level. World "up" is +Y.
//   - Atmosphere thickness ~ 80 km. Optical depth scales with how oblique the sun
//     ray is through the atmosphere (longer path at sunset → more extinction).
//   - Sun light reaching a world point = base sun color × wavelength-dependent
//     transmittance × Earth shadow factor.
//   - Earth shadow: if the point is on the dark side of the planet (sun ray
//     intersects the planet before reaching the sun) → no direct light.
//   - Aerial perspective: any view ray accumulates atmospheric extinction +
//     inscatter as it travels through air. Used to fade clouds/terrain/ocean.
// ═══════════════════════════════════════════════════════════════════════════════

export const ATMOSPHERE_GLSL = `
// Atmosphere geometry constants
const float ATMO_HEIGHT      = 80000.0;          // 80 km
const vec3  EARTH_CENTER     = vec3(0.0, -EARTH_RADIUS, 0.0);
const float ATMO_RADIUS      = EARTH_RADIUS + ATMO_HEIGHT;

// Wavelength-dependent extinction coefficients (per meter, scaled).
// Blue scatters more than red → sunset reddening emerges naturally.
// Calibrated so total transmittance at zenith ≈ (0.92, 0.96, 0.99).
const vec3  RAYLEIGH_BETA    = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const vec3  MIE_BETA         = vec3(21e-6);
const float RAYLEIGH_SCALE_H = 8000.0;
const float MIE_SCALE_H      = 1200.0;

// ─── Earth / atmosphere ray utilities ────────────────────────────────────────

// Returns distance from ro along rd to the outer atmosphere shell. -1 if miss.
float atmosphereDist(vec3 ro, vec3 rd) {
    vec3 oc = ro - EARTH_CENTER;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - ATMO_RADIUS * ATMO_RADIUS;
    float h = b * b - c;
    if (h < 0.0) return -1.0;
    return -b + sqrt(h); // far hit
}

// Earth shadow test: is worldPos illuminated by the sun?
// Returns 1.0 if lit, 0.0 if blocked, smoothly transitions across the terminator.
float earthShadow(vec3 worldPos, vec3 sunDir) {
    // Cast a ray from the point toward the sun. If it intersects the Earth sphere
    // BEFORE escaping the atmosphere, the point is in Earth's shadow.
    float t = raySphereIntersect(worldPos, sunDir, EARTH_CENTER, EARTH_RADIUS - 50.0);
    if (t < 0.0) return 1.0;             // ray clears the planet
    // Soft terminator: use sun elevation at the point as the gradient
    vec3 up = normalize(worldPos - EARTH_CENTER);
    float sunElevAtPoint = dot(up, sunDir);
    return smoothstep(-0.04, 0.04, sunElevAtPoint);
}

// Optical depth (relative units) along ray ro→rd for given length.
// Cheap analytical approximation: integrate exponential density along ray.
float opticalDepth(vec3 ro, vec3 rd, float rayLength, float scaleHeight) {
    const int STEPS = 6;
    float stepSize = rayLength / float(STEPS);
    float depth = 0.0;
    for (int i = 0; i < STEPS; i++) {
        vec3 p = ro + rd * (float(i) + 0.5) * stepSize;
        float h = max(0.0, length(p - EARTH_CENTER) - EARTH_RADIUS);
        depth += exp(-h / scaleHeight) * stepSize;
    }
    return depth;
}

// Transmittance from worldPos to the sun (through atmosphere only — Earth shadow
// is handled separately).
vec3 sunTransmittance(vec3 worldPos, vec3 sunDir) {
    float dToAtmo = atmosphereDist(worldPos, sunDir);
    if (dToAtmo < 0.0) return vec3(1.0);
    float odR = opticalDepth(worldPos, sunDir, dToAtmo, RAYLEIGH_SCALE_H);
    float odM = opticalDepth(worldPos, sunDir, dToAtmo, MIE_SCALE_H);
    vec3 tau = RAYLEIGH_BETA * odR + MIE_BETA * 1.1 * odM;
    return exp(-tau);
}

// ─── Public API: sun light at a world point ──────────────────────────────────
//
// This is THE function every layer should call when it needs the color and
// intensity of direct sunlight reaching a point.
//
//   - Includes wavelength extinction (sunset reddening)
//   - Includes Earth shadow (zero on the night side)
//   - Multiplied by user-controlled uSunColor and uSunIntensity
//
vec3 getSunLight(vec3 worldPos, vec3 sunDir) {
    vec3 trans = sunTransmittance(worldPos, sunDir);
    float shadow = earthShadow(worldPos, sunDir);
    return uSunColor * uSunIntensity * trans * shadow;
}

// Convenience overload for "near sea level" — used when you don't have a worldPos
// (e.g., reflected sky).
vec3 getSunLightAtSeaLevel(vec3 sunDir) {
    return getSunLight(vec3(0.0, 100.0, 0.0), sunDir);
}

// ─── Aerial perspective ──────────────────────────────────────────────────────
//
// Apply atmospheric extinction + inscatter to a colored object at distance.
// inColor: object color (clouds, terrain, ocean, etc.)
// rayOrigin / rayDir: view ray
// distance: how far the object is along the ray
// sunDir: sun direction
// inscatterColor: typical sky color in the view direction (for inscatter)
//
vec3 applyAerialPerspective(vec3 inColor, vec3 rayOrigin, vec3 rayDir,
                            float distance, vec3 sunDir, vec3 inscatterColor) {
    // Limit ray length to sane atmosphere thickness
    float d = min(distance, 100000.0);
    float odR = opticalDepth(rayOrigin, rayDir, d, RAYLEIGH_SCALE_H);
    float odM = opticalDepth(rayOrigin, rayDir, d, MIE_SCALE_H);
    vec3 tau = RAYLEIGH_BETA * odR + MIE_BETA * odM;
    vec3 transmittance = exp(-tau);

    // Inscatter strength tracks how much light was lost (energy conservation).
    // Modulate by sun visibility so night-side air doesn't glow.
    float sunVis = earthShadow(rayOrigin + rayDir * d * 0.5, sunDir);
    vec3 inscatter = inscatterColor * (1.0 - transmittance) * sunVis;

    return inColor * transmittance + inscatter;
}

// ─── Sky-dome ambient ────────────────────────────────────────────────────────
//
// Average sky color seen from a world point (cheap: sample the zenith colour
// modulated by sun height). Used by clouds and water for ambient lighting so
// they go dark at night and bluish during the day.
//
vec3 getSkyAmbient(vec3 worldPos, vec3 sunDir) {
    vec3 up = normalize(worldPos - EARTH_CENTER);
    float sunElev = dot(up, sunDir);
    float dayFactor = smoothstep(-0.1, 0.25, sunElev);

    vec3 dayAmbient   = uSkyZenithColor * 0.6 + uSkyHorizonColor * 0.4;
    vec3 duskAmbient  = vec3(0.25, 0.18, 0.22);
    vec3 nightAmbient = vec3(0.015, 0.022, 0.045);

    vec3 ambient = mix(nightAmbient, duskAmbient, smoothstep(-0.2, 0.0, sunElev));
    ambient = mix(ambient, dayAmbient, dayFactor);
    return ambient;
}
`;
