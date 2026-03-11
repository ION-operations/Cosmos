// ═══════════════════════════════════════════════════════════════════════════════
// SHARED GLSL - Constants, utilities, hash, noise, ray functions
// Used by ALL layer modules
// ═══════════════════════════════════════════════════════════════════════════════

export const VERTEX_SHADER = `
precision highp float;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = vec4(position, 1.0);
}
`;

export const SHARED_UNIFORMS = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform sampler2D blueNoise;
uniform sampler2D previousFrame;
uniform int iFrame;

uniform vec3 uCameraPos;
uniform float uCameraYaw;
uniform float uCameraPitch;
uniform float uCameraFOV;
`;

export const SHARED_GLSL = `
#define PI 3.14159265359
#define TAU 6.28318530718
#define EPSILON 0.0001

const float CLOUD_EXTENT = 50000.0;
const float EARTH_RADIUS = 6371000.0;
const float goldenRatio = 1.61803398875;

varying vec2 vUv;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec3 saturate3(vec3 x) { return clamp(x, 0.0, 1.0); }

float remap(float x, float a, float b, float c, float d) {
    return c + (x - a) * (d - c) / (b - a);
}

float smootherstep(float edge0, float edge1, float x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

mat2 rot2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

// ═══════════════════════════════════════════════════════════════════════════
// HASH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

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

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
}

vec3 hash3v(vec3 p) {
    p = mod(p, 289.0);
    float n = mod((p.x * 17.0 + p.y) * 17.0 + p.z, 289.0);
    n = mod((n * 34.0 + 1.0) * n, 289.0);
    vec3 k = mod(floor(n / vec3(1.0, 7.0, 49.0)), 7.0) * 2.0 - 1.0;
    return normalize(k + 0.0001);
}

// ═══════════════════════════════════════════════════════════════════════════
// NOISE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

vec3 quintic(vec3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float gradientNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = quintic(f);
    
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

float valueNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(mix(hash13(i + vec3(0,0,0)), hash13(i + vec3(1,0,0)), f.x),
            mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
            mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}

float worleyNoise(vec3 p) {
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

float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 8; i++) {
        if(i >= octaves) break;
        value += amplitude * gradientNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

float ridgedFbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float prev = 1.0;
    
    for(int i = 0; i < 8; i++) {
        if(i >= octaves) break;
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

float perlinWorley(vec3 p, int octaves) {
    float perlin = fbm(p, octaves);
    float worley = worleyNoise(p * 4.0);
    return remap(perlin, worley - 1.0, 1.0, 0.0, 1.0);
}

float warpedNoise(vec3 p, float strength, int octaves) {
    vec3 q = vec3(
        fbm(p, 3),
        fbm(p + vec3(5.2, 1.3, 2.8), 3),
        fbm(p + vec3(1.7, 9.2, 3.1), 3)
    );
    return fbm(p + strength * q, octaves);
}

vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    
    float px0 = gradientNoise(p - dx);
    float px1 = gradientNoise(p + dx);
    float py0 = gradientNoise(p - dy);
    float py1 = gradientNoise(p + dy);
    float pz0 = gradientNoise(p - dz);
    float pz1 = gradientNoise(p + dz);
    
    return vec3(
        py1 - py0 - (pz1 - pz0),
        pz1 - pz0 - (px1 - px0),
        px1 - px0 - (py1 - py0)
    ) / (2.0 * e);
}

// ═══════════════════════════════════════════════════════════════════════════
// RAY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

vec3 getRayDirection(vec2 uv, vec3 camPos, vec3 lookAt, float fov) {
    vec3 forward = normalize(lookAt - camPos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    
    float aspectRatio = iResolution.x / iResolution.y;
    float fovScale = tan(radians(fov) * 0.5);
    
    vec2 screenPos = (uv * 2.0 - 1.0) * vec2(aspectRatio, 1.0) * fovScale;
    
    return normalize(forward + right * screenPos.x + up * screenPos.y);
}

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

float raySphereIntersect(vec3 ro, vec3 rd, vec3 center, float radius) {
    vec3 oc = ro - center;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - radius * radius;
    float h = b * b - c;
    if(h < 0.0) return -1.0;
    return -b - sqrt(h);
}
`;
