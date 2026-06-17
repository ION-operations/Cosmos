export type SpeciesId = "oak" | "birch" | "willow" | "pine" | "acacia";

export type SpeciesProfile = {
  id: SpeciesId;
  name: string;
  morphology: { crownHabit: string; apicalDominance: number; scaffoldCount: number; maxOrder: number };
  trunk: { baseRadius: number; taperExponent: number; ovality: number; flutingStrength: number; twist: number };
  branch: { angleMeanDeg: number; angleVarianceDeg: number; lengthDecay: number; radiusDecay: number; selfWeightSag: number };
  union: { collarStrength: number; barkRidge: number; compressionShoulder: number };
  root: { architecture: "tap" | "fibrous" | "heart" | "plate" | "buttress"; spread: number; buttressStrength: number };
  bark: { mode: "fissured" | "peeling" | "scaled" | "furrowed" | "dry_cracked"; relief: number; anisotropy: number };
  foliage: { mode: "broadleaf" | "triangular_leaf" | "pendant_strands" | "needle_fascicles" | "bipinnate_leaflets"; density: number };
  wind: { stiffnessByOrder: number[]; leafFlutter: number; strandDrag: number };
};

export const speciesRegistry: Record<SpeciesId, SpeciesProfile> = {
  oak: {
    id: "oak",
    name: "English Oak",
    morphology: { crownHabit: "broad heavy crown", apicalDominance: 0.42, scaffoldCount: 7, maxOrder: 5 },
    trunk: { baseRadius: 0.38, taperExponent: 1.45, ovality: 0.16, flutingStrength: 0.32, twist: 0.1 },
    branch: { angleMeanDeg: 48, angleVarianceDeg: 19, lengthDecay: 0.72, radiusDecay: 0.62, selfWeightSag: 0.45 },
    union: { collarStrength: 0.82, barkRidge: 0.75, compressionShoulder: 0.7 },
    root: { architecture: "heart", spread: 1.45, buttressStrength: 0.42 },
    bark: { mode: "fissured", relief: 0.85, anisotropy: 0.68 },
    foliage: { mode: "broadleaf", density: 0.78 },
    wind: { stiffnessByOrder: [0.92, 0.62, 0.38, 0.22, 0.12], leafFlutter: 0.34, strandDrag: 0 }
  },
  birch: {
    id: "birch",
    name: "Silver Birch",
    morphology: { crownHabit: "airy slim leader", apicalDominance: 0.74, scaffoldCount: 5, maxOrder: 5 },
    trunk: { baseRadius: 0.18, taperExponent: 1.18, ovality: 0.08, flutingStrength: 0.08, twist: 0.18 },
    branch: { angleMeanDeg: 35, angleVarianceDeg: 14, lengthDecay: 0.75, radiusDecay: 0.57, selfWeightSag: 0.38 },
    union: { collarStrength: 0.5, barkRidge: 0.46, compressionShoulder: 0.35 },
    root: { architecture: "fibrous", spread: 1.08, buttressStrength: 0.08 },
    bark: { mode: "peeling", relief: 0.42, anisotropy: 0.52 },
    foliage: { mode: "triangular_leaf", density: 0.55 },
    wind: { stiffnessByOrder: [0.62, 0.42, 0.25, 0.16, 0.1], leafFlutter: 0.62, strandDrag: 0 }
  },
  willow: {
    id: "willow",
    name: "Weeping Willow",
    morphology: { crownHabit: "pendant curtain", apicalDominance: 0.28, scaffoldCount: 9, maxOrder: 6 },
    trunk: { baseRadius: 0.3, taperExponent: 1.28, ovality: 0.18, flutingStrength: 0.18, twist: 0.14 },
    branch: { angleMeanDeg: 62, angleVarianceDeg: 22, lengthDecay: 0.82, radiusDecay: 0.55, selfWeightSag: 0.82 },
    union: { collarStrength: 0.58, barkRidge: 0.5, compressionShoulder: 0.45 },
    root: { architecture: "heart", spread: 1.6, buttressStrength: 0.18 },
    bark: { mode: "furrowed", relief: 0.66, anisotropy: 0.75 },
    foliage: { mode: "pendant_strands", density: 0.92 },
    wind: { stiffnessByOrder: [0.58, 0.32, 0.18, 0.1, 0.05], leafFlutter: 0.48, strandDrag: 0.9 }
  },
  pine: {
    id: "pine",
    name: "Scots Pine",
    morphology: { crownHabit: "whorled tiers", apicalDominance: 0.88, scaffoldCount: 6, maxOrder: 4 },
    trunk: { baseRadius: 0.28, taperExponent: 1.32, ovality: 0.07, flutingStrength: 0.1, twist: 0.06 },
    branch: { angleMeanDeg: 72, angleVarianceDeg: 9, lengthDecay: 0.66, radiusDecay: 0.58, selfWeightSag: 0.26 },
    union: { collarStrength: 0.44, barkRidge: 0.38, compressionShoulder: 0.3 },
    root: { architecture: "tap", spread: 0.95, buttressStrength: 0.06 },
    bark: { mode: "scaled", relief: 0.7, anisotropy: 0.45 },
    foliage: { mode: "needle_fascicles", density: 0.7 },
    wind: { stiffnessByOrder: [0.84, 0.58, 0.33, 0.2, 0.12], leafFlutter: 0.28, strandDrag: 0 }
  },
  acacia: {
    id: "acacia",
    name: "Umbrella Acacia",
    morphology: { crownHabit: "flat umbrella canopy", apicalDominance: 0.18, scaffoldCount: 10, maxOrder: 5 },
    trunk: { baseRadius: 0.24, taperExponent: 1.12, ovality: 0.28, flutingStrength: 0.22, twist: 0.38 },
    branch: { angleMeanDeg: 78, angleVarianceDeg: 16, lengthDecay: 0.78, radiusDecay: 0.6, selfWeightSag: 0.22 },
    union: { collarStrength: 0.62, barkRidge: 0.52, compressionShoulder: 0.54 },
    root: { architecture: "plate", spread: 1.8, buttressStrength: 0.16 },
    bark: { mode: "dry_cracked", relief: 0.64, anisotropy: 0.5 },
    foliage: { mode: "bipinnate_leaflets", density: 0.42 },
    wind: { stiffnessByOrder: [0.78, 0.5, 0.28, 0.16, 0.08], leafFlutter: 0.55, strandDrag: 0 }
  }
};
