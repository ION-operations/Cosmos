// ═══════════════════════════════════════════
// GENESIS ENGINE — Ocean Shaders
// Projected grid + Gerstner + JONSWAP spectrum
// Enhanced with techniques from:
//   - greatoceanwaves: multi-octave displacement with wind drag, crest sharpening
//   - realisticoceancloseupclearwater: subsurface scattering, absorption, caustic hints
//   - dolphinjump: foam/splash interaction patterns, wake turbulence
// ═══════════════════════════════════════════

import { ATMOS_GLSL, NOISE_GLSL, WEATHER_ATLAS_GLSL } from './common';

export const MAX_WAVES = 12;
export const MAX_RINGS = 24;

export const oceanVS = `
precision highp float;
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uTime;
uniform vec4 uW[${MAX_WAVES}];
uniform vec4 uW2[${MAX_WAVES}];
uniform int uWN;
uniform vec4 uR[${MAX_RINGS}];
uniform vec4 uR2[${MAX_RINGS}];
uniform int uRN;
uniform vec3 uCam;
uniform mat4 uInvP, uInvV;
uniform float uPFS, uPFE;
const float ER = 6371000.0;
varying vec3 vWP;
varying vec3 vN;
varying float vFoam, vH, vFade, vDist;

${NOISE_GLSL}

vec3 worldRay(vec2 ndc){
  vec4 cf = vec4(ndc, 1, 1);
  vec4 vf = uInvP * cf;
  vf /= max(vf.w, 1e-6);
  vec4 wf = uInvV * vf;
  return normalize(wf.xyz - uCam);
}

// greatoceanwaves technique: multi-octave wave displacement with wind-drag sharpening
vec3 waveOctaveDisp(vec3 p, float t, float fade){
  vec3 disp = vec3(0.0);
  float amp = 0.15 * fade;
  float freq = 0.8;
  float speed = 1.2;
  // 4 extra octaves of fine detail on top of Gerstner
  for(int i = 0; i < 4; i++){
    float phase = dot(p.xz, vec2(cos(float(i)*1.3+0.5), sin(float(i)*1.3+0.5))) * freq - t * speed;
    // Crest sharpening from greatoceanwaves — use abs(sin) to sharpen peaks
    float wave = sin(phase);
    float sharpWave = sign(wave) * pow(abs(wave), 0.75); // sharpen crests
    disp.y += sharpWave * amp;
    // Horizontal displacement for choppiness
    disp.x += cos(phase) * amp * 0.3 * cos(float(i)*1.3+0.5);
    disp.z += cos(phase) * amp * 0.3 * sin(float(i)*1.3+0.5);
    amp *= 0.45;
    freq *= 2.1;
    speed *= 1.15;
  }
  return disp;
}

void main(){
  vec2 ndc = position.xy;
  vec3 rd = worldRay(ndc);
  float denom = rd.y;
  float tP = (0.0 - uCam.y) / denom;
  float dXZ = abs(tP) * length(rd.xz);
  float fade = 1.0 - smoothstep(uPFS, uPFE, dXZ);
  fade = clamp(fade, 0.0, 1.0);
  if(denom >= -1e-5) fade = 0.0;
  vFade = fade;
  float t = clamp(tP, 0.0, 1e7);
  vec3 pos = uCam + rd * t;
  float r = min(dXZ, uPFE);
  pos.y += -(r*r) / (2.0*ER);
  vec3 bp = pos;
  vec3 tan = vec3(1,0,0), bitan = vec3(0,0,1);
  float jac = 1.0;
  
  if(fade > 0.0001){
    // Main Gerstner waves (JONSWAP spectrum)
    for(int i=0; i<${MAX_WAVES}; i++){
      if(i >= uWN) break;
      float A=uW[i].x*fade, kx=uW[i].y, kz=uW[i].z, om=uW[i].w;
      float Q=uW2[i].x*fade, phi=uW2[i].y, k=uW2[i].z;
      float phase = kx*bp.x + kz*bp.z - om*uTime + phi;
      float S=sin(phase), C=cos(phase);
      float dx=kx/max(k,.001), dz=kz/max(k,.001);
      pos.x -= Q*A*dx*S; pos.z -= Q*A*dz*S; pos.y += A*C;
      float WA=k*A, WAS=WA*S, WAC=WA*C;
      tan.x -= Q*dx*dx*WAC; tan.y += dx*WAS; tan.z -= Q*dx*dz*WAC;
      bitan.x -= Q*dx*dz*WAC; bitan.y += dz*WAS; bitan.z -= Q*dz*dz*WAC;
      jac -= Q*WAC;
    }
    
    // Additional wave octave displacement (greatoceanwaves technique)
    vec3 octDisp = waveOctaveDisp(bp, uTime, fade);
    pos += octDisp;
    // Approximate normal contribution from octave displacement
    float eps = 0.3;
    vec3 octDispX = waveOctaveDisp(bp + vec3(eps, 0, 0), uTime, fade);
    vec3 octDispZ = waveOctaveDisp(bp + vec3(0, 0, eps), uTime, fade);
    tan.y += (octDispX.y - octDisp.y) / eps;
    bitan.y += (octDispZ.y - octDisp.y) / eps;
  }
  
  // Ring waves (splash interaction — dolphinjump inspired wake patterns)
  for(int i=0; i<${MAX_RINGS}; i++){
    if(i >= uRN) break;
    float rx=uR[i].x, rz=uR[i].y, ramp=uR[i].z, rt=uR[i].w;
    float age = uTime - rt; if(age < 0.0) continue;
    float ddx=bp.x-rx, ddz=bp.z-rz, dist=sqrt(ddx*ddx+ddz*ddz);
    float k=max(uR2[i].x,.001), c=max(uR2[i].y,0.0), dmp=max(uR2[i].z,0.0), sp=max(uR2[i].w,0.0);
    float front=c*age, edge=.35+1.5/k;
    float fm=smoothstep(0.0, edge, front-dist);
    float env=ramp*exp(-dmp*age)*exp(-sp*dist)*fade*fm;
    float ph=k*(dist-c*age); float w=env*sin(ph);
    pos.y += w;
    // Wake turbulence — secondary ripples behind main ring front (dolphinjump technique)
    float wake = env * 0.3 * sin(ph * 3.0 + age * 2.0) * exp(-dist * 0.1);
    pos.y += wake;
    float dW=env*k*cos(ph);
    if(dist > 0.1){ tan.y += dW*ddx/dist*.3; bitan.y += dW*ddz/dist*.3; }
  }
  
  vec3 Nw = normalize(cross(bitan, tan));
  vec3 sC = vec3(uCam.x, -ER, uCam.z);
  vec3 Nc = normalize(pos - sC);
  float cM = smoothstep(0.0, 1.0, 1.0-fade);
  vN = normalize(mix(Nw, Nc, cM));
  vWP = pos;
  vH = pos.y - bp.y;
  vFoam = clamp(1.0-jac, 0.0, 1.0);
  vDist = length(pos - uCam);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1);
  #include <logdepthbuf_vertex>
}`;

