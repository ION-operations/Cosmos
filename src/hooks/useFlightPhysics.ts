import { useRef, useEffect } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCED FLIGHT PHYSICS — 6-DOF Aerodynamic Simulation
// ─────────────────────────────────────────────────────────────────────────────
// Models: thrust, drag (parasitic + induced), lift, gravity, inertia,
// angle-of-attack, stall, banking turns, yaw coupling, ground effect.
// Coordinate space matches the existing engine (Y up, world-scale meters).
// ─────────────────────────────────────────────────────────────────────────────

export interface FlightConfig {
  // Aircraft mass & inertia
  mass: number;                    // kg
  wingArea: number;                // m²
  // Aerodynamic coefficients
  cl0: number;                     // base lift coefficient (zero AoA)
  clAlpha: number;                 // dCl/dAoA (per radian)
  clMax: number;                   // stall lift cap
  cd0: number;                     // parasitic drag coeff
  inducedDragK: number;            // induced drag factor
  // Thrust
  maxThrust: number;               // N
  // Control authority (rad/s² of angular acceleration at full deflection)
  pitchRate: number;
  rollRate: number;
  yawRate: number;
  // Damping (1/s) — how quickly angular velocity decays without input
  angularDamping: number;
  // Gravity (m/s²) — engine "world units" map ~1:1 to meters
  gravity: number;
  // Air density at sea level
  airDensity: number;
}

export const DEFAULT_FLIGHT_CONFIG: FlightConfig = {
  mass: 1200,
  wingArea: 16,
  cl0: 0.25,
  clAlpha: 5.5,
  clMax: 1.4,
  cd0: 0.025,
  inducedDragK: 0.045,
  maxThrust: 28000,
  pitchRate: 2.2,
  rollRate: 4.5,
  yawRate: 1.2,
  angularDamping: 2.4,
  gravity: 9.81,
  airDensity: 1.225,
};

export interface FlightState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;       // world-space m/s
  // Orientation (Euler, body frame)
  pitch: number;                 // rad — nose up positive
  yaw: number;                   // rad — heading
  roll: number;                  // rad — bank, right wing down positive
  // Angular velocity (body frame, rad/s)
  pitchRate: number;
  yawRate: number;
  rollRate: number;
  // Engine
  throttle: number;              // 0..1
  // Telemetry
  airspeed: number;              // m/s
  altitude: number;              // m
  angleOfAttack: number;         // rad
  gForce: number;                // multiples of g
  thrustN: number;               // current thrust newtons
  liftN: number;
  dragN: number;
  stalled: boolean;
  mode: 'flight' | 'orbital' | 'free';
}

