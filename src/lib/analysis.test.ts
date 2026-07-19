import { beforeAll, describe, expect, it } from "vitest";
import { analyzeRepository } from "@/lib/analysis";
import { resetFixture, type FixtureCommits } from "../../scripts/reset-fixture";

let fixture: FixtureCommits;

beforeAll(() => {
  fixture = resetFixture();
});

describe("analyzeRepository", () => {
  it("finds the optional-to-required contract change and its source consumers", async () => {
    const analysis = await analyzeRepository({ workspaceId: "test-workspace", repositoryPath: fixture.repositoryPath, baseCommit: fixture.baseCommit, headCommit: fixture.headCommit });
    const contract = analysis.findings.find((finding) => finding.kind === "api-contract-tightened");
    expect(contract).toMatchObject({ severity: "critical", confidence: "high", metadata: { property: "riskLevel" } });
    expect(contract?.impactedFiles).toContain("src/client/legacy-client.ts");
    expect(analysis.graph.nodes.some((node) => node.kind === "contract" && node.label.includes("riskLevel"))).toBe(true);
    expect(analysis.diffSummary.filesChanged).toBeGreaterThanOrEqual(2);
  });

  it("redacts secret-shaped values in diff evidence", async () => {
    const analysis = await analyzeRepository({ workspaceId: "test-workspace", repositoryPath: fixture.repositoryPath, baseCommit: fixture.baseCommit, headCommit: fixture.headCommit });
    expect(analysis.secretWarnings).toEqual([]);
  });
});
