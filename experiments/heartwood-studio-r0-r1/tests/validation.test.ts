import { describe, expect, it } from "vitest";
import { createDemoTreeGraph } from "../src/core/createDemoTreeGraph";
import { speciesRegistry } from "../src/core/species";
import { validateTreeGraph } from "../src/core/validation";

describe("R0/R1 structural gates", () => {
  it("demo oak passes structural gates", () => {
    const graph = createDemoTreeGraph(speciesRegistry.oak);
    const report = validateTreeGraph(graph);
    expect(report.status).toBe("pass");
  });

  it("flat caps fail unless endpoint is cut or scar", () => {
    const graph = createDemoTreeGraph(speciesRegistry.oak);
    const terminal = graph.nodes.find((node) => node.children.length === 0)!;
    terminal.terminalTreatment = "flat_cap";
    terminal.endpointState = "living_tip";
    const report = validateTreeGraph(graph);
    expect(report.status).toBe("fail");
    expect(report.gateResults.find((gate) => gate.id === "flat_cap_gate")?.status).toBe("fail");
  });

  it("blob unions fail", () => {
    const graph = createDemoTreeGraph(speciesRegistry.oak);
    graph.unionZones[0]!.blobInflation = 0.5;
    const report = validateTreeGraph(graph);
    expect(report.status).toBe("fail");
    expect(report.gateResults.find((gate) => gate.id === "junction_continuity_gate")?.status).toBe("fail");
  });
});
