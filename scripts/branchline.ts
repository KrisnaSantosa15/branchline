import { randomUUID } from "node:crypto";
import { analyzeRepository } from "../src/lib/analysis";
import { deterministicMitigations } from "../src/lib/artifacts";
import { connectRepositorySource, isRemoteRepositorySource } from "../src/lib/repository";

function flag(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function usage() {
  return `Branchline — evidence-led release rehearsal\n\nUsage:\n  npm run branchline -- <local-git-path-or-public-https-url> [base-commit] [head-commit]\n\nThe command reads Git history only. It never executes target repository code, runs tests, deploys, or sends evidence to a model provider.`;
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(usage());
    return;
  }

  const positional = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));
  const sourceInput = flag("--repo") ?? positional[0];
  if (!sourceInput) throw new Error(`Missing Git repository path or public HTTPS URL.\n\n${usage()}`);

  // The CLI is invoked by an authorized agent for an explicit repository. Scope
  // the local-only path guard to that repository unless the caller set a broader
  // approved root intentionally.
  if (!isRemoteRepositorySource(sourceInput)) process.env.BRANCHLINE_REPO_ROOT ??= sourceInput;
  const repository = await connectRepositorySource(sourceInput);
  if (repository.commits.length < 2) throw new Error("Branchline needs at least two commits to rehearse a release boundary.");

  const baseCommit = flag("--base") ?? positional[1] ?? repository.commits[1].hash;
  const headCommit = flag("--head") ?? positional[2] ?? repository.commits[0].hash;

  const workspaceId = randomUUID();
  const analysis = await analyzeRepository({ workspaceId, repositoryPath: repository.repositoryPath, baseCommit, headCommit });
  const mitigations = deterministicMitigations(workspaceId, analysis);
  console.log(`# Branchline agent brief\n\n## Release boundary\n\n- Repository: \`${repository.repositoryPath}\`\n- Base: \`${baseCommit}\`\n- Candidate: \`${headCommit}\`\n- Diff: ${analysis.diffSummary.filesChanged} files, +${analysis.diffSummary.insertions}/-${analysis.diffSummary.deletions}\n\n## Evidence-led findings\n\n${analysis.findings.map((finding) => `- **${finding.severity.toUpperCase()}** — ${finding.title}: ${finding.detail}\n  - Evidence: ${finding.evidence.map((item) => `\`${item.path}\` (${item.label})`).join("; ")}`).join("\n")}\n\n## Deterministic mitigation proposals\n\n${mitigations.map((mitigation) => `- **${mitigation.title}** (${mitigation.owner})\n  - Verify: ${mitigation.verification}\n  - Fallback: ${mitigation.fallback}`).join("\n")}\n\n## Agent decision\n\nUse the evidence above to recommend a rollout strategy, name the assumptions, and keep a human responsible for accepting, changing, or rejecting every mitigation.\n\n> Branchline's metrics and findings are a deterministic rehearsal, not production telemetry or a deployment instruction.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Branchline analysis failed.");
  process.exitCode = 1;
});
