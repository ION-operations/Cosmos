import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Settings, X, Sun, Moon, Cloud, Waves, Mountain, Wind,
  Sparkles, Pause, Play, RotateCcw, Maximize2, CloudRain, CloudSnow, Zap,
  Eye, EyeOff, TreePine, Droplets, Layers
} from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL EARTH ENGINE V5 — WebGPU + WebGL2 Fallback
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GLSL ES 3.0 — Vertex Shader ───
const GL_VERT = `#version 300 es
out vec2 vUv;
void main() {
  float x = float((gl_VertexID & 1) << 2);
  float y = float((gl_VertexID & 2) << 1);
  vUv = vec2(x * 0.5, 1.0 - y * 0.5);
  gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);
}
`;

// ─── GLSL ES 3.0 — Fragment Shader ───
const GL_FRAG = `#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
out vec4 fragColor;

// ═ UNIFORMS ═
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_camPos;
uniform float u_fov;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_sunAzimuth;
uniform float u_sunElevation;
uniform float u_sunIntensity;
uniform float u_moonIntensity;
uniform vec3 u_sunColor;
uniform float u_starIntensity;
uniform int u_autoTime;
uniform float u_cycleSpeed;
uniform vec3 u_zenithColor;
uniform vec3 u_horizonColor;
uniform float u_rayleighStrength;
uniform float u_mieStrength;
uniform float u_mieG;
uniform float u_cloudCoverage;
uniform float u_cloudDensity;
uniform float u_cloudScale;
uniform float u_cloudDetailScale;
uniform float u_cloudSpeed;
uniform float u_cloudHeight;
uniform float u_cloudThickness;
uniform float u_cloudLightAbsorption;
uniform float u_cloudAmbient;
uniform float u_cloudSilverLining;
uniform float u_cloudPowder;
uniform int u_cloudSteps;
uniform float u_terrainScale;
uniform float u_terrainHeight;
uniform float u_mountainHeight;
uniform float u_mountainSharpness;
uniform float u_snowLine;
uniform float u_treeLine;
uniform float u_beachWidth;
uniform float u_erosionStrength;
uniform vec3 u_grassColor;
uniform vec3 u_rockColor;
uniform vec3 u_snowColor;
uniform vec3 u_sandColor;
uniform float u_oceanLevel;
uniform vec3 u_oceanColor;
uniform vec3 u_oceanDeepColor;
uniform float u_waveHeight;
uniform float u_waveFrequency;
uniform float u_waveSpeed;
uniform float u_oceanRoughness;
uniform float u_foamIntensity;
uniform float u_causticsIntensity;
uniform float u_sssIntensity;
uniform int u_weatherType;
uniform float u_weatherIntensity;
uniform float u_windSpeed;
uniform float u_windDirection;
uniform float u_lightningIntensity;
uniform float u_lightningTime;
uniform float u_fogDensity;
uniform float u_fogHeight;
uniform vec3 u_fogColor;
uniform float u_bloomIntensity;
uniform float u_exposure;
uniform float u_saturation;
uniform float u_vignetteStrength;
uniform float u_godRayIntensity;
uniform float u_godRayDecay;
uniform int u_godRaySteps;
uniform int u_layerSky;
uniform int u_layerClouds;
uniform int u_layerTerrain;
uniform int u_layerOcean;
uniform int u_layerWeather;
uniform int u_layerFog;
uniform int u_layerGodRays;
uniform sampler3D u_noiseTex;

// ═ CONSTANTS ═
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float CLOUD_EXTENT = 50000.0;

// ═ HASH ═
float hash11(float p) {
  float q = fract(p * 0.1031);
  q *= q + 33.33; q *= q + q;
  return fract(q);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p) {
  vec3 q = fract(p * 0.1031);
  q += dot(q, q.zyx + 31.32);
  return fract((q.x + q.y) * q.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((vec2(p3.x) + p3.yz) * p3.zy);
}
vec3 hash33(vec3 p) {
  vec3 q = vec3(dot(p, vec3(127.1,311.7,74.7)), dot(p, vec3(269.5,183.3,246.1)), dot(p, vec3(113.5,271.9,124.6)));
  return fract(sin(q) * 43758.5453123);
}

// ═ NOISE ═
float gradientNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  float n000 = dot(hash33(i)*2.0-1.0, f);
  float n100 = dot(hash33(i+vec3(1,0,0))*2.0-1.0, f-vec3(1,0,0));
  float n010 = dot(hash33(i+vec3(0,1,0))*2.0-1.0, f-vec3(0,1,0));
  float n110 = dot(hash33(i+vec3(1,1,0))*2.0-1.0, f-vec3(1,1,0));
  float n001 = dot(hash33(i+vec3(0,0,1))*2.0-1.0, f-vec3(0,0,1));
  float n101 = dot(hash33(i+vec3(1,0,1))*2.0-1.0, f-vec3(1,0,1));
  float n011 = dot(hash33(i+vec3(0,1,1))*2.0-1.0, f-vec3(0,1,1));
  float n111 = dot(hash33(i+vec3(1,1,1))*2.0-1.0, f-vec3(1,1,1));
  float mx0 = mix(mix(n000,n100,u.x), mix(n010,n110,u.x), u.y);
  float mx1 = mix(mix(n001,n101,u.x), mix(n011,n111,u.x), u.y);
  return mix(mx0, mx1, u.z);
}

float worleyNoise(vec3 p) {
  vec3 n = floor(p), f = fract(p);
  float d = 1.0;
  for(int k=-1;k<=1;k++) for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++) {
    vec3 g = vec3(float(i),float(j),float(k));
    vec3 o = hash33(n+g);
    vec3 r = g+o-f;
    d = min(d, dot(r,r));
  }
  return 1.0-sqrt(d);
}

float fbm(vec3 p, int oct) {
  float v=0.0, a=0.5, freq=1.0;
  for(int i=0;i<8;i++) { if(i>=oct) break; v+=a*gradientNoise(p*freq); freq*=2.0; a*=0.5; }
  return v;
}

float ridgedFbm(vec3 p, int oct) {
  float v=0.0, a=0.5, freq=1.0, prev=1.0;
  for(int i=0;i<8;i++) { if(i>=oct) break; float n=1.0-abs(gradientNoise(p*freq)); n*=n; v+=a*n*prev; prev=n; freq*=2.0; a*=0.5; }
  return v;
}

float warpedNoise(vec3 p, float str, int oct) {
  vec3 q = vec3(fbm(p,3), fbm(p+vec3(5.2,1.3,2.8),3), fbm(p+vec3(1.7,9.2,3.1),3));
  return fbm(p+str*q, oct);
}

vec3 curlNoise(vec3 p) {
  float e=0.1;
  float px0=gradientNoise(p-vec3(e,0,0)), px1=gradientNoise(p+vec3(e,0,0));
  float py0=gradientNoise(p-vec3(0,e,0)), py1=gradientNoise(p+vec3(0,e,0));
  float pz0=gradientNoise(p-vec3(0,0,e)), pz1=gradientNoise(p+vec3(0,0,e));
  return vec3(py1-py0-(pz1-pz0), pz1-pz0-(px1-px0), px1-px0-(py1-py0))/(2.0*e);
}

float remap(float x, float a, float b, float c, float d) { return c+(x-a)*(d-c)/(b-a); }
float saturateF(float x) { return clamp(x,0.0,1.0); }
vec3 saturate3(vec3 x) { return clamp(x, vec3(0), vec3(1)); }
float smootherstep(float e0, float e1, float x) { float t=clamp((x-e0)/(e1-e0),0.0,1.0); return t*t*t*(t*(t*6.0-15.0)+10.0); }

// ═ RAY UTILITIES ═
vec3 getRayDirection(vec2 uv, vec3 camPos, vec3 lookAt, float fov) {
  vec3 fwd = normalize(lookAt-camPos);
  vec3 right = normalize(cross(vec3(0,1,0), fwd));
  vec3 up = cross(fwd, right);
  float aspect = u_resolution.x / u_resolution.y;
  float fovScale = tan(radians(fov)*0.5);
  vec2 sp = (uv*2.0-1.0) * vec2(aspect,1.0) * fovScale;
  return normalize(fwd + right*sp.x + up*sp.y);
}

// ═ CELESTIAL ═
float getAutoSunElevation() {
  if(u_autoTime==0) return u_sunElevation;
  float ct = u_time*u_cycleSpeed*0.01;
  return sin(ct)*0.5+0.1;
}
float getAutoSunAzimuth() {
  if(u_autoTime==0) return u_sunAzimuth;
  float ct = u_time*u_cycleSpeed*0.01;
  return mod(ct*0.3, TAU);
}
vec3 getSunDirection() {
  float az=getAutoSunAzimuth(), el=getAutoSunElevation();
  return normalize(vec3(cos(el)*sin(az), sin(el), cos(el)*cos(az)));
}
vec3 getMoonDirection() { return normalize(-getSunDirection()+vec3(0.2,0.3,0.1)); }

float getStars(vec3 rd) {
  if(rd.y<0.0) return 0.0;
  float sunElev=getAutoSunElevation();
  float starVis=smoothstep(0.1,-0.1,sunElev);
  if(starVis<=0.0) return 0.0;
  vec3 dir=rd.xzy;
  float theta=acos(clamp(dir.z,-1.0,1.0));
  float stars=0.0;
  for(float l=-5.0;l<=5.0;l+=1.0) {
    float level=clamp(floor((theta/PI)*10000.0)+l,0.0,9999.0);
    float width=PI/10000.0;
    float theta_=( level+0.5)*width;
    if(sin(theta_)<hash12(vec2(theta_,0.0))) continue;
    float rnd=hash11(PI+theta_);
    float phi_=TAU*hash11(level);
    vec3 starPos=vec3(sin(theta_)*cos(phi_),sin(theta_)*sin(phi_),cos(theta_));
    float d=0.5+0.5*dot(starPos,dir);
    float glow=pow(rnd*8e-7/max(1.0-d,5e-7), 2.9+sin(rnd*6.0*u_time));
    stars+=glow;
  }
  return stars*0.05*u_starIntensity*starVis;
}

vec3 getSunDisk(vec3 rd, vec3 sunDir) {
  float sd=dot(rd,sunDir);
  float disk=smoothstep(0.9997,0.9999,sd);
  float corona=pow(saturateF(sd),256.0)*2.0+pow(saturateF(sd),8.0)*0.5;
  return u_sunColor*(disk*50.0+corona)*u_sunIntensity;
}

vec3 getMoonDisk(vec3 rd, vec3 moonDir) {
  float md=dot(rd,moonDir);
  if(md<0.999) return vec3(0);
  float craters=1.0-worleyNoise((rd-moonDir*md)*500.0)*0.3;
  float disk=smoothstep(0.999,0.9995,md);
  return vec3(0.9,0.9,0.85)*disk*craters*u_moonIntensity;
}

// ═ ATMOSPHERE ═
float rayleighPhase(float ct) { return (3.0/(16.0*PI))*(1.0+ct*ct); }
float miePhase(float ct, float g) { float g2=g*g; return (1.0-g2)/(4.0*PI*pow(1.0+g2-2.0*g*ct,1.5)); }

vec3 getSkyColor(vec3 rd, vec3 sunDir) {
  float sd=dot(rd,sunDir);
  float hf=1.0-pow(saturateF(rd.y),0.4);
  float sunElev=getAutoSunElevation();
  vec3 zenith=u_zenithColor, horizon=u_horizonColor;
  if(sunElev<0.1) {
    float t=smoothstep(-0.2,0.1,sunElev);
    zenith=mix(vec3(0.02,0.03,0.08),zenith,t);
    horizon=mix(vec3(0.1,0.05,0.15),horizon,t);
    if(sunElev>-0.1&&sunElev<0.1) {
      float sb=1.0-abs(sunElev)*10.0;
      horizon=mix(horizon,vec3(1,0.4,0.1),sb*0.7);
    }
  }
  vec3 sky=mix(zenith,horizon,hf);
  sky+=vec3(0.2,0.4,0.8)*rayleighPhase(sd)*u_rayleighStrength;
  sky+=u_sunColor*miePhase(sd,u_mieG)*u_mieStrength;
  if(u_weatherType>0) { sky*=(1.0-u_weatherIntensity*0.5); sky=mix(sky,vec3(0.4,0.45,0.5),u_weatherIntensity*0.3); }
  return sky;
}

// ═ CLOUDS ═
float getCloudHeightGrad(float y, float base, float top) {
  float h=(y-base)/(top-base);
  if(h<0.0||h>1.0) return 0.0;
  return pow(smoothstep(0.0,0.1,h),0.5)*smoothstep(1.0,0.85,h)*(1.0-pow(h,2.0)*0.5);
}

float sampleCloudDensity(vec3 p, bool cheap) {
  float cloudBase=u_cloudHeight, cloudTop=u_cloudHeight+u_cloudThickness;
  float hg=getCloudHeightGrad(p.y,cloudBase,cloudTop);
  if(hg<=0.0) return 0.0;
  vec2 ec=(p.xz+CLOUD_EXTENT)/(CLOUD_EXTENT*2.0);
  float ef=smoothstep(0.0,0.1,ec.x)*smoothstep(1.0,0.9,ec.x)*smoothstep(0.0,0.1,ec.y)*smoothstep(1.0,0.9,ec.y);
  if(ef<=0.0) return 0.0;
  vec3 wo=vec3(cos(u_windDirection)*u_windSpeed*u_time*10.0,0,sin(u_windDirection)*u_windSpeed*u_time*10.0);
  vec3 sc=(p+wo)*u_cloudScale*0.0001+vec3(u_time*u_cloudSpeed*0.002,0,0);
  vec4 nv=texture(u_noiseTex,fract(sc*16.0/8.0));
  float shape=remap(nv.x,nv.y-1.0,1.0,0.0,1.0);
  float cov=u_cloudCoverage;
  if(u_weatherType>0) cov=mix(u_cloudCoverage,0.9,u_weatherIntensity);
  float density=saturateF(remap(shape*hg,1.0-cov,1.0,0.0,1.0));
  if(cheap||density<=0.0) return density*ef*u_cloudDensity;
  vec3 dc=(p+wo)*u_cloudDetailScale*0.001+vec3(u_time*u_cloudSpeed*0.004,0,0);
  float detail=fbm(dc,3)*0.3;
  density=saturateF(remap(density,detail,1.0,0.0,1.0));
  return density*ef*u_cloudDensity;
}

float cloudLightMarch(vec3 pos, vec3 ld) {
  float ss=u_cloudThickness*0.5/8.0;
  float td=0.0; vec3 rp=pos;
  for(int i=0;i<8;i++) { rp+=ld*ss; td+=sampleCloudDensity(rp,true)*ss; }
  return exp(-td*u_cloudLightAbsorption);
}

float dualLobePhase(float ct, float g1, float g2, float blend) { return mix(miePhase(ct,g1),miePhase(ct,g2),blend); }

vec3 cloudScattering(vec3 pos, vec3 rd, float density, vec3 sunDir, vec3 lc) {
  float lt=cloudLightMarch(pos,sunDir);
  float ct=dot(rd,sunDir);
  float phase=dualLobePhase(ct,0.8,-0.5,0.2);
  vec3 ambient=vec3(0.5,0.6,0.7)*u_cloudAmbient;
  vec3 direct=lc*lt*phase;
  float sl=pow(1.0-abs(ct),8.0)*u_cloudSilverLining;
  vec3 silver=lc*sl*lt;
  if(u_weatherType==3&&u_lightningIntensity>0.0) {
    float lightning=u_lightningIntensity*exp(-abs(u_time-u_lightningTime)*10.0);
    ambient+=vec3(lightning*5.0);
  }
  return ambient+direct+silver;
}

vec4 raymarchClouds(vec3 ro, vec3 rd, vec3 sunDir, vec3 lc) {
  if(u_layerClouds==0) return vec4(0);
  float cloudBase=u_cloudHeight, cloudTop=u_cloudHeight+u_cloudThickness;
  vec3 cmin=vec3(-CLOUD_EXTENT,cloudBase,-CLOUD_EXTENT), cmax=vec3(CLOUD_EXTENT,cloudTop,CLOUD_EXTENT);
  vec3 invRd=1.0/rd;
  vec3 t0=(cmin-ro)*invRd, t1=(cmax-ro)*invRd;
  vec3 tmin=min(t0,t1), tmax=max(t0,t1);
  float dstA=max(max(tmin.x,tmin.y),tmin.z);
  float dstB=min(min(tmax.x,tmax.y),tmax.z);
  float dstToBox=max(0.0,dstA);
  float dstInside=max(0.0,dstB-dstToBox);
  if(dstInside<=0.0) return vec4(0);
  int steps=min(u_cloudSteps,64);
  float stepSize=dstInside/float(steps);
  float t=dstToBox+stepSize*hash12(vUv*u_resolution+u_time);
  vec3 totalLight=vec3(0); float totalT=1.0;
  for(int i=0;i<64;i++) {
    if(i>=steps||totalT<0.01) break;
    vec3 pos=ro+rd*t;
    if(pos.y>=cloudBase&&pos.y<=cloudTop) {
      float d=sampleCloudDensity(pos,false);
      if(d>0.001) {
        vec3 lum=cloudScattering(pos,rd,d,sunDir,lc);
        float st=exp(-d*stepSize);
        totalLight+=totalT*lum*(1.0-st);
        totalT*=st;
      }
    }
    t+=stepSize;
    if(t>dstToBox+dstInside) break;
  }
  return vec4(totalLight,1.0-totalT);
}

float sampleCloudShadow(vec3 wp, vec3 sunDir) {
  if(u_layerClouds==0) return 1.0;
  float cloudBase=u_cloudHeight, cloudTop=u_cloudHeight+u_cloudThickness;
  vec3 invRd=1.0/sunDir;
  vec3 t0=(vec3(-CLOUD_EXTENT,cloudBase,-CLOUD_EXTENT)-wp)*invRd;
  vec3 t1=(vec3(CLOUD_EXTENT,cloudTop,CLOUD_EXTENT)-wp)*invRd;
  vec3 tmin=min(t0,t1), tmax=max(t0,t1);
  float dstA=max(max(tmin.x,tmin.y),tmin.z);
  float dstB=min(min(tmax.x,tmax.y),tmax.z);
  float dstToBox=max(0.0,dstA), dstInside=max(0.0,dstB-dstToBox);
  if(dstInside<=0.0) return 1.0;
  float ss=dstInside/8.0, t=dstToBox, td=0.0;
  for(int i=0;i<8;i++) { td+=sampleCloudDensity(wp+sunDir*t,true)*ss; t+=ss; }
  return exp(-td*0.5);
}

// ═ TERRAIN ═
float getTerrainHeight(vec2 p) {
  vec2 pos=p*u_terrainScale*0.001;
  float continent=smoothstep(0.25,0.65,fbm(vec3(pos*0.3+7.3,0),3)*0.5+0.5);
  float mountains=pow(ridgedFbm(vec3(pos*1.5+3.7,0.5),5),u_mountainSharpness)*u_mountainHeight;
  float hills=fbm(vec3(pos*3.0+11.1,1),4)*u_terrainHeight*0.4;
  float detail=fbm(vec3(pos*12.0+5.5,2),3)*u_terrainHeight*0.08;
  float warp=warpedNoise(vec3(pos*2.0,0.3),0.5,3)*u_terrainHeight*0.2;
  float erosion=0.0;
  if(u_erosionStrength>0.0) {
    vec3 en=curlNoise(vec3(pos*5.0,0));
    erosion=(en.x+en.y)*u_erosionStrength*80.0;
    float valleys=pow(1.0-abs(gradientNoise(vec3(pos*2.0,0.5))),3.0);
    erosion+=valleys*u_erosionStrength*150.0;
  }
  return continent*(mountains+hills+detail+warp-erosion)+u_oceanLevel;
}

vec3 getTerrainNormal(vec2 p, float h) {
  float e=10.0;
  return normalize(vec3(getTerrainHeight(p-vec2(e,0))-getTerrainHeight(p+vec2(e,0)), 2.0*e, getTerrainHeight(p-vec2(0,e))-getTerrainHeight(p+vec2(0,e))));
}

vec3 getTerrainMaterial(vec3 wp, vec3 n, float h) {
  float slope=1.0-n.y, rh=h-u_oceanLevel;
  float beach=smoothstep(0.0,u_beachWidth,rh)*smoothstep(u_beachWidth*2.0,u_beachWidth,rh);
  float grass=smoothstep(u_beachWidth,u_beachWidth*2.0,rh)*smoothstep(u_treeLine,u_treeLine*0.8,rh)*smoothstep(0.5,0.3,slope);
  float rock=saturateF(smoothstep(0.3,0.6,slope)+smoothstep(u_treeLine*0.8,u_treeLine,rh));
  float snow=smoothstep(u_snowLine*0.9,u_snowLine,rh)*smoothstep(0.7,0.4,slope);
  if(u_weatherType==2) snow=mix(snow,1.0,u_weatherIntensity*(1.0-slope));
  vec3 c=u_sandColor*beach;
  c=mix(c,u_grassColor,grass); c=mix(c,u_rockColor,rock); c=mix(c,u_snowColor,snow);
  c*=fbm(wp*0.1,3)*0.2+0.9;
  return c;
}

vec4 raymarchTerrain(vec3 ro, vec3 rd, vec3 sunDir, vec3 lc) {
  if(u_layerTerrain==0) return vec4(0,0,0,-1);
  float t=1.0, maxDist=80000.0, lastH=0.0, lastY=0.0;
  for(int i=0;i<200;i++) {
    vec3 pos=ro+rd*t;
    float th=getTerrainHeight(pos.xz);
    float d2t=pos.y-th;
    if(d2t<0.5) {
      float tLow=t-max(1.0,abs(lastY-lastH)*0.3), tHigh=t;
      for(int j=0;j<6;j++) {
        float tMid=(tLow+tHigh)*0.5;
        vec3 mp=ro+rd*tMid;
        if(mp.y<getTerrainHeight(mp.xz)) tHigh=tMid; else tLow=tMid;
      }
      t=(tLow+tHigh)*0.5;
      vec3 hp=ro+rd*t;
      float fH=getTerrainHeight(hp.xz);
      vec3 n=getTerrainNormal(hp.xz,fH);
      vec3 mat=getTerrainMaterial(hp,n,fH);
      float NdotL=max(0.0,dot(n,sunDir));
      float cs=sampleCloudShadow(hp,sunDir);
      float lf=0.0;
      if(u_weatherType==3&&u_lightningIntensity>0.0) lf=u_lightningIntensity*exp(-abs(u_time-u_lightningTime)*10.0);
      return vec4(mat*0.25+mat*lc*NdotL*cs+mat*lf*3.0, t);
    }
    lastH=th; lastY=pos.y;
    t+=max(0.5,min(max(0.3,d2t*0.4),200.0+t*0.01));
    if(t>maxDist) break;
  }
  return vec4(0,0,0,-1);
}

// ═ OCEAN ═
const mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);

float oceanNoise(vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x),u.y)*2.0-1.0;
}

float sea_octave(vec2 uv_in, float choppy) {
  vec2 uv=uv_in+vec2(oceanNoise(uv_in),oceanNoise(uv_in+7.3));
  vec2 wv=1.0-abs(sin(uv)), swv=abs(cos(uv));
  vec2 blended=mix(wv,swv,wv);
  return pow(1.0-pow(blended.x*blended.y,0.65),choppy);
}

float oceanMap(vec3 p, int iterations) {
  float SEA_FREQ=u_waveFrequency*0.16, SEA_HEIGHT=u_waveHeight*0.6;
  float SEA_CHOPPY=4.0+u_oceanRoughness*4.0, SEA_TIME=u_time*u_waveSpeed*0.8;
  float freq=SEA_FREQ, amp=SEA_HEIGHT, choppy=SEA_CHOPPY;
  vec2 uv=vec2(p.x*0.75,p.z);
  float wa=u_windDirection;
  uv=mat2(cos(wa),-sin(wa),sin(wa),cos(wa))*uv;
  float h=0.0;
  for(int i=0;i<8;i++) {
    if(i>=iterations) break;
    float d=sea_octave((uv+SEA_TIME)*freq,choppy)+sea_octave((uv-SEA_TIME)*freq,choppy);
    h+=d*amp; uv=octave_m*uv; freq*=1.9; amp*=0.22; choppy=mix(choppy,1.0,0.2);
  }
  if(u_weatherType==3) h+=sea_octave(p.xz*0.05+SEA_TIME*0.5,2.0)*u_weatherIntensity*u_waveHeight*1.5;
  return p.y-h;
}

vec4 heightMapTracing(vec3 ori, vec3 dir) {
  float tm=0.0, tx=2000.0;
  float hx=oceanMap(ori+dir*tx,5);
  if(hx>0.0) return vec4(ori+dir*tx,tx);
  float hm=oceanMap(ori+dir*tm,5);
  float tmid=0.0;
  for(int i=0;i<8;i++) {
    tmid=mix(tm,tx,hm/(hm-hx));
    float hmid=oceanMap(ori+dir*tmid,5);
    if(hmid<0.0){tx=tmid;}else{tm=tmid;hm=hmid;}
  }
  return vec4(ori+dir*tmid,tmid);
}

vec3 getOceanNormal(vec3 p, float eps) {
  float ny=oceanMap(p,8);
  return normalize(vec3(oceanMap(vec3(p.x+eps,p.y,p.z),8)-ny, eps, oceanMap(vec3(p.x,p.y,p.z+eps),8)-ny));
}

float getCaustics(vec3 wp) {
  vec2 uv=wp.xz*0.05; float c=0.0;
  for(float i=0.0;i<3.0;i+=1.0) {
    vec2 p2=uv*(1.5+i*0.5)+vec2(u_time*(0.2+i*0.1),u_time*(0.15-i*0.05));
    c+=pow(worleyNoise(vec3(p2,i+u_time*0.2)),3.0-i*0.5)*(1.0-i*0.25);
  }
  return saturateF(c*0.8);
}

vec3 getOceanColor(vec3 p, vec3 n, vec3 sunDir, vec3 lc, vec3 eye, float dist) {
  float fresnel=pow(clamp(1.0-dot(n,-eye),0.0,1.0),3.0)*0.5;
  vec3 refl=getSkyColor(reflect(eye,n),sunDir);
  vec3 refr=u_oceanDeepColor+pow(dot(n,sunDir)*0.4+0.6,80.0)*(u_oceanColor*1.5+vec3(0,0.1,0.05))*0.12;
  vec3 color=mix(refr,refl,fresnel);
  float atten=max(1.0-dist*dist*0.0000015,0.0);
  float sss=pow(saturateF(dot(-eye,sunDir+n*0.4)),3.0);
  color+=vec3(0,0.15,0.1)*sss*u_sssIntensity*atten;
  float nrm=(60.0+8.0)/(PI*8.0);
  float spec=pow(max(dot(reflect(eye,n),sunDir),0.0),60.0)*nrm;
  color+=vec3(spec)*lc;
  color+=getCaustics(p)*u_causticsIntensity*0.08*lc*atten;
  color*=mix(0.6,1.0,sampleCloudShadow(p,sunDir));
  float af=1.0-saturateF(dist*0.0003);
  color=mix(getSkyColor(eye,sunDir)*0.8,color,af);
  return color;
}

vec4 renderOcean(vec3 ro, vec3 rd, vec3 sunDir, vec3 lc, float terrainDist) {
  if(u_layerOcean==0) return vec4(0);
  if(rd.y>0.3) return vec4(0);
  vec4 result=heightMapTracing(ro,rd);
  float t=result.w;
  if(t>1999.0) return vec4(0);
  if(terrainDist>0.0&&t>terrainDist) return vec4(0);
  vec3 hp=result.xyz;
  float eps=max(0.01,t*0.002);
  vec3 n=getOceanNormal(hp,eps);
  return vec4(getOceanColor(hp,n,sunDir,lc,rd,t), t);
}

// ═ WEATHER ═
vec3 renderRain(vec2 uv, vec3 bc) {
  if(u_layerWeather==0||u_weatherType!=1) return bc;
  float ra=0.0;
  for(float layer=0.0;layer<3.0;layer+=1.0) {
    float ls=1.0+layer*0.5, lspd=10.0+layer*5.0, la=(1.0-layer*0.3)*0.5;
    vec2 ruv=uv*vec2(100.0*ls,40.0*ls);
    ruv.y-=u_time*lspd; ruv.x+=sin(u_time*0.5+layer)*0.5+u_time*u_windSpeed*3.0;
    vec2 cid=floor(ruv), cuv=fract(ruv);
    float rnd=hash12(cid);
    if(rnd<u_weatherIntensity*0.8) {
      float dx=hash12(cid+0.1)*0.8+0.1, dl=0.1+rnd*0.15;
      float dist=abs(cuv.x-dx);
      ra+=smoothstep(0.02,0.0,dist)*smoothstep(0.0,dl,cuv.y)*smoothstep(dl+0.1,dl,cuv.y)*la*u_weatherIntensity;
    }
  }
  return mix(bc,vec3(0.7,0.75,0.85),saturateF(ra));
}

vec3 renderSnow(vec2 uv, vec3 bc) {
  if(u_layerWeather==0||u_weatherType!=2) return bc;
  float sa=0.0;
  for(float layer=0.0;layer<4.0;layer+=1.0) {
    float ls=1.0+layer*0.3, lspd=0.5+layer*0.2;
    vec2 suv=uv*vec2(50.0*ls);
    suv.y-=u_time*lspd; suv.x+=sin(u_time*0.5+layer)*0.3+u_time*u_windSpeed*2.0;
    suv.x+=sin(suv.y*2.0+layer*1.5)*0.1;
    vec2 cid=floor(suv), cuv=fract(suv);
    if(hash12(cid)<u_weatherIntensity*0.6) {
      vec2 fp=hash22(cid)*0.8+0.1;
      float sz=0.03+hash12(cid+1.0)*0.03;
      sa+=smoothstep(sz,sz*0.3,length(cuv-fp))*(1.0-layer*0.2)*0.4;
    }
  }
  return mix(bc,vec3(0.95,0.95,1.0),saturateF(sa));
}

vec3 renderLightning(vec2 uv, vec3 bc) {
  if(u_layerWeather==0||u_weatherType!=3) return bc;
  float flash=u_lightningIntensity*exp(-abs(u_time-u_lightningTime)*8.0);
  return bc+vec3(0.8,0.85,1.0)*flash*0.5;
}

// ═ FOG & GOD RAYS ═
vec3 applyFog(vec3 color, vec3 ro, vec3 rd, float dist, vec3 sunDir, vec3 lc) {
  if(u_layerFog==0||u_fogDensity<=0.0) return color;
  float fa=1.0-exp(-dist*u_fogDensity*0.0001);
  if(u_weatherType>0) fa=mix(fa,0.5,u_weatherIntensity*0.3);
  float sa=pow(saturateF(dot(rd,sunDir)),8.0);
  vec3 fc=mix(u_fogColor,lc,sa*0.5);
  if(u_weatherType==1||u_weatherType==3) fc=mix(fc,vec3(0.4,0.45,0.5),u_weatherIntensity*0.3);
  return mix(color,fc,fa);
}

float calculateGodRays(vec3 ro, vec3 rd, vec3 sunDir, float sd) {
  if(u_layerGodRays==0||u_godRayIntensity<=0.0) return 0.0;
  float gr=0.0; int steps=min(u_godRaySteps,16);
  float ss=min(sd,5000.0)/float(steps); float decay=1.0;
  for(int i=0;i<16;i++) {
    if(i>=steps) break;
    vec3 pos=ro+rd*(float(i)*ss);
    float co=sampleCloudShadow(pos,sunDir);
    gr+=(1.0-co)*decay*pow(max(0.0,dot(normalize(pos-ro),sunDir)),4.0);
    decay*=u_godRayDecay;
  }
  return gr*u_godRayIntensity*0.1;
}

// ═ POST-PROCESSING ═
vec3 applyPost(vec3 c, vec2 uv) {
  c*=u_exposure;
  float luma=dot(c,vec3(0.2126,0.7152,0.0722));
  c=mix(vec3(luma),c,u_saturation);
  if(u_vignetteStrength>0.0) {
    vec2 vu=uv*2.0-1.0;
    c*=1.0-dot(vu,vu)*u_vignetteStrength*0.5;
  }
  c=(c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14);
  return saturate3(c);
}

// ═ MAIN ═
void main() {
  vec2 uv=vUv;
  vec3 ro=u_camPos;
  float pitch=clamp(u_pitch,-PI*0.45,PI*0.45);
  vec3 ld=vec3(cos(pitch)*sin(u_yaw),sin(pitch),cos(pitch)*cos(u_yaw));
  vec3 rd=getRayDirection(uv,ro,ro+ld,u_fov);
  vec3 sunDir=getSunDirection();
  vec3 moonDir=getMoonDirection();
  float sunElev=getAutoSunElevation();
  vec3 lightColor=u_sunColor*u_sunIntensity;
  if(sunElev<0.0) lightColor=vec3(0.3,0.35,0.5)*u_moonIntensity;
  else if(sunElev<0.1) lightColor=mix(vec3(0.3,0.35,0.5)*u_moonIntensity,vec3(1,0.5,0.2)*u_sunIntensity,sunElev/0.1);
  if(u_weatherType>0) lightColor*=(1.0-u_weatherIntensity*0.4);

  bool underwater=ro.y<u_oceanLevel;
  vec3 finalColor=vec3(0);
  float sceneDepth=100000.0;

  if(u_layerSky!=0) {
    vec3 sky=getSkyColor(rd,sunDir);
    if(sunElev<0.1&&u_weatherType==0) sky+=vec3(getStars(rd));
    if(u_weatherType==0) { sky+=getSunDisk(rd,sunDir); if(sunElev<0.0) sky+=getMoonDisk(rd,moonDir); }
    finalColor=sky;
  }

  vec4 tr=raymarchTerrain(ro,rd,sunDir,lightColor);
  if(tr.w>0.0) { finalColor=tr.rgb; sceneDepth=tr.w; }

  vec4 oc=renderOcean(ro,rd,sunDir,lightColor,tr.w);
  if(oc.w>0.0&&(tr.w<0.0||oc.w<tr.w)) { finalColor=oc.rgb; sceneDepth=oc.w; }

  if(!underwater) { vec4 cl=raymarchClouds(ro,rd,sunDir,lightColor); finalColor=mix(finalColor,cl.rgb,cl.a); }
  if(!underwater) finalColor=applyFog(finalColor,ro,rd,sceneDepth,sunDir,lightColor);
  if(!underwater) { float gr=calculateGodRays(ro,rd,sunDir,sceneDepth); finalColor+=lightColor*gr; }
  if(!underwater) { finalColor=renderRain(uv,finalColor); finalColor=renderSnow(uv,finalColor); finalColor=renderLightning(uv,finalColor); }

  finalColor=applyPost(finalColor,uv);
  fragColor=vec4(finalColor,1.0);
}
`;

