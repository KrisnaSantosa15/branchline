import { describe, expect, it } from "vitest";
import { createCouncilEvidencePack, synthesizeCouncil, validateCouncilReport } from "@/lib/council";
import type { AnalysisResult, CouncilReport } from "@/lib/domain";

const analysis: AnalysisResult = {
  id: "analysis-ephemeral", workspaceId: "workspace-1", baseCommit: "base1234", headCommit: "head1234", diffSummary: { filesChanged: 1, insertions: 2, deletions: 1 }, secretWarnings: [], graph: { nodes: [], edges: [] }, createdAt: "2026-07-19T00:00:00.000Z",
  findings: [{ id: "finding-1", kind: "api-contract-tightened", title: "riskLevel is now required", detail: "A contract changed.", confidence: "high", severity: "critical", impactedFiles: ["src/api/release-risk.ts"], evidence: [{ id: "evidence-1", path: "src/api/release-risk.ts", label: "optional property became required", detail: "riskLevel? changed to riskLevel" }] }],
};

function report(packHash: string, overrides: Partial<CouncilReport> = {}): CouncilReport {
  return {
    schemaVersion: 1,
    evidencePackHash: packHash,
    role: "contract-guardian",
    verdict: "caution",
    recommendation: "compatibility-adapter",
    summary: "A compatibility window is required.",
    claims: [{ statement: "The field is now required.", impact: "critical", confidence: "high", evidenceIds: ["evidence-1"] }],
    unknowns: ["Runtime client version mix is not in Git history."],
    requiredVerifications: ["Run a legacy contract test."],
    rollbackTriggers: ["Legacy response parsing fails."],
    ...overrides,
  };
}

describe("Council evidence and reports", () => {
  it("creates a stable evidence hash without ephemeral analysis IDs", () => {
    const first = createCouncilEvidencePack({ repositoryPath: "/repo", analysis });
    const second = createCouncilEvidencePack({ repositoryPath: "/repo", analysis: { ...analysis, id: "analysis-new", createdAt: "later" } });
    expect(first.hash).toBe(second.hash);
    expect(first.evidence[0].findingTitle).toBe("riskLevel is now required");
  });

  it("accepts evidence-bound reports and rejects evidence outside the pack", () => {
    const pack = createCouncilEvidencePack({ repositoryPath: "/repo", analysis });
    expect(validateCouncilReport(report(pack.hash), pack).role).toBe("contract-guardian");
    expect(() => validateCouncilReport(report(pack.hash, { claims: [{ statement: "Unsupported", impact: "high", confidence: "high", evidenceIds: ["unknown"] }] }), pack)).toThrow("outside this pack");
  });

  it("makes disagreement explicit instead of silently voting it away", () => {
    const pack = createCouncilEvidencePack({ repositoryPath: "/repo", analysis });
    const synthesis = synthesizeCouncil(pack, [
      report(pack.hash),
      report(pack.hash, { role: "rollout-commander", verdict: "block", recommendation: "rollback", summary: "Do not expand traffic." }),
    ]);
    expect(synthesis.overallVerdict).toBe("block");
    expect(synthesis.disagreements.map((item) => item.kind)).toEqual(["verdict", "recommendation"]);
    expect(synthesis.missingRoles).toContain("security-config");
  });
});
