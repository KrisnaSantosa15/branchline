import { createHash, randomUUID } from "node:crypto";
import type {
  AnalysisResult,
  CouncilDisagreement,
  CouncilEvidencePack,
  CouncilRecommendation,
  CouncilReview,
  CouncilReport,
  CouncilRole,
  CouncilSynthesis,
  CouncilVerdict,
  Scenario,
  Workspace,
} from "./domain";
import { councilRoles, councilVerdicts } from "./domain";

const recommendations = new Set<CouncilRecommendation>(["full-rollout", "canary", "compatibility-adapter", "rollback", "hold"]);

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function isRole(value: unknown): value is CouncilRole {
  return typeof value === "string" && (councilRoles as readonly string[]).includes(value);
}

function isVerdict(value: unknown): value is CouncilVerdict {
  return typeof value === "string" && (councilVerdicts as readonly string[]).includes(value);
}

function stringList(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) throw new Error(`${label} must be an array of non-empty strings.`);
  return value.map((item) => item.trim());
}

function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

export function createCouncilEvidencePack(input: { workspace?: Workspace; repositoryPath?: string; analysis: AnalysisResult; scenario?: Scenario }): CouncilEvidencePack {
  const { analysis, scenario } = input;
  const body = {
    schemaVersion: 1 as const,
    scope: {
      repository: input.workspace?.source.value ?? input.repositoryPath ?? "unknown repository",
      baseCommit: analysis.baseCommit,
      headCommit: analysis.headCommit,
      diffSummary: analysis.diffSummary,
    },
    findings: analysis.findings
      .map(({ id, kind, title, detail, severity, confidence, impactedFiles }) => ({ id, kind, title, detail, severity, confidence, impactedFiles: [...impactedFiles].sort() }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    evidence: analysis.findings
      .flatMap((finding) => finding.evidence.map((item) => ({ ...item, findingId: finding.id, findingTitle: finding.title, severity: finding.severity, confidence: finding.confidence })))
      .sort((left, right) => left.id.localeCompare(right.id)),
    ...(scenario ? { scenario: { decisions: scenario.decisions, state: scenario.state } } : {}),
    limitations: [
      "This pack contains committed Git evidence and deterministic rehearsal state, not production telemetry.",
      "Specialists may propose hypotheses but must not alter metrics, repository files, deployments, or release decisions.",
      "Potential secret-shaped values are redacted before evidence enters this pack.",
    ],
  };
  const digest = hash(body);
  return { ...body, id: `council-${digest.slice(0, 16)}`, hash: digest };
}

export function validateCouncilReport(input: unknown, evidencePack: CouncilEvidencePack): CouncilReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Council report must be a JSON object.");
  const report = input as Record<string, unknown>;
  if (report.schemaVersion !== 1) throw new Error("Council report must use schemaVersion 1.");
  if (report.evidencePackHash !== evidencePack.hash) throw new Error("Council report evidencePackHash does not match the selected evidence pack.");
  if (!isRole(report.role)) throw new Error("Council report has an unsupported role.");
  if (!isVerdict(report.verdict)) throw new Error("Council report has an unsupported verdict.");
  if (typeof report.recommendation !== "string" || !recommendations.has(report.recommendation as CouncilRecommendation)) throw new Error("Council report has an unsupported recommendation.");
  if (!Array.isArray(report.claims)) throw new Error("Council report claims must be an array.");
  const evidenceIds = new Set(evidencePack.evidence.map((item) => item.id));
  const claims = report.claims.map((claim, index) => {
    if (!claim || typeof claim !== "object" || Array.isArray(claim)) throw new Error(`claims[${index}] must be an object.`);
    const item = claim as Record<string, unknown>;
    const impact = item.impact;
    const confidence = item.confidence;
    if (!["critical", "high", "medium", "low"].includes(String(impact))) throw new Error(`claims[${index}].impact is invalid.`);
    if (!["high", "medium", "low"].includes(String(confidence))) throw new Error(`claims[${index}].confidence is invalid.`);
    const claimEvidence = stringList(item.evidenceIds, `claims[${index}].evidenceIds`);
    if (!claimEvidence.length) throw new Error(`claims[${index}] must cite at least one evidence ID.`);
    const unknown = claimEvidence.find((id) => !evidenceIds.has(id));
    if (unknown) throw new Error(`claims[${index}] cites evidence outside this pack: ${unknown}`);
    return { statement: text(item.statement, `claims[${index}].statement`), impact: impact as CouncilReport["claims"][number]["impact"], confidence: confidence as CouncilReport["claims"][number]["confidence"], evidenceIds: claimEvidence };
  });
  if ((report.verdict === "block" || report.verdict === "caution") && !claims.length) throw new Error("Caution and block reports must include at least one evidence-linked claim.");
  return {
    schemaVersion: 1,
    evidencePackHash: evidencePack.hash,
    role: report.role,
    verdict: report.verdict,
    recommendation: report.recommendation as CouncilRecommendation,
    summary: text(report.summary, "summary"),
    claims,
    unknowns: stringList(report.unknowns, "unknowns"),
    requiredVerifications: stringList(report.requiredVerifications, "requiredVerifications"),
    rollbackTriggers: stringList(report.rollbackTriggers, "rollbackTriggers"),
  };
}

export function synthesizeCouncil(evidencePack: CouncilEvidencePack, reports: CouncilReport[]): CouncilSynthesis {
  const roles = new Set<CouncilRole>();
  for (const report of reports) {
    validateCouncilReport(report, evidencePack);
    if (roles.has(report.role)) throw new Error(`Council role ${report.role} submitted more than one report.`);
    roles.add(report.role);
  }
  const disagreements: CouncilDisagreement[] = [];
  const verdicts = new Map<CouncilVerdict, CouncilRole[]>();
  const recommendationsByRole = new Map<CouncilRecommendation, CouncilRole[]>();
  for (const report of reports) {
    verdicts.set(report.verdict, [...(verdicts.get(report.verdict) ?? []), report.role]);
    recommendationsByRole.set(report.recommendation, [...(recommendationsByRole.get(report.recommendation) ?? []), report.role]);
  }
  if (verdicts.size > 1) disagreements.push({ kind: "verdict", roles: reports.map((report) => report.role), detail: `Specialists returned different verdicts: ${[...verdicts.keys()].join(", ")}.` });
  if (recommendationsByRole.size > 1) disagreements.push({ kind: "recommendation", roles: reports.map((report) => report.role), detail: `Specialists recommend different release paths: ${[...recommendationsByRole.keys()].join(", ")}.` });
  const overallVerdict: CouncilVerdict = reports.some((report) => report.verdict === "block")
    ? "block"
    : reports.some((report) => report.verdict === "caution")
      ? "caution"
      : reports.some((report) => report.verdict === "insufficient-evidence")
        ? "insufficient-evidence"
        : "approve";
  return { evidencePackHash: evidencePack.hash, reports, missingRoles: councilRoles.filter((role) => !roles.has(role)), overallVerdict, disagreements };
}

export function startCouncilReview(input: { workspaceId: string; analysisId: string; evidencePack: CouncilEvidencePack; scenarioId?: string }): CouncilReview {
  const timestamp = new Date().toISOString();
  return {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    analysisId: input.analysisId,
    ...(input.scenarioId ? { scenarioId: input.scenarioId } : {}),
    evidencePackHash: input.evidencePack.hash,
    evidencePack: input.evidencePack,
    status: "open",
    requiredFollowUps: [],
    reports: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
