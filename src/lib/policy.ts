import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { AnalysisResult, CouncilReview, Scenario } from "./domain";

export type ReleasePolicy = {
  version: 1;
  requireScenarioDecision: boolean;
  minTestConfidence: number;
  requireCompatibilityForContractTightening: boolean;
  requireCouncil: boolean;
  requireAllCouncilRoles: boolean;
  requireHumanDecision: boolean;
  allowAcceptedRisk: boolean;
};

export type PolicyCheck = {
  id: string;
  status: "pass" | "warn" | "fail";
  title: string;
  detail: string;
  evidenceIds: string[];
};

export type PolicyResult = {
  policy: ReleasePolicy;
  source: string;
  checks: PolicyCheck[];
  status: "pass" | "warn" | "fail";
};

export const defaultReleasePolicy: ReleasePolicy = {
  version: 1,
  requireScenarioDecision: false,
  minTestConfidence: 0,
  requireCompatibilityForContractTightening: false,
  requireCouncil: false,
  requireAllCouncilRoles: false,
  requireHumanDecision: false,
  allowAcceptedRisk: true,
};

const booleanKeys = new Set<keyof ReleasePolicy>(["requireScenarioDecision", "requireCompatibilityForContractTightening", "requireCouncil", "requireAllCouncilRoles", "requireHumanDecision", "allowAcceptedRisk"]);

function policyError(message: string) {
  return new Error(`Invalid Branchline policy: ${message}`);
}

export function parseReleasePolicy(text: string): ReleasePolicy {
  const result: Record<string, unknown> = { ...defaultReleasePolicy };
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.replace(/(^|\s)#.*$/, "$1").trim();
    if (!line) continue;
    const match = /^([A-Za-z][A-Za-z0-9]*):\s*(.*?)\s*$/.exec(line);
    if (!match) throw policyError(`line ${index + 1} must use flat key: value syntax.`);
    const [, key, rawValue] = match;
    if (!(key in defaultReleasePolicy)) throw policyError(`line ${index + 1} has an unsupported key: ${key}.`);
    if (booleanKeys.has(key as keyof ReleasePolicy)) {
      if (rawValue !== "true" && rawValue !== "false") throw policyError(`${key} must be true or false.`);
      result[key] = rawValue === "true";
    } else {
      const value = Number(rawValue);
      if (!Number.isInteger(value)) throw policyError(`${key} must be an integer.`);
      result[key] = value;
    }
  }
  if (result.version !== 1) throw policyError("version must be 1.");
  if (typeof result.minTestConfidence !== "number" || result.minTestConfidence < 0 || result.minTestConfidence > 100) throw policyError("minTestConfidence must be between 0 and 100.");
  return result as ReleasePolicy;
}

export async function loadReleasePolicy(repositoryPath: string, configuredPath?: string): Promise<{ policy: ReleasePolicy; source: string }> {
  const source = configuredPath ? resolve(configuredPath) : join(repositoryPath, ".branchline", "policy.yml");
  try {
    return { policy: parseReleasePolicy(await readFile(source, "utf8")), source };
  } catch (error) {
    if (!configuredPath && (error as NodeJS.ErrnoException).code === "ENOENT") return { policy: defaultReleasePolicy, source: "default policy (no .branchline/policy.yml)" };
    throw error;
  }
}

function check(status: PolicyCheck["status"], id: string, title: string, detail: string, evidenceIds: string[] = []): PolicyCheck {
  return { id, status, title, detail, evidenceIds };
}

