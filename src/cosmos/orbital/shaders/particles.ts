// ═══════════════════════════════════════════
// GENESIS ENGINE — Particle Shaders
// Spray/splash particles with atmospheric lighting
// Source: ATMOSPHERE_OCEAN + dolphinjump (splash patterns)
// ═══════════════════════════════════════════

export const partVS = `
precision highp float;
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aSize, aAlpha;
varying float vAlpha, vDist;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1);
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
  gl_PointSize = aSize * 280.0 / max(-mv.z, 1.0);
  gl_PointSize = clamp(gl_PointSize, 1.0, 28.0);
  vAlpha = aAlpha;
}`;

export const partFS = `
precision highp float;
#include <common>
#include <logdepthbuf_pars_fragment>
varying float vAlpha, vDist;
uniform vec3 uSunDir;
uniform float uSunI;
void main(){
  #include <logdepthbuf_fragment>
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if(r > 0.5) discard;
  float a = smoothstep(0.5, 0.15, r) * vAlpha;
  float fog = exp(-vDist * 0.0015);
  // Mist/spray catches sunlight from behind (dolphinjump back-lighting effect)
  float backLight = pow(max(-dot(normalize(vec3(c.x, 0.5, c.y)), uSunDir), 0.0), 3.0) * 0.3;
  vec3 col = vec3(0.75, 0.85, 0.95) * (0.4 + max(uSunDir.y, 0.0)*0.6 + backLight) * min(uSunI*0.04, 1.3) * fog;
  gl_FragColor = vec4(col, a*0.65);
}`;
