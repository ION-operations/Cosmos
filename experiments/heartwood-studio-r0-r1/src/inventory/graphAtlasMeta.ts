export type GraphAtlasSystemNode = {
  id: string;
  label: string;
  domain: string;
  degree: number;
  description: string;
};

export type GraphAtlasCount = {
  rawRows: number;
  uniqueParameters: number;
  nodes: number;
  edges: number;
};

export const graphAtlasCounts: GraphAtlasCount = {
  rawRows: 790,
  uniqueParameters: 665,
  nodes: 695,
  edges: 1539
};

export const graphAtlasGeneratedFrom = [
  "heartwood_vNext_parameter_audit_all_params_v0_1.csv",
  "heartwood_vNext_labL_growth_ecology.html",
  "developer specimen image boards",
  "reference docs/zips present in /mnt/data"
] as const;

export const graphAtlasKindCounts = {
  parameter: 665,
  system: 13,
  visual: 12,
  species: 5
} as const;

export const graphAtlasPriorityCounts = {
  priority1: 367,
  priority2: 237,
  priority3: 47,
  priority4: 36,
  priority5: 8
} as const;

export const graphAtlasStatusCounts = {
  indexedNeedsMapping: 393,
  restoreCandidate: 119,
  presentInPriorAcceptedBase: 80,
  activeInLabL: 50,
  specOnly: 15,
  system: 13,
  target: 12,
  deprecatedReplaceWithUnionZone: 8,
  oracle: 5
} as const;

export const graphAtlasDomainCounts = {
  unionCollar: 154,
  speciesPreset: 86,
  windPhysics: 77,
  barkSurface: 52,
  crownCanopy: 52,
  foliageLeaves: 52,
  trunkLeader: 36,
  environmentViewport: 36,
  rootsSoil: 35,
  growthLifecycle: 31,
  lodPerformance: 16,
  visual: 12,
  tissueWx: 10,
  branching: 9,
  miscUnknown: 8,
  trunkRoot: 6,
  species: 5,
  growthEcology: 3,
  core: 2,
  growthForces: 2
} as const;

export const graphAtlasSystemNodes: GraphAtlasSystemNode[] = [
  { id: "system:treeGraph", label: "TreeGraph / structural truth", domain: "core", degree: 2, description: "Graph of trunk, branches, twigs, leaves, roots; owns hierarchy and node order." },
  { id: "system:morphologyGenerator", label: "Morphology generator", domain: "core", degree: 104, description: "Builds trunk-as-leader, scaffold limbs, crown architecture, root forms." },
  { id: "system:growthEcology", label: "Growth ecology", domain: "growth", degree: 7, description: "Gravity, phototropy, competition, reiteration, self-pruning, wind memory." },
  { id: "system:unionZone", label: "UnionZone / collars", domain: "geometry", degree: 163, description: "Buried child, collar ridge, undercut, compression shoulder, no bulbs." },
  { id: "system:rootArchitecture", label: "Root architecture", domain: "roots", degree: 43, description: "Root spread/depth/buttress/crawl/subroots/fluting and future soil adapter." },
  { id: "system:barkMaterial", label: "Bark material", domain: "surface", degree: 54, description: "Fissures, plates, dark furrows, ridge highlights, moss/lichen/wetness." },
  { id: "system:foliageGenerator", label: "Foliage generator", domain: "foliage", degree: 53, description: "Leaf/needle shapes, petioles, clumping, density, species-specific allocation." },
  { id: "system:windSolver", label: "Rotation wind solver", domain: "wind", degree: 79, description: "Beam-like structural rotations and leaf-only flutter." },
  { id: "system:tissueWx", label: "W(x) tissue material", domain: "tissue", degree: 12, description: "Wood coordinates, rings, sapwood/heartwood/cambium, cap shading." },
  { id: "system:stampLedger", label: "Stamp ledger", domain: "state", degree: 1, description: "Replayable cut, break, scar, bark tear, season, fire, snow events." },
  { id: "system:oracleWorkbench", label: "Oracle workbench", domain: "tooling", degree: 167, description: "Developer specimen boards, aspect labs, compare wall, screenshot review." },
  { id: "system:lodBudget", label: "LOD / budget system", domain: "performance", degree: 18, description: "Distance tiers, instance budgets, branch/leaf simplification, frame safety." },
  { id: "system:soilAdapter", label: "Soil / Earth adapter", domain: "soil", degree: 1, description: "Moisture/cohesion/phi hooks; root anchorage and exposed roots." }
];

export const graphAtlasMaterializationStatus = {
  countsImported: true,
  systemNodesImported: true,
  domainCountsImported: true,
  parameterListImported: false,
  relationshipListImported: false,
  reasonParameterListNotImportedYet: "Full 665 parameter list and 1539 relationships were parsed from the uploaded atlas in-session, but must be committed as generated chunks rather than hand-authored scaffolding. Until then, no scaffold coverage may claim full graph parity."
} as const;
