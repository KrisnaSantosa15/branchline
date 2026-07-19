import { randomUUID } from "node:crypto";
import type { AnalysisResult, Comparison, ReleaseStrategy, Scenario, SimulationEvent, WorldState } from "@/lib/domain";

function hasContractRisk(analysis: AnalysisResult) {
  return analysis.findings.some((finding) => finding.kind === "api-contract-tightened");
}

function highestRisk(analysis: AnalysisResult): WorldState["scenarioRisk"] {
  if (analysis.findings.some((finding) => finding.severity === "critical")) return "critical";
  if (analysis.findings.some((finding) => finding.severity === "high")) return "high";
  if (analysis.findings.some((finding) => finding.severity === "medium")) return "medium";
  return "low";
}

function relatedEvidence(analysis: AnalysisResult) {
  return analysis.findings.flatMap((finding) => finding.evidence.map((item) => item.id)).slice(0, 4);
}

function event(input: Omit<SimulationEvent, "id" | "at">): SimulationEvent {
  return { ...input, id: randomUUID(), at: new Date().toISOString() };
}

function initialState(analysis: AnalysisResult): WorldState {
  return {
    trafficAffected: 0,
    clientErrorRate: 0,
    supportLoad: 4,
    onCallUrgency: 8,
    testConfidence: analysis.findings.some((finding) => finding.kind === "test-changed") ? 68 : 42,
    releaseStatus: "ready",
    compatibilityWindowOpen: false,
    scenarioRisk: highestRisk(analysis),
  };
}

