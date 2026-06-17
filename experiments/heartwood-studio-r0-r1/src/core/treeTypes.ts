export type Vec3 = [number, number, number];

export type EndpointState =
  | "leader_continuation"
  | "living_tip"
  | "dormant_bud"
  | "twig_fan"
  | "leaf_terminal"
  | "needle_terminal"
  | "dead_stub"
  | "snapped_limb"
  | "old_cut"
  | "scarred_cut"
  | "rot_cavity"
  | "occluded_terminal"
  | "unresolved";

export type TreeNodeKind =
  | "leader"
  | "branch"
  | "twig"
  | "root"
  | "leaf_anchor"
  | "needle_anchor"
  | "deadwood"
  | "scar";

export type TerminalTreatment =
  | "none"
  | "natural_taper"
  | "bud"
  | "twig_cluster"
  | "leaf_cluster"
  | "needle_fascicle"
  | "jagged_break"
  | "scarred_cut_cap"
  | "rot_cavity"
  | "flat_cap";

export type TissueMask = {
  bark: number;
  cambium: number;
  sapwood: number;
  heartwood: number;
};

export type UnionZone = {
  parentId: number;
  childId: number;
  attachAlong01: number;
  collarStrength: number;
  buriedChildBase01: number;
  c1Continuity: number;
  blobInflation: number;
  barkRidge: number;
  compressionShoulder: number;
};

export type TreeNode = {
  id: number;
  parentId: number | null;
  order: number;
  kind: TreeNodeKind;
  start: Vec3;
  end: Vec3;
  radiusStart: number;
  radiusEnd: number;
  mass: number;
  stiffness: number;
  damping: number;
  ageYears: number;
  vitality: number;
  endpointState: EndpointState;
  terminalTreatment: TerminalTreatment;
  branchBinding: number;
  junctionMask: number;
  cutMask: number;
  splinterMask: number;
  tissueMask: TissueMask;
  children: number[];
};

export type TreeGraph = {
  meta: {
    id: string;
    speciesId: string;
    seed: number;
    createdAt: string;
    notes: string[];
  };
  nodes: TreeNode[];
  unionZones: UnionZone[];
};

export function terminalNodes(graph: TreeGraph): TreeNode[] {
  const childIds = new Set<number>();
  for (const node of graph.nodes) for (const childId of node.children) childIds.add(childId);
  return graph.nodes.filter((node) => !childIds.has(node.id));
}

export function getNodeById(graph: TreeGraph, id: number): TreeNode | undefined {
  return graph.nodes.find((node) => node.id === id);
}
