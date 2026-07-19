import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { analyzeRepository } from "../src/lib/analysis";
import { createCouncilEvidencePack } from "../src/lib/council";
import { evaluateReleasePolicy, parseReleasePolicy } from "../src/lib/policy";
import { connectRepositorySource, isRemoteRepositorySource } from "../src/lib/repository";
import { applyDecision, compareScenarios, startScenario } from "../src/lib/simulation";
import type { ReleaseStrategy } from "../src/lib/domain";

type Request = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
type ReleaseInput = { repository: string; base?: string; head?: string };

const protocolVersion = "2025-11-25";
const strategies = new Set<ReleaseStrategy>(["full-rollout", "canary", "compatibility-adapter", "rollback"]);

function send(message: Record<string, unknown>) { process.stdout.write(`${JSON.stringify(message)}\n`); }
function respond(id: Request["id"], result: unknown) { if (id !== undefined) send({ jsonrpc: "2.0", id, result }); }
function fail(id: Request["id"], code: number, message: string) { if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code, message } }); }
function toolResult(value: unknown) { return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value, isError: false }; }
function required(value: unknown, label: string) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`); return value.trim(); }
function releaseInput(args: Record<string, unknown>): ReleaseInput { return { repository: required(args.repository, "repository"), ...(typeof args.base === "string" ? { base: args.base } : {}), ...(typeof args.head === "string" ? { head: args.head } : {}) }; }
function decisions(value: unknown, label: string) { if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !strategies.has(item as ReleaseStrategy))) throw new Error(`${label} must be an array of Branchline release strategies.`); return value as ReleaseStrategy[]; }

async function loadRelease(input: ReleaseInput) {
  if (!isRemoteRepositorySource(input.repository)) process.env.BRANCHLINE_REPO_ROOT ??= input.repository;
  const repository = await connectRepositorySource(input.repository);
  if (repository.commits.length < 2) throw new Error("Branchline needs at least two commits to inspect a release boundary.");
  const baseCommit = input.base ?? repository.commits[1].hash;
  const headCommit = input.head ?? repository.commits[0].hash;
  const analysis = await analyzeRepository({ workspaceId: randomUUID(), repositoryPath: repository.repositoryPath, baseCommit, headCommit });
  return { repository, analysis };
}

const tools = [
  { name: "analyze_release", title: "Analyze a release boundary", description: "Read a local approved Git repository or public HTTPS Git URL and return evidence-linked findings. Never executes target code or writes to the repository.", inputSchema: { type: "object", properties: { repository: { type: "string" }, base: { type: "string" }, head: { type: "string" } }, required: ["repository"], additionalProperties: false } },
  { name: "get_evidence_pack", title: "Create a redacted Council evidence pack", description: "Return the immutable evidence packet used by Branchline specialist review, without exposing unselected repository content.", inputSchema: { type: "object", properties: { repository: { type: "string" }, base: { type: "string" }, head: { type: "string" } }, required: ["repository"], additionalProperties: false } },
  { name: "compare_rollouts", title: "Compare deterministic rollout paths", description: "Rehearse two decision sequences from the same Git evidence and return transparent metric deltas. Never deploys or alters the target repository.", inputSchema: { type: "object", properties: { repository: { type: "string" }, base: { type: "string" }, head: { type: "string" }, primaryDecisions: { type: "array", items: { type: "string", enum: [...strategies] } }, alternateDecisions: { type: "array", items: { type: "string", enum: [...strategies] } } }, required: ["repository", "primaryDecisions", "alternateDecisions"], additionalProperties: false } },
  { name: "check_policy", title: "Evaluate a Branchline release policy", description: "Evaluate supplied flat policy text against Git evidence and an optional deterministic decision sequence. Does not read policy paths outside the requested repository.", inputSchema: { type: "object", properties: { repository: { type: "string" }, base: { type: "string" }, head: { type: "string" }, policy: { type: "string" }, decisions: { type: "array", items: { type: "string", enum: [...strategies] } } }, required: ["repository"], additionalProperties: false } },
];

async function callTool(name: string, args: Record<string, unknown>) {
  const { repository, analysis } = await loadRelease(releaseInput(args));
  if (name === "analyze_release") return { repository: repository.source.value, analysis };
  if (name === "get_evidence_pack") return createCouncilEvidencePack({ repositoryPath: repository.source.value, analysis });
  if (name === "compare_rollouts") {
    const primaryDecisions = decisions(args.primaryDecisions, "primaryDecisions");
    const alternateDecisions = decisions(args.alternateDecisions, "alternateDecisions");
    const initial = startScenario("mcp", analysis, "MCP release rehearsal");
    const primary = primaryDecisions.reduce((scenario, decision) => applyDecision(scenario, analysis, decision), initial);
    const alternate = alternateDecisions.reduce((scenario, decision) => applyDecision(scenario, analysis, decision), { ...initial, id: randomUUID(), title: "MCP alternate rehearsal" });
    return { analysis, comparison: compareScenarios(primary, alternate) };
  }
  if (name === "check_policy") {
    const selected = args.decisions === undefined ? [] : decisions(args.decisions, "decisions");
    const scenario = selected.reduce((current, decision) => applyDecision(current, analysis, decision), startScenario("mcp", analysis, "MCP policy rehearsal"));
    const policy = typeof args.policy === "string" ? parseReleasePolicy(args.policy) : { version: 1, requireScenarioDecision: false, minTestConfidence: 0, requireCompatibilityForContractTightening: false, requireCouncil: false, requireAllCouncilRoles: false, requireHumanDecision: false, allowAcceptedRisk: true } as const;
    return evaluateReleasePolicy({ policy, source: typeof args.policy === "string" ? "MCP supplied policy" : "default policy", analysis, scenario: selected.length ? scenario : undefined });
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handle(request: Request) {
  if (request.jsonrpc !== "2.0" || typeof request.method !== "string") return fail(request.id, -32600, "Invalid JSON-RPC request.");
  try {
    if (request.method === "initialize") return respond(request.id, { protocolVersion: typeof request.params?.protocolVersion === "string" ? request.params.protocolVersion : protocolVersion, capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false } }, serverInfo: { name: "branchline", version: "0.2.0" }, instructions: "Branchline MCP is read-only. It analyzes committed Git evidence and deterministic simulations; it never executes target code, deploys, merges, or makes release decisions." });
    if (request.method === "notifications/initialized") return;
    if (request.method === "tools/list") return respond(request.id, { tools });
    if (request.method === "tools/call") {
      const name = required(request.params?.name, "tool name");
      const args = request.params?.arguments;
      if (args !== undefined && (!args || typeof args !== "object" || Array.isArray(args))) throw new Error("tool arguments must be an object.");
      return respond(request.id, toolResult(await callTool(name, (args ?? {}) as Record<string, unknown>)));
    }
    if (request.method === "resources/list") return respond(request.id, { resources: [{ uri: "branchline://guide/release-safety", name: "Branchline release-safety guide", description: "Read-only operating boundaries for Branchline evidence and rehearsal output.", mimeType: "text/markdown" }] });
    if (request.method === "resources/read") {
      if (request.params?.uri !== "branchline://guide/release-safety") throw new Error("Unknown Branchline resource URI.");
      return respond(request.id, { contents: [{ uri: "branchline://guide/release-safety", mimeType: "text/markdown", text: "# Branchline MCP\n\n- Read Git evidence and deterministic rehearsal results only.\n- Treat scenario metrics as rehearsal outcomes, never production telemetry or predictions.\n- Keep a human responsible for every release decision.\n- Never execute target code, deploy, merge, or create pull requests." }] });
    }
    if (request.method === "prompts/list") return respond(request.id, { prompts: [{ name: "release_council", description: "Generate an evidence-bound Branchline Council review.", arguments: [{ name: "repository", required: true }, { name: "base", required: false }, { name: "head", required: false }] }, { name: "release_review", description: "Prepare a human-owned release review from Branchline evidence.", arguments: [{ name: "repository", required: true }, { name: "base", required: false }, { name: "head", required: false }] }] });
    if (request.method === "prompts/get") {
      const name = required(request.params?.name, "prompt name");
      const args = (request.params?.arguments ?? {}) as Record<string, unknown>;
      const repository = required(args.repository, "repository");
      if (name !== "release_council" && name !== "release_review") throw new Error("Unknown Branchline prompt.");
      const instruction = name === "release_council" ? "Call get_evidence_pack, then seek contract, test, rollout, and security perspectives. Keep conclusions evidence-linked and ask a human to resolve disagreements." : "Call analyze_release and, when appropriate, check_policy. Present findings, unknowns, verification commands, and rollback triggers. Do not make the release decision.";
      return respond(request.id, { description: `Branchline ${name.replaceAll("_", " ")}`, messages: [{ role: "user", content: { type: "text", text: `${instruction}\n\nRepository: ${repository}${typeof args.base === "string" ? `\nBase: ${args.base}` : ""}${typeof args.head === "string" ? `\nHead: ${args.head}` : ""}` } }] });
    }
    return fail(request.id, -32601, `Method not found: ${request.method}`);
  } catch (caught) {
    return fail(request.id, -32000, caught instanceof Error ? caught.message : "Branchline MCP request failed.");
  }
}

async function main() {
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    try { await handle(JSON.parse(line) as Request); } catch { fail(null, -32700, "Parse error."); }
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Branchline MCP failed."}\n`);
  process.exitCode = 1;
});
