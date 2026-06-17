import { graphAtlasCounts, graphAtlasMaterializationStatus } from "./graphAtlasMeta";

export type CoverageState = "present" | "partial" | "missing" | "blocked" | "regressed";

export type ScaffoldCoverageItem = {
  aspect: string;
  expectedFromAtlas: string;
  currentScaffoldCoverage: CoverageState;
  evidence: string[];
  missingOrWeak: string[];
  decision: string;
};

export const scaffoldCoverage: ScaffoldCoverageItem[] = [
  {
    aspect: "graph_inventory",
    expectedFromAtlas: "665 parameters and 1539 relationships must be machine-readable in the repo.",
    currentScaffoldCoverage: graphAtlasMaterializationStatus.parameterListImported && graphAtlasMaterializationStatus.relationshipListImported ? "present" : "blocked",
    evidence: ["graphAtlasCounts", "graphAtlasSystemNodes", "GRAPH_FIRST_RECOVERY_PROTOCOL.md"],
    missingOrWeak: ["full parameter list chunks", "full relationship list chunks", "parameter-to-scaffold diff"],
    decision: "No full parity claim is allowed until the full atlas inventory is materialized."
  },
  {
    aspect: "tree_graph_authority",
    expectedFromAtlas: "TreeGraph owns trunk, branches, twigs, leaves, roots, hierarchy, and node order.",
    currentScaffoldCoverage: "partial",
    evidence: ["src/core/treeTypes.ts", "src/core/createDemoTreeGraph.ts", "src/core/validation.ts"],
    missingOrWeak: ["no imported atlas parameter ownership", "no real generator ownership", "no rendered geometry audit yet"],
    decision: "Useful R0 scaffold, not high-water parity."
  },
  {
    aspect: "morphology_generator",
    expectedFromAtlas: "Builds trunk-as-leader, scaffold limbs, crown architecture, and root forms.",
    currentScaffoldCoverage: "partial",
    evidence: ["demo TreeGraph only", "species profiles only"],
    missingOrWeak: ["CODEX/HyperTree adapter", "full branch recursion", "real crown architecture", "root generator integration"],
    decision: "Blocked for promotion until adapter diff exists."
  },
  {
    aspect: "union_zone",
    expectedFromAtlas: "Buried child, collar ridge, undercut, compression shoulder, no bulbs.",
    currentScaffoldCoverage: "partial",
    evidence: ["UnionZone type", "junction_continuity_gate"],
    missingOrWeak: ["actual collar geometry", "C1 metric from mesh", "bark ridge propagation", "union material masks"],
    decision: "Structural placeholder only."
  },
  {
    aspect: "root_architecture",
    expectedFromAtlas: "Root spread/depth/buttress/crawl/subroots/fluting and future soil adapter.",
    currentScaffoldCoverage: "partial",
    evidence: ["root node kind", "species root profile", "demo roots"],
    missingOrWeak: ["buttress mesh", "surface crawl roots", "subroot splitting", "soil phi adapter"],
    decision: "Not promotable."
  },
  {
    aspect: "bark_material",
    expectedFromAtlas: "Fissures, plates, dark furrows, ridge highlights, moss/lichen/wetness.",
    currentScaffoldCoverage: "missing",
    evidence: ["species bark profile only"],
    missingOrWeak: ["rendered bark material", "topology masks", "species bark shader", "tissue coordinates"],
    decision: "Do not claim bark coverage."
  },
  {
    aspect: "foliage_generator",
    expectedFromAtlas: "Leaf/needle shapes, petioles, clumping, density, species-specific allocation.",
    currentScaffoldCoverage: "missing",
    evidence: ["species foliage profile only"],
    missingOrWeak: ["actual leaves", "pine needles", "willow strands", "acacia leaflets", "petiole/strand droop"],
    decision: "Do not claim foliage coverage."
  },
  {
    aspect: "wind_solver",
    expectedFromAtlas: "Beam-like structural rotations and leaf-only flutter.",
    currentScaffoldCoverage: "missing",
    evidence: ["stiffness/damping fields only"],
    missingOrWeak: ["node rotation texture", "parent-child coupling", "sag/load memory", "visual wind workbench"],
    decision: "Do not claim wind coverage."
  },
  {
    aspect: "oracle_workbench",
    expectedFromAtlas: "Developer specimen boards, aspect labs, compare wall, screenshot review.",
    currentScaffoldCoverage: "partial",
    evidence: ["referenceManifest.ts", "inline ReferenceOracle panel"],
    missingOrWeak: ["actual images in public/references", "side-by-side compare wall", "screenshot capture", "manual decision receipt"],
    decision: "Must become the primary visual inspection page set."
  },
  {
    aspect: "visual_inspection_runtime",
    expectedFromAtlas: "Every aspect must be visible in isolation and in full-tree context.",
    currentScaffoldCoverage: "partial",
    evidence: ["React workbench shell"],
    missingOrWeak: ["WebGL fallback renderer", "WebGPU renderer", "debug overlays", "aspect page route matrix", "screenshot capture"],
    decision: "Highest immediate implementation priority after graph chunks."
  }
];

export const scaffoldCoverageSummary = {
  atlasCounts: graphAtlasCounts,
  items: scaffoldCoverage.length,
  present: scaffoldCoverage.filter((item) => item.currentScaffoldCoverage === "present").length,
  partial: scaffoldCoverage.filter((item) => item.currentScaffoldCoverage === "partial").length,
  missing: scaffoldCoverage.filter((item) => item.currentScaffoldCoverage === "missing").length,
  blocked: scaffoldCoverage.filter((item) => item.currentScaffoldCoverage === "blocked").length,
  regressed: scaffoldCoverage.filter((item) => item.currentScaffoldCoverage === "regressed").length
} as const;
