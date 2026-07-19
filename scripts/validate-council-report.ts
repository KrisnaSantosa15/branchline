import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { synthesizeCouncil, validateCouncilReport } from "../src/lib/council";
import type { CouncilEvidencePack, CouncilReport } from "../src/lib/domain";

type Format = "json" | "markdown";

function usage() {
  return `Branchline Council report validator\n\nUsage:\n  branchline validate-report <evidence-pack.json> <report.json> [...report.json] [--format json|markdown]\n\nValidates that every specialist report belongs to the selected evidence pack and only cites known evidence. The command reads files only; it does not call a model or modify a repository.`;
}

function flag(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function positional() {
  return process.argv.slice(2).filter((argument, index, values) => !argument.startsWith("-") && values[index - 1] !== "--format");
}

async function readJson(pathname: string) {
  try {
    return JSON.parse(await readFile(resolve(pathname), "utf8")) as unknown;
  } catch (error) {
    throw new Error(`Could not read valid JSON from ${pathname}: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

function asEvidencePack(value: unknown): CouncilEvidencePack {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Evidence pack must be a JSON object.");
  const pack = value as Partial<CouncilEvidencePack>;
  if (pack.schemaVersion !== 1 || typeof pack.hash !== "string" || !Array.isArray(pack.evidence)) throw new Error("Evidence pack is not a Branchline Council schemaVersion 1 packet.");
  return pack as CouncilEvidencePack;
}

function markdown(synthesis: ReturnType<typeof synthesizeCouncil>) {
  return `# Branchline Council validation\n\n- Evidence hash: \`${synthesis.evidencePackHash}\`\n- Overall verdict: **${synthesis.overallVerdict}**\n- Reports: ${synthesis.reports.length}\n- Missing roles: ${synthesis.missingRoles.length ? synthesis.missingRoles.join(", ") : "none"}\n\n## Specialist reports\n\n${synthesis.reports.map((report) => `- **${report.role}** — ${report.verdict}; recommends \`${report.recommendation}\`\n  - ${report.summary}`).join("\n")}\n\n## Disagreements\n\n${synthesis.disagreements.length ? synthesis.disagreements.map((item) => `- **${item.kind}**: ${item.detail}`).join("\n") : "None detected. A human still owns the release decision."}\n`;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const format = (flag("--format") ?? "markdown") as Format;
  if (format !== "json" && format !== "markdown") throw new Error(`Unsupported validation format: ${format}. Use json or markdown.`);
  const paths = positional();
  if (paths.length < 2) throw new Error(`Provide one evidence pack and at least one report.\n\n${usage()}`);
  const pack = asEvidencePack(await readJson(paths[0]));
  const reports = await Promise.all(paths.slice(1).map(async (pathname) => validateCouncilReport(await readJson(pathname), pack)));
  const synthesis = synthesizeCouncil(pack, reports as CouncilReport[]);
  console.log(format === "json" ? JSON.stringify(synthesis, null, 2) : markdown(synthesis));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Council validation failed.");
  process.exitCode = 1;
});