export function startScenario(workspaceId: string, analysis: AnalysisResult, title = "Primary release rehearsal"): Scenario {
  const evidenceIds = relatedEvidence(analysis);
  const contractRisk = hasContractRisk(analysis);
  return {
    id: randomUUID(),
    workspaceId,
    analysisId: analysis.id,
    title,
    state: initialState(analysis),
    decisions: [],
    events: [
      event({
        actor: "release-captain",
        tone: "decision",
        title: "Release rehearsal armed",
        detail: contractRisk
          ? "The selected change tightens a public contract. Choose a rollout posture to see its operational consequences."
          : "Branchline loaded the selected diff. Choose a rollout posture to interrogate the strongest evidence path.",
        rule: "Initial scenario state reflects classified repository findings; no model-generated risk metrics are used.",
        evidenceIds,
      }),
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function applyDecision(scenario: Scenario, analysis: AnalysisResult, decision: ReleaseStrategy): Scenario {
  const nextState = { ...scenario.state };
  const nextEvents = [...scenario.events];
  const evidenceIds = relatedEvidence(analysis);
  const contractRisk = hasContractRisk(analysis);

  if (decision === "full-rollout") {
    nextState.trafficAffected = clamp(nextState.trafficAffected + (contractRisk ? 74 : 30));
    nextState.clientErrorRate = clamp(nextState.clientErrorRate + (contractRisk ? 31 : 11));
    nextState.supportLoad = clamp(nextState.supportLoad + (contractRisk ? 42 : 18));
    nextState.onCallUrgency = clamp(nextState.onCallUrgency + (contractRisk ? 68 : 32));
    nextState.testConfidence = clamp(nextState.testConfidence - (contractRisk ? 14 : 7));
    nextState.releaseStatus = contractRisk ? "at-risk" : "observing";
    nextEvents.push(
      event({
        actor: "api-gateway",
        tone: contractRisk ? "hazard" : "warning",
        title: "Full traffic now sees the changed contract",
        detail: contractRisk
          ? "Legacy consumers that do not send or handle the newly required field begin to fail at the public contract boundary."
          : "Full traffic exposes all consumers to the selected change before a compatibility signal is observed.",
        rule: "Full rollout applies the detected contract risk to the complete release audience.",
        evidenceIds,
      }),
      event({
        actor: "support",
        tone: "hazard",
        title: "Support queue accelerates",
        detail: "Support load rises with client errors. The impact is a scenario consequence, not observed production telemetry.",
        rule: "Support load follows client error rate under the API-contract scenario template.",
        evidenceIds,
      }),
    );
  }

  if (decision === "canary") {
    nextState.trafficAffected = clamp(nextState.trafficAffected + (contractRisk ? 8 : 3));
    nextState.clientErrorRate = clamp(nextState.clientErrorRate + (contractRisk ? 7 : 2));
    nextState.supportLoad = clamp(nextState.supportLoad + (contractRisk ? 6 : 2));
    nextState.onCallUrgency = clamp(nextState.onCallUrgency + (contractRisk ? 18 : 7));
    nextState.testConfidence = clamp(nextState.testConfidence + 4);
    nextState.releaseStatus = "observing";
    nextEvents.push(
      event({
        actor: "legacy-client",
        tone: "warning",
        title: "Canary exposes a narrow legacy-client failure path",
        detail: contractRisk
          ? "A small traffic slice reveals the optional-to-required contract mismatch while the blast radius remains contained."
          : "The narrow traffic slice stays within the rehearsal observation window.",
        rule: "Canary rollout limits contract exposure to a small deterministic traffic share.",
        evidenceIds,
      }),
      event({
        actor: "on-call",
        tone: "warning",
        title: "Observation threshold is active",
        detail: "On-call urgency rises, but remains below the forced rollback threshold until a release captain decides otherwise.",
        rule: "Canary issues create an observation event instead of an immediate incident.",
        evidenceIds,
      }),
    );
  }

  if (decision === "compatibility-adapter") {
    nextState.compatibilityWindowOpen = true;
    nextState.trafficAffected = clamp(nextState.trafficAffected - (contractRisk ? 6 : 2));
    nextState.clientErrorRate = clamp(nextState.clientErrorRate - (contractRisk ? 6 : 2));
    nextState.supportLoad = clamp(nextState.supportLoad - (contractRisk ? 10 : 3));
    nextState.onCallUrgency = clamp(nextState.onCallUrgency - (contractRisk ? 20 : 7));
    nextState.testConfidence = clamp(nextState.testConfidence + 28);
    nextState.releaseStatus = nextState.clientErrorRate > 12 ? "observing" : "ready";
    nextEvents.push(
      event({
        actor: "ci",
        tone: "verified",
        title: "Compatibility window restores the old contract path",
        detail: contractRisk
          ? "The adapter permits legacy consumers to coexist while new consumers adopt the required field."
          : "The adapter adds a controlled transition path for the changed interface.",
        rule: "Compatibility adapters reduce API-contract impact and raise test confidence when paired with explicit contract coverage.",
        evidenceIds,
      }),
      event({
        actor: "release-captain",
        tone: "recovery",
        title: "A safer release path is available",
        detail: "Keep the canary active, validate the contract test, and set a sunset date for the compatibility path.",
        rule: "The scenario recommends observation when compatibility follows a risky canary.",
        evidenceIds,
      }),
    );
  }

  if (decision === "rollback") {
    nextState.trafficAffected = 0;
    nextState.clientErrorRate = 0;
    nextState.supportLoad = clamp(Math.max(4, nextState.supportLoad - 24));
    nextState.onCallUrgency = clamp(Math.max(8, nextState.onCallUrgency - 52));
    nextState.releaseStatus = "contained";
    nextEvents.push(
      event({
        actor: "release-captain",
        tone: "recovery",
        title: "Rollback contains the rehearsal incident",
        detail: "The selected change stops receiving traffic. Root-cause evidence and test artifacts remain available for the next attempt.",
        rule: "Rollback removes release traffic in the deterministic scenario; it does not modify a real repository or deployment.",
        evidenceIds,
      }),
    );
  }

  return {
    ...scenario,
    state: nextState,
    events: nextEvents,
    decisions: [...scenario.decisions, decision],
    updatedAt: new Date().toISOString(),
  };
}

export function branchScenario(scenario: Scenario, title: string): Scenario {
  const now = new Date().toISOString();
  return {
    ...scenario,
    id: randomUUID(),
    title,
    parentScenarioId: scenario.id,
    events: [
      ...scenario.events,
      event({
        actor: "release-captain",
        tone: "decision",
        title: "Scenario branched",
        detail: "This branch begins with the exact persisted state of its parent. Later decisions will not mutate the original rehearsal.",
        rule: "Branching copies current deterministic world state and event history.",
        evidenceIds: [],
      }),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function compareScenarios(primary: Scenario, alternate: Scenario): Comparison {
  const metric = (label: string, primaryValue: number | string, alternateValue: number | string, lowerIsBetter = true) => {
    const better =
      primaryValue === alternateValue
        ? "tie"
        : typeof primaryValue === "number" && typeof alternateValue === "number"
          ? lowerIsBetter
            ? primaryValue < alternateValue
              ? "primary"
              : "alternate"
            : primaryValue > alternateValue
              ? "primary"
              : "alternate"
          : "tie";
    return { label, primary: primaryValue, alternate: alternateValue, better } as const;
  };
  return {
    primary,
    alternate,
    deltas: [
      metric("Client error rate", primary.state.clientErrorRate, alternate.state.clientErrorRate),
      metric("Traffic affected", primary.state.trafficAffected, alternate.state.trafficAffected),
      metric("Support load", primary.state.supportLoad, alternate.state.supportLoad),
      metric("On-call urgency", primary.state.onCallUrgency, alternate.state.onCallUrgency),
      metric("Test confidence", primary.state.testConfidence, alternate.state.testConfidence, false),
      metric("Release status", primary.state.releaseStatus, alternate.state.releaseStatus),
    ],
  };
}
