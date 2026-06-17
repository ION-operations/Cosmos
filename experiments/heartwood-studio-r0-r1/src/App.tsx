import { useMemo, useState } from "react";
import { createDemoTreeGraph } from "./core/createDemoTreeGraph";
import { speciesRegistry, SpeciesId } from "./core/species";
import { terminalNodes, TreeGraph, TreeNode } from "./core/treeTypes";
import { validateTreeGraph } from "./core/validation";

type WorkbenchId =
  | "branch_architecture"
  | "trunk_leader"
  | "junction_collar"
  | "endpoints_damage"
  | "reference_oracle"
  | "gpu_diagnostics";

const WORKBENCHES: { id: WorkbenchId; title: string; phase: string; objective: string }[] = [
  { id: "branch_architecture", title: "Branch Architecture", phase: "R1", objective: "Graph-owned scaffold limbs, branches, twigs, and endpoints." },
  { id: "trunk_leader", title: "Trunk / Leader", phase: "R1", objective: "Trunk is the order-0 Leader continuation through the crown." },
  { id: "junction_collar", title: "Junction / Collar", phase: "R2", objective: "UnionZone continuity instead of blobbed branch joints." },
  { id: "endpoints_damage", title: "Endpoints / Damage", phase: "R1", objective: "Every terminal has a biological endpoint state." },
  { id: "reference_oracle", title: "Reference Oracle", phase: "R0", objective: "Evidence board for target features and forbidden failures." },
  { id: "gpu_diagnostics", title: "GPU Diagnostics", phase: "R0", objective: "Raw WGSL smoke runtime placeholder." }
];

function nodeLabel(node: TreeNode) {
  return `${node.id} · ${node.kind} · order ${node.order}`;
}

