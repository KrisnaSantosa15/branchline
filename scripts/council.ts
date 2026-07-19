import { randomUUID } from "node:crypto";
import { analyzeRepository } from "../src/lib/analysis";
import { createCouncilEvidencePack } from "../src/lib/council";
import { connectRepositorySource, isRemoteRepositorySource } from "../src/lib/repository";

type Format = "json" | "markdown";

function flag(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function usage() {
  return `Branchline Release Council\n\nUsage:\n  branchline council <local-git-path-or-public-https-url> [base-commit] [head-commit] [--format json|markdown]\n\nThe Council command prints an immutable, redacted evidence pack for specialist review. It does not call a model, execute repository code, write a report, deploy, or make a release decision.`;
}

function rolePrompt(role: string) {
  const prompts: Record<string, string> = {
    "contract-guardian": "Inspect changed contracts and direct consumers. Require an evidence-linked compatibility path before approving an incompatible release.",
    "test-observability": "Inspect tests, verification gaps, and measurable release signals. Do not infer runtime coverage from absent repository evidence.",
    "rollout-commander": "Choose the narrowest defensible rollout or rollback path. Name a concrete trigger that would stop expansion.",
    "security-config": "Inspect secrets-redaction notices, dependency/configuration/migration findings, and operational configuration risk. Never request sensitive source excerpts.",
  };
  return prompts[role];
}

function markdown(pack: ReturnType<typeof createCouncilEvidencePack>) {
  return `# Branchline Release Council packet\n\n- Evidence hash: \`${pack.hash}\`\n- Repository: \`${pack.scope.repository}\`\n- Boundary: \`${pack.scope.baseCommit}\` → \`${pack.scope.headCommit}\`\n- Diff: ${pack.scope.diffSummary.filesChanged} files, +${pack.scope.diffSummary.insertions}/-${pack.scope.diffSummary.deletions}\n\n## Specialist briefs\n\n${["contract-guardian", "test-observability", "rollout-commander", "security-config"].map((role) => `### ${role}\n\n${rolePrompt(role)}`).join("\n\n")}\n\n## Findings\n\n${pack.findings.map((finding) => `- **${finding.severity.toUpperCase()}** — ${finding.title}\n  - ${finding.detail}`).join("\n")}\n\n## Evidence index\n\n${pack.evidence.map((item) => `- \`${item.id}\` — \`${item.path}\`: ${item.label}`).join("\n")}\n\n## Report contract\n\nEach specialist must return JSON with \`schemaVersion\`, \`evidencePackHash\`, \`role\`, \`verdict\`, \`recommendation\`, \`summary\`, \`claims\`, \`unknowns\`, \`requiredVerifications\`, and \`rollbackTriggers\`. Claims must cite only evidence IDs in this packet. A human must resolve disagreements.\n\n> ${pack.limitations.join(" ")}\n`;
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(usage());
    return;
  }
  const format = (flag("--format") ?? "markdown") as Format;
  if (format !== "json" && format !== "markdown") throw new Error(`Unsupported Council format: ${format}. Use json or markdown.`);
  const positional = process.argv.slice(2).filter((argument, index, values) => !argument.startsWith("-") && values[index - 1] !== "--format" && values[index - 1] !== "--base" && values[index - 1] !== "--head");
  const sourceInput = flag("--repo") ?? positional[0];
  if (!sourceInput) throw new Error(`Missing Git repository path or public HTTPS URL.\n\n${usage()}`);
  if (!isRemoteRepositorySource(sourceInput)) process.env.BRANCHLINE_REPO_ROOT ??= sourceInput;
  const repository = await connectRepositorySource(sourceInput);
  if (repository.commits.length < 2) throw new Error("Branchline needs at least two commits to create a Council packet.");
  const baseCommit = flag("--base") ?? positional[1] ?? repository.commits[1].hash;
  const headCommit = flag("--head") ?? positional[2] ?? repository.commits[0].hash;
  const analysis = await analyzeRepository({ workspaceId: randomUUID(), repositoryPath: repository.repositoryPath, baseCommit, headCommit });
  const pack = createCouncilEvidencePack({ repositoryPath: repository.source.value, analysis });
  console.log(format === "json" ? JSON.stringify(pack, null, 2) : markdown(pack));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Branchline Council failed.");
  process.exitCode = 1;
});
