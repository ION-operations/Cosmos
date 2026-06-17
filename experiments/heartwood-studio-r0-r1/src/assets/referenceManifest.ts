export type ReferenceRecord = {
  id: string;
  species: "oak" | "birch" | "willow" | "pine" | "acacia";
  aspect: string;
  path: string;
  targetFeatures: string[];
  forbiddenFailures: string[];
};

export const referenceRecords: ReferenceRecord[] = [
  {
    id: "oak_junction_001",
    species: "oak",
    aspect: "branch_junction",
    path: "/references/oak/junction/oak_junction_001.png",
    targetFeatures: ["raised collar ridge", "branch emerges from parent mass", "bark grain bends around union"],
    forbiddenFailures: ["glued tube", "spherical blob", "hard socket seam"]
  },
  {
    id: "birch_bark_001",
    species: "birch",
    aspect: "bark",
    path: "/references/birch/bark/birch_bark_001.png",
    targetFeatures: ["white peeling sheets", "black scars/lenticels", "thin paper bark layering"],
    forbiddenFailures: ["generic brown noise", "oak-like fissures", "uniform tube texture"]
  },
  {
    id: "willow_strands_001",
    species: "willow",
    aspect: "foliage",
    path: "/references/willow/strands/willow_strands_001.png",
    targetFeatures: ["pendant curtains", "drooping strand chains", "narrow leaves aligned to strand flow"],
    forbiddenFailures: ["generic leaf blob", "stiff upright clusters"]
  },
  {
    id: "pine_needles_001",
    species: "pine",
    aspect: "needles",
    path: "/references/pine/needles/pine_needles_001.png",
    targetFeatures: ["needle fascicle bundles", "tufts near branch tips", "whorled branch tier identity"],
    forbiddenFailures: ["green leaf cards", "broadleaf blob", "uniform fur shell"]
  },
  {
    id: "acacia_canopy_001",
    species: "acacia",
    aspect: "full_tree",
    path: "/references/acacia/full/acacia_canopy_001.png",
    targetFeatures: ["flat umbrella canopy", "long lateral scaffolds", "fine leaflet texture"],
    forbiddenFailures: ["round oak crown", "generic shrub blob", "single pole trunk without gesture"]
  }
];