export const oceanFS = `
precision highp float;
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uSunDir, uCam, uDeep;
uniform float uSunI, uExpo, uAlt, uScat, uRough, uFoamA, uFoamT, uTime;
varying vec3 vWP, vN;
varying float vFoam, vH, vFade, vDist;
${ATMOS_GLSL}
${NOISE_GLSL}
${WEATHER_ATLAS_GLSL}

vec3 skyCol(vec3 rd){ return atmosphere(rd, uSunDir, uSunI, uAlt); }

// Enhanced subsurface scattering (realisticoceancloseupclearwater)
// Multiple SSS lobes for realistic light transport through water volume
vec3 subsurfaceScattering(vec3 V, vec3 N, vec3 L, float sunI, vec3 sunT){
  // Forward SSS — light shining through wave crests
  float sss_forward = pow(max(dot(V, -L), 0.0), 4.0) * 0.35;
  // Side SSS — ambient light scattering through volume
  float sss_side = pow(max(dot(V, -L), 0.0), 16.0) * 0.2;
  // Height-dependent SSS — thin wave crests glow more
  float heightGlow = smoothstep(0.0, 0.8, vH) * 0.25;
  // Green-blue subsurface glow with depth-dependent color shift
  vec3 sssCol1 = vec3(0.0, 0.15, 0.12) * sss_forward;
  vec3 sssCol2 = vec3(0.03, 0.10, 0.15) * sss_side;
  vec3 sssCol3 = vec3(0.05, 0.20, 0.10) * heightGlow;
  return (sssCol1 + sssCol2 + sssCol3) * sunI * sunT;
}

// Procedural normal perturbation for micro-wave detail (realisticoceancloseupclearwater)
vec3 microNormals(vec3 wp, float t, float dist){
  float detail = smoothstep(500.0, 50.0, dist); // Only close up
  if(detail < 0.01) return vec3(0.0);
  // Multi-frequency ripples
  float n1 = gnoise(vec3(wp.xz * 4.0, t * 0.8)) * 0.015;
  float n2 = gnoise(vec3(wp.xz * 12.0, t * 1.2)) * 0.008;
  float n3 = gnoise(vec3(wp.xz * 30.0 + t * 0.5, t * 0.3)) * 0.003;
  return vec3(n1 + n2 + n3, 0.0, n1 - n2 + n3) * detail;
}

void main(){
  #include <logdepthbuf_fragment>
  if(vFade <= 0.0001) discard;
  
  vec3 N = normalize(vN);
  CosmosWeatherState wx = cosmosSampleWeatherPlanar(vWP, uTime);
  float weatherWind = smoothstep(0.05, 0.85, length(wx.wind));
  float weatherStorm = smoothstep(0.08, 0.85, wx.precip);
  float localRough = mix(uRough, clamp(uRough + wx.precip * 0.10 + weatherWind * 0.035, 0.008, 0.32), uWeatherAtlasStrength);
  
  // Apply micro-normal perturbation for close-up detail
  vec3 microN = microNormals(vWP, uTime, vDist);
  N = normalize(N + vec3(microN.x, 0.0, microN.z));
  
  vec3 V = normalize(uCam - vWP);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  
  float NdV = max(dot(N, V), 0.0);
  float NdL = max(dot(N, uSunDir), 0.0);
  
  // Enhanced Fresnel with roughness-dependent grazing angle boost
  float F0 = 0.02;
  float fresnel = F0 + (1.0-F0) * pow(1.0-NdV, 5.0);
  // Roughness dims fresnel at grazing angles
  fresnel = mix(fresnel, F0, localRough * 0.5);
  fresnel = clamp(fresnel, 0.0, 1.0);
  
  // Sky reflection with LOD-like roughness blur
  vec3 refl = skyCol(R);
  // Blend with horizon color for rougher water
  vec3 horizCol = skyCol(normalize(vec3(R.x, 0.02, R.z)));
  refl = mix(refl, horizCol, localRough * 2.0);
  
  // GGX Specular (physically-based)
  vec3 H = normalize(uSunDir + V);
  float NdH = max(dot(N, H), 0.0);
  float a2 = localRough * localRough;
  float dn = NdH*NdH*(a2-1.0)+1.0;
  float D = a2 / (3.14159*dn*dn + 0.0001);
  // Geometric shadowing (Smith GGX)
  float k = (localRough + 1.0) * (localRough + 1.0) / 8.0;
  float G1V = NdV / (NdV * (1.0 - k) + k);
  float G1L = NdL / (NdL * (1.0 - k) + k);
  float G = G1V * G1L;
  vec3 sunT = exp(-BR*1.5e5*max(1.0-uSunDir.y, 0.0));
  vec3 spec = sunT * D * G * fresnel * NdL * uSunI * 0.6;
  
  // Underwater absorption (realisticoceancloseupclearwater enhanced model)
  // Different absorption rates per wavelength for realistic color
  float depth = max(-vH*2.0+1.0, 0.0);
  vec3 absorb = exp(-vec3(0.45, 0.09, 0.04) * depth * 3.0);
  // Scattering contribution increases with depth
  vec3 scatC = vec3(0.0293, uScat*0.14, uScat*0.20);
  vec3 deepScatter = vec3(0.005, 0.02, 0.04) * (1.0 - exp(-depth * 0.5));
  vec3 uw = uDeep * absorb + scatC * (1.0 - absorb.g) + deepScatter;
  
  // Caustic hints on shallow areas (realisticoceancloseupclearwater)
  float caustic1 = abs(gnoise(vec3(vWP.xz * 2.0 + uTime * 0.3, uTime * 0.15)));
  float caustic2 = abs(gnoise(vec3(vWP.xz * 3.5 - uTime * 0.2, uTime * 0.1)));
  float causticPattern = pow(caustic1 * caustic2, 2.0);
  float shallowMask = smoothstep(2.0, 0.0, depth) * NdL * 0.15;
  uw += vec3(0.1, 0.15, 0.12) * causticPattern * shallowMask * uSunI * 0.02;
  
  // Enhanced SSS
  vec3 sss = subsurfaceScattering(V, N, uSunDir, uSunI, sunT);
  
  // Compose water
  vec3 water = mix(uw + sss, refl, fresnel) + spec;
  
  // Foam (multi-scale with realistic texture — dolphinjump interaction patterns)
  float foam = smoothstep(uFoamT+0.15, uFoamT-0.05, 1.0-vFoam) * uFoamA;
  foam += smoothstep(0.4, 1.8, vH) * 0.12 * uFoamA;
  foam += weatherStorm * uWeatherAtlasStrength * 0.18 * smoothstep(0.15, 1.1, vH + 0.45);
  foam = clamp(foam, 0.0, 1.0);
  // Multi-frequency foam texture with Voronoi-like breakup
  float fN1 = fract(sin(dot(vWP.xz*3.7, vec2(12.9898, 78.233))) * 43758.5453);
  float fN2 = fract(sin(dot(vWP.xz*7.3, vec2(78.233, 12.9898))) * 43758.5453);
  float fN3 = gnoise(vec3(vWP.xz * 15.0, uTime * 0.5)) * 0.5 + 0.5;
  foam *= 0.5 + fN1*0.2 + fN2*0.15 + fN3*0.15;
  // Foam bubbles — small bright spots within foam
  float bubbles = pow(fN3, 4.0) * foam * 0.3;
  vec3 foamC = vec3(0.88, 0.93, 0.97) * (0.45 + NdL*0.55) * sunT * uSunI * 0.05;
  foamC += vec3(1.0) * bubbles * 0.1;
  water = mix(water, foamC, foam);
  
  // Aerial perspective (atmospheric fog)
  float dist = vDist;
  vec3 fogC = skyCol(normalize(vec3(V.x, 0.02, V.z)));
  float fogF = 1.0 - exp(-dist*0.0008*dist*0.0008*2.5);
  water = mix(water, fogC, fogF*0.6);
  
  // Far whitecaps (greatoceanwaves wave crest patterns — wind-driven)
  float farT = smoothstep(5000.0, 80000.0, dist);
  float graz = pow(clamp(1.0-NdV, 0.0, 1.0), 5.0);
  vec2 fp = vWP.xz*0.0006 + uTime*0.04*vec2(0.9, 0.7);
  vec2 fid = floor(fp);
  float rnd = fract(sin(dot(fid, vec2(127.1, 311.7))) * 43758.5453);
  float pres = step(0.94, rnd); // slightly more whitecaps
  float rd2 = fract(rnd*19.19);
  float cap = smoothstep(mix(0.06, 0.23, rd2), 0.0, length(fract(fp)-0.5));
  // Wind-modulated whitecap intensity (greatoceanwaves)
  float windFactor = mix(smoothstep(3.0, 15.0, 7.0), clamp(0.45 + weatherWind * 0.72 + weatherStorm * 0.55, 0.0, 1.35), uWeatherAtlasStrength);
  float micro = pres * cap * farT * graz * 0.8 * windFactor;
  water += vec3(0.92, 0.96, 1.0) * (0.15 + 0.85*NdL) * sunT * uSunI * 0.04 * micro;
  
  // ACES-inspired tonemap
  water = 1.0 - exp(-water * uExpo);
  water = pow(water, vec3(1.0/2.2));
  
  gl_FragColor = vec4(water, clamp(vFade, 0.0, 1.0));
}`;
