import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@/lib/domain";
import { applyDecision, branchScenario, compareScenarios, startScenario } from "@/lib/simulation";

const analysis: AnalysisResult = {
  id: "analysis-1",
  workspaceId: "workspace-1",
  baseCommit: "base1234",
  headCommit: "head1234",
  diffSummary: { filesChanged: 1, insertions: 1, deletions: 1 },
  secretWarnings: [],
  graph: { nodes: [], edges: [] },
  findings: [{ id: "finding-1", kind: "api-contract-tightened", title: "riskLevel is now required", detail: "A contract changed.", confidence: "high", severity: "critical", impactedFiles: ["src/api/release-risk.ts"], metadata: { property: "riskLevel" }, evidence: [{ id: "evidence-1", path: "src/api/release-risk.ts", label: "optional property became required", detail: "riskLevel? changed to riskLevel" }] }],
  createdAt: "2026-07-19T00:00:00.000Z",
};

describe("release rehearsal rules", () => {
  it("contains the contract blast radius with a canary and compatibility adapter", () => {
    const started = startScenario("workspace-1", analysis);
    const canary = applyDecision(started, analysis, "canary");
    const adapted = applyDecision(canary, analysis, "compatibility-adapter");
    expect(canary.state.clientErrorRate).toBeGreaterThan(0);
    expect(adapted.state.compatibilityWindowOpen).toBe(true);
    expect(adapted.state.testConfidence).toBeGreaterThan(canary.state.testConfidence);
    expect(adapted.state.clientErrorRate).toBeLessThanOrEqual(canary.state.clientErrorRate);
  });

  it("keeps a branch independent and makes its lower-risk path comparable", () => {
    const started = startScenario("workspace-1", analysis);
    const full = applyDecision(started, analysis, "full-rollout");
    const alternate = applyDecision(branchScenario(started, "canary path"), analysis, "canary");
    const comparison = compareScenarios(full, alternate);
    expect(full.state.clientErrorRate).toBeGreaterThan(alternate.state.clientErrorRate);
    expect(comparison.deltas.find((delta) => delta.label === "Client error rate")?.better).toBe("alternate");
    expect(started.decisions).toHaveLength(0);
  });
});
