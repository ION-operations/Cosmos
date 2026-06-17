import { AspectId } from "./referenceRegression";

export type HighWaterBaseline = {
  aspect: AspectId;
  sources: string[];
  requiredCapabilities: string[];
  forbiddenRegressions: string[];
};

export const highWaterBaselines: Record<AspectId, HighWaterBaseline> = {
  branch_architecture: {
    aspect: "branch_architecture",
    sources: ["CODEX5.3 Tree3DPreview", "Heartwood R4 A/B skeleton harness", "Heartwood R5 CODEX integration candidate", "aspect workbench branch route"],
    requiredCapabilities: [
      "scaffold branch rhythm",
      "graph-owned parent child hierarchy",
      "branch order awareness",
      "max order recursion budget",
      "species dependent branch angles",
      "branch angle variance",
      "branch probability density",
      "child budget and twig budget",
      "length decay and radius decay",
      "self weight sag",
      "phototropic recovery growth bias",
      "wind memory bias",
      "apical dominance",
      "reiteration secondary leader possibility",
      "dead or broken limb support",
      "terminal classification for every tip",
      "foliage hidden skeleton recognizable by species"
    ],
    forbiddenRegressions: ["anonymous renderer limbs", "generic tree silhouette", "twig spaghetti", "branch tubes glued onto trunk", "branch distribution independent of species", "leaf mass hiding failed skeleton"]
  },
  trunk_leader: {
    aspect: "trunk_leader",
    sources: ["Tree Kernel vNext", "HyperTree vNext plan", "CODEX trunk gesture and bark/root panels", "Heartwood R5 trunk controls"],
    requiredCapabilities: ["order zero Leader continuing into crown", "no separate capped trunk primitive", "taper", "flare", "ovality", "fluting", "trunk gesture knots", "lean", "twist", "age height relationship", "base root transition", "species dependent trunk habit"],
    forbiddenRegressions: ["flat pole ending under canopy", "trunk top disconnect", "straight cylinder with branches pasted on", "lost trunk knots gesture", "lost base flare"]
  },
  junction_collar: {
    aspect: "junction_collar",
    sources: ["Tree Kernel branch collar truth", "HyperTree C1 UnionZone plan", "CODEX collar union parameters", "visual branch collar references"],
    requiredCapabilities: ["buried child base", "C1 continuity", "collar ridge", "lower compression shoulder", "bark grain ridge wrapping around union", "parent child radius constraint", "no spherical metaball bulb as final truth", "no hard socket seam", "union masks available to render material layer"],
    forbiddenRegressions: ["glued tube", "ball blob at every branch", "child branch appears surface mounted", "collar lost when mesh is simplified", "junction material disconnected from geometry"]
  },
  endpoints_damage: {
    aspect: "endpoints_damage",
    sources: ["CODEX cutMask", "CODEX splinterMask", "CODEX branchBinding", "Heartwood R5", "Tree Kernel stamp cut scar memory"],
    requiredCapabilities: ["no unresolved terminal ends", "living tip", "dormant bud", "twig fan", "leaf terminal", "needle terminal", "dead stub", "snapped limb", "old cut", "scarred cut", "rot cavity", "occluded root terminal", "cut masks", "splinter masks", "deadwood controls", "break severity", "future cut scar stamp ownership"],
    forbiddenRegressions: ["arbitrary flat caps", "all endpoints natural taper only", "deadwood removed", "cut splinter masks ignored", "damage as pure texture with no graph ownership"]
  },
  roots_buttress: {
    aspect: "roots_buttress",
    sources: ["CODEX root parameters", "Earth Kernel", "Arbor-Terra", "Tree Kernel roots belong to ground", "visual root flare buttress references"],
    requiredCapabilities: ["root emergence from trunk mass", "flare buttress tie in", "root architecture by species", "surface crawl roots", "subroot splitting", "ground entry occluded terminal states", "fluting tie in to trunk", "future soil phi adapter boundary", "future hydrotropism obstacle deflection hooks"],
    forbiddenRegressions: ["roots sitting on top of surface", "generic spokes", "no trunk root transition", "disconnected soil root logic", "roots only decorative curves"]
  },
  bark_surface: {
    aspect: "bark_surface",
    sources: ["CODEX bark noise and panel controls", "Tree Kernel material truth W(x)", "HyperTree tissue coordinates", "visual bark references"],
    requiredCapabilities: ["species specific bark modes", "bark relief", "anisotropy", "bark scale", "junction scar ridge tie in", "topology aware bark masks", "future cambium sapwood heartwood fields", "future ring knot scar cut tissue mapping"],
    forbiddenRegressions: ["generic brown noise", "bark disconnected from branch unions", "same bark for every species", "no tissue future path", "bark hides geometry failures"]
  },
  foliage: {
    aspect: "foliage",
    sources: ["CODEX leaf parameter set", "Heartwood species boards", "Hyperreal Tree Vision", "Quick Grass performance concept"],
    requiredCapabilities: ["species specific foliage modes", "broadleaf support", "oak leaf identity", "birch triangular leaf identity", "pine needle fascicles", "willow pendant strands", "acacia bipinnate leaflet fine canopy texture", "density and clustering controls", "petiole strand droop support", "silhouette breakup", "leaf hidden skeleton still valid"],
    forbiddenRegressions: ["generic green billboards", "pine rendered as broadleaf cards", "willow rendered as normal leafy blob", "acacia rendered as oak like round crown", "foliage used to cover bad branch architecture"]
  },
  wind_load: {
    aspect: "wind_load",
    sources: ["Tree Kernel rotation driven wind", "CODEX wind parameter set", "HyperTree two phase wind solver"],
    requiredCapabilities: ["branch order stiffness", "parent child coupling", "bottom up drag top down force inheritance", "sag load memory", "torsion", "canopy shear lag wake", "leaf flutter separated from structural sway", "future node rotation texture quaternion like node motion"],
    forbiddenRegressions: ["uniform sine wave offset", "rubber hose translation", "leaf and trunk moved by same noise", "no mass stiffness damping distinction", "wind independent of hierarchy"]
  },
  soil_root_hydro: {
    aspect: "soil_root_hydro",
    sources: ["Earth Kernel v2", "soil hydro MLS-MPM notes", "Arbor-Terra eco kernel"],
    requiredCapabilities: ["terrain truth remains sparse phi SDF", "HydroTiles remain fluid authority", "FlowGuide MPM is guidance not replacement", "terrain fluid edits are stamp logged", "roots may influence cohesion and moisture later", "overhang support logic remains future compatible"],
    forbiddenRegressions: ["global heightfield replacing phi truth", "unstamped terrain mutation", "MPM replacing HydroTiles", "fake soil contact not owned by terrain root state"]
  }
};
