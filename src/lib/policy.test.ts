import { describe, expect, it } from "vitest";
import { evaluateReleasePolicy, parseReleasePolicy } from "@/lib/policy";
import type { AnalysisResult, Scenario } from "@/lib/domain";

const analysis: AnalysisResult = {
  id: "analysis-1", workspaceId: "workspace-1", baseCommit: "base", headCommit: "head", diffSummary: { filesChanged: 1, insertions: 2, deletions: 1 }, secretWarnings: [], graph: { nodes: [], edges: [] }, createdAt: "2026-07-19T00:00:00.000Z",
  findings: [{ id: "contract", kind: "api-contract-tightened", title: "riskLevel is now required", detail: "contract", confidence: "high", severity: "critical", impactedFiles: ["src/api.ts"], evidence: [{ id: "evidence-contract", path: "src/api.ts", label: "tightened", detail: "riskLevel" }] }],
};

const scenario: Scenario = {
  id: "scenario", workspaceId: "workspace-1", analysisId: "analysis-1", title: "test", parentScenarioId: undefined, decisions: ["compatibility-adapter"], events: [], createdAt: "now", updatedAt: "now",
  state: { trafficAffected: 5, clientErrorRate: 0, supportLoad: 0, onCallUrgency: 0, testConfidence: 82, releaseStatus: "observing", compatibilityWindowOpen: true, scenarioRisk: "critical" },
};

describe("release policy", () => {
  it("parses the documented flat YAML policy shape", () => {
    expect(parseReleasePolicy("# Release gate\nversion: 1 # current schema\nrequireScenarioDecision: true\nminTestConfidence: 80\nrequireCompatibilityForContractTightening: true\n")).toMatchObject({ requireScenarioDecision: true, minTestConfidence: 80, requireCompatibilityForContractTightening: true });
    expect(() => parseReleasePolicy("unexpected: true")).toThrow("unsupported key");
  });

  it("fails a contract gate until the deterministic scenario records compatibility", () => {
    const policy = parseReleasePolicy("version: 1\nrequireScenarioDecision: true\nminTestConfidence: 80\nrequireCompatibilityForContractTightening: true\n");
    const withoutScenario = evaluateReleasePolicy({ policy, source: "fixture", analysis });
    expect(withoutScenario.status).toBe("fail");
    const withScenario = evaluateReleasePolicy({ policy, source: "fixture", analysis, scenario });
    expect(withScenario.status).toBe("pass");
  });
});