// ─── WGSL COMPUTE: 3D Noise Texture Generator (128³) ───
const NOISE_COMPUTE_WGSL = /* wgsl */`
@group(0) @binding(0) var output: texture_storage_3d<rgba8unorm, write>;

fn hash31(p: vec3f) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash33(p: vec3f) -> vec3f {
  let q = vec3f(
    dot(p, vec3f(127.1, 311.7, 74.7)),
    dot(p, vec3f(269.5, 183.3, 246.1)),
    dot(p, vec3f(113.5, 271.9, 124.6))
  );
  return fract(sin(q) * 43758.5453123);
}

fn quintic(t: vec3f) -> vec3f {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

fn gradientNoise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = quintic(f);
  let n000 = dot(hash33(i + vec3f(0.0, 0.0, 0.0)) * 2.0 - 1.0, f - vec3f(0.0, 0.0, 0.0));
  let n100 = dot(hash33(i + vec3f(1.0, 0.0, 0.0)) * 2.0 - 1.0, f - vec3f(1.0, 0.0, 0.0));
  let n010 = dot(hash33(i + vec3f(0.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3f(0.0, 1.0, 0.0));
  let n110 = dot(hash33(i + vec3f(1.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3f(1.0, 1.0, 0.0));
  let n001 = dot(hash33(i + vec3f(0.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3f(0.0, 0.0, 1.0));
  let n101 = dot(hash33(i + vec3f(1.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3f(1.0, 0.0, 1.0));
  let n011 = dot(hash33(i + vec3f(0.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3f(0.0, 1.0, 1.0));
  let n111 = dot(hash33(i + vec3f(1.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3f(1.0, 1.0, 1.0));
  let mix_x0 = mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y);
  let mix_x1 = mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y);
  return mix(mix_x0, mix_x1, u.z);
}

fn worleyNoise(p: vec3f) -> f32 {
  let n = floor(p);
  let f = fract(p);
  var d = 1.0;
  for (var k = -1; k <= 1; k++) {
    for (var j = -1; j <= 1; j++) {
      for (var i = -1; i <= 1; i++) {
        let g = vec3f(f32(i), f32(j), f32(k));
        let o = hash33(n + g);
        let r = g + o - f;
        d = min(d, dot(r, r));
      }
    }
  }
  return 1.0 - sqrt(d);
}

fn fbm(p: vec3f) -> f32 {
  var value = 0.0;
  var amp = 0.5;
  var freq = 1.0;
  var pos = p;
  for (var i = 0; i < 6; i++) {
    value += amp * gradientNoise(pos * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let size = 128u;
  if (id.x >= size || id.y >= size || id.z >= size) { return; }
  let p = vec3f(id) / f32(size) * 8.0;
  let perlin = fbm(p) * 0.5 + 0.5;
  let worley = worleyNoise(p * 2.0);
  let ridged = 1.0 - abs(gradientNoise(p * 1.5));
  let detail = worleyNoise(p * 4.0);
  textureStore(output, id, vec4f(perlin, worley, ridged, detail));
}
`;

