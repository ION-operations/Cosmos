import { describe, expect, it } from "vitest";
import { evaluateReferenceRegression, referenceBaselines } from "../src/core/referenceRegression";

describe("reference regression contract", () => {
  it("blocks candidates that have not demonstrated all required reference features", () => {
    const report = evaluateReferenceRegression({
      aspect: "junction_collar",
      authorityGatePassed: true,
      preservedFeatures: ["buried child base"],
      knownRegressions: [],
      improvements: []
    });

    expect(report.status).toBe("blocked");
    expect(report.missingRequiredFeatures).toContain("collar ridge");
    expect(report.missingRequiredFeatures).toContain("compression shoulder");
  });

  it("forbids promotion when any known regression is present", () => {
    const report = evaluateReferenceRegression({
      aspect: "branch_architecture",
      authorityGatePassed: true,
      preservedFeatures: referenceBaselines.branch_architecture.mustPreserve,
      knownRegressions: ["twig spaghetti"],
      improvements: []
    });

    expect(report.status).toBe("regressed");
    expect(report.regressions).toContain("twig spaghetti");
  });

  it("allows promotable only when authority, parity, and improvements are present", () => {
    const report = evaluateReferenceRegression({
      aspect: "trunk_leader",
      authorityGatePassed: true,
      preservedFeatures: referenceBaselines.trunk_leader.mustPreserve,
      knownRegressions: [],
      improvements: ["explicit Leader continuation metric"]
    });

    expect(report.status).toBe("promotable");
  });
});
