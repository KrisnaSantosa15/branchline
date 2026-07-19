export type Confidence = "high" | "medium" | "low";

export type FindingKind =
  | "api-contract-tightened"
  | "route-changed"
  | "export-changed"
  | "test-changed"
  | "dependency-changed"
  | "configuration-changed"
  | "migration-changed"
  | "file-changed";

export type Evidence = {
  id: string;
  path: string;
  label: string;
  detail: string;
  lineHint?: string;
};

export type Finding = {
  id: string;
  kind: FindingKind;
  title: string;
  detail: string;
  confidence: Confidence;
  severity: "critical" | "high" | "medium" | "low";
  evidence: Evidence[];
  impactedFiles: string[];
  metadata?: Record<string, string | number | boolean>;
};

export type GraphNode = {
  id: string;
  label: string;
  kind: "change" | "consumer" | "test" | "contract" | "system";
  path?: string;
  confidence: Confidence;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  evidenceIds: string[];
};

export type AnalysisResult = {
  id: string;
  workspaceId: string;
  baseCommit: string;
  headCommit: string;
  diffSummary: { filesChanged: number; insertions: number; deletions: number };
  findings: Finding[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  secretWarnings: string[];
  createdAt: string;
};

export type RepositorySource = {
  kind: "local" | "remote";
  value: string;
};

export type Workspace = {
  id: string;
  name: string;
  repositoryPath: string;
  source: RepositorySource;
  commits: CommitInfo[];
  createdAt: string;
  updatedAt: string;
};

export type CommitInfo = {
  hash: string;
  message: string;
  date: string;
};

export type ReleaseStrategy =
  | "full-rollout"
  | "canary"
  | "compatibility-adapter"
  | "rollback";

export type ReleaseStatus = "ready" | "observing" | "at-risk" | "contained" | "blocked";

export type WorldState = {
  trafficAffected: number;
  clientErrorRate: number;
  supportLoad: number;
  onCallUrgency: number;
  testConfidence: number;
  releaseStatus: ReleaseStatus;
  compatibilityWindowOpen: boolean;
  scenarioRisk: "critical" | "high" | "medium" | "low";
};

export type SimulationEvent = {
  id: string;
  at: string;
  actor: "release-captain" | "legacy-client" | "api-gateway" | "support" | "on-call" | "ci";
  tone: "verified" | "warning" | "hazard" | "decision" | "recovery";
  title: string;
  detail: string;
  rule: string;
  evidenceIds: string[];
};

export type Scenario = {
  id: string;
  workspaceId: string;
  analysisId: string;
  title: string;
  parentScenarioId?: string;
  state: WorldState;
  events: SimulationEvent[];
  decisions: ReleaseStrategy[];
  createdAt: string;
  updatedAt: string;
};

export type MitigationStatus = "proposed" | "accepted" | "rejected" | "edited";

export type Mitigation = {
  id: string;
  workspaceId: string;
  analysisId: string;
  title: string;
  rationale: string;
  owner: "engineering" | "release-captain" | "on-call" | "support";
  verification: string;
  fallback: string;
  testSnippet?: string;
  evidenceIds: string[];
  source: "deterministic" | "model";
  status: MitigationStatus;
  editedContent?: string;
  createdAt: string;
  updatedAt: string;
};

export type Comparison = {
  primary: Scenario;
  alternate: Scenario;
  deltas: Array<{ label: string; primary: number | string; alternate: number | string; better: "primary" | "alternate" | "tie" }>;
};

export const councilRoles = ["contract-guardian", "test-observability", "rollout-commander", "security-config"] as const;
export type CouncilRole = (typeof councilRoles)[number];

export const councilVerdicts = ["approve", "caution", "block", "insufficient-evidence"] as const;
export type CouncilVerdict = (typeof councilVerdicts)[number];

export type CouncilRecommendation = ReleaseStrategy | "hold";

export type CouncilEvidence = Evidence & {
  findingId: string;
  findingTitle: string;
  severity: Finding["severity"];
  confidence: Confidence;
};

export type CouncilEvidencePack = {
  schemaVersion: 1;
  id: string;
  hash: string;
  scope: {
    repository: string;
    baseCommit: string;
    headCommit: string;
    diffSummary: AnalysisResult["diffSummary"];
  };
  findings: Array<Pick<Finding, "id" | "kind" | "title" | "detail" | "severity" | "confidence" | "impactedFiles">>;
  evidence: CouncilEvidence[];
  scenario?: Pick<Scenario, "decisions" | "state">;
  limitations: string[];
};

export type CouncilClaim = {
  statement: string;
  impact: Finding["severity"];
  confidence: Confidence;
  evidenceIds: string[];
};

export type CouncilReport = {
  schemaVersion: 1;
  evidencePackHash: string;
  role: CouncilRole;
  verdict: CouncilVerdict;
  recommendation: CouncilRecommendation;
  summary: string;
  claims: CouncilClaim[];
  unknowns: string[];
  requiredVerifications: string[];
  rollbackTriggers: string[];
};

export type CouncilDisagreement = {
  kind: "verdict" | "recommendation";
  roles: CouncilRole[];
  detail: string;
};

export type CouncilSynthesis = {
  evidencePackHash: string;
  reports: CouncilReport[];
  missingRoles: CouncilRole[];
  overallVerdict: CouncilVerdict;
  disagreements: CouncilDisagreement[];
};

export type CouncilReviewStatus = "open" | "request-evidence" | "accepted-risk" | "approved" | "blocked";

export type CouncilReview = {
  id: string;
  workspaceId: string;
  analysisId: string;
  scenarioId?: string;
  evidencePackHash: string;
  evidencePack: CouncilEvidencePack;
  status: CouncilReviewStatus;
  decisionNote?: string;
  requiredFollowUps: string[];
  reports: CouncilReport[];
  createdAt: string;
  updatedAt: string;
};
