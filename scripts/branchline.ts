import { randomUUID } from "node:crypto";
import { analyzeRepository } from "../src/lib/analysis";
import { deterministicMitigations } from "../src/lib/artifacts";
import { connectRepository } from "../src/lib/repository";

function flag(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function usage() {
  return `Branchline — evidence-led release rehearsal\n\nUsage:\n  npm run branchline -- <local-git-path> [--base <commit>] [--head <commit>] [--format markdown|json]\n\nThe command reads Git history only. It never executes target repository code, runs tests, deploys, or sends evidence to a model provider.`;
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(usage());
    return;
  }

  const repositoryPath = flag("--repo") ?? process.argv.slice(2).find((argument) => !argument.startsWith("-"));
  if (!repositoryPath) throw new Error(`Missing local Git repository path.\n\n${usage()}`);

  // The CLI is invoked by an authorized agent for an explicit repository. Scope
  // the local-only path guard to that repository unless the caller set a broader
  // approved root intentionally.
  process.env.BRANCHLINE_REPO_ROOT ??= repositoryPath;
  const repository = await connectRepository(repositoryPath);
  if (repository.commits.length < 2) throw new Error("Branchline needs at least two commits to rehearse a release boundary.");

  const baseCommit = flag("--base") ?? repository.commits[1].hash;
  const headCommit = flag("--head") ?? repository.commits[0].hash;
  const requestedFormat = flag("--format") ?? "markdown";
  if (requestedFormat !== "markdown" && requestedFormat !== "json") throw new Error("--format must be markdown or json.");

  const workspaceId = randomUUID();
  const analysis = await analyzeRepository({ workspaceId, repositoryPath: repository.repositoryPath, baseCommit, headCommit });
  const mitigations = deterministicMitigations(workspaceId, analysis);
  const result = {
    source: "branchline-agent-cli",
    repositoryPath: repository.repositoryPath,
    baseCommit,
    headCommit,
    analysis,
    mitigations,
  };

  if (requestedFormat === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`# Branchline agent brief\n\n## Release boundary\n\n- Repository: \`${repository.repositoryPath}\`\n- Base: \`${baseCommit}\`\n- Candidate: \`${headCommit}\`\n- Diff: ${analysis.diffSummary.filesChanged} files, +${analysis.diffSummary.insertions}/-${analysis.diffSummary.deletions}\n\n## Evidence-led findings\n\n${analysis.findings.map((finding) => `- **${finding.severity.toUpperCase()}** — ${finding.title}: ${finding.detail}\n  - Evidence: ${finding.evidence.map((item) => `\`${item.path}\` (${item.label})`).join("; ")}`).join("\n")}\n\n## Deterministic mitigation proposals\n\n${mitigations.map((mitigation) => `- **${mitigation.title}** (${mitigation.owner})\n  - Verify: ${mitigation.verification}\n  - Fallback: ${mitigation.fallback}`).join("\n")}\n\n## Agent decision\n\nUse the evidence above to recommend a rollout strategy, name the assumptions, and keep a human responsible for accepting, changing, or rejecting every mitigation.\n\n> Branchline's metrics and findings are a deterministic rehearsal, not production telemetry or a deployment instruction.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Branchline analysis failed.");
  process.exitCode = 1;
});
