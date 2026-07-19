import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { analyzeRepository } from "../src/lib/analysis";
import { evaluateReleasePolicy, loadReleasePolicy, policyResultMarkdown } from "../src/lib/policy";
import { connectRepositorySource, isRemoteRepositorySource } from "../src/lib/repository";
import type { CouncilReview, Scenario } from "../src/lib/domain";

type Format = "json" | "markdown";
type FailOn = "fail" | "warn" | "never";

function flag(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function positional() {
  const takesValue = new Set(["--repo", "--base", "--head", "--policy", "--format", "--fail-on", "--release-brief"]);
  const values: string[] = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (takesValue.has(value)) {
      index += 1;
      continue;
    }
    if (!value.startsWith("-")) values.push(value);
  }
  return values;
}

function usage() {
  return `Branchline policy check\n\nUsage:\n  branchline check <local-git-path-or-public-https-url> [base-commit] [head-commit] [--policy <policy.yml>] [--release-brief <brief.json>] [--format json|markdown] [--fail-on fail|warn|never]\n\nThe command reads committed Git data, a policy file, and an optional Branchline JSON release brief. It never executes repository code, deploys, creates pull requests, or calls a model provider.`;
}

async function releaseBrief(pathname?: string) {
  if (!pathname) return {};
  try {
    const parsed = JSON.parse(await readFile(pathname, "utf8")) as { scenario?: Scenario; councilReview?: CouncilReview };
    return { scenario: parsed.scenario, councilReview: parsed.councilReview };
  } catch (error) {
    throw new Error(`Could not read a Branchline JSON release brief from ${pathname}: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const format = (flag("--format") ?? "markdown") as Format;
  const failOn = (flag("--fail-on") ?? "fail") as FailOn;
  if (format !== "json" && format !== "markdown") throw new Error(`Unsupported output format: ${format}. Use json or markdown.`);
  if (failOn !== "fail" && failOn !== "warn" && failOn !== "never") throw new Error(`Unsupported --fail-on value: ${failOn}. Use fail, warn, or never.`);
  const values = positional();
  const sourceInput = flag("--repo") ?? values[0];
  if (!sourceInput) throw new Error(`Missing Git repository path or public HTTPS URL.\n\n${usage()}`);
  if (!isRemoteRepositorySource(sourceInput)) process.env.BRANCHLINE_REPO_ROOT ??= sourceInput;
  const repository = await connectRepositorySource(sourceInput);
  if (repository.commits.length < 2) throw new Error("Branchline needs at least two commits to check a release boundary.");
  const baseCommit = flag("--base") ?? values[1] ?? repository.commits[1].hash;
  const headCommit = flag("--head") ?? values[2] ?? repository.commits[0].hash;
  const analysis = await analyzeRepository({ workspaceId: randomUUID(), repositoryPath: repository.repositoryPath, baseCommit, headCommit });
  const [{ policy, source }, brief] = await Promise.all([loadReleasePolicy(repository.repositoryPath, flag("--policy")), releaseBrief(flag("--release-brief"))]);
  const result = evaluateReleasePolicy({ policy, source, analysis, ...brief });
  const output = format === "json"
    ? JSON.stringify({ repository: repository.source.value, baseCommit, headCommit, result }, null, 2)
    : `# Branchline release boundary\n\n- Repository: \`${repository.source.value}\`\n- Base: \`${baseCommit}\`\n- Candidate: \`${headCommit}\`\n\n${policyResultMarkdown(result)}\n`;
  console.log(output);
  if ((failOn === "fail" && result.status === "fail") || (failOn === "warn" && result.status !== "pass")) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Branchline policy check failed.");
  process.exitCode = 1;
});