function TreeGraphPanel({ graph, selectedNodeId, setSelectedNodeId }: { graph: TreeGraph; selectedNodeId: number | null; setSelectedNodeId: (id: number) => void }) {
  const terminals = terminalNodes(graph);
  const selected = graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes[0];

  return (
    <div className="graphGrid">
      <section className="viewportCard">
        <h2>Graph-owned skeleton preview</h2>
        <p>Foliage stays hidden until skeleton, endpoint, Leader, and UnionZone gates pass.</p>
        <div className="nodeList">
          {graph.nodes.map((node) => (
            <button key={node.id} className={node.id === selected?.id ? "nodeButton active" : "nodeButton"} onClick={() => setSelectedNodeId(node.id)}>
              <b>{nodeLabel(node)}</b>
              <span>{node.endpointState} / {node.terminalTreatment}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panelCard">
        <h2>Selected node</h2>
        {selected ? (
          <div className="kv">
            <span>ID</span><b>{selected.id}</b>
            <span>Parent</span><b>{selected.parentId ?? "none"}</b>
            <span>Kind</span><b>{selected.kind}</b>
            <span>Endpoint</span><b>{selected.endpointState}</b>
            <span>Terminal</span><b>{selected.terminalTreatment}</b>
            <span>Branch binding</span><b>{selected.branchBinding}</b>
            <span>Junction mask</span><b>{selected.junctionMask}</b>
            <span>Children</span><b>{selected.children.join(", ") || "none"}</b>
          </div>
        ) : null}
        <h3>Terminals</h3>
        <ul>{terminals.map((node) => <li key={node.id}>{nodeLabel(node)} — {node.endpointState}</li>)}</ul>
      </section>
    </div>
  );
}

function ReferenceOracle() {
  const records = [
    { id: "oak_junction_001", species: "oak", aspect: "branch_junction", target: "raised collar ridge; branch emerges from parent mass", forbidden: "glued tube; spherical blob; hard socket seam" },
    { id: "birch_bark_001", species: "birch", aspect: "bark", target: "white peeling sheets; black scars/lenticels", forbidden: "generic brown noise; oak-like fissures" },
    { id: "willow_strands_001", species: "willow", aspect: "foliage", target: "pendant curtains; drooping strand chains", forbidden: "generic leaf blob; stiff upright clusters" },
    { id: "pine_needles_001", species: "pine", aspect: "needles", target: "needle fascicle bundles; whorled branch tiers", forbidden: "green leaf cards; broadleaf blob" }
  ];

  return (
    <section className="viewportCard">
      <h2>Reference Oracle</h2>
      <p>Metadata-first evidence board. Actual images are wired under public/references next.</p>
      <div className="oracleGrid">
        {records.map((record) => (
          <article key={record.id} className="referenceCard">
            <b>{record.id}</b>
            <span>{record.species} / {record.aspect}</span>
            <p><b>Target:</b> {record.target}</p>
            <p><b>Forbidden:</b> {record.forbidden}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function GpuDiagnostics() {
  return (
    <section className="viewportCard">
      <h2>GPU Diagnostics</h2>
      <p>R0 contract: compile WGSL, bind validation buffer, dispatch compute, read status back. The concrete runtime is the next file group.</p>
      <pre>@compute @workgroup_size(1) fn main() {'{'} result[0] = 1u; {'}'}</pre>
    </section>
  );
}

export function App() {
  const [speciesId, setSpeciesId] = useState<SpeciesId>("oak");
  const [workbenchId, setWorkbenchId] = useState<WorkbenchId>("branch_architecture");
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  const species = speciesRegistry[speciesId];
  const graph = useMemo(() => createDemoTreeGraph(species), [species]);
  const report = useMemo(() => validateTreeGraph(graph), [graph]);
  const workbench = WORKBENCHES.find((item) => item.id === workbenchId)!;

  return (
    <div className="studio">
      <header className="topbar">
        <div>
          <div className="eyebrow">Heartwood Studio R0/R1</div>
          <h1>TreeGraph authority · aspect workbenches · validation gates</h1>
        </div>
        <div className={`statusPill ${report.status}`}>
          <b>{species.name}</b>
          <span>{graph.nodes.length} nodes · {graph.unionZones.length} UnionZones · {report.status.toUpperCase()}</span>
        </div>
      </header>

      <aside className="leftRail">
        <div className="sectionTitle">Workbench route</div>
        {WORKBENCHES.map((item) => (
          <button key={item.id} className={item.id === workbenchId ? "navButton active" : "navButton"} onClick={() => setWorkbenchId(item.id)}>
            <span>{item.title}</span><em>{item.phase}</em>
          </button>
        ))}
      </aside>

      <main className="viewport">
        <div className="viewportOverlay">
          <b>{workbench.title}</b>
          <select value={speciesId} onChange={(event) => setSpeciesId(event.target.value as SpeciesId)}>
            {Object.values(speciesRegistry).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        {workbenchId === "reference_oracle" ? <ReferenceOracle /> : workbenchId === "gpu_diagnostics" ? <GpuDiagnostics /> : <TreeGraphPanel graph={graph} selectedNodeId={selectedNodeId} setSelectedNodeId={setSelectedNodeId} />}
      </main>

      <aside className="rightInspector">
        <section className="panelCard">
          <h2>{workbench.title}</h2>
          <p>{workbench.objective}</p>
          <div className="kv"><span>Phase</span><b>{workbench.phase}</b><span>Species</span><b>{species.name}</b></div>
        </section>

        <section className="panelCard">
          <h2>Validation Gates</h2>
          <div className={`reportStatus ${report.status}`}>{report.status.toUpperCase()}</div>
          {report.gateResults.map((gate) => (
            <div key={gate.id} className={`gate ${gate.status}`}>
              <b>{gate.label}</b>
              <span>{gate.message}</span>
              {gate.evidence?.length ? <code>{gate.evidence.join(", ")}</code> : null}
            </div>
          ))}
        </section>
      </aside>

      <footer className="bottomDock"><b>Promotion rule:</b><span>No full-tree merge until graph authority, endpoints, Leader continuity, and UnionZone gates pass.</span></footer>
    </div>
  );
}
