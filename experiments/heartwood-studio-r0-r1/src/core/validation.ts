import { TreeGraph, terminalNodes } from "./treeTypes";

export type GateResult = {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail";
  severity: "info" | "warning" | "fail";
  message: string;
  evidence?: string[];
};

export type ValidationReport = {
  status: "pass" | "warning" | "fail";
  gateResults: GateResult[];
};

function summarize(gates: GateResult[]): ValidationReport["status"] {
  if (gates.some((gate) => gate.status === "fail")) return "fail";
  if (gates.some((gate) => gate.status === "warning")) return "warning";
  return "pass";
}

function graphAuthorityGate(graph: TreeGraph): GateResult {
  const ids = new Set(graph.nodes.map((node) => node.id));
  const orphanIds = graph.nodes.filter((node) => node.parentId !== null && !ids.has(node.parentId)).map((node) => node.id);

  return orphanIds.length === 0
    ? { id: "graph_authority_gate", label: "Graph authority", status: "pass", severity: "fail", message: "Every node has a valid TreeGraph parent or is the root Leader." }
    : { id: "graph_authority_gate", label: "Graph authority", status: "fail", severity: "fail", message: "Orphan nodes found. Renderer-owned anonymous limbs would be possible.", evidence: orphanIds.map(String) };
}

function leaderContinuityGate(graph: TreeGraph): GateResult {
  const leaders = graph.nodes.filter((node) => node.kind === "leader" && node.order === 0);
  const rootLeader = leaders.find((node) => node.parentId === null);
  const hasContinuation = rootLeader ? leaders.some((node) => node.parentId === rootLeader.id) : false;

  if (!rootLeader) return { id: "leader_continuity_gate", label: "Leader continuity", status: "fail", severity: "fail", message: "No order-0 root Leader found." };

  return hasContinuation
    ? { id: "leader_continuity_gate", label: "Leader continuity", status: "pass", severity: "fail", message: "Trunk is represented as a continuing order-0 Leader spine." }
    : { id: "leader_continuity_gate", label: "Leader continuity", status: "fail", severity: "fail", message: "Leader exists but has no continuation into the crown." };
}

function endpointStateGate(graph: TreeGraph): GateResult {
  const bad = terminalNodes(graph).filter((node) => node.endpointState === "unresolved");
  return bad.length === 0
    ? { id: "endpoint_state_gate", label: "Endpoint taxonomy", status: "pass", severity: "fail", message: "All terminal nodes have biological endpoint states." }
    : { id: "endpoint_state_gate", label: "Endpoint taxonomy", status: "fail", severity: "fail", message: "Unresolved terminal endpoints detected.", evidence: bad.map((node) => `${node.id}:${node.kind}`) };
}

function flatCapGate(graph: TreeGraph): GateResult {
  const bad = terminalNodes(graph).filter((node) => node.terminalTreatment === "flat_cap" && node.endpointState !== "old_cut" && node.endpointState !== "scarred_cut");
  return bad.length === 0
    ? { id: "flat_cap_gate", label: "No arbitrary flat caps", status: "pass", severity: "fail", message: "No terminal uses arbitrary flat-cap geometry." }
    : { id: "flat_cap_gate", label: "No arbitrary flat caps", status: "fail", severity: "fail", message: "Flat caps are only valid for explicit cut/scar states.", evidence: bad.map((node) => `${node.id}:${node.endpointState}`) };
}

function unionZoneGate(graph: TreeGraph): GateResult {
  const bad = graph.unionZones.filter((zone) => zone.blobInflation > 0.001 || zone.buriedChildBase01 < 0.25 || zone.c1Continuity < 0.65);
  return bad.length === 0
    ? { id: "junction_continuity_gate", label: "UnionZone continuity", status: "pass", severity: "fail", message: "UnionZones use buried child bases and C1 continuity, not blob inflation." }
    : { id: "junction_continuity_gate", label: "UnionZone continuity", status: "fail", severity: "fail", message: "Blob, shallow burial, or low-continuity union detected.", evidence: bad.map((zone) => `${zone.parentId}->${zone.childId}`) };
}

export function validateTreeGraph(graph: TreeGraph): ValidationReport {
  const gateResults = [graphAuthorityGate(graph), leaderContinuityGate(graph), endpointStateGate(graph), flatCapGate(graph), unionZoneGate(graph)];
  return { status: summarize(gateResults), gateResults };
}
