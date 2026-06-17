import { SpeciesProfile } from "./species";
import { TreeGraph, TreeNode, UnionZone } from "./treeTypes";

let nextId = 1;

type NodeSeed = Omit<TreeNode, "id" | "children" | "tissueMask"> & { id?: number; children?: number[] };

function createNode(partial: NodeSeed): TreeNode {
  return {
    id: partial.id ?? nextId++,
    children: partial.children ?? [],
    tissueMask: { bark: 1, cambium: 0, sapwood: 0, heartwood: 0 },
    ...partial
  };
}

export function createDemoTreeGraph(species: SpeciesProfile): TreeGraph {
  nextId = 1;

  const leader0 = createNode({
    parentId: null,
    order: 0,
    kind: "leader",
    start: [0, 0, 0],
    end: [0.08, 2.2, 0.02],
    radiusStart: species.trunk.baseRadius,
    radiusEnd: species.trunk.baseRadius * 0.52,
    mass: 12,
    stiffness: species.wind.stiffnessByOrder[0] ?? 0.9,
    damping: 0.75,
    ageYears: 32,
    vitality: 1,
    endpointState: "leader_continuation",
    terminalTreatment: "none",
    branchBinding: 1,
    junctionMask: 0,
    cutMask: 0,
    splinterMask: 0
  });

  const leader1 = createNode({
    parentId: leader0.id,
    order: 0,
    kind: "leader",
    start: leader0.end,
    end: [0.18, 4.1, -0.08],
    radiusStart: leader0.radiusEnd,
    radiusEnd: species.trunk.baseRadius * 0.24,
    mass: 7,
    stiffness: species.wind.stiffnessByOrder[0] ?? 0.9,
    damping: 0.7,
    ageYears: 22,
    vitality: 1,
    endpointState: "living_tip",
    terminalTreatment: "natural_taper",
    branchBinding: 1,
    junctionMask: 0,
    cutMask: 0,
    splinterMask: 0
  });

  const branchLeft = createNode({
    parentId: leader0.id,
    order: 1,
    kind: "branch",
    start: [0.05, 1.35, 0.01],
    end: [-1.75, 2.25, 0.45],
    radiusStart: 0.17,
    radiusEnd: 0.052,
    mass: 3,
    stiffness: species.wind.stiffnessByOrder[1] ?? 0.55,
    damping: 0.58,
    ageYears: 20,
    vitality: 0.92,
    endpointState: "twig_fan",
    terminalTreatment: "twig_cluster",
    branchBinding: 1,
    junctionMask: 1,
    cutMask: 0,
    splinterMask: 0
  });

  const branchRight = createNode({
    parentId: leader0.id,
    order: 1,
    kind: "branch",
    start: [0.08, 1.9, 0],
    end: [1.48, 2.9, -0.52],
    radiusStart: 0.145,
    radiusEnd: 0.045,
    mass: 2.5,
    stiffness: species.wind.stiffnessByOrder[1] ?? 0.55,
    damping: 0.58,
    ageYears: 16,
    vitality: 0.9,
    endpointState: "twig_fan",
    terminalTreatment: "twig_cluster",
    branchBinding: 1,
    junctionMask: 1,
    cutMask: 0,
    splinterMask: 0
  });

  const upperBranch = createNode({
    parentId: leader1.id,
    order: 1,
    kind: "branch",
    start: [0.13, 2.85, -0.04],
    end: [-0.95, 3.95, -0.72],
    radiusStart: 0.08,
    radiusEnd: 0.028,
    mass: 1.6,
    stiffness: species.wind.stiffnessByOrder[1] ?? 0.55,
    damping: 0.52,
    ageYears: 11,
    vitality: 0.95,
    endpointState: species.id === "pine" ? "needle_terminal" : "leaf_terminal",
    terminalTreatment: species.id === "pine" ? "needle_fascicle" : "leaf_cluster",
    branchBinding: 1,
    junctionMask: 1,
    cutMask: 0,
    splinterMask: 0
  });

  const rootLeft = createNode({
    parentId: leader0.id,
    order: -1,
    kind: "root",
    start: [0, 0.05, 0],
    end: [-1.2, -0.28, 0.42],
    radiusStart: 0.18,
    radiusEnd: 0.045,
    mass: 2,
    stiffness: 0.9,
    damping: 0.9,
    ageYears: 30,
    vitality: 1,
    endpointState: "occluded_terminal",
    terminalTreatment: "natural_taper",
    branchBinding: 1,
    junctionMask: 1,
    cutMask: 0,
    splinterMask: 0
  });

  const rootRight = createNode({
    parentId: leader0.id,
    order: -1,
    kind: "root",
    start: [0, 0.05, 0],
    end: [1.15, -0.24, -0.36],
    radiusStart: 0.16,
    radiusEnd: 0.04,
    mass: 2,
    stiffness: 0.9,
    damping: 0.9,
    ageYears: 30,
    vitality: 1,
    endpointState: "occluded_terminal",
    terminalTreatment: "natural_taper",
    branchBinding: 1,
    junctionMask: 1,
    cutMask: 0,
    splinterMask: 0
  });

  leader0.children = [leader1.id, branchLeft.id, branchRight.id, rootLeft.id, rootRight.id];
  leader1.children = [upperBranch.id];

  const nodes = [leader0, leader1, branchLeft, branchRight, upperBranch, rootLeft, rootRight];

  const unionZones: UnionZone[] = nodes
    .filter((node) => node.parentId !== null)
    .map((node) => ({
      parentId: node.parentId!,
      childId: node.id,
      attachAlong01: node.kind === "root" ? 0.02 : Math.max(0.05, Math.min(0.95, node.start[1] / Math.max(leader1.end[1], 0.0001))),
      collarStrength: node.kind === "root" ? 0.85 : species.union.collarStrength,
      buriedChildBase01: node.kind === "root" ? 0.72 : 0.62,
      c1Continuity: 0.86,
      blobInflation: 0,
      barkRidge: species.union.barkRidge,
      compressionShoulder: species.union.compressionShoulder
    }));

  return {
    meta: {
      id: `demo-${species.id}`,
      speciesId: species.id,
      seed: 42,
      createdAt: new Date().toISOString(),
      notes: ["R0/R1 scaffold graph", "Foliage hidden by default: skeleton gates first"]
    },
    nodes,
    unionZones
  };
}
