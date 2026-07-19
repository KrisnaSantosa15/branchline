import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { beforeEach, describe, expect, it } from "vitest";
import type { AnalysisResult } from "@/lib/domain";

process.env.VITEST = "true";
process.env.BRANCHLINE_DB_PATH = join(tmpdir(), `branchline-test-${randomUUID()}.db`);

const { createWorkspace, getLatestAnalysis, getWorkspace, listMitigations, listScenarios, listWorkspaces, resetDatabaseForTests, saveAnalysis, saveMitigation, saveScenario, updateMitigation } = await import("@/lib/persistence");
const { deterministicMitigations } = await import("@/lib/artifacts");
const { startScenario } = await import("@/lib/simulation");

const analysis = (workspaceId: string): AnalysisResult => ({
  id: randomUUID(), workspaceId, baseCommit: "base1234", headCommit: "head1234", diffSummary: { filesChanged: 1, insertions: 1, deletions: 1 }, secretWarnings: [], graph: { nodes: [], edges: [] }, createdAt: "2026-07-19T00:00:00.000Z",
  findings: [{ id: "finding-1", kind: "api-contract-tightened", title: "riskLevel is now required", detail: "A contract changed.", confidence: "high", severity: "critical", impactedFiles: ["src/api/release-risk.ts"], metadata: { property: "riskLevel" }, evidence: [{ id: "evidence-1", path: "src/api/release-risk.ts", label: "optional property became required", detail: "riskLevel? changed to riskLevel" }] }],
});

beforeEach(() => resetDatabaseForTests());

describe("SQLite persistence", () => {
  it("persists a workspace, analysis, scenario, and mitigation decision", () => {
    const workspace = createWorkspace({ name: "Persistence test", repositoryPath: "D:/fixture", source: { kind: "local", value: "D:/fixture" }, commits: [] });
    const inspected = analysis(workspace.id);
    saveAnalysis(inspected);
    const scenario = saveScenario(startScenario(workspace.id, inspected));
    const mitigation = deterministicMitigations(workspace.id, inspected)[0];
    saveMitigation(mitigation);
    const accepted = updateMitigation(mitigation.id, "accepted");

    expect(getWorkspace(workspace.id)?.name).toBe("Persistence test");
    expect(listWorkspaces().map((item) => item.id)).toContain(workspace.id);
    expect(getLatestAnalysis(workspace.id)?.id).toBe(inspected.id);
    expect(listScenarios(workspace.id)[0].id).toBe(scenario.id);
    expect(listMitigations(inspected.id)[0].status).toBe("accepted");
    expect(accepted?.status).toBe("accepted");
  });
});
