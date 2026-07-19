import { randomUUID } from "node:crypto";
import type { AnalysisResult, Mitigation, Scenario, Workspace } from "@/lib/domain";

function now() {
  return new Date().toISOString();
}

export function deterministicMitigations(workspaceId: string, analysis: AnalysisResult): Mitigation[] {
  const contract = analysis.findings.find((finding) => finding.kind === "api-contract-tightened");
  const evidenceIds = (contract?.evidence ?? analysis.findings.flatMap((finding) => finding.evidence).slice(0, 2)).map((item) => item.id);
  const createdAt = now();
  if (contract) {
    const property = String(contract.metadata?.property ?? "changedField");
    return [
      {
        id: randomUUID(),
        workspaceId,
        analysisId: analysis.id,
        title: `Keep ${property} backward-compatible during rollout`,
        rationale: `The selected diff made ${property} required. Preserve an adapter/default value while legacy consumers update.`,
        owner: "engineering",
        verification: "Run the generated contract test against both the legacy and new response shapes before expanding traffic.",
        fallback: "Disable the new response requirement or roll back to the previous contract version.",
        testSnippet: `import { describe, expect, it } from "vitest";

describe("release contract: ${property}", () => {
  it("keeps the legacy response readable during the compatibility window", async () => {
    const response = await fetch("/api/release-risk");
    const body = await response.json();
    expect(body).toHaveProperty("${property}");
    expect(body.${property}).not.toBeNull();
  });
});`,
        evidenceIds,
        source: "deterministic",
        status: "proposed",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: randomUUID(),
        workspaceId,
        analysisId: analysis.id,
        title: "Gate expansion on legacy-client contract telemetry",
        rationale: "The canary rehearsal exposes the affected contract path early; maintain a narrow traffic slice until error and support thresholds are understood.",
        owner: "release-captain",
        verification: "Confirm the canary has no unexpected legacy contract errors and the compatibility path has a documented sunset date.",
        fallback: "Hold or roll back the canary without expanding traffic.",
        evidenceIds,
        source: "deterministic",
        status: "proposed",
        createdAt,
        updatedAt: createdAt,
      },
    ];
  }
  return [
    {
      id: randomUUID(),
      workspaceId,
      analysisId: analysis.id,
      title: "Rehearse the changed interface behind a canary",
      rationale: "No explicit API tightening was detected, but a narrow rollout reveals integration failure modes before full traffic exposure.",
      owner: "release-captain",
      verification: "Review changed consumers and the selected diff before increasing traffic.",
      fallback: "Roll back the change and add a focused regression test.",
      evidenceIds,
      source: "deterministic",
      status: "proposed",
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export function exportReleaseBrief(workspace: Workspace, analysis: AnalysisResult, scenario: Scenario, mitigations: Mitigation[]) {
  const accepted = mitigations.filter((mitigation) => mitigation.status === "accepted" || mitigation.status === "edited");
  const evidence = analysis.findings.flatMap((finding) => finding.evidence);
  const markdown = `# Branchline release brief — ${workspace.name}

Generated ${new Date().toISOString()}

## Scope

- Repository: \`${workspace.repositoryPath}\`
- Base commit: \`${analysis.baseCommit}\`
- Head commit: \`${analysis.headCommit}\`
- Diff: ${analysis.diffSummary.filesChanged} files, +${analysis.diffSummary.insertions}/-${analysis.diffSummary.deletions}

## Scenario status

- Status: **${scenario.state.releaseStatus}**
- Decisions: ${scenario.decisions.length ? scenario.decisions.join(" → ") : "No release decision applied"}
- Traffic affected (scenario): ${scenario.state.trafficAffected}%
- Client error rate (scenario): ${scenario.state.clientErrorRate}%
- Support load (scenario): ${scenario.state.supportLoad}/100
- On-call urgency (scenario): ${scenario.state.onCallUrgency}/100
- Test confidence: ${scenario.state.testConfidence}/100

> These are deterministic rehearsal outcomes derived from Branchline scenario rules. They are not observed production telemetry or outage predictions.

## Evidence-led findings

${analysis.findings
  .map((finding) => `### ${finding.title}\n\n- Severity: ${finding.severity}\n- Confidence: ${finding.confidence}\n- ${finding.detail}\n- Evidence: ${finding.evidence.map((item) => `\`${item.path}\` — ${item.label}`).join("; ")}`)
  .join("\n\n")}

## Event trace

${scenario.events.map((item) => `- **${item.actor}** — ${item.title}: ${item.detail}\n  - Rule: ${item.rule}`).join("\n")}

## Accepted mitigations

${accepted.length ? accepted.map((item) => `- **${item.title}** (${item.owner})\n  - Verify: ${item.verification}\n  - Fallback: ${item.fallback}`).join("\n") : "No mitigations accepted yet."}

## Assumptions and privacy

- Branchline analyzed a local Git diff and stored the resulting audit trail locally.
- Model-generated suggestions, when enabled, are separated from deterministic findings and require review.
- Potential secrets detected in diff excerpts are redacted before model context is built.

## Evidence index

${evidence.map((item) => `- ${item.id}: \`${item.path}\` — ${item.detail}`).join("\n")}
`;
  return { markdown, json: { workspace, analysis, scenario, mitigations } };
}