// ─── WGSL MAIN RENDER SHADER (kept for WebGPU path) ───
const RENDER_WGSL = /* wgsl */`
struct FrameUniforms { time: f32, frame: u32, resolution: vec2f, mouse: vec2f, _pad0: vec2f, };
struct CameraUniforms { position: vec3f, fov: f32, yaw: f32, pitch: f32, _pad: vec2f, };
struct SunUniforms { azimuth: f32, elevation: f32, intensity: f32, moonIntensity: f32, color: vec3f, starIntensity: f32, autoTime: u32, cycleSpeed: f32, _pad: vec2f, };
struct AtmosphereUniforms { zenithColor: vec3f, atmosphereDensity: f32, horizonColor: vec3f, rayleighStrength: f32, mieStrength: f32, mieG: f32, _pad: vec2f, };
struct CloudUniforms { coverage: f32, density: f32, scale: f32, detailScale: f32, speed: f32, height: f32, thickness: f32, lightAbsorption: f32, ambient: f32, silverLining: f32, powder: f32, steps: u32, };
struct TerrainUniforms { scale: f32, height: f32, mountainHeight: f32, mountainSharpness: f32, snowLine: f32, treeLine: f32, beachWidth: f32, erosionStrength: f32, grassColor: vec3f, _pad0: f32, rockColor: vec3f, _pad1: f32, snowColor: vec3f, _pad2: f32, sandColor: vec3f, _pad3: f32, };
struct OceanUniforms { level: f32, waveHeight: f32, waveFrequency: f32, waveSpeed: f32, roughness: f32, fresnel: f32, foamIntensity: f32, causticsIntensity: f32, sssIntensity: f32, bubbleIntensity: f32, _pad: vec2f, color: vec3f, _pad2: f32, deepColor: vec3f, _pad3: f32, };
struct WeatherUniforms { weatherType: u32, intensity: f32, windSpeed: f32, windDirection: f32, lightningIntensity: f32, lightningTime: f32, _pad: vec2f, };
struct FogUniforms { density: f32, height: f32, _pad0: vec2f, color: vec3f, _pad1: f32, };
struct PostUniforms { bloomIntensity: f32, bloomThreshold: f32, exposure: f32, saturation: f32, vignetteStrength: f32, godRayIntensity: f32, godRayDecay: f32, godRaySteps: u32, };
struct LayerFlags { sky: u32, clouds: u32, terrain: u32, ocean: u32, vegetation: u32, weather: u32, fog: u32, godRays: u32, };

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<uniform> camera: CameraUniforms;
@group(0) @binding(2) var<uniform> sun: SunUniforms;
@group(0) @binding(3) var<uniform> atmosphere: AtmosphereUniforms;
@group(0) @binding(4) var<uniform> cloud: CloudUniforms;
@group(0) @binding(5) var<uniform> terrain: TerrainUniforms;
@group(0) @binding(6) var<uniform> ocean: OceanUniforms;
@group(0) @binding(7) var<uniform> weather: WeatherUniforms;
@group(0) @binding(8) var<uniform> fog: FogUniforms;
@group(0) @binding(9) var<uniform> post: PostUniforms;
@group(0) @binding(10) var<uniform> layers: LayerFlags;
@group(1) @binding(0) var noiseTex: texture_3d<f32>;
@group(1) @binding(1) var noiseSampler: sampler;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;
const CLOUD_EXTENT: f32 = 50000.0;

struct VertexOutput { @builtin(position) position: vec4f, @location(0) uv: vec2f, };

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var uv = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));
  var out: VertexOutput;
  out.position = vec4f(pos[vid], 0.0, 1.0);
  out.uv = uv[vid];
  return out;
}

fn saturateF(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn saturate3(x: vec3f) -> vec3f { return clamp(x, vec3f(0.0), vec3f(1.0)); }
fn remap(x: f32, a: f32, b: f32, c: f32, d: f32) -> f32 { return c + (x - a) * (d - c) / (b - a); }
fn rot2D(angle: f32) -> mat2x2f { let c = cos(angle); let s = sin(angle); return mat2x2f(c, -s, s, c); }

fn hash11(p_in: f32) -> f32 { var p = fract(p_in * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
fn hash12(p: vec2f) -> f32 { var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
fn hash13(p: vec3f) -> f32 { var q = fract(p * 0.1031); q += dot(q, q.zyx + 31.32); return fract((q.x + q.y) * q.z); }
fn hash22(p: vec2f) -> vec2f { let p3 = fract(vec3f(p.x, p.y, p.x) * vec3f(0.1031, 0.1030, 0.0973)); let p3b = p3 + dot(p3, p3.yzx + 33.33); return fract((vec2f(p3b.x, p3b.x) + p3b.yz) * p3b.zy); }
fn hash33(p: vec3f) -> vec3f { let q = vec3f(dot(p, vec3f(127.1, 311.7, 74.7)), dot(p, vec3f(269.5, 183.3, 246.1)), dot(p, vec3f(113.5, 271.9, 124.6))); return fract(sin(q) * 43758.5453123); }

fn gradientNoise(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p); let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let n000 = dot(hash33(i) * 2.0 - 1.0, f);
  let n100 = dot(hash33(i + vec3f(1,0,0)) * 2.0 - 1.0, f - vec3f(1,0,0));
  let n010 = dot(hash33(i + vec3f(0,1,0)) * 2.0 - 1.0, f - vec3f(0,1,0));
  let n110 = dot(hash33(i + vec3f(1,1,0)) * 2.0 - 1.0, f - vec3f(1,1,0));
  let n001 = dot(hash33(i + vec3f(0,0,1)) * 2.0 - 1.0, f - vec3f(0,0,1));
  let n101 = dot(hash33(i + vec3f(1,0,1)) * 2.0 - 1.0, f - vec3f(1,0,1));
  let n011 = dot(hash33(i + vec3f(0,1,1)) * 2.0 - 1.0, f - vec3f(0,1,1));
  let n111 = dot(hash33(i + vec3f(1,1,1)) * 2.0 - 1.0, f - vec3f(1,1,1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}

fn worleyNoise(p: vec3f) -> f32 {
  let n = floor(p); let f = fract(p); var d = 1.0;
  for (var k = -1; k <= 1; k++) { for (var j = -1; j <= 1; j++) { for (var i = -1; i <= 1; i++) {
    let g = vec3f(f32(i), f32(j), f32(k)); let o = hash33(n + g); let r = g + o - f; d = min(d, dot(r, r));
  }}} return 1.0 - sqrt(d);
}

fn fbm(p: vec3f, octaves: i32) -> f32 {
  var v = 0.0; var a = 0.5; var freq = 1.0;
  for (var i = 0; i < 8; i++) { if (i >= octaves) { break; } v += a * gradientNoise(p * freq); freq *= 2.0; a *= 0.5; }
  return v;
}

fn ridgedFbm(p: vec3f, octaves: i32) -> f32 {
  var v = 0.0; var a = 0.5; var freq = 1.0; var prev = 1.0;
  for (var i = 0; i < 8; i++) { if (i >= octaves) { break; } var n = 1.0 - abs(gradientNoise(p * freq)); n = n * n; v += a * n * prev; prev = n; freq *= 2.0; a *= 0.5; }
  return v;
}

fn warpedNoise(p: vec3f, strength: f32, octaves: i32) -> f32 {
  let q = vec3f(fbm(p, 3), fbm(p + vec3f(5.2, 1.3, 2.8), 3), fbm(p + vec3f(1.7, 9.2, 3.1), 3));
  return fbm(p + strength * q, octaves);
}

fn curlNoise(p: vec3f) -> vec3f {
  let e = 0.1;
  let px0 = gradientNoise(p - vec3f(e, 0, 0)); let px1 = gradientNoise(p + vec3f(e, 0, 0));
  let py0 = gradientNoise(p - vec3f(0, e, 0)); let py1 = gradientNoise(p + vec3f(0, e, 0));
  let pz0 = gradientNoise(p - vec3f(0, 0, e)); let pz1 = gradientNoise(p + vec3f(0, 0, e));
  return vec3f(py1-py0-(pz1-pz0), pz1-pz0-(px1-px0), px1-px0-(py1-py0)) / (2.0*e);
}

fn sampleNoise3D(p: vec3f) -> vec4f { return textureSampleLevel(noiseTex, noiseSampler, fract(p / 8.0), 0.0); }

fn getRayDirection(uv: vec2f, camPos: vec3f, lookAt: vec3f, fov: f32) -> vec3f {
  let forward = normalize(lookAt - camPos); let right = normalize(cross(vec3f(0,1,0), forward)); let up = cross(forward, right);
  let aspect = frame.resolution.x / frame.resolution.y; let fovScale = tan(radians(fov) * 0.5);
  let sp = (uv * 2.0 - 1.0) * vec2f(aspect, 1.0) * fovScale;
  return normalize(forward + right * sp.x + up * sp.y);
}

fn getAutoSunElevation() -> f32 { if (sun.autoTime == 0u) { return sun.elevation; } return sin(frame.time * sun.cycleSpeed * 0.01) * 0.5 + 0.1; }
fn getAutoSunAzimuth() -> f32 { if (sun.autoTime == 0u) { return sun.azimuth; } return (frame.time * sun.cycleSpeed * 0.01 * 0.3) % TAU; }
fn getSunDirection() -> vec3f { let az = getAutoSunAzimuth(); let el = getAutoSunElevation(); return normalize(vec3f(cos(el)*sin(az), sin(el), cos(el)*cos(az))); }
fn getMoonDirection() -> vec3f { return normalize(-getSunDirection() + vec3f(0.2, 0.3, 0.1)); }

fn getStars(rd: vec3f) -> f32 {
  if (rd.y < 0.0) { return 0.0; }
  let sunElev = getAutoSunElevation(); let starVis = smoothstep(0.1, -0.1, sunElev);
  if (starVis <= 0.0) { return 0.0; }
  let dir = rd.xzy; let theta = acos(clamp(dir.z, -1.0, 1.0)); var stars = 0.0;
  for (var l = -5.0; l <= 5.0; l += 1.0) {
    let level = clamp(floor((theta / PI) * 10000.0) + l, 0.0, 9999.0);
    let theta_ = (level + 0.5) * PI / 10000.0;
    if (sin(theta_) < hash12(vec2f(theta_, 0.0))) { continue; }
    let rnd = hash11(PI + theta_); let phi_ = TAU * hash11(level);
    let starPos = vec3f(sin(theta_)*cos(phi_), sin(theta_)*sin(phi_), cos(theta_));
    let d = 0.5 + 0.5 * dot(starPos, dir);
    stars += pow(rnd * 8e-7 / max(1.0 - d, 5e-7), 2.9 + sin(rnd * 6.0 * frame.time));
  }
  return stars * 0.05 * sun.starIntensity * starVis;
}

fn getSunDisk(rd: vec3f, sunDir: vec3f) -> vec3f { let sd = dot(rd, sunDir); return sun.color * (smoothstep(0.9997, 0.9999, sd) * 50.0 + pow(saturateF(sd), 256.0) * 2.0 + pow(saturateF(sd), 8.0) * 0.5) * sun.intensity; }
fn getMoonDisk(rd: vec3f, moonDir: vec3f) -> vec3f { let md = dot(rd, moonDir); if (md < 0.999) { return vec3f(0); } return vec3f(0.9, 0.9, 0.85) * smoothstep(0.999, 0.9995, md) * (1.0 - worleyNoise((rd - moonDir * md) * 500.0) * 0.3) * sun.moonIntensity; }

fn rayleighPhase(ct: f32) -> f32 { return (3.0 / (16.0 * PI)) * (1.0 + ct * ct); }
fn miePhase(ct: f32, g: f32) -> f32 { let g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * ct, 1.5)); }
fn dualLobePhase(ct: f32, g1: f32, g2: f32, blend: f32) -> f32 { return mix(miePhase(ct, g1), miePhase(ct, g2), blend); }

fn getSkyColor(rd: vec3f, sunDir: vec3f) -> vec3f {
  let sd = dot(rd, sunDir); let hf = 1.0 - pow(saturateF(rd.y), 0.4); let sunElev = getAutoSunElevation();
  var zenith = atmosphere.zenithColor; var horizon = atmosphere.horizonColor;
  if (sunElev < 0.1) { let t = smoothstep(-0.2, 0.1, sunElev); zenith = mix(vec3f(0.02, 0.03, 0.08), zenith, t); horizon = mix(vec3f(0.1, 0.05, 0.15), horizon, t);
    if (sunElev > -0.1 && sunElev < 0.1) { horizon = mix(horizon, vec3f(1, 0.4, 0.1), (1.0 - abs(sunElev) * 10.0) * 0.7); } }
  var sky = mix(zenith, horizon, hf); sky += vec3f(0.2, 0.4, 0.8) * rayleighPhase(sd) * atmosphere.rayleighStrength; sky += sun.color * miePhase(sd, atmosphere.mieG) * atmosphere.mieStrength;
  if (weather.weatherType > 0u) { sky *= (1.0 - weather.intensity * 0.5); sky = mix(sky, vec3f(0.4, 0.45, 0.5), weather.intensity * 0.3); }
  return sky;
}

fn getCloudHeightGradient(y: f32, cloudBase: f32, cloudTop: f32) -> f32 {
  let h = (y - cloudBase) / (cloudTop - cloudBase); if (h < 0.0 || h > 1.0) { return 0.0; }
  return pow(smoothstep(0.0, 0.1, h), 0.5) * smoothstep(1.0, 0.85, h) * (1.0 - pow(h, 2.0) * 0.5);
}

fn sampleCloudDensity(p: vec3f, cheap: bool) -> f32 {
  let cloudBase = cloud.height; let cloudTop = cloud.height + cloud.thickness;
  let hg = getCloudHeightGradient(p.y, cloudBase, cloudTop); if (hg <= 0.0) { return 0.0; }
  let ec = (p.xz + CLOUD_EXTENT) / (CLOUD_EXTENT * 2.0);
  let ef = smoothstep(0.0, 0.1, ec.x) * smoothstep(1.0, 0.9, ec.x) * smoothstep(0.0, 0.1, ec.y) * smoothstep(1.0, 0.9, ec.y);
  if (ef <= 0.0) { return 0.0; }
  let wo = vec3f(cos(weather.windDirection) * weather.windSpeed * frame.time * 10.0, 0.0, sin(weather.windDirection) * weather.windSpeed * frame.time * 10.0);
  let sc = (p + wo) * cloud.scale * 0.0001 + vec3f(frame.time * cloud.speed * 0.002, 0, 0);
  let nv = sampleNoise3D(sc * 16.0); let shape = remap(nv.x, nv.y - 1.0, 1.0, 0.0, 1.0);
  var cov = cloud.coverage; if (weather.weatherType > 0u) { cov = mix(cloud.coverage, 0.9, weather.intensity); }
  var density = saturateF(remap(shape * hg, 1.0 - cov, 1.0, 0.0, 1.0));
  if (cheap || density <= 0.0) { return density * ef * cloud.density; }
  let dc = (p + wo) * cloud.detailScale * 0.001 + vec3f(frame.time * cloud.speed * 0.004, 0, 0);
  density = saturateF(remap(density, fbm(dc, 3) * 0.3, 1.0, 0.0, 1.0));
  return density * ef * cloud.density;
}

fn cloudLightMarch(pos: vec3f, ld: vec3f) -> f32 {
  let ss = cloud.thickness * 0.5 / 8.0; var td = 0.0; var rp = pos;
  for (var i = 0; i < 8; i++) { rp += ld * ss; td += sampleCloudDensity(rp, true) * ss; }
  return exp(-td * cloud.lightAbsorption);
}

fn cloudScattering(pos: vec3f, rd: vec3f, density: f32, sunDir: vec3f, lc: vec3f) -> vec3f {
  let lt = cloudLightMarch(pos, sunDir); let ct = dot(rd, sunDir);
  var ambient = vec3f(0.5, 0.6, 0.7) * cloud.ambient;
  let direct = lc * lt * dualLobePhase(ct, 0.8, -0.5, 0.2);
  let silver = lc * pow(1.0 - abs(ct), 8.0) * cloud.silverLining * lt;
  if (weather.weatherType == 3u && weather.lightningIntensity > 0.0) { ambient += vec3f(1.0) * weather.lightningIntensity * exp(-abs(frame.time - weather.lightningTime) * 10.0) * 5.0; }
  return ambient + direct + silver;
}

fn rayBoxIntersect(ro: vec3f, rd: vec3f, bmin: vec3f, bmax: vec3f) -> vec2f {
  let inv = 1.0 / rd; let t0 = (bmin - ro) * inv; let t1 = (bmax - ro) * inv;
  let tmin = min(t0, t1); let tmax = max(t0, t1);
  return vec2f(max(0.0, max(max(tmin.x, tmin.y), tmin.z)), max(0.0, min(min(tmax.x, tmax.y), tmax.z) - max(0.0, max(max(tmin.x, tmin.y), tmin.z))));
}

fn raymarchClouds(ro: vec3f, rd: vec3f, sunDir: vec3f, lc: vec3f) -> vec4f {
  if (layers.clouds == 0u) { return vec4f(0); }
  let bh = rayBoxIntersect(ro, rd, vec3f(-CLOUD_EXTENT, cloud.height, -CLOUD_EXTENT), vec3f(CLOUD_EXTENT, cloud.height + cloud.thickness, CLOUD_EXTENT));
  if (bh.y <= 0.0) { return vec4f(0); }
  let steps = min(i32(cloud.steps), 64); let ss = bh.y / f32(steps);
  var t = bh.x + ss * fract(hash12(vec2f(f32(frame.frame % 100u), 0.0)) + 1.61803398875 * f32(frame.frame % 100u));
  var tl = vec3f(0); var tt = 1.0;
  for (var i = 0; i < 64; i++) { if (i >= steps || tt < 0.01) { break; } let pos = ro + rd * t;
    if (pos.y >= cloud.height && pos.y <= cloud.height + cloud.thickness) { let d = sampleCloudDensity(pos, false);
      if (d > 0.001) { let lum = cloudScattering(pos, rd, d, sunDir, lc); let st = exp(-d * ss); tl += tt * lum * (1.0 - st); tt *= st; } }
    t += ss; if (t > bh.x + bh.y) { break; } }
  return vec4f(tl, 1.0 - tt);
}

fn sampleCloudShadow(wp: vec3f, sunDir: vec3f) -> f32 {
  if (layers.clouds == 0u) { return 1.0; }
  let bh = rayBoxIntersect(wp, sunDir, vec3f(-CLOUD_EXTENT, cloud.height, -CLOUD_EXTENT), vec3f(CLOUD_EXTENT, cloud.height + cloud.thickness, CLOUD_EXTENT));
  if (bh.y <= 0.0) { return 1.0; }
  let ss = bh.y / 8.0; var t = bh.x; var td = 0.0;
  for (var i = 0; i < 8; i++) { td += sampleCloudDensity(wp + sunDir * t, true) * ss; t += ss; }
  return exp(-td * 0.5);
}

fn getTerrainHeight(p: vec2f) -> f32 {
  let pos = p * terrain.scale * 0.001;
  let continent = smoothstep(0.25, 0.65, fbm(vec3f(pos * 0.3 + 7.3, 0.0), 3) * 0.5 + 0.5);
  let mountains = pow(ridgedFbm(vec3f(pos * 1.5 + 3.7, 0.5), 5), terrain.mountainSharpness) * terrain.mountainHeight;
  let hills = fbm(vec3f(pos * 3.0 + 11.1, 1.0), 4) * terrain.height * 0.4;
  let detail = fbm(vec3f(pos * 12.0 + 5.5, 2.0), 3) * terrain.height * 0.08;
  let warp = warpedNoise(vec3f(pos * 2.0, 0.3), 0.5, 3) * terrain.height * 0.2;
  var erosion = 0.0;
  if (terrain.erosionStrength > 0.0) { let en = curlNoise(vec3f(pos * 5.0, 0.0)); erosion = (en.x + en.y) * terrain.erosionStrength * 80.0 + pow(1.0 - abs(gradientNoise(vec3f(pos * 2.0, 0.5))), 3.0) * terrain.erosionStrength * 150.0; }
  return continent * (mountains + hills + detail + warp - erosion) + ocean.level;
}

fn getTerrainNormal(p: vec2f, height: f32) -> vec3f { let e = 10.0; return normalize(vec3f(getTerrainHeight(p - vec2f(e, 0)) - getTerrainHeight(p + vec2f(e, 0)), 2.0 * e, getTerrainHeight(p - vec2f(0, e)) - getTerrainHeight(p + vec2f(0, e)))); }

fn getTerrainMaterial(wp: vec3f, normal: vec3f, height: f32) -> vec3f {
  let slope = 1.0 - normal.y; let rh = height - ocean.level;
  let beach = smoothstep(0.0, terrain.beachWidth, rh) * smoothstep(terrain.beachWidth * 2.0, terrain.beachWidth, rh);
  let grass = smoothstep(terrain.beachWidth, terrain.beachWidth * 2.0, rh) * smoothstep(terrain.treeLine, terrain.treeLine * 0.8, rh) * smoothstep(0.5, 0.3, slope);
  var rock = saturateF(smoothstep(0.3, 0.6, slope) + smoothstep(terrain.treeLine * 0.8, terrain.treeLine, rh));
  var snow = smoothstep(terrain.snowLine * 0.9, terrain.snowLine, rh) * smoothstep(0.7, 0.4, slope);
  if (weather.weatherType == 2u) { snow = mix(snow, 1.0, weather.intensity * (1.0 - slope)); }
  var c = terrain.sandColor * beach; c = mix(c, terrain.grassColor, grass); c = mix(c, terrain.rockColor, rock); c = mix(c, terrain.snowColor, snow);
  return c * (fbm(wp * 0.1, 3) * 0.2 + 0.9);
}

fn raymarchTerrain(ro: vec3f, rd: vec3f, sunDir: vec3f, lc: vec3f) -> vec4f {
  if (layers.terrain == 0u) { return vec4f(0, 0, 0, -1); }
  var t = 1.0; var lastH = 0.0; var lastY = 0.0;
  for (var i = 0; i < 200; i++) {
    let pos = ro + rd * t; let th = getTerrainHeight(pos.xz); let d2t = pos.y - th;
    if (d2t < 0.5) {
      var tL = t - max(1.0, abs(lastY - lastH) * 0.3); var tH = t;
      for (var j = 0; j < 6; j++) { let tM = (tL + tH) * 0.5; let mp = ro + rd * tM; if (mp.y < getTerrainHeight(mp.xz)) { tH = tM; } else { tL = tM; } }
      t = (tL + tH) * 0.5; let hp = ro + rd * t; let fH = getTerrainHeight(hp.xz); let n = getTerrainNormal(hp.xz, fH); let mat = getTerrainMaterial(hp, n, fH);
      let NdotL = max(0.0, dot(n, sunDir)); let cs = sampleCloudShadow(hp, sunDir);
      var lf = 0.0; if (weather.weatherType == 3u) { lf = weather.lightningIntensity * exp(-abs(frame.time - weather.lightningTime) * 10.0); }
      return vec4f(mat * 0.25 + mat * lc * NdotL * cs + mat * lf * 3.0, t);
    }
    lastH = th; lastY = pos.y; t += max(0.5, min(max(0.3, d2t * 0.4), 200.0 + t * 0.01)); if (t > 80000.0) { break; }
  }
  return vec4f(0, 0, 0, -1);
}

const octave_m: mat2x2f = mat2x2f(1.6, 1.2, -1.2, 1.6);
fn oceanNoise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash12(i), hash12(i + vec2f(1, 0)), u.x), mix(hash12(i + vec2f(0, 1)), hash12(i + vec2f(1, 1)), u.x), u.y) * 2.0 - 1.0; }
fn sea_octave(uv_in: vec2f, choppy: f32) -> f32 { let uv = uv_in + vec2f(oceanNoise(uv_in), oceanNoise(uv_in + 7.3)); let wv = 1.0 - abs(sin(uv)); let swv = abs(cos(uv)); let bl = mix(wv, swv, wv); return pow(1.0 - pow(bl.x * bl.y, 0.65), choppy); }

fn oceanMap(p: vec3f, iterations: i32) -> f32 {
  let SF = ocean.waveFrequency * 0.16; let SH = ocean.waveHeight * 0.6; let SC = 4.0 + ocean.roughness * 4.0; let ST = frame.time * ocean.waveSpeed * 0.8;
  var freq = SF; var amp = SH; var choppy = SC; var uv = vec2f(p.x * 0.75, p.z);
  let wa = weather.windDirection; uv = mat2x2f(cos(wa), -sin(wa), sin(wa), cos(wa)) * uv;
  var h = 0.0;
  for (var i = 0; i < 8; i++) { if (i >= iterations) { break; } h += (sea_octave((uv + ST) * freq, choppy) + sea_octave((uv - ST) * freq, choppy)) * amp; uv = octave_m * uv; freq *= 1.9; amp *= 0.22; choppy = mix(choppy, 1.0, 0.2); }
  if (weather.weatherType == 3u) { h += sea_octave(p.xz * 0.05 + ST * 0.5, 2.0) * weather.intensity * ocean.waveHeight * 1.5; }
  return p.y - h;
}

fn heightMapTracing(ori: vec3f, dir: vec3f) -> vec4f {
  var tm = 0.0; var tx = 2000.0; let hx = oceanMap(ori + dir * tx, 5); if (hx > 0.0) { return vec4f(ori + dir * tx, tx); }
  var hm = oceanMap(ori + dir * tm, 5); var tmid = 0.0;
  for (var i = 0; i < 8; i++) { tmid = mix(tm, tx, hm / (hm - hx)); let hmid = oceanMap(ori + dir * tmid, 5); if (hmid < 0.0) { tx = tmid; } else { tm = tmid; hm = hmid; } }
  return vec4f(ori + dir * tmid, tmid);
}

fn getOceanNormal(p: vec3f, eps: f32) -> vec3f { let ny = oceanMap(p, 8); return normalize(vec3f(oceanMap(vec3f(p.x + eps, p.y, p.z), 8) - ny, eps, oceanMap(vec3f(p.x, p.y, p.z + eps), 8) - ny)); }

fn getCaustics(wp: vec3f) -> f32 {
  let uv = wp.xz * 0.05; var c = 0.0;
  for (var i = 0.0; i < 3.0; i += 1.0) { c += pow(worleyNoise(vec3f(uv * (1.5 + i * 0.5) + vec2f(frame.time * (0.2 + i * 0.1), frame.time * (0.15 - i * 0.05)), i + frame.time * 0.2)), 3.0 - i * 0.5) * (1.0 - i * 0.25); }
  return saturateF(c * 0.8);
}

fn getOceanColor(p: vec3f, n: vec3f, sunDir: vec3f, lc: vec3f, eye: vec3f, dist: f32) -> vec3f {
  let fresnel = pow(clamp(1.0 - dot(n, -eye), 0.0, 1.0), 3.0) * 0.5;
  let refl = getSkyColor(reflect(eye, n), sunDir);
  let refr = ocean.deepColor + pow(dot(n, sunDir) * 0.4 + 0.6, 80.0) * (ocean.color * 1.5 + vec3f(0, 0.1, 0.05)) * 0.12;
  var color = mix(refr, refl, fresnel);
  let atten = max(1.0 - dist * dist * 0.0000015, 0.0);
  color += vec3f(0, 0.15, 0.1) * pow(saturateF(dot(-eye, sunDir + n * 0.4)), 3.0) * ocean.sssIntensity * atten;
  color += vec3f(pow(max(dot(reflect(eye, n), sunDir), 0.0), 60.0) * (68.0 / (PI * 8.0))) * lc;
  color += getCaustics(p) * ocean.causticsIntensity * 0.08 * lc * atten;
  color *= mix(0.6, 1.0, sampleCloudShadow(p, sunDir));
  return mix(getSkyColor(eye, sunDir) * 0.8, color, 1.0 - saturateF(dist * 0.0003));
}

fn renderOcean(ro: vec3f, rd: vec3f, sunDir: vec3f, lc: vec3f, td: f32) -> vec4f {
  if (layers.ocean == 0u) { return vec4f(0); }
  if (rd.y > 0.3) { return vec4f(0); }
  let result = heightMapTracing(ro, rd); let t = result.w;
  if (t > 1999.0) { return vec4f(0); } if (td > 0.0 && t > td) { return vec4f(0); }
  return vec4f(getOceanColor(result.xyz, getOceanNormal(result.xyz, max(0.01, t * 0.002)), sunDir, lc, rd, t), t);
}

fn renderRain(uv: vec2f, bc: vec3f) -> vec3f {
  if (layers.weather == 0u || weather.weatherType != 1u) { return bc; }
  var ra = 0.0;
  for (var layer = 0.0; layer < 3.0; layer += 1.0) {
    let ls = 1.0 + layer * 0.5; var ruv = uv * vec2f(100.0 * ls, 40.0 * ls);
    ruv.y -= frame.time * (10.0 + layer * 5.0); ruv.x += sin(frame.time * 0.5 + layer) * 0.5 + frame.time * weather.windSpeed * 3.0;
    let cid = floor(ruv); let cuv = fract(ruv); let rnd = hash12(cid);
    if (rnd < weather.intensity * 0.8) { let dx = hash12(cid + 0.1) * 0.8 + 0.1; let dl = 0.1 + rnd * 0.15;
      ra += smoothstep(0.02, 0.0, abs(cuv.x - dx)) * smoothstep(0.0, dl, cuv.y) * smoothstep(dl + 0.1, dl, cuv.y) * (1.0 - layer * 0.3) * 0.5 * weather.intensity; } }
  return mix(bc, vec3f(0.7, 0.75, 0.85), saturateF(ra));
}

fn renderSnow(uv: vec2f, bc: vec3f) -> vec3f {
  if (layers.weather == 0u || weather.weatherType != 2u) { return bc; }
  var sa = 0.0;
  for (var layer = 0.0; layer < 4.0; layer += 1.0) {
    var suv = uv * vec2f(50.0 * (1.0 + layer * 0.3));
    suv.y -= frame.time * (0.5 + layer * 0.2); suv.x += sin(frame.time * 0.5 + layer) * 0.3 + frame.time * weather.windSpeed * 2.0; suv.x += sin(suv.y * 2.0 + layer * 1.5) * 0.1;
    let cid = floor(suv); let cuv = fract(suv);
    if (hash12(cid) < weather.intensity * 0.6) { let fp = hash22(cid) * 0.8 + 0.1; let sz = 0.03 + hash12(cid + 1.0) * 0.03;
      sa += smoothstep(sz, sz * 0.3, length(cuv - fp)) * (1.0 - layer * 0.2) * 0.4; } }
  return mix(bc, vec3f(0.95, 0.95, 1.0), saturateF(sa));
}

fn renderLightning(uv: vec2f, bc: vec3f) -> vec3f {
  if (layers.weather == 0u || weather.weatherType != 3u) { return bc; }
  return bc + vec3f(0.8, 0.85, 1.0) * weather.lightningIntensity * exp(-abs(frame.time - weather.lightningTime) * 8.0) * 0.5;
}

fn applyFog(color: vec3f, ro: vec3f, rd: vec3f, dist: f32, sunDir: vec3f, lc: vec3f) -> vec3f {
  if (layers.fog == 0u || fog.density <= 0.0) { return color; }
  var fa = 1.0 - exp(-dist * fog.density * 0.0001);
  if (weather.weatherType > 0u) { fa = mix(fa, 0.5, weather.intensity * 0.3); }
  var fc = mix(fog.color, lc, pow(saturateF(dot(rd, sunDir)), 8.0) * 0.5);
  if (weather.weatherType == 1u || weather.weatherType == 3u) { fc = mix(fc, vec3f(0.4, 0.45, 0.5), weather.intensity * 0.3); }
  return mix(color, fc, fa);
}

fn calculateGodRays(ro: vec3f, rd: vec3f, sunDir: vec3f, sd: f32) -> f32 {
  if (layers.godRays == 0u || post.godRayIntensity <= 0.0) { return 0.0; }
  var gr = 0.0; let steps = min(i32(post.godRaySteps), 16); let ss = min(sd, 5000.0) / f32(steps); var decay = 1.0;
  for (var i = 0; i < 16; i++) { if (i >= steps) { break; } let pos = ro + rd * (f32(i) * ss); gr += (1.0 - sampleCloudShadow(pos, sunDir)) * decay * pow(max(0.0, dot(normalize(pos - ro), sunDir)), 4.0); decay *= post.godRayDecay; }
  return gr * post.godRayIntensity * 0.1;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv; let ro = camera.position;
  let pitch = clamp(camera.pitch, -PI * 0.45, PI * 0.45);
  let ld = vec3f(cos(pitch) * sin(camera.yaw), sin(pitch), cos(pitch) * cos(camera.yaw));
  let rd = getRayDirection(uv, ro, ro + ld, camera.fov);
  let sunDir = getSunDirection(); let moonDir = getMoonDirection(); let sunElev = getAutoSunElevation();
  var lc = sun.color * sun.intensity;
  if (sunElev < 0.0) { lc = vec3f(0.3, 0.35, 0.5) * sun.moonIntensity; }
  else if (sunElev < 0.1) { lc = mix(vec3f(0.3, 0.35, 0.5) * sun.moonIntensity, vec3f(1, 0.5, 0.2) * sun.intensity, sunElev / 0.1); }
  if (weather.weatherType > 0u) { lc *= (1.0 - weather.intensity * 0.4); }
  let uw = ro.y < ocean.level; var fc = vec3f(0); var sd = 100000.0;
  if (layers.sky != 0u) { var sky = getSkyColor(rd, sunDir); if (sunElev < 0.1 && weather.weatherType == 0u) { sky += vec3f(getStars(rd)); }
    if (weather.weatherType == 0u) { sky += getSunDisk(rd, sunDir); if (sunElev < 0.0) { sky += getMoonDisk(rd, moonDir); } } fc = sky; }
  let tr = raymarchTerrain(ro, rd, sunDir, lc); if (tr.w > 0.0) { fc = tr.rgb; sd = tr.w; }
  let oc = renderOcean(ro, rd, sunDir, lc, tr.w); if (oc.w > 0.0 && (tr.w < 0.0 || oc.w < tr.w)) { fc = oc.rgb; sd = oc.w; }
  if (!uw) { let cl = raymarchClouds(ro, rd, sunDir, lc); fc = mix(fc, cl.rgb, cl.a); }
  if (!uw) { fc = applyFog(fc, ro, rd, sd, sunDir, lc); }
  if (!uw) { fc += lc * calculateGodRays(ro, rd, sunDir, sd); }
  if (!uw) { fc = renderRain(uv, fc); fc = renderSnow(uv, fc); fc = renderLightning(uv, fc); }
  fc *= post.exposure; let luma = dot(fc, vec3f(0.2126, 0.7152, 0.0722)); fc = mix(vec3f(luma), fc, post.saturation);
  if (post.vignetteStrength > 0.0) { let vu = uv * 2.0 - 1.0; fc *= 1.0 - dot(vu, vu) * post.vignetteStrength * 0.5; }
  fc = (fc * (2.51 * fc + 0.03)) / (fc * (2.43 * fc + 0.59) + 0.14);
  return vec4f(saturate3(fc), 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
interface EngineSettings {
  timeOfDay: number;
  sunAzimuth: number;
  sunElevation: number;
  autoTimeEnabled: boolean;
  dayNightCycleSpeed: number;
  cameraHeight: number;
  cameraFOV: number;
  cameraSpeed: number;
  skyZenithColor: [number, number, number];
  skyHorizonColor: [number, number, number];
  atmosphereDensity: number;
  rayleighStrength: number;
  mieStrength: number;
  mieG: number;
  moonIntensity: number;
  starIntensity: number;
  cloudCoverage: number;
  cloudDensity: number;
  cloudScale: number;
  cloudDetailScale: number;
  cloudSpeed: number;
  cloudHeight: number;
  cloudThickness: number;
  cloudLightAbsorption: number;
  cloudAmbient: number;
  cloudSilverLining: number;
  cloudPowder: number;
  cloudSteps: number;
  terrainScale: number;
  terrainHeight: number;
  mountainHeight: number;
  mountainSharpness: number;
  snowLine: number;
  treeLine: number;
  beachWidth: number;
  erosionStrength: number;
  grassColor: [number, number, number];
  rockColor: [number, number, number];
  snowColor: [number, number, number];
  sandColor: [number, number, number];
  oceanLevel: number;
  oceanColor: [number, number, number];
  oceanDeepColor: [number, number, number];
  waveHeight: number;
  waveFrequency: number;
  waveSpeed: number;
  oceanRoughness: number;
  oceanFresnel: number;
  foamIntensity: number;
  causticsIntensity: number;
  sssIntensity: number;
  bubbleIntensity: number;
  weatherType: number;
  weatherIntensity: number;
  windSpeed: number;
  windDirection: number;
  lightningIntensity: number;
  fogDensity: number;
  fogHeight: number;
  fogColor: [number, number, number];
  bloomIntensity: number;
  bloomThreshold: number;
  exposure: number;
  saturation: number;
  vignetteStrength: number;
  godRayIntensity: number;
  godRayDecay: number;
  godRaySteps: number;
}

interface LayerVisibility {
  sky: boolean;
  clouds: boolean;
  terrain: boolean;
  ocean: boolean;
  vegetation: boolean;
  weather: boolean;
  fog: boolean;
  godRays: boolean;
}

const DEFAULT_SETTINGS: EngineSettings = {
  timeOfDay: 2, sunAzimuth: 0.3, sunElevation: 0.4, autoTimeEnabled: false,
  dayNightCycleSpeed: 1.0, cameraHeight: 200, cameraFOV: 75, cameraSpeed: 100,
  skyZenithColor: [0.15, 0.35, 0.65], skyHorizonColor: [0.5, 0.65, 0.8],
  atmosphereDensity: 1.0, rayleighStrength: 1.0, mieStrength: 0.5, mieG: 0.8,
  moonIntensity: 0.5, starIntensity: 1.0,
  cloudCoverage: 0.5, cloudDensity: 0.05, cloudScale: 1.0, cloudDetailScale: 3.0,
  cloudSpeed: 0.5, cloudHeight: 1500, cloudThickness: 1500, cloudLightAbsorption: 0.5,
  cloudAmbient: 0.4, cloudSilverLining: 0.3, cloudPowder: 0.5, cloudSteps: 64,
  terrainScale: 1.0, terrainHeight: 500, mountainHeight: 3000, mountainSharpness: 2.0,
  snowLine: 2500, treeLine: 2000, beachWidth: 50, erosionStrength: 0.3,
  grassColor: [0.2, 0.4, 0.1], rockColor: [0.4, 0.35, 0.3],
  snowColor: [0.95, 0.95, 1.0], sandColor: [0.8, 0.7, 0.5],
  oceanLevel: 0, oceanColor: [0.0, 0.09, 0.18], oceanDeepColor: [0.0, 0.04, 0.1],
  waveHeight: 0.6, waveFrequency: 1.0, waveSpeed: 0.8, oceanRoughness: 0.3,
  oceanFresnel: 0.04, foamIntensity: 0.3, causticsIntensity: 0.3,
  sssIntensity: 0.4, bubbleIntensity: 0.15,
  weatherType: 0, weatherIntensity: 0, windSpeed: 0.5, windDirection: 0,
  lightningIntensity: 0.8,
  fogDensity: 0.3, fogHeight: 500, fogColor: [0.5, 0.55, 0.6],
  bloomIntensity: 0.15, bloomThreshold: 0.8, exposure: 1.0, saturation: 1.1,
  vignetteStrength: 0.2, godRayIntensity: 0.3, godRayDecay: 0.96, godRaySteps: 16,
};

const DEFAULT_LAYERS: LayerVisibility = {
  sky: true, clouds: false, terrain: false, ocean: false,
  vegetation: false, weather: false, fog: false, godRays: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3">
    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
    {children}
  </div>
);

const SliderSetting: React.FC<{
  label: string; value: number; min: number; max: number; step: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}> = React.memo(({ label, value, min, max, step, format, onChange }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <Label className="text-xs">{label}</Label>
      <span className="text-xs text-muted-foreground font-mono">{format ? format(value) : value.toFixed(2)}</span>
    </div>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="w-full" />
  </div>
));

const LayerToggle: React.FC<{
  label: string; icon: React.ReactNode; enabled: boolean; onChange: (enabled: boolean) => void;
}> = ({ label, icon, enabled, onChange }) => (
  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
    <div className="flex items-center gap-2">{icon}<span className="text-sm">{label}</span></div>
    <Switch checked={enabled} onCheckedChange={onChange} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// WEBGPU HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function padTo256(size: number): number { return Math.ceil(size / 256) * 256; }

function buildFrameBuffer(time: number, frameNum: number, w: number, h: number): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32)); const f = new Float32Array(buf); const u = new Uint32Array(buf);
  f[0] = time; u[1] = frameNum; f[2] = w; f[3] = h; return buf;
}
function buildCameraBuffer(pos: [number, number, number], fov: number, yaw: number, pitch: number): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32)); const f = new Float32Array(buf);
  f[0] = pos[0]; f[1] = pos[1]; f[2] = pos[2]; f[3] = fov; f[4] = yaw; f[5] = pitch; return buf;
}
function buildSunBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(48)); const f = new Float32Array(buf); const u = new Uint32Array(buf);
  f[0] = s.sunAzimuth * Math.PI * 2; f[1] = s.sunElevation * Math.PI * 0.5; f[2] = 2.0; f[3] = s.moonIntensity;
  f[4] = 1.0; f[5] = 0.95; f[6] = 0.8; f[7] = s.starIntensity; u[8] = s.autoTimeEnabled ? 1 : 0; f[9] = s.dayNightCycleSpeed; return buf;
}
function buildAtmosphereBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(48)); const f = new Float32Array(buf);
  f[0] = s.skyZenithColor[0]; f[1] = s.skyZenithColor[1]; f[2] = s.skyZenithColor[2]; f[3] = s.atmosphereDensity;
  f[4] = s.skyHorizonColor[0]; f[5] = s.skyHorizonColor[1]; f[6] = s.skyHorizonColor[2]; f[7] = s.rayleighStrength;
  f[8] = s.mieStrength; f[9] = s.mieG; return buf;
}
function buildCloudBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(48)); const f = new Float32Array(buf); const u = new Uint32Array(buf);
  f[0] = s.cloudCoverage; f[1] = s.cloudDensity; f[2] = s.cloudScale; f[3] = s.cloudDetailScale;
  f[4] = s.cloudSpeed; f[5] = s.cloudHeight; f[6] = s.cloudThickness; f[7] = s.cloudLightAbsorption;
  f[8] = s.cloudAmbient; f[9] = s.cloudSilverLining; f[10] = s.cloudPowder; u[11] = s.cloudSteps; return buf;
}
function buildTerrainBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(128)); const f = new Float32Array(buf);
  f[0] = s.terrainScale; f[1] = s.terrainHeight; f[2] = s.mountainHeight; f[3] = s.mountainSharpness;
  f[4] = s.snowLine; f[5] = s.treeLine; f[6] = s.beachWidth; f[7] = s.erosionStrength;
  f[8] = s.grassColor[0]; f[9] = s.grassColor[1]; f[10] = s.grassColor[2];
  f[12] = s.rockColor[0]; f[13] = s.rockColor[1]; f[14] = s.rockColor[2];
  f[16] = s.snowColor[0]; f[17] = s.snowColor[1]; f[18] = s.snowColor[2];
  f[20] = s.sandColor[0]; f[21] = s.sandColor[1]; f[22] = s.sandColor[2]; return buf;
}
function buildOceanBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(96)); const f = new Float32Array(buf);
  f[0] = s.oceanLevel; f[1] = s.waveHeight; f[2] = s.waveFrequency; f[3] = s.waveSpeed;
  f[4] = s.oceanRoughness; f[5] = s.oceanFresnel; f[6] = s.foamIntensity; f[7] = s.causticsIntensity;
  f[8] = s.sssIntensity; f[9] = s.bubbleIntensity;
  f[12] = s.oceanColor[0]; f[13] = s.oceanColor[1]; f[14] = s.oceanColor[2];
  f[16] = s.oceanDeepColor[0]; f[17] = s.oceanDeepColor[1]; f[18] = s.oceanDeepColor[2]; return buf;
}
function buildWeatherBuffer(s: EngineSettings, lt: number): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32)); const f = new Float32Array(buf); const u = new Uint32Array(buf);
  u[0] = s.weatherType; f[1] = s.weatherIntensity; f[2] = s.windSpeed; f[3] = s.windDirection;
  f[4] = s.lightningIntensity; f[5] = lt; return buf;
}
function buildFogBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32)); const f = new Float32Array(buf);
  f[0] = s.fogDensity; f[1] = s.fogHeight; f[4] = s.fogColor[0]; f[5] = s.fogColor[1]; f[6] = s.fogColor[2]; return buf;
}
function buildPostBuffer(s: EngineSettings): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32)); const f = new Float32Array(buf); const u = new Uint32Array(buf);
  f[0] = s.bloomIntensity; f[1] = s.bloomThreshold; f[2] = s.exposure; f[3] = s.saturation;
  f[4] = s.vignetteStrength; f[5] = s.godRayIntensity; f[6] = s.godRayDecay; u[7] = s.godRaySteps; return buf;
}
function buildLayerBuffer(l: LayerVisibility): ArrayBuffer {
  const buf = new ArrayBuffer(padTo256(32)); const u = new Uint32Array(buf);
  u[0] = l.sky ? 1 : 0; u[1] = l.clouds ? 1 : 0; u[2] = l.terrain ? 1 : 0; u[3] = l.ocean ? 1 : 0;
  u[4] = l.vegetation ? 1 : 0; u[5] = l.weather ? 1 : 0; u[6] = l.fog ? 1 : 0; u[7] = l.godRays ? 1 : 0; return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBGL2 HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function createGLShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createGLProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | null {
  const vert = createGLShader(gl, gl.VERTEX_SHADER, vs);
  const frag = createGLShader(gl, gl.FRAGMENT_SHADER, fs);
  if (!vert || !frag) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

function generate3DNoiseTexture(gl: WebGL2RenderingContext, size: number): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_3D, tex);
  // Generate noise data on CPU
  const data = new Uint8Array(size * size * size * 4);
  function hash33(x: number, y: number, z: number): [number, number, number] {
    const qx = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
    const qy = Math.sin(x * 269.5 + y * 183.3 + z * 246.1) * 43758.5453123;
    const qz = Math.sin(x * 113.5 + y * 271.9 + z * 124.6) * 43758.5453123;
    return [qx - Math.floor(qx), qy - Math.floor(qy), qz - Math.floor(qz)];
  }
  function simpleNoise(px: number, py: number, pz: number): number {
    const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
    const fx = px - ix, fy = py - iy, fz = pz - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    let r = 0;
    for (let di = 0; di <= 1; di++) for (let dj = 0; dj <= 1; dj++) for (let dk = 0; dk <= 1; dk++) {
      const [hx, hy, hz] = hash33(ix + di, iy + dj, iz + dk);
      const gx = hx * 2 - 1, gy = hy * 2 - 1, gz = hz * 2 - 1;
      const dx = fx - di, dy = fy - dj, dz = fz - dk;
      const d = gx * dx + gy * dy + gz * dz;
      const wx = di === 0 ? 1 - ux : ux;
      const wy = dj === 0 ? 1 - uy : uy;
      const wz = dk === 0 ? 1 - uz : uz;
      r += d * wx * wy * wz;
    }
    return r;
  }
  function fbmCPU(x: number, y: number, z: number, oct: number): number {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * simpleNoise(x * f, y * f, z * f); f *= 2; a *= 0.5; }
    return v;
  }
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const idx = (z * size * size + y * size + x) * 4;
    const px = x / size * 8, py = y / size * 8, pz = z / size * 8;
    data[idx + 0] = Math.floor((fbmCPU(px, py, pz, 6) * 0.5 + 0.5) * 255);
    data[idx + 1] = Math.floor(Math.max(0, Math.min(1, 1 - Math.sqrt(simpleWorley(px * 2, py * 2, pz * 2)))) * 255);
    data[idx + 2] = Math.floor((1 - Math.abs(simpleNoise(px * 1.5, py * 1.5, pz * 1.5))) * 255);
    data[idx + 3] = Math.floor(Math.max(0, Math.min(1, 1 - Math.sqrt(simpleWorley(px * 4, py * 4, pz * 4)))) * 255);
  }
  function simpleWorley(px: number, py: number, pz: number): number {
    const n = [Math.floor(px), Math.floor(py), Math.floor(pz)];
    const f = [px - n[0], py - n[1], pz - n[2]];
    let d = 1;
    for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const [ox, oy, oz] = hash33(n[0] + i, n[1] + j, n[2] + k);
      const rx = i + ox - f[0], ry = j + oy - f[1], rz = k + oz - f[2];
      d = Math.min(d, rx * rx + ry * ry + rz * rz);
    }
    return d;
  }
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, size, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
  return tex;
}

interface GL2Uniforms { [key: string]: WebGLUniformLocation | null }

function getGL2Uniforms(gl: WebGL2RenderingContext, prog: WebGLProgram): GL2Uniforms {
  const names = [
    'u_time', 'u_resolution', 'u_camPos', 'u_fov', 'u_yaw', 'u_pitch',
    'u_sunAzimuth', 'u_sunElevation', 'u_sunIntensity', 'u_moonIntensity', 'u_sunColor', 'u_starIntensity',
    'u_autoTime', 'u_cycleSpeed',
    'u_zenithColor', 'u_horizonColor', 'u_rayleighStrength', 'u_mieStrength', 'u_mieG',
    'u_cloudCoverage', 'u_cloudDensity', 'u_cloudScale', 'u_cloudDetailScale', 'u_cloudSpeed',
    'u_cloudHeight', 'u_cloudThickness', 'u_cloudLightAbsorption', 'u_cloudAmbient', 'u_cloudSilverLining',
    'u_cloudPowder', 'u_cloudSteps',
    'u_terrainScale', 'u_terrainHeight', 'u_mountainHeight', 'u_mountainSharpness',
    'u_snowLine', 'u_treeLine', 'u_beachWidth', 'u_erosionStrength',
    'u_grassColor', 'u_rockColor', 'u_snowColor', 'u_sandColor',
    'u_oceanLevel', 'u_oceanColor', 'u_oceanDeepColor',
    'u_waveHeight', 'u_waveFrequency', 'u_waveSpeed', 'u_oceanRoughness',
    'u_foamIntensity', 'u_causticsIntensity', 'u_sssIntensity',
    'u_weatherType', 'u_weatherIntensity', 'u_windSpeed', 'u_windDirection',
    'u_lightningIntensity', 'u_lightningTime',
    'u_fogDensity', 'u_fogHeight', 'u_fogColor',
    'u_bloomIntensity', 'u_exposure', 'u_saturation', 'u_vignetteStrength',
    'u_godRayIntensity', 'u_godRayDecay', 'u_godRaySteps',
    'u_layerSky', 'u_layerClouds', 'u_layerTerrain', 'u_layerOcean',
    'u_layerWeather', 'u_layerFog', 'u_layerGodRays',
    'u_noiseTex',
  ];
  const u: GL2Uniforms = {};
  for (const n of names) u[n] = gl.getUniformLocation(prog, n);
  return u;
}

function setGL2Uniforms(gl: WebGL2RenderingContext, u: GL2Uniforms, s: EngineSettings, l: LayerVisibility,
  cam: { pos: [number, number, number]; yaw: number; pitch: number }, time: number, lightningTime: number, w: number, h: number) {
  gl.uniform1f(u.u_time, time);
  gl.uniform2f(u.u_resolution, w, h);
  gl.uniform3f(u.u_camPos, cam.pos[0], cam.pos[1], cam.pos[2]);
  gl.uniform1f(u.u_fov, s.cameraFOV);
  gl.uniform1f(u.u_yaw, cam.yaw);
  gl.uniform1f(u.u_pitch, cam.pitch);
  gl.uniform1f(u.u_sunAzimuth, s.sunAzimuth * Math.PI * 2);
  gl.uniform1f(u.u_sunElevation, s.sunElevation * Math.PI * 0.5);
  gl.uniform1f(u.u_sunIntensity, 2.0);
  gl.uniform1f(u.u_moonIntensity, s.moonIntensity);
  gl.uniform3f(u.u_sunColor, 1.0, 0.95, 0.8);
  gl.uniform1f(u.u_starIntensity, s.starIntensity);
  gl.uniform1i(u.u_autoTime, s.autoTimeEnabled ? 1 : 0);
  gl.uniform1f(u.u_cycleSpeed, s.dayNightCycleSpeed);
  gl.uniform3f(u.u_zenithColor, ...s.skyZenithColor);
  gl.uniform3f(u.u_horizonColor, ...s.skyHorizonColor);
  gl.uniform1f(u.u_rayleighStrength, s.rayleighStrength);
  gl.uniform1f(u.u_mieStrength, s.mieStrength);
  gl.uniform1f(u.u_mieG, s.mieG);
  gl.uniform1f(u.u_cloudCoverage, s.cloudCoverage);
  gl.uniform1f(u.u_cloudDensity, s.cloudDensity);
  gl.uniform1f(u.u_cloudScale, s.cloudScale);
  gl.uniform1f(u.u_cloudDetailScale, s.cloudDetailScale);
  gl.uniform1f(u.u_cloudSpeed, s.cloudSpeed);
  gl.uniform1f(u.u_cloudHeight, s.cloudHeight);
  gl.uniform1f(u.u_cloudThickness, s.cloudThickness);
  gl.uniform1f(u.u_cloudLightAbsorption, s.cloudLightAbsorption);
  gl.uniform1f(u.u_cloudAmbient, s.cloudAmbient);
  gl.uniform1f(u.u_cloudSilverLining, s.cloudSilverLining);
  gl.uniform1f(u.u_cloudPowder, s.cloudPowder);
  gl.uniform1i(u.u_cloudSteps, s.cloudSteps);
  gl.uniform1f(u.u_terrainScale, s.terrainScale);
  gl.uniform1f(u.u_terrainHeight, s.terrainHeight);
  gl.uniform1f(u.u_mountainHeight, s.mountainHeight);
  gl.uniform1f(u.u_mountainSharpness, s.mountainSharpness);
  gl.uniform1f(u.u_snowLine, s.snowLine);
  gl.uniform1f(u.u_treeLine, s.treeLine);
  gl.uniform1f(u.u_beachWidth, s.beachWidth);
  gl.uniform1f(u.u_erosionStrength, s.erosionStrength);
  gl.uniform3f(u.u_grassColor, ...s.grassColor);
  gl.uniform3f(u.u_rockColor, ...s.rockColor);
  gl.uniform3f(u.u_snowColor, ...s.snowColor);
  gl.uniform3f(u.u_sandColor, ...s.sandColor);
  gl.uniform1f(u.u_oceanLevel, s.oceanLevel);
  gl.uniform3f(u.u_oceanColor, ...s.oceanColor);
  gl.uniform3f(u.u_oceanDeepColor, ...s.oceanDeepColor);
  gl.uniform1f(u.u_waveHeight, s.waveHeight);
  gl.uniform1f(u.u_waveFrequency, s.waveFrequency);
  gl.uniform1f(u.u_waveSpeed, s.waveSpeed);
  gl.uniform1f(u.u_oceanRoughness, s.oceanRoughness);
  gl.uniform1f(u.u_foamIntensity, s.foamIntensity);
  gl.uniform1f(u.u_causticsIntensity, s.causticsIntensity);
  gl.uniform1f(u.u_sssIntensity, s.sssIntensity);
  gl.uniform1i(u.u_weatherType, s.weatherType);
  gl.uniform1f(u.u_weatherIntensity, s.weatherIntensity);
  gl.uniform1f(u.u_windSpeed, s.windSpeed);
  gl.uniform1f(u.u_windDirection, s.windDirection);
  gl.uniform1f(u.u_lightningIntensity, s.lightningIntensity);
  gl.uniform1f(u.u_lightningTime, lightningTime);
  gl.uniform1f(u.u_fogDensity, s.fogDensity);
  gl.uniform1f(u.u_fogHeight, s.fogHeight);
  gl.uniform3f(u.u_fogColor, ...s.fogColor);
  gl.uniform1f(u.u_bloomIntensity, s.bloomIntensity);
  gl.uniform1f(u.u_exposure, s.exposure);
  gl.uniform1f(u.u_saturation, s.saturation);
  gl.uniform1f(u.u_vignetteStrength, s.vignetteStrength);
  gl.uniform1f(u.u_godRayIntensity, s.godRayIntensity);
  gl.uniform1f(u.u_godRayDecay, s.godRayDecay);
  gl.uniform1i(u.u_godRaySteps, s.godRaySteps);
  gl.uniform1i(u.u_layerSky, l.sky ? 1 : 0);
  gl.uniform1i(u.u_layerClouds, l.clouds ? 1 : 0);
  gl.uniform1i(u.u_layerTerrain, l.terrain ? 1 : 0);
  gl.uniform1i(u.u_layerOcean, l.ocean ? 1 : 0);
  gl.uniform1i(u.u_layerWeather, l.weather ? 1 : 0);
  gl.uniform1i(u.u_layerFog, l.fog ? 1 : 0);
  gl.uniform1i(u.u_layerGodRays, l.godRays ? 1 : 0);
}



// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
type RendererBackend = 'webgpu' | 'webgl2';

const ProceduralEarthGPU: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const lightningTimeRef = useRef(0);
  const startTimeRef = useRef(0);
  const backendRef = useRef<RendererBackend>('webgl2');
  

  // WebGPU state
  const gpuRef = useRef<{
    device: GPUDevice; context: GPUCanvasContext; pipeline: GPURenderPipeline;
    uniformBuffers: GPUBuffer[]; bindGroup0: GPUBindGroup; bindGroup1: GPUBindGroup;
    noiseTexture: GPUTexture; format: GPUTextureFormat;
    lastConfiguredWidth: number; lastConfiguredHeight: number;
  } | null>(null);

  // WebGL2 state
  const gl2Ref = useRef<{
    gl: WebGL2RenderingContext; program: WebGLProgram; uniforms: GL2Uniforms;
    vao: WebGLVertexArrayObject; noiseTex: WebGLTexture;
  } | null>(null);

  const cameraRef = useRef({ pos: [0, 200, 0] as [number, number, number], yaw: 0, pitch: 0, velocity: [0, 0, 0] as [number, number, number] });
  const keysRef = useRef<Set<string>>(new Set());

  const [showSettings, setShowSettings] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [activeTab, setActiveTab] = useState('atmosphere');
  const [gpuError, setGpuError] = useState<string | null>(null);
  const [gpuReady, setGpuReady] = useState(false);
  const [rendererType, setRendererType] = useState<RendererBackend>('webgl2');

  const settingsRef = useRef(settings);
  const layersRef = useRef(layers);
  const isPausedRef = useRef(isPaused);
  settingsRef.current = settings;
  layersRef.current = layers;
  isPausedRef.current = isPaused;

  const updateSetting = useCallback(<K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);
  const updateLayer = useCallback(<K extends keyof LayerVisibility>(key: K, value: boolean) => {
    setLayers(prev => ({ ...prev, [key]: value }));
  }, []);
  const enableAllLayers = useCallback(() => {
    setLayers({ sky: true, clouds: true, terrain: true, ocean: true, vegetation: true, weather: true, fog: true, godRays: true });
  }, []);
  const skyOnlyLayers = useCallback(() => { setLayers(DEFAULT_LAYERS); }, []);

  // Initialize renderer — try WebGPU first, fallback to WebGL2
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // CRITICAL: Set canvas pixel dimensions before requesting any context.
    // Without explicit width/height, getContext('webgl2') returns null in many environments.
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    console.log(`[Init] Canvas size: ${canvas.width}x${canvas.height} (DPR ${dpr})`);

    const initWebGPU = async (): Promise<boolean> => {
      try {
        if (!navigator.gpu) return false;
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (!adapter) return false;
        // Test WebGPU on a throwaway canvas first to avoid contaminating the React canvas
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1; testCanvas.height = 1;
        const testCtx = testCanvas.getContext('webgpu');
        if (!testCtx) return false;
        // WebGPU works — now use the real canvas
        const device = await adapter.requestDevice({ requiredLimits: { maxStorageTexturesPerShaderStage: 1 } });
        const context = canvas.getContext('webgpu') as GPUCanvasContext | null;
        if (!context) return false;
        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: 'premultiplied' });

        const noiseSize = 128;
        const noiseTexture = device.createTexture({ size: [noiseSize, noiseSize, noiseSize], dimension: '3d', format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING });
        const computeModule = device.createShaderModule({ code: NOISE_COMPUTE_WGSL });
        const computePipeline = device.createComputePipeline({ layout: 'auto', compute: { module: computeModule, entryPoint: 'main' } });
        const computeBG = device.createBindGroup({ layout: computePipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: noiseTexture.createView() }] });
        const enc = device.createCommandEncoder(); const pass = enc.beginComputePass();
        pass.setPipeline(computePipeline); pass.setBindGroup(0, computeBG);
        pass.dispatchWorkgroups(noiseSize / 4, noiseSize / 4, noiseSize / 4); pass.end();
        device.queue.submit([enc.finish()]);

        const renderModule = device.createShaderModule({ code: RENDER_WGSL });
        const compilationInfo = await renderModule.getCompilationInfo();
        const errors = compilationInfo.messages.filter(m => m.type === 'error');
        if (errors.length > 0) { console.error('WGSL errors:', errors); return false; }

        const bufferSizes = [32, 32, 48, 48, 48, 128, 96, 32, 32, 32, 32];
        const uniformBuffers = bufferSizes.map(size => device.createBuffer({ size: padTo256(size), usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
        const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', addressModeU: 'repeat', addressModeV: 'repeat', addressModeW: 'repeat' });
        const bgl0 = device.createBindGroupLayout({ entries: Array.from({ length: 11 }, (_, i) => ({ binding: i, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as const } })) });
        const bgl1 = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '3d' } }, { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } }] });
        const pipeline = device.createRenderPipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [bgl0, bgl1] }), vertex: { module: renderModule, entryPoint: 'vs_main' }, fragment: { module: renderModule, entryPoint: 'fs_main', targets: [{ format }] }, primitive: { topology: 'triangle-list' } });
        const bindGroup0 = device.createBindGroup({ layout: bgl0, entries: uniformBuffers.map((buffer, i) => ({ binding: i, resource: { buffer } })) });
        const bindGroup1 = device.createBindGroup({ layout: bgl1, entries: [{ binding: 0, resource: noiseTexture.createView({ dimension: '3d' }) }, { binding: 1, resource: sampler }] });

        gpuRef.current = { device, context, pipeline, uniformBuffers, bindGroup0, bindGroup1, noiseTexture, format, lastConfiguredWidth: canvas.width, lastConfiguredHeight: canvas.height };
        backendRef.current = 'webgpu';
        return true;
      } catch (e) { console.warn('WebGPU init failed:', e); return false; }
    };

    const initWebGL2 = (): boolean => {
      console.log('[WebGL2] Requesting context...');
      console.log(`[WebGL2] Canvas dimensions: ${canvas.width}x${canvas.height}, clientSize: ${canvas.clientWidth}x${canvas.clientHeight}`);
      // Try with permissive options first, then strict
      const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, failIfMajorPerformanceCaveat: false, desynchronized: true, powerPreference: 'default' })
                || canvas.getContext('webgl2', { antialias: false, alpha: false })
                || canvas.getContext('webgl2');
      if (!gl) { console.error('[WebGL2] getContext returned null — WebGL2 not supported in this environment'); return false; }
      console.log('[WebGL2] Context OK. Compiling shaders...');
      const program = createGLProgram(gl, GL_VERT, GL_FRAG);
      if (!program) { console.error('[WebGL2] Shader compilation/linking failed'); return false; }
      console.log('[WebGL2] Shaders OK. Setting up...');
      gl.useProgram(program);
      const uniforms = getGL2Uniforms(gl, program);
      const vao = gl.createVertexArray();
      if (!vao) { console.error('[WebGL2] VAO creation failed'); return false; }
      gl.bindVertexArray(vao);
      console.log('[WebGL2] Generating 3D noise texture (64³)...');
      const noiseTex = generate3DNoiseTexture(gl, 64);
      if (!noiseTex) { console.error('[WebGL2] Noise texture failed'); return false; }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, noiseTex);
      gl.uniform1i(uniforms.u_noiseTex, 0);
      gl2Ref.current = { gl, program, uniforms, vao, noiseTex };
      backendRef.current = 'webgl2';
      return true;
    };

    const init = async () => {
      // First check if WebGPU is available WITHOUT touching the React canvas
      let useWebGPU = false;
      try {
        if (navigator.gpu) {
          const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
          if (adapter) {
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 1; testCanvas.height = 1;
            const testCtx = testCanvas.getContext('webgpu');
            useWebGPU = !!testCtx;
          }
        }
      } catch { useWebGPU = false; }

      if (useWebGPU) {
        const ok = await initWebGPU();
        if (ok) {
          console.log('✓ Using WebGPU backend');
          // Listen for device loss
          if (gpuRef.current) {
            gpuRef.current.device.lost.then((info) => {
              console.error(`[WebGPU] Device lost: ${info.reason} — ${info.message}`);
              setGpuError(`WebGPU device lost: ${info.reason}. Reload to retry.`);
            });
          }
          setRendererType('webgpu');
        } else {
          // WebGPU context may have contaminated the canvas, try WebGL2 anyway
          console.warn('WebGPU full init failed, attempting WebGL2 fallback...');
          const gl2ok = initWebGL2();
          if (gl2ok) {
            console.log('✓ Using WebGL2 backend (after WebGPU failure)');
            setRendererType('webgl2');
          } else {
            setGpuError('Rendering failed. WebGPU pipeline failed and WebGL2 shader compilation also failed. Try Chrome or Edge.');
            return;
          }
        }
      } else {
        console.log('WebGPU unavailable, trying WebGL2...');
        const ok = initWebGL2();
        if (ok) {
          console.log('✓ Using WebGL2 backend');
          setRendererType('webgl2');
        } else {
          setGpuError('WebGL2 shader compilation failed. Try Chrome or Edge for full WebGPU support.');
          return;
        }
      }
      startTimeRef.current = performance.now() / 1000;
      setGpuReady(true);
    };

    init();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (gpuRef.current) { gpuRef.current.noiseTexture.destroy(); gpuRef.current.uniformBuffers.forEach(b => b.destroy()); }
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!gpuReady || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let lastTime = performance.now() / 1000;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const now = performance.now() / 1000;
      const deltaTime = now - lastTime;
      lastTime = now;
      if (isPausedRef.current) return;

      const s = settingsRef.current;
      const l = layersRef.current;
      const cam = cameraRef.current;
      frameRef.current++;
      const time = now - startTimeRef.current;

      // Camera movement
      const keys = keysRef.current;
      const speed = s.cameraSpeed * deltaTime;
      const fwd = [Math.cos(cam.pitch) * Math.sin(cam.yaw), Math.sin(cam.pitch), Math.cos(cam.pitch) * Math.cos(cam.yaw)];
      const right = [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)];
      let mx = 0, my = 0, mz = 0;
      if (keys.has('w')) { mx += fwd[0]; my += fwd[1]; mz += fwd[2]; }
      if (keys.has('s')) { mx -= fwd[0]; my -= fwd[1]; mz -= fwd[2]; }
      if (keys.has('a')) { mx -= right[0]; mz -= right[2]; }
      if (keys.has('d')) { mx += right[0]; mz += right[2]; }
      if (keys.has(' ')) { my += 1; }
      if (keys.has('shift')) { my -= 1; }
      const len = Math.sqrt(mx * mx + my * my + mz * mz);
      if (len > 0) {
        mx /= len; my /= len; mz /= len;
        cam.velocity[0] += (mx * speed * 10 - cam.velocity[0]) * 0.1;
        cam.velocity[1] += (my * speed * 10 - cam.velocity[1]) * 0.1;
        cam.velocity[2] += (mz * speed * 10 - cam.velocity[2]) * 0.1;
      } else { cam.velocity[0] *= 0.9; cam.velocity[1] *= 0.9; cam.velocity[2] *= 0.9; }
      cam.pos[0] += cam.velocity[0] * deltaTime;
      cam.pos[1] += cam.velocity[1] * deltaTime;
      cam.pos[2] += cam.velocity[2] * deltaTime;

      if (s.weatherType === 3 && Math.random() < 0.002) lightningTimeRef.current = time;

      // Resize canvas
      const dpr = Math.min(devicePixelRatio, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

      // ─ WebGPU render ─
      if (backendRef.current === 'webgpu' && gpuRef.current) {
        const gpu = gpuRef.current;
        const { device, context, pipeline, uniformBuffers, bindGroup0, bindGroup1 } = gpu;

        // CRITICAL: Reconfigure context when canvas size changes
        if (w !== gpu.lastConfiguredWidth || h !== gpu.lastConfiguredHeight) {
          try {
            context.configure({ device, format: gpu.format, alphaMode: 'premultiplied' });
            gpu.lastConfiguredWidth = w;
            gpu.lastConfiguredHeight = h;
            console.log(`[WebGPU] Reconfigured context: ${w}x${h}`);
          } catch (e) { console.error('[WebGPU] Reconfigure failed:', e); return; }
        }

        try {
          device.queue.writeBuffer(uniformBuffers[0], 0, buildFrameBuffer(time, frameRef.current, w, h));
          device.queue.writeBuffer(uniformBuffers[1], 0, buildCameraBuffer(cam.pos, s.cameraFOV, cam.yaw, cam.pitch));
          device.queue.writeBuffer(uniformBuffers[2], 0, buildSunBuffer(s));
          device.queue.writeBuffer(uniformBuffers[3], 0, buildAtmosphereBuffer(s));
          device.queue.writeBuffer(uniformBuffers[4], 0, buildCloudBuffer(s));
          device.queue.writeBuffer(uniformBuffers[5], 0, buildTerrainBuffer(s));
          device.queue.writeBuffer(uniformBuffers[6], 0, buildOceanBuffer(s));
          device.queue.writeBuffer(uniformBuffers[7], 0, buildWeatherBuffer(s, lightningTimeRef.current));
          device.queue.writeBuffer(uniformBuffers[8], 0, buildFogBuffer(s));
          device.queue.writeBuffer(uniformBuffers[9], 0, buildPostBuffer(s));
          device.queue.writeBuffer(uniformBuffers[10], 0, buildLayerBuffer(l));
          const texture = context.getCurrentTexture();
          const encoder = device.createCommandEncoder();
          const rp = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
          rp.setPipeline(pipeline); rp.setBindGroup(0, bindGroup0); rp.setBindGroup(1, bindGroup1); rp.draw(3); rp.end();
          device.queue.submit([encoder.finish()]);
        } catch (e) {
          console.error('[WebGPU] Render error:', e);
        }
      }

      // ─ WebGL2 render ─
      if (backendRef.current === 'webgl2' && gl2Ref.current) {
        const { gl, program, uniforms, vao, noiseTex } = gl2Ref.current;
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, noiseTex);
        setGL2Uniforms(gl, uniforms, s, l, cam, time, lightningTimeRef.current, w, h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

    };

    animate();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [gpuReady]);

  // Input handlers — re-bind when gpuReady (canvas may have been replaced)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gpuReady) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        cameraRef.current.yaw += e.movementX * 0.002;
        cameraRef.current.pitch -= e.movementY * 0.002;
        cameraRef.current.pitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, cameraRef.current.pitch));
      }
    };
    const handleClick = () => { canvas.requestPointerLock(); };
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current.add(e.key.toLowerCase()); };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); };
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gpuReady]);

  const setTimePreset = (preset: 'night' | 'sunrise' | 'day' | 'sunset') => {
    switch (preset) {
      case 'night': setSettings(prev => ({ ...prev, timeOfDay: 0, sunElevation: -0.2, starIntensity: 1.0, skyZenithColor: [0.02, 0.03, 0.08], skyHorizonColor: [0.05, 0.05, 0.1] })); break;
      case 'sunrise': setSettings(prev => ({ ...prev, timeOfDay: 1, sunElevation: 0.08, sunAzimuth: 0.25, starIntensity: 0.2, skyZenithColor: [0.15, 0.25, 0.5], skyHorizonColor: [0.9, 0.5, 0.3] })); break;
      case 'day': setSettings(prev => ({ ...prev, timeOfDay: 2, sunElevation: 0.4, starIntensity: 0, skyZenithColor: [0.15, 0.35, 0.65], skyHorizonColor: [0.5, 0.65, 0.8] })); break;
      case 'sunset': setSettings(prev => ({ ...prev, timeOfDay: 3, sunElevation: 0.08, sunAzimuth: 0.75, starIntensity: 0.3, skyZenithColor: [0.2, 0.25, 0.45], skyHorizonColor: [0.95, 0.4, 0.2] })); break;
    }
  };

  const setWeatherPreset = (w: 'clear' | 'rain' | 'snow' | 'storm') => {
    switch (w) {
      case 'clear': setSettings(prev => ({ ...prev, weatherType: 0, weatherIntensity: 0 })); break;
      case 'rain': setSettings(prev => ({ ...prev, weatherType: 1, weatherIntensity: 0.7, cloudCoverage: 0.8 })); break;
      case 'snow': setSettings(prev => ({ ...prev, weatherType: 2, weatherIntensity: 0.6, cloudCoverage: 0.7 })); break;
      case 'storm': setSettings(prev => ({ ...prev, weatherType: 3, weatherIntensity: 1.0, cloudCoverage: 0.95, windSpeed: 1.5 })); break;
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS); setLayers(DEFAULT_LAYERS);
    cameraRef.current = { pos: [0, 200, 0], yaw: 0, pitch: 0, velocity: [0, 0, 0] };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };

  if (gpuError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-lg text-center space-y-6">
          <Sparkles className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-3xl font-bold text-white">Renderer Error</h1>
          <p className="text-slate-300">{gpuError}</p>
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <AnimatedLogo />

      {/* Header */}
      <div className="absolute top-5 left-20 panel-glow backdrop-blur-xl rounded-xl p-4">
        <h1 className="text-xl font-bold text-primary text-glow">Procedural Earth V5</h1>
        <p className="text-xs text-muted-foreground">
          {rendererType === 'webgpu' ? 'WebGPU • Compute Noise • WGSL' : 'WebGL2 • CPU Noise • GLSL'}
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-5 left-5 panel-glow backdrop-blur-xl rounded-xl p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Click</kbd> to enable flight</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">WASD</kbd> Move</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Space/Shift</kbd> Up/Down</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-primary">Mouse</kbd> Look</span>
        </div>
      </div>

      {/* Time presets */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-2">
        {(['night', 'sunrise', 'day', 'sunset'] as const).map((preset) => (
          <Button key={preset} size="sm"
            variant={(preset === 'night' && settings.timeOfDay === 0) || (preset === 'sunrise' && settings.timeOfDay === 1) || (preset === 'day' && settings.timeOfDay === 2) || (preset === 'sunset' && settings.timeOfDay === 3) ? 'default' : 'outline'}
            onClick={() => setTimePreset(preset)} className="panel-glow backdrop-blur-sm capitalize">
            {preset === 'night' ? <Moon className="w-4 h-4 mr-1" /> : <Sun className="w-4 h-4 mr-1" />}
            {preset}
          </Button>
        ))}
        <Button size="sm" variant={settings.autoTimeEnabled ? 'default' : 'outline'} onClick={() => updateSetting('autoTimeEnabled', !settings.autoTimeEnabled)} className="panel-glow backdrop-blur-sm">
          <RotateCcw className="w-4 h-4 mr-1" /> Auto
        </Button>
      </div>

      {/* Weather presets */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2">
        <Button size="sm" variant={settings.weatherType === 0 ? 'default' : 'outline'} onClick={() => setWeatherPreset('clear')} className="panel-glow backdrop-blur-sm"><Sun className="w-4 h-4 mr-1" />Clear</Button>
        <Button size="sm" variant={settings.weatherType === 1 ? 'default' : 'outline'} onClick={() => setWeatherPreset('rain')} className="panel-glow backdrop-blur-sm"><CloudRain className="w-4 h-4 mr-1" />Rain</Button>
        <Button size="sm" variant={settings.weatherType === 2 ? 'default' : 'outline'} onClick={() => setWeatherPreset('snow')} className="panel-glow backdrop-blur-sm"><CloudSnow className="w-4 h-4 mr-1" />Snow</Button>
        <Button size="sm" variant={settings.weatherType === 3 ? 'default' : 'outline'} onClick={() => setWeatherPreset('storm')} className="panel-glow backdrop-blur-sm"><Zap className="w-4 h-4 mr-1" />Storm</Button>
      </div>

      {/* Controls */}
      <div className="absolute top-5 right-5 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)} className="panel-glow backdrop-blur-sm">{isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}</Button>
        <Button variant="outline" size="icon" onClick={resetSettings} className="panel-glow backdrop-blur-sm"><RotateCcw className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" onClick={toggleFullscreen} className="panel-glow backdrop-blur-sm"><Maximize2 className="w-4 h-4" /></Button>
        <Button variant={showLayers ? 'default' : 'outline'} size="icon" onClick={() => setShowLayers(!showLayers)} className="panel-glow backdrop-blur-sm"><Layers className="w-4 h-4" /></Button>
        <Button variant={showSettings ? 'default' : 'outline'} size="icon" onClick={() => setShowSettings(!showSettings)} className="panel-glow backdrop-blur-sm"><Settings className="w-4 h-4" /></Button>
      </div>

      {/* Layer Panel */}
      {showLayers && (
        <div className="absolute top-20 right-5 w-64 panel-glow backdrop-blur-xl rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-primary">Layer Visibility</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowLayers(false)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2 mb-4">
            <LayerToggle label="Sky" icon={<Sun className="w-4 h-4 text-primary" />} enabled={layers.sky} onChange={(v) => updateLayer('sky', v)} />
            <LayerToggle label="Clouds" icon={<Cloud className="w-4 h-4 text-primary" />} enabled={layers.clouds} onChange={(v) => updateLayer('clouds', v)} />
            <LayerToggle label="Terrain" icon={<Mountain className="w-4 h-4 text-primary" />} enabled={layers.terrain} onChange={(v) => updateLayer('terrain', v)} />
            <LayerToggle label="Ocean" icon={<Waves className="w-4 h-4 text-primary" />} enabled={layers.ocean} onChange={(v) => updateLayer('ocean', v)} />
            <LayerToggle label="Vegetation" icon={<TreePine className="w-4 h-4 text-primary" />} enabled={layers.vegetation} onChange={(v) => updateLayer('vegetation', v)} />
            <LayerToggle label="Weather" icon={<CloudRain className="w-4 h-4 text-primary" />} enabled={layers.weather} onChange={(v) => updateLayer('weather', v)} />
            <LayerToggle label="Fog" icon={<Wind className="w-4 h-4 text-primary" />} enabled={layers.fog} onChange={(v) => updateLayer('fog', v)} />
            <LayerToggle label="God Rays" icon={<Sparkles className="w-4 h-4 text-primary" />} enabled={layers.godRays} onChange={(v) => updateLayer('godRays', v)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={enableAllLayers}><Eye className="w-4 h-4 mr-1" /> All</Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={skyOnlyLayers}><EyeOff className="w-4 h-4 mr-1" /> Sky Only</Button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-20 right-5 w-80 max-h-[calc(100vh-120px)] panel-glow backdrop-blur-xl rounded-xl">
          <div className="flex justify-between items-center p-4 border-b border-border/30">
            <h3 className="text-sm font-semibold text-primary">Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5 p-1 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="atmosphere" className="text-xs px-2"><Sun className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="clouds" className="text-xs px-2"><Cloud className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="terrain" className="text-xs px-2"><Mountain className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="ocean" className="text-xs px-2"><Waves className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="effects" className="text-xs px-2"><Sparkles className="w-3 h-3" /></TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-4 space-y-4">
                <TabsContent value="atmosphere" className="mt-0 space-y-4">
                  <SettingSection title="Sun Position">
                    <SliderSetting label="Azimuth" value={settings.sunAzimuth} min={0} max={1} step={0.01} format={(v) => `${(v*360).toFixed(0)}°`} onChange={(v) => updateSetting('sunAzimuth', v)} />
                    <SliderSetting label="Elevation" value={settings.sunElevation} min={-0.3} max={1} step={0.01} format={(v) => `${(v*90).toFixed(0)}°`} onChange={(v) => updateSetting('sunElevation', v)} />
                  </SettingSection>
                  <SettingSection title="Day/Night Cycle">
                    <SliderSetting label="Cycle Speed" value={settings.dayNightCycleSpeed} min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('dayNightCycleSpeed', v)} />
                  </SettingSection>
                  <SettingSection title="Atmosphere">
                    <SliderSetting label="Rayleigh" value={settings.rayleighStrength} min={0} max={3} step={0.05} onChange={(v) => updateSetting('rayleighStrength', v)} />
                    <SliderSetting label="Mie" value={settings.mieStrength} min={0} max={2} step={0.05} onChange={(v) => updateSetting('mieStrength', v)} />
                    <SliderSetting label="Mie G" value={settings.mieG} min={0.5} max={0.99} step={0.01} onChange={(v) => updateSetting('mieG', v)} />
                  </SettingSection>
                  <SettingSection title="Camera">
                    <SliderSetting label="FOV" value={settings.cameraFOV} min={30} max={120} step={1} format={(v) => `${v}°`} onChange={(v) => updateSetting('cameraFOV', v)} />
                    <SliderSetting label="Speed" value={settings.cameraSpeed} min={10} max={500} step={10} onChange={(v) => updateSetting('cameraSpeed', v)} />
                  </SettingSection>
                </TabsContent>
                <TabsContent value="clouds" className="mt-0 space-y-4">
                  <SettingSection title="Shape">
                    <SliderSetting label="Coverage" value={settings.cloudCoverage} min={0} max={1} step={0.01} format={(v) => `${(v*100).toFixed(0)}%`} onChange={(v) => updateSetting('cloudCoverage', v)} />
                    <SliderSetting label="Density" value={settings.cloudDensity} min={0.01} max={0.2} step={0.005} onChange={(v) => updateSetting('cloudDensity', v)} />
                    <SliderSetting label="Scale" value={settings.cloudScale} min={0.2} max={3} step={0.1} onChange={(v) => updateSetting('cloudScale', v)} />
                  </SettingSection>
                  <SettingSection title="Motion">
                    <SliderSetting label="Speed" value={settings.cloudSpeed} min={0} max={5} step={0.1} onChange={(v) => updateSetting('cloudSpeed', v)} />
                    <SliderSetting label="Detail" value={settings.cloudDetailScale} min={0.5} max={10} step={0.5} onChange={(v) => updateSetting('cloudDetailScale', v)} />
                  </SettingSection>
                  <SettingSection title="Layer">
                    <SliderSetting label="Height (m)" value={settings.cloudHeight} min={500} max={5000} step={100} onChange={(v) => updateSetting('cloudHeight', v)} />
                    <SliderSetting label="Thickness (m)" value={settings.cloudThickness} min={500} max={3000} step={100} onChange={(v) => updateSetting('cloudThickness', v)} />
                  </SettingSection>
                  <SettingSection title="Lighting">
                    <SliderSetting label="Silver Lining" value={settings.cloudSilverLining} min={0} max={1} step={0.05} onChange={(v) => updateSetting('cloudSilverLining', v)} />
                    <SliderSetting label="Powder" value={settings.cloudPowder} min={0} max={1} step={0.05} onChange={(v) => updateSetting('cloudPowder', v)} />
                  </SettingSection>
                </TabsContent>
                <TabsContent value="terrain" className="mt-0 space-y-4">
                  <SettingSection title="Shape">
                    <SliderSetting label="Scale" value={settings.terrainScale} min={0.2} max={3} step={0.1} onChange={(v) => updateSetting('terrainScale', v)} />
                    <SliderSetting label="Mountain Height" value={settings.mountainHeight} min={500} max={8000} step={100} onChange={(v) => updateSetting('mountainHeight', v)} />
                    <SliderSetting label="Erosion" value={settings.erosionStrength} min={0} max={1} step={0.05} onChange={(v) => updateSetting('erosionStrength', v)} />
                  </SettingSection>
                  <SettingSection title="Biomes">
                    <SliderSetting label="Snow Line" value={settings.snowLine} min={1000} max={5000} step={100} onChange={(v) => updateSetting('snowLine', v)} />
                    <SliderSetting label="Tree Line" value={settings.treeLine} min={500} max={4000} step={100} onChange={(v) => updateSetting('treeLine', v)} />
                  </SettingSection>
                </TabsContent>
                <TabsContent value="ocean" className="mt-0 space-y-4">
                  <SettingSection title="Surface">
                    <SliderSetting label="Sea Level" value={settings.oceanLevel} min={-500} max={500} step={10} onChange={(v) => updateSetting('oceanLevel', v)} />
                    <SliderSetting label="Wave Height" value={settings.waveHeight} min={0} max={10} step={0.1} onChange={(v) => updateSetting('waveHeight', v)} />
                    <SliderSetting label="Wave Speed" value={settings.waveSpeed} min={0} max={3} step={0.1} onChange={(v) => updateSetting('waveSpeed', v)} />
                    <SliderSetting label="Roughness" value={settings.oceanRoughness} min={0} max={1} step={0.05} onChange={(v) => updateSetting('oceanRoughness', v)} />
                    <SliderSetting label="Foam" value={settings.foamIntensity} min={0} max={2} step={0.05} onChange={(v) => updateSetting('foamIntensity', v)} />
                  </SettingSection>
                  <SettingSection title="Effects">
                    <SliderSetting label="Caustics" value={settings.causticsIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('causticsIntensity', v)} />
                    <SliderSetting label="SSS" value={settings.sssIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('sssIntensity', v)} />
                  </SettingSection>
                </TabsContent>
                <TabsContent value="effects" className="mt-0 space-y-4">
                  <SettingSection title="Post-Processing">
                    <SliderSetting label="Bloom" value={settings.bloomIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('bloomIntensity', v)} />
                    <SliderSetting label="Exposure" value={settings.exposure} min={0.5} max={2} step={0.05} onChange={(v) => updateSetting('exposure', v)} />
                    <SliderSetting label="Saturation" value={settings.saturation} min={0.5} max={1.5} step={0.05} onChange={(v) => updateSetting('saturation', v)} />
                    <SliderSetting label="Vignette" value={settings.vignetteStrength} min={0} max={1} step={0.05} onChange={(v) => updateSetting('vignetteStrength', v)} />
                  </SettingSection>
                  <SettingSection title="God Rays">
                    <SliderSetting label="Intensity" value={settings.godRayIntensity} min={0} max={2} step={0.05} onChange={(v) => updateSetting('godRayIntensity', v)} />
                  </SettingSection>
                  <SettingSection title="Fog">
                    <SliderSetting label="Density" value={settings.fogDensity} min={0} max={2} step={0.05} onChange={(v) => updateSetting('fogDensity', v)} />
                  </SettingSection>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ProceduralEarthGPU;
