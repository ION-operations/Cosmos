export const GRAVITY_M_PER_S2 = 9.81;
export const TWO_PI = Math.PI * 2;
export const DEFAULT_WATER_DENSITY_KG_M3 = 1025;
export const DEFAULT_SURFACE_TENSION_N_M = 0.072;

export interface WaveKinematics {
  wavelengthMeters: number;
  wavenumberRadPerMeter: number;
  angularFrequencyRadPerSecond: number;
  phaseSpeedMetersPerSecond: number;
  groupSpeedMetersPerSecond: number;
}

export interface BreakerCandidate {
  id: string;
  steepness: number;
  curvature: number;
  impulse: number;
  cameraImportance: number;
  distanceMeters: number;
}

export interface BreakerEvent extends BreakerCandidate {
  energy01: number;
  mode: 'whitecap' | 'crest-ribbon' | 'object-impact' | 'wall-sheet';
}

export function wavenumberFromWavelength(wavelengthMeters: number): number {
  if (!Number.isFinite(wavelengthMeters) || wavelengthMeters <= 0) {
    throw new Error('wavelengthMeters must be a positive finite number.');
  }
  return TWO_PI / wavelengthMeters;
}

export function deepWaterKinematics(wavelengthMeters: number, gravity = GRAVITY_M_PER_S2): WaveKinematics {
  const k = wavenumberFromWavelength(wavelengthMeters);
  const omega = Math.sqrt(gravity * k);
  const phaseSpeed = omega / k;
  return {
    wavelengthMeters,
    wavenumberRadPerMeter: k,
    angularFrequencyRadPerSecond: omega,
    phaseSpeedMetersPerSecond: phaseSpeed,
    groupSpeedMetersPerSecond: phaseSpeed * 0.5,
  };
}

export function shallowWaterPhaseSpeed(depthMeters: number, gravity = GRAVITY_M_PER_S2): number {
  if (!Number.isFinite(depthMeters) || depthMeters < 0) {
    throw new Error('depthMeters must be a non-negative finite number.');
  }
  return Math.sqrt(gravity * depthMeters);
}

export function capillaryGravityAngularFrequency(
  wavelengthMeters: number,
  depthMeters: number,
  densityKgM3 = DEFAULT_WATER_DENSITY_KG_M3,
  surfaceTensionNM = DEFAULT_SURFACE_TENSION_N_M,
  gravity = GRAVITY_M_PER_S2,
): number {
  const k = wavenumberFromWavelength(wavelengthMeters);
  const finiteDepth = Math.tanh(k * Math.max(depthMeters, 0));
  return Math.sqrt((gravity * k + (surfaceTensionNM / densityKgM3) * k ** 3) * finiteDepth);
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function breakerEnergy01(candidate: BreakerCandidate): number {
  const steep = clamp01((candidate.steepness - 0.055) / 0.12);
  const curve = clamp01(candidate.curvature / 1.8);
  const impulse = clamp01(candidate.impulse / 14);
  const camera = clamp01(candidate.cameraImportance);
  const distanceFalloff = 1 / (1 + Math.max(candidate.distanceMeters, 0) / 240);
  return clamp01((steep * 0.46 + curve * 0.18 + impulse * 0.24 + camera * 0.12) * distanceFalloff);
}

export function classifyBreakerMode(candidate: BreakerCandidate): BreakerEvent['mode'] {
  if (candidate.impulse > 9) return 'object-impact';
  if (candidate.curvature > 1.4 && candidate.steepness > 0.10) return 'crest-ribbon';
  if (candidate.curvature > 1.7) return 'wall-sheet';
  return 'whitecap';
}

export function selectTopBreakerEvents(candidates: BreakerCandidate[], maxEvents: number): BreakerEvent[] {
  if (!Number.isFinite(maxEvents) || maxEvents < 0) {
    throw new Error('maxEvents must be a non-negative finite number.');
  }
  return candidates
    .map((candidate) => ({
      ...candidate,
      energy01: breakerEnergy01(candidate),
      mode: classifyBreakerMode(candidate),
    }))
    .filter((event) => event.energy01 > 0.001)
    .sort((a, b) => b.energy01 - a.energy01 || a.id.localeCompare(b.id))
    .slice(0, Math.floor(maxEvents));
}
