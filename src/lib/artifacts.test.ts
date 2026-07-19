import { describe, expect, it } from "vitest";
import { deterministicMitigations, exportReleaseBrief } from "@/lib/artifacts";
import { createCouncilEvidencePack, startCouncilReview } from "@/lib/council";
import { startScenario } from "@/lib/simulation";
import type { AnalysisResult, Workspace } from "@/lib/domain";

const analysis: AnalysisResult = {
  id: "analysis-1", workspaceId: "workspace-1", baseCommit: "base1234", headCommit: "head1234", diffSummary: { filesChanged: 1, insertions: 1, deletions: 1 }, secretWarnings: [], graph: { nodes: [], edges: [] }, createdAt: "2026-07-19T00:00:00.000Z",
  findings: [{ id: "finding-1", kind: "api-contract-tightened", title: "riskLevel is now required", detail: "A contract changed.", confidence: "high", severity: "critical", impactedFiles: ["src/api/release-risk.ts"], metadata: { property: "riskLevel" }, evidence: [{ id: "evidence-1", path: "src/api/release-risk.ts", label: "optional property became required", detail: "riskLevel? changed to riskLevel" }] }],
};
const workspace: Workspace = { id: "workspace-1", name: "Fixture release", repositoryPath: "D:/fixture", source: { kind: "local", value: "D:/fixture" }, commits: [], createdAt: "2026-07-19T00:00:00.000Z", updatedAt: "2026-07-19T00:00:00.000Z" };

describe("release artifacts", () => {
  it("makes a contract test and evidence-led Markdown brief", () => {
    const mitigations = deterministicMitigations(workspace.id, analysis);
    const scenario = startScenario(workspace.id, analysis);
    const councilReview = startCouncilReview({ workspaceId: workspace.id, analysisId: analysis.id, evidencePack: createCouncilEvidencePack({ workspace, analysis, scenario }), scenarioId: scenario.id });
    const artifact = exportReleaseBrief(workspace, analysis, scenario, mitigations, councilReview);
    expect(mitigations[0].testSnippet).toContain("riskLevel");
    expect(artifact.markdown).toContain("riskLevel is now required");
    expect(artifact.markdown).toContain("deterministic rehearsal outcomes");
    expect(artifact.markdown).toContain("Release Council");
    expect(artifact.json.councilReview?.evidencePackHash).toBe(councilReview.evidencePackHash);
  });
});