export function evaluateReleasePolicy(input: { policy: ReleasePolicy; source: string; analysis: AnalysisResult; scenario?: Scenario; councilReview?: CouncilReview }): PolicyResult {
  const { policy, source, analysis, scenario, councilReview } = input;
  const checks: PolicyCheck[] = [];
  const contract = analysis.findings.find((finding) => finding.kind === "api-contract-tightened");
  const contractEvidence = contract?.evidence.map((item) => item.id) ?? [];

  if (policy.requireScenarioDecision) {
    checks.push(scenario?.decisions.length
      ? check("pass", "scenario-decision", "A release strategy is recorded", `Scenario decisions: ${scenario.decisions.join(" → ")}.`)
      : check("fail", "scenario-decision", "A release strategy is required", "Policy requires a deterministic scenario with at least one release decision."));
  }

  if (policy.minTestConfidence > 0) {
    checks.push(scenario
      ? scenario.state.testConfidence >= policy.minTestConfidence
        ? check("pass", "test-confidence", "Scenario test confidence meets the policy", `${scenario.state.testConfidence}/100 meets the minimum ${policy.minTestConfidence}/100.`)
        : check("fail", "test-confidence", "Scenario test confidence is below the policy", `${scenario.state.testConfidence}/100 is below the minimum ${policy.minTestConfidence}/100.`)
      : check("fail", "test-confidence", "Scenario test confidence is required", `Policy requires at least ${policy.minTestConfidence}/100, but no scenario was supplied.`));
  }

  if (policy.requireCompatibilityForContractTightening && contract) {
    const compatible = Boolean(scenario?.state.compatibilityWindowOpen || scenario?.decisions.includes("compatibility-adapter"));
    checks.push(compatible
      ? check("pass", "contract-compatibility", "Compatibility path is recorded for the tightened contract", "The scenario contains a compatibility window or adapter.", contractEvidence)
      : check("fail", "contract-compatibility", "Compatibility path is required for the tightened contract", "Policy requires a compatibility adapter/window before this contract change can proceed.", contractEvidence));
  }

  if (policy.requireCouncil || policy.requireAllCouncilRoles || policy.requireHumanDecision) {
    checks.push(councilReview
      ? check("pass", "council-created", "Release Council packet is recorded", `Evidence packet ${councilReview.evidencePackHash.slice(0, 16)}… is attached to this decision.`)
      : check("fail", "council-created", "Release Council packet is required", "Policy requires a persisted Council review for this release."));
  }

  if (policy.requireAllCouncilRoles && councilReview) {
    const missing = ["contract-guardian", "test-observability", "rollout-commander", "security-config"].filter((role) => !councilReview.reports.some((report) => report.role === role));
    checks.push(missing.length
      ? check("fail", "council-coverage", "All Council specialist roles are required", `Missing reports: ${missing.join(", ")}.`)
      : check("pass", "council-coverage", "All Council specialist roles reported", "Contract, test, rollout, and security perspectives are present."));
  }

  if (policy.requireHumanDecision && councilReview) {
    const acceptedRiskBlocked = councilReview.status === "accepted-risk" && !policy.allowAcceptedRisk;
    const status = councilReview.status === "approved" || (councilReview.status === "accepted-risk" && policy.allowAcceptedRisk);
    checks.push(status
      ? check("pass", "human-decision", "Human Council decision satisfies the policy", `Recorded status: ${councilReview.status}.`)
      : acceptedRiskBlocked
        ? check("fail", "human-decision", "Accepted risk is prohibited by policy", "This policy only permits an explicit approval after Council review.")
        : check("fail", "human-decision", "A releasable human Council decision is required", `Recorded status: ${councilReview.status}.`));
  }

  if (analysis.secretWarnings.length) checks.push(check("warn", "redaction", "Potential secrets were redacted", `${analysis.secretWarnings.length} secret-shaped value(s) were removed from model-facing evidence.`));
  if (!checks.length) checks.push(check("pass", "baseline", "No enforceable policy gates configured", "Use .branchline/policy.yml to require scenario, Council, compatibility, or test-confidence gates."));
  const status = checks.some((item) => item.status === "fail") ? "fail" : checks.some((item) => item.status === "warn") ? "warn" : "pass";
  return { policy, source, checks, status };
}

export function policyResultMarkdown(result: PolicyResult) {
  return `# Branchline policy check\n\n- Policy: \`${result.source}\`\n- Result: **${result.status.toUpperCase()}**\n\n${result.checks.map((item) => `- **${item.status.toUpperCase()}** — ${item.title}: ${item.detail}${item.evidenceIds.length ? `\n  - Evidence: ${item.evidenceIds.map((id) => `\`${id}\``).join(", ")}` : ""}`).join("\n")}`;
}
