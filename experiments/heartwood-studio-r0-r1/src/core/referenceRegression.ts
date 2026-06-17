export type AspectId =
  | "branch_architecture"
  | "trunk_leader"
  | "junction_collar"
  | "endpoints_damage"
  | "roots_buttress"
  | "bark_surface"
  | "foliage"
  | "wind_load"
  | "soil_root_hydro";

export type PromotionStatus = "blocked" | "regressed" | "parity" | "improved" | "promotable";

export type ReferenceBaseline = {
  aspect: AspectId;
  baselineSources: string[];
  mustPreserve: string[];
  forbiddenRegressions: string[];
};

export type CandidateEvidence = {
  aspect: AspectId;
  authorityGatePassed: boolean;
  preservedFeatures: string[];
  knownRegressions: string[];
  improvements: string[];
};

export type ReferenceRegressionReport = {
  aspect: AspectId;
  status: PromotionStatus;
  missingRequiredFeatures: string[];
  regressions: string[];
  improvements: string[];
  message: string;
};

export const referenceBaselines: Record<AspectId, ReferenceBaseline> = {
  branch_architecture: {
    aspect: "branch_architecture",
    baselineSources: ["CODEX5.3", "Heartwood R4/R5", "aspect workbench"],
    mustPreserve: ["scaffold rhythm", "non-flat terminals", "species silhouette", "dead and broken limb support"],
    forbiddenRegressions: ["anonymous render-only limbs", "twig spaghetti", "generic silhouette", "leaf-hidden skeleton failure"]
  },
  trunk_leader: {
    aspect: "trunk_leader",
    baselineSources: ["Tree Kernel brief", "HyperTree plan", "CODEX trunk gestures"],
    mustPreserve: ["continuous order-0 Leader", "trunk gesture knots", "taper", "ovality", "fluting", "root flare"],
    forbiddenRegressions: ["capped trunk pole", "separate trunk tube", "lost gesture", "flat top termination"]
  },
  junction_collar: {
    aspect: "junction_collar",
    baselineSources: ["Tree Kernel brief", "HyperTree plan", "CODEX collar params"],
    mustPreserve: ["buried child base", "collar ridge", "compression shoulder", "bark flow around union"],
    forbiddenRegressions: ["glued tube", "spherical blob", "hard socket seam", "child branch floating on surface"]
  },
  endpoints_damage: {
    aspect: "endpoints_damage",
    baselineSources: ["CODEX cut masks", "CODEX splinter masks", "Heartwood R5"],
    mustPreserve: ["endpoint taxonomy", "snapped limbs", "old cuts", "scars", "splinters"],
    forbiddenRegressions: ["arbitrary flat caps", "unclassified terminals", "missing deadwood", "lost cut/splinter masks"]
  },
  roots_buttress: {
    aspect: "roots_buttress",
    baselineSources: ["Earth Kernel brief", "Tree Kernel brief", "CODEX root params"],
    mustPreserve: ["root emergence from trunk mass", "buttress or root flare", "ground entry", "crawl roots"],
    forbiddenRegressions: ["roots sitting on surface", "no flare", "generic spokes", "detached base"]
  },
  bark_surface: {
    aspect: "bark_surface",
    baselineSources: ["reference boards", "CODEX bark noise", "Tree Kernel tissue plan"],
    mustPreserve: ["species-specific bark", "relief", "anisotropy", "topology tie-in", "future tissue fields"],
    forbiddenRegressions: ["generic brown noise", "texture disconnected from topology", "lost species identity"]
  },
  foliage: {
    aspect: "foliage",
    baselineSources: ["CODEX foliage params", "image references"],
    mustPreserve: ["species-specific leaves", "pine needle fascicles", "willow strands", "acacia fine leaflets"],
    forbiddenRegressions: ["generic green mass", "pine as broadleaf", "willow as upright blob", "acacia as round oak crown"]
  },
  wind_load: {
    aspect: "wind_load",
    baselineSources: ["Tree Kernel brief", "CODEX wind params"],
    mustPreserve: ["parent/order coupling", "rotation-driven motion", "sag/load memory", "leaf-only flutter"],
    forbiddenRegressions: ["rubber hose translation", "uniform sine offset", "parent-child decoupling", "no stiffness by order"]
  },
  soil_root_hydro: {
    aspect: "soil_root_hydro",
    baselineSources: ["Earth Kernel brief", "FlowGuide-MPM notes"],
    mustPreserve: ["terrain truth in phi", "paged hydro tiles", "FlowGuide as guidance only", "stamp-logged edits"],
    forbiddenRegressions: ["global heightfield replacement", "unstamped terrain mutation", "MPM replacing hydro authority"]
  }
};

export function evaluateReferenceRegression(candidate: CandidateEvidence): ReferenceRegressionReport {
  const baseline = referenceBaselines[candidate.aspect];
  const preserved = new Set(candidate.preservedFeatures.map((feature) => feature.toLowerCase()));
  const missingRequiredFeatures = baseline.mustPreserve.filter((feature) => !preserved.has(feature.toLowerCase()));
  const regressions = [...candidate.knownRegressions];

  if (!candidate.authorityGatePassed) {
    return {
      aspect: candidate.aspect,
      status: "blocked",
      missingRequiredFeatures,
      regressions,
      improvements: candidate.improvements,
      message: "Authority gate has not passed, so reference regression cannot be cleared."
    };
  }

  if (regressions.length > 0) {
    return {
      aspect: candidate.aspect,
      status: "regressed",
      missingRequiredFeatures,
      regressions,
      improvements: candidate.improvements,
      message: "Candidate has known regressions against supplied references. Promotion forbidden."
    };
  }

  if (missingRequiredFeatures.length > 0) {
    return {
      aspect: candidate.aspect,
      status: "blocked",
      missingRequiredFeatures,
      regressions,
      improvements: candidate.improvements,
      message: "Candidate has not demonstrated parity with required reference features."
    };
  }

  if (candidate.improvements.length > 0) {
    return {
      aspect: candidate.aspect,
      status: "promotable",
      missingRequiredFeatures: [],
      regressions: [],
      improvements: candidate.improvements,
      message: "Candidate preserves reference parity and records improvements."
    };
  }

  return {
    aspect: candidate.aspect,
    status: "parity",
    missingRequiredFeatures: [],
    regressions: [],
    improvements: [],
    message: "Candidate preserves reference parity but records no improvement yet."
  };
}