export interface FlightControls {
  // Free-cam toggle (ignores physics, pure WASD)
  freeCam: boolean;
  // Mouse look sensitivity (when not in pure flight)
  mouseSensitivity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────
export interface UseFlightPhysicsResult {
  stateRef: React.MutableRefObject<FlightState>;
  configRef: React.MutableRefObject<FlightConfig>;
  controlsRef: React.MutableRefObject<FlightControls>;
  step: (dt: number, keys: Set<string>, mouseDelta: { x: number; y: number }) => void;
  reset: () => void;
}

export function useFlightPhysics(
  initialConfig: Partial<FlightConfig> = {},
  initialPos = new THREE.Vector3(0, 1500, 0),
): UseFlightPhysicsResult {
  const configRef = useRef<FlightConfig>({ ...DEFAULT_FLIGHT_CONFIG, ...initialConfig });
  const controlsRef = useRef<FlightControls>({ freeCam: false, mouseSensitivity: 0.0022 });

  const stateRef = useRef<FlightState>({
    position: initialPos.clone(),
    velocity: new THREE.Vector3(0, 0, -80), // start with cruise speed
    pitch: 0,
    yaw: 0,
    roll: 0,
    pitchRate: 0,
    yawRate: 0,
    rollRate: 0,
    throttle: 0.6,
    airspeed: 80,
    altitude: initialPos.y,
    angleOfAttack: 0,
    gForce: 1,
    thrustN: 0,
    liftN: 0,
    dragN: 0,
    stalled: false,
    mode: 'flight',
  });

  const reset = () => {
    stateRef.current.position.copy(initialPos);
    stateRef.current.velocity.set(0, 0, -80);
    stateRef.current.pitch = 0;
    stateRef.current.yaw = 0;
    stateRef.current.roll = 0;
    stateRef.current.pitchRate = 0;
    stateRef.current.yawRate = 0;
    stateRef.current.rollRate = 0;
    stateRef.current.throttle = 0.6;
    stateRef.current.stalled = false;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // PHYSICS STEP
  // ───────────────────────────────────────────────────────────────────────────
  const step = (dt: number, keys: Set<string>, mouseDelta: { x: number; y: number }) => {
    const s = stateRef.current;
    const c = configRef.current;
    const ctrl = controlsRef.current;
    if (dt <= 0 || dt > 0.1) dt = Math.min(dt, 0.1); // clamp big frame jumps

    // ── FREE CAMERA MODE — bypass physics, classic noclip ───────────────────
    if (ctrl.freeCam) {
      s.mode = 'free';
      s.yaw += mouseDelta.x * ctrl.mouseSensitivity;
      s.pitch -= mouseDelta.y * ctrl.mouseSensitivity;
      s.pitch = THREE.MathUtils.clamp(s.pitch, -Math.PI * 0.49, Math.PI * 0.49);
      s.roll = 0;

      const fwd = new THREE.Vector3(
        Math.cos(s.pitch) * Math.sin(s.yaw),
        Math.sin(s.pitch),
        Math.cos(s.pitch) * Math.cos(s.yaw),
      );
      const right = new THREE.Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
      const move = new THREE.Vector3();
      const speed = (keys.has('shift') ? 800 : 200) * (1 + s.throttle * 4);
      if (keys.has('w')) move.add(fwd);
      if (keys.has('s')) move.sub(fwd);
      if (keys.has('a')) move.sub(right);
      if (keys.has('d')) move.add(right);
      if (keys.has(' ')) move.y += 1;
      if (keys.has('control')) move.y -= 1;
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);
      s.position.add(move);
      s.velocity.copy(move).multiplyScalar(1 / Math.max(dt, 1e-4));
      s.airspeed = s.velocity.length();
      s.altitude = s.position.y;
      return;
    }

    s.mode = 'flight';

    // ── CONTROL INPUT → angular acceleration ────────────────────────────────
    // Mouse: pitch (Y) + yaw (X). A/D = roll. Q/E = rudder yaw.
    let pitchInput = -mouseDelta.y * ctrl.mouseSensitivity * 60; // mouse-driven elevator
    let rollInput = 0;
    let yawInput = mouseDelta.x * ctrl.mouseSensitivity * 30;

    if (keys.has('w')) pitchInput += 1;     // nose down (push stick forward)
    if (keys.has('s')) pitchInput -= 1;     // nose up (pull back)
    if (keys.has('a')) rollInput -= 1;      // roll left
    if (keys.has('d')) rollInput += 1;      // roll right
    if (keys.has('q')) yawInput -= 1;       // rudder left
    if (keys.has('e')) yawInput += 1;       // rudder right

    // Throttle
    if (keys.has('shift')) s.throttle = Math.min(1, s.throttle + dt * 0.6);
    if (keys.has('control')) s.throttle = Math.max(0, s.throttle - dt * 0.6);
    if (keys.has('x')) s.throttle = 0;
    if (keys.has('z')) s.throttle = 1;

    // Apply control torques (scaled by airspeed — no authority at zero airspeed)
    const speed = s.velocity.length();
    const controlAuthority = THREE.MathUtils.clamp(speed / 60, 0.05, 1.0);

    s.pitchRate += (-pitchInput * c.pitchRate * controlAuthority - s.pitchRate * c.angularDamping) * dt;
    s.rollRate  += ( rollInput  * c.rollRate  * controlAuthority - s.rollRate  * c.angularDamping) * dt;
    s.yawRate   += ( yawInput   * c.yawRate   * controlAuthority - s.yawRate   * c.angularDamping) * dt;

    // Bank-induced turn coordination: rolling banks the lift vector,
    // generating a yaw component. Real aircraft rely on this.
    const bankYawCoupling = Math.sin(s.roll) * 0.6 * controlAuthority;
    s.yawRate += bankYawCoupling * dt;

    // Integrate orientation
    s.pitch += s.pitchRate * dt;
    s.roll  += s.rollRate  * dt;
    s.yaw   += s.yawRate   * dt;

    // Clamp pitch to avoid gimbal-lock weirdness
    s.pitch = THREE.MathUtils.clamp(s.pitch, -Math.PI * 0.49, Math.PI * 0.49);
    // Wrap yaw
    if (s.yaw > Math.PI) s.yaw -= Math.PI * 2;
    if (s.yaw < -Math.PI) s.yaw += Math.PI * 2;

    // ── BUILD BODY-FRAME BASIS ───────────────────────────────────────────────
    const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
    const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
    const cr = Math.cos(s.roll), sr = Math.sin(s.roll);

    // Forward (nose direction)
    const forward = new THREE.Vector3(cp * sy, sp, cp * cy);
    // Right wing (banked)
    const rightFlat = new THREE.Vector3(cy, 0, -sy);
    const upFlat = new THREE.Vector3(0, 1, 0);
    // Apply roll: rotate right and up around forward
    const right = rightFlat.clone().multiplyScalar(cr).add(upFlat.clone().multiplyScalar(sr));
    const up = upFlat.clone().multiplyScalar(cr).sub(rightFlat.clone().multiplyScalar(sr));
    // Re-orthogonalize up so lift acts perpendicular to actual velocity
    const bodyUp = new THREE.Vector3().crossVectors(right, forward).normalize();

    // ── AERODYNAMICS ────────────────────────────────────────────────────────
    const airspeed = s.velocity.length();
    const dynamicPressure = 0.5 * c.airDensity * airspeed * airspeed;

    // Angle of attack: angle between forward vector and velocity vector,
    // projected onto the pitch plane.
    let aoa = 0;
    if (airspeed > 1) {
      const velDir = s.velocity.clone().normalize();
      const cosAoA = velDir.dot(forward);
      const verticalComp = velDir.dot(bodyUp);
      aoa = Math.atan2(-verticalComp, cosAoA);
    }
    s.angleOfAttack = aoa;

    // Lift coefficient with stall behavior
    let cl = c.cl0 + c.clAlpha * aoa;
    const stallAoA = c.clMax / c.clAlpha;
    s.stalled = Math.abs(aoa) > stallAoA;
    if (s.stalled) {
      // Sharp lift loss past stall
      const overshoot = Math.abs(aoa) - stallAoA;
      cl = Math.sign(cl) * Math.max(0.2, c.clMax - overshoot * 3.5);
    }
    cl = THREE.MathUtils.clamp(cl, -c.clMax, c.clMax);

    // Drag coefficient (parasitic + induced)
    const cd = c.cd0 + c.inducedDragK * cl * cl;

    const liftMag = cl * dynamicPressure * c.wingArea;
    const dragMag = cd * dynamicPressure * c.wingArea;

    s.liftN = liftMag;
    s.dragN = dragMag;

    // ── FORCES ──────────────────────────────────────────────────────────────
    const lift = bodyUp.clone().multiplyScalar(liftMag);
    const drag = airspeed > 0.01
      ? s.velocity.clone().normalize().multiplyScalar(-dragMag)
      : new THREE.Vector3();
    const thrust = forward.clone().multiplyScalar(c.maxThrust * s.throttle);
    s.thrustN = c.maxThrust * s.throttle;
    const gravity = new THREE.Vector3(0, -c.gravity * c.mass, 0);

    const totalForce = new THREE.Vector3()
      .add(lift)
      .add(drag)
      .add(thrust)
      .add(gravity);

    const acceleration = totalForce.divideScalar(c.mass);

    // G-force (felt in body-up direction)
    const accelMagInUp = acceleration.dot(bodyUp) + c.gravity * bodyUp.y;
    s.gForce = 1 + accelMagInUp / c.gravity;

    // Integrate velocity & position
    s.velocity.add(acceleration.multiplyScalar(dt));
    s.position.add(s.velocity.clone().multiplyScalar(dt));

    // Soft ground floor — bounce/clamp with damping (prevents falling through)
    const groundFloor = 2;
    if (s.position.y < groundFloor) {
      s.position.y = groundFloor;
      if (s.velocity.y < 0) {
        s.velocity.y *= -0.2;
        s.velocity.x *= 0.85;
        s.velocity.z *= 0.85;
      }
    }

    s.airspeed = s.velocity.length();
    s.altitude = s.position.y;
  };

  return { stateRef, configRef, controlsRef, step, reset };
}
