"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronRight, CircleDotDashed, Copy, FileDown, GitBranch, GitCommitHorizontal, Network, Play, RotateCcw, ShieldCheck, Sparkles, TimerReset, TriangleAlert, X } from "lucide-react";
import clsx from "clsx";
import type { AnalysisResult, Comparison, Mitigation, ReleaseStrategy, Scenario, Workspace } from "@/lib/domain";

type WorkspaceResponse = { workspace: Workspace };
type AnalyzeResponse = { analysis: AnalysisResult; mitigations: Mitigation[] };
type WorkspaceStateResponse = { workspace: Workspace; analysis?: AnalysisResult; scenarios: Scenario[]; mitigations: Mitigation[] };
type WorkflowPanel = "connect" | "impact" | "rehearse" | "decide";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Branchline could not complete that operation.");
  return body;
}

function shortHash(hash: string) {
  return hash.slice(0, 8);
}

function severityIcon(severity: string) {
  return severity === "critical" || severity === "high" ? <TriangleAlert size={16} /> : <CircleDotDashed size={16} />;
}

function Metric({ label, value, suffix, level = "neutral" }: { label: string; value: number | string; suffix?: string; level?: "neutral" | "safe" | "danger" | "warning" }) {
  return (
    <div className={clsx("metric", `metric--${level}`)}>
      <span>{label}</span>
      <strong>
        {value}
        {suffix}
      </strong>
    </div>
  );
}

function DecisionButton({ strategy, label, detail, disabled, onClick }: { strategy: ReleaseStrategy; label: string; detail: string; disabled?: boolean; onClick: (strategy: ReleaseStrategy) => void }) {
  return (
    <button className={clsx("decision", `decision--${strategy}`)} type="button" onClick={() => onClick(strategy)} disabled={disabled}>
      <span className="decision__title">{label}</span>
      <span className="decision__detail">{detail}</span>
      <ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}

export function BranchlineConsole() {
  const [name, setName] = useState("Release control room");
  const [repositorySource, setRepositorySource] = useState("");
  const [workspace, setWorkspace] = useState<Workspace>();
  const [recentWorkspaces, setRecentWorkspaces] = useState<Workspace[]>([]);
  const [baseCommit, setBaseCommit] = useState("");
  const [headCommit, setHeadCommit] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult>();
  const [scenario, setScenario] = useState<Scenario>();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [mitigations, setMitigations] = useState<Mitigation[]>([]);
  const [comparison, setComparison] = useState<Comparison>();
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [advisorAvailable, setAdvisorAvailable] = useState<boolean>();
  const [activePanel, setActivePanel] = useState<WorkflowPanel>("connect");
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" | "info" }>();

  const contractFinding = analysis?.findings.find((finding) => finding.kind === "api-contract-tightened");
  const riskFindingCount = analysis?.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length ?? 0;
  const alternateScenarios = scenarios.filter((item) => item.id !== scenario?.id);
  const canUseModel = selectedEvidence.length > 0;
  const workflow = [
    { id: "connect" as const, number: "01", label: "Connect", detail: workspace ? "source ready" : "choose source", disabled: false },
    { id: "impact" as const, number: "02", label: "Impact", detail: analysis ? `${analysis.findings.length} signals` : "map the diff", disabled: !analysis },
    { id: "rehearse" as const, number: "03", label: "Rehearse", detail: scenario ? scenario.state.releaseStatus : "test a path", disabled: !analysis },
    { id: "decide" as const, number: "04", label: "Decide", detail: `${mitigations.filter((item) => item.status === "accepted").length} accepted`, disabled: !analysis },
  ];

  useEffect(() => {
    void fetch("/api/capabilities")
      .then((response) => response.json() as Promise<{ advisorAssistance: boolean }>)
      .then((result) => setAdvisorAvailable(result.advisorAssistance))
      .catch(() => setAdvisorAvailable(false));
  }, []);

  useEffect(() => {
    void api<{ workspaces: Workspace[] }>("/api/workspaces")
      .then((result) => setRecentWorkspaces(result.workspaces))
      .catch(() => setRecentWorkspaces([]));
  }, []);

  const sourceHint = useMemo(
    () => {
      if (!repositorySource) return "Paste a local Git path or a public HTTPS Git URL. Branchline never executes repository code.";
      return repositorySource.startsWith("https://")
        ? "Branchline makes a shallow, bare clone in its managed local cache. Credentialed, localhost, and non-HTTPS URLs are rejected."
        : "Local repositories must stay inside BRANCHLINE_REPO_ROOT. Branchline reads Git history only.";
    },
    [repositorySource],
  );

  const connect = async () => {
    setBusy("connect");
    setNotice(undefined);
    try {
      const result = await api<WorkspaceResponse>("/api/workspaces", { method: "POST", body: JSON.stringify({ name, source: repositorySource }) });
      setWorkspace(result.workspace);
      setBaseCommit(result.workspace.commits[1]?.hash ?? result.workspace.commits[0]?.hash ?? "");
      setHeadCommit(result.workspace.commits[0]?.hash ?? "");
      setAnalysis(undefined);
      setScenario(undefined);
      setScenarios([]);
      setMitigations([]);
      setComparison(undefined);
      setActivePanel("connect");
      setRecentWorkspaces((items) => [result.workspace, ...items.filter((item) => item.id !== result.workspace.id)]);
      setNotice({ text: "Repository connected. Select the release boundary, then build the evidence map.", tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Connection failed.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const resumeWorkspace = async (id: string) => {
    setBusy("resume");
    setNotice(undefined);
    try {
      const result = await api<WorkspaceStateResponse>(`/api/workspaces/${id}`);
      setWorkspace(result.workspace);
      setRepositorySource(result.workspace.source.value);
      setName(result.workspace.name);
      setAnalysis(result.analysis);
      setMitigations(result.mitigations);
      setScenarios(result.scenarios);
      setScenario(result.scenarios.at(-1));
      setBaseCommit(result.analysis?.baseCommit ?? result.workspace.commits[1]?.hash ?? result.workspace.commits[0]?.hash ?? "");
      setHeadCommit(result.analysis?.headCommit ?? result.workspace.commits[0]?.hash ?? "");
      setSelectedEvidence(result.analysis?.findings.flatMap((finding) => finding.evidence.map((item) => item.id)).slice(0, 3) ?? []);
      setComparison(undefined);
      setActivePanel(result.analysis ? result.scenarios.length ? "rehearse" : "impact" : "connect");
      setNotice({ text: `Resumed ${result.workspace.name} with its saved evidence, rehearsal branches, and mitigation decisions.`, tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "That control room could not be reopened.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const runAnalysis = async () => {
    if (!workspace) return;
    setBusy("analysis");
    setNotice(undefined);
    try {
      const result = await api<AnalyzeResponse>(`/api/workspaces/${workspace.id}/analyze`, { method: "POST", body: JSON.stringify({ baseCommit, headCommit }) });
      setAnalysis(result.analysis);
      setMitigations(result.mitigations);
      setScenario(undefined);
      setScenarios([]);
      setSelectedEvidence(result.analysis.findings.flatMap((finding) => finding.evidence.map((item) => item.id)).slice(0, 3));
      setActivePanel("impact");
      setNotice({ text: `${result.analysis.findings.length} findings mapped from the real diff. Arm the release rehearsal when you are ready.`, tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Analysis failed.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const armScenario = async () => {
    if (!workspace || !analysis) return;
    setBusy("scenario");
    try {
      const result = await api<{ scenario: Scenario }>("/api/scenarios", { method: "POST", body: JSON.stringify({ workspaceId: workspace.id, analysisId: analysis.id }) });
      setScenario(result.scenario);
      setScenarios([result.scenario]);
      setActivePanel("rehearse");
      setNotice({ text: "Rehearsal armed. Every action below changes a persisted, deterministic scenario—not a real deployment.", tone: "info" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Scenario could not start.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const decide = async (decision: ReleaseStrategy) => {
    if (!scenario) return;
    setBusy(decision);
    try {
      const result = await api<{ scenario: Scenario }>(`/api/scenarios/${scenario.id}/decisions`, { method: "POST", body: JSON.stringify({ decision }) });
      setScenario(result.scenario);
      setScenarios((items) => items.map((item) => (item.id === result.scenario.id ? result.scenario : item)));
      setNotice({ text: `${decision.replaceAll("-", " ")} applied to this rehearsal branch.`, tone: "info" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Decision could not be applied.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const branch = async () => {
    if (!scenario) return;
    setBusy("branch");
    try {
      const result = await api<{ scenario: Scenario }>(`/api/scenarios/${scenario.id}/branch`, { method: "POST", body: JSON.stringify({ title: `Alternate path ${scenarios.length + 1}` }) });
      setScenario(result.scenario);
      setScenarios((items) => [...items, result.scenario]);
      setComparison(undefined);
      setNotice({ text: "A new branch starts from the exact current state. Test the alternate release decision now.", tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Branching failed.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const compare = async (other: Scenario) => {
    if (!scenario) return;
    setBusy("compare");
    try {
      const result = await api<{ comparison: Comparison }>(`/api/scenarios/${scenario.id}/compare/${other.id}`);
      setComparison(result.comparison);
      setNotice({ text: `Comparing ${scenario.title} and ${other.title}.`, tone: "info" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Comparison failed.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const changeMitigation = async (mitigation: Mitigation, status: "accepted" | "rejected") => {
    setBusy(mitigation.id);
    try {
      const result = await api<{ mitigation: Mitigation }>(`/api/mitigations/${mitigation.id}`, { method: "POST", body: JSON.stringify({ status }) });
      setMitigations((items) => items.map((item) => (item.id === mitigation.id ? result.mitigation : item)));
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Mitigation could not be updated.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const askAdvisor = async () => {
    if (!workspace || !analysis) return;
    setBusy("advisor");
    try {
      const result = await api<{ mitigation: Mitigation }>("/api/ai/mitigations", { method: "POST", body: JSON.stringify({ workspaceId: workspace.id, analysisId: analysis.id, selectedEvidenceIds: selectedEvidence }) });
      setMitigations((items) => [...items, result.mitigation]);
      setNotice({ text: "An advisor proposal was added as a reviewable card. It has not changed the scenario metrics.", tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Advisor assistance is unavailable. Configure a compatible endpoint to enable it.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const download = async (format: "markdown" | "json") => {
    if (!workspace || !analysis || !scenario) return;
    setBusy("export");
    try {
      const result = await api<{ format: string; content: string }>("/api/exports", { method: "POST", body: JSON.stringify({ workspaceId: workspace.id, analysisId: analysis.id, scenarioId: scenario.id, format }) });
      const blob = new Blob([result.content], { type: format === "markdown" ? "text/markdown" : "application/json" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `branchline-${scenario.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format === "markdown" ? "md" : "json"}`;
      anchor.click();
      URL.revokeObjectURL(href);
      setNotice({ text: "Release brief downloaded with assumptions, evidence, decisions, and audit trace.", tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Export failed.", tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <main className="shell">
      <header className="topline">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <GitBranch size={20} />
          </span>
          <span>
            <b>BRANCHLINE</b>
            <em>release rehearsal</em>
          </span>
        </div>
        <div className="topline__signal">
          <span className="pulse" /> LOCAL EVIDENCE / DETERMINISTIC IMPACT
        </div>
      </header>

      <section className={clsx("hero", workspace && "hero--condensed")}>
        <div>
          <p className="eyebrow">Release control, one decision at a time</p>
          <h1>Map it. Rehearse it.<br />Then decide.</h1>
          <p className="hero__copy">A focused flight path for a real local or public Git diff—evidence first, deterministic rehearsal second, human approval last.</p>
        </div>
        <div className="hero__plate" aria-label="Branchline product principles">
          <span>01</span><p>Evidence over intuition</p>
          <span>02</span><p>Simulation, never prophecy</p>
          <span>03</span><p>Human decision at every gate</p>
        </div>
      </section>

      {notice && (
        <div className={clsx("notice", `notice--${notice.tone}`)} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.tone === "error" ? <AlertTriangle size={18} /> : notice.tone === "success" ? <ShieldCheck size={18} /> : <CircleDotDashed size={18} />}
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice(undefined)}><X size={16} /></button>
        </div>
      )}

      {workspace && (
        <nav className="workflow-rail" aria-label="Release rehearsal workflow" role="tablist">
          {workflow.map((step) => (
            <button
              className={clsx("workflow-tab", activePanel === step.id && "workflow-tab--active")}
              type="button"
              key={step.id}
              role="tab"
              aria-selected={activePanel === step.id}
              aria-controls={`panel-${step.id}`}
              disabled={step.disabled}
              onClick={() => setActivePanel(step.id)}
            >
              <span className="workflow-tab__number">{step.number}</span>
              <span><b>{step.label}</b><small>{step.detail}</small></span>
              {step.id === "rehearse" && scenario && <span className="workflow-tab__signal" aria-label="Scenario armed" />}
            </button>
          ))}
        </nav>
      )}

      {activePanel === "connect" && <section className="module intake" id="panel-connect" role="tabpanel" aria-label="Connect Git source">
        <div className="module__heading">
          <span className="module__index">01 / CONNECT</span>
          <h2>Set the release boundary.</h2>
        </div>
        <div className="intake__fields">
          <label>
            <span>Control room name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Checkout API release" />
          </label>
          <label className="intake__path">
            <span>Git source</span>
            <input value={repositorySource} onChange={(event) => setRepositorySource(event.target.value)} placeholder="D:\\projects\\service-api or https://github.com/org/repo.git" spellCheck={false} />
            <small>{sourceHint}</small>
          </label>
          <button className="button button--primary" type="button" onClick={connect} disabled={busy === "connect" || !repositorySource.trim()}>
            <GitCommitHorizontal size={18} /> {busy === "connect" ? "Checking Git…" : "Connect repository"}
          </button>
        </div>

        {recentWorkspaces.length > 0 && (
          <div className="recent-workspaces">
            <span>Recent control rooms</span>
            {recentWorkspaces.slice(0, 4).map((item) => (
              <button type="button" key={item.id} onClick={() => resumeWorkspace(item.id)} disabled={busy === "resume"}>
                <GitCommitHorizontal size={13} /> <b>{item.name}</b> <code>{item.source.value.replace(/\/$/, "").split(/[\\/]/).pop()}</code>
              </button>
            ))}
          </div>
        )}

        {workspace && (
          <div className="commit-picker">
            <div className="repo-chip"><span className="pulse" /> {workspace.source.kind.toUpperCase()} SOURCE <code>{workspace.source.value}</code></div>
            <label>
              <span>Base / known-safe</span>
              <select value={baseCommit} onChange={(event) => setBaseCommit(event.target.value)}>
                {workspace.commits.map((commit) => <option key={commit.hash} value={commit.hash}>{shortHash(commit.hash)} — {commit.message}</option>)}
              </select>
            </label>
            <ChevronRight aria-hidden="true" />
            <label>
              <span>Head / release candidate</span>
              <select value={headCommit} onChange={(event) => setHeadCommit(event.target.value)}>
                {workspace.commits.map((commit) => <option key={commit.hash} value={commit.hash}>{shortHash(commit.hash)} — {commit.message}</option>)}
              </select>
            </label>
            <button className="button button--signal" type="button" onClick={runAnalysis} disabled={busy === "analysis" || !baseCommit || !headCommit || baseCommit === headCommit}>
              <Network size={18} /> {busy === "analysis" ? "Mapping evidence…" : "Build impact map"}
            </button>
          </div>
        )}
      </section>}

      {analysis && activePanel === "impact" && (
          <section className="module evidence" id="panel-impact" role="tabpanel" aria-label="Impact map">
            <div className="module__heading module__heading--split">
              <div>
                <span className="module__index">02 / EVIDENCE MAP</span>
                <h2>{analysis.diffSummary.filesChanged} changed files. {riskFindingCount} release gates.</h2>
              </div>
              <button className="button button--outline" type="button" onClick={armScenario} disabled={busy === "scenario" || Boolean(scenario)}>
                <Play size={17} /> {scenario ? "Rehearsal armed" : busy === "scenario" ? "Arming…" : "Arm rehearsal"}
              </button>
            </div>

            <div className="metrics-row">
              <Metric label="Files" value={analysis.diffSummary.filesChanged} />
              <Metric label="Insertions" value={analysis.diffSummary.insertions} suffix="+" level="safe" />
              <Metric label="Deletions" value={analysis.diffSummary.deletions} suffix="−" level="warning" />
              <Metric label="Graph nodes" value={analysis.graph.nodes.length} />
              <Metric label="Secret warnings" value={analysis.secretWarnings.length} level={analysis.secretWarnings.length ? "danger" : "safe"} />
            </div>

            {analysis.secretWarnings.length > 0 && <div className="privacy-warning"><ShieldCheck size={18} /><span>{analysis.secretWarnings.length} potential secret value(s) were redacted from evidence excerpts before model assistance.</span></div>}

            <div className="evidence__grid">
              <div className="finding-list">
                {analysis.findings.map((finding) => (
                  <article className={clsx("finding", `finding--${finding.severity}`)} key={finding.id}>
                    <div className="finding__severity">{severityIcon(finding.severity)} {finding.severity}</div>
                    <div>
                      <h3>{finding.title}</h3>
                      <p>{finding.detail}</p>
                      <div className="evidence-pills">
                        {finding.evidence.map((item) => (
                          <button className={clsx("evidence-pill", selectedEvidence.includes(item.id) && "evidence-pill--active")} type="button" key={item.id} onClick={() => setSelectedEvidence((items) => items.includes(item.id) ? items.filter((id) => id !== item.id) : [...items, item.id])}>
                            <span className="evidence-pill__check">{selectedEvidence.includes(item.id) ? <Check size={12} /> : null}</span>
                            <code>{item.path}</code> · {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="graph-card">
                <div className="graph-card__top"><Network size={17} /> <span>IMPACT RELAY</span><small>evidence-linked</small></div>
                <div className="graph">
                  {analysis.graph.nodes.slice(0, 10).map((node, index) => (
                    <div className={clsx("graph-node", `graph-node--${node.kind}`)} key={node.id} style={{ "--node-index": index } as React.CSSProperties}>
                      <span>{node.kind}</span><b>{node.label.split("/").pop()}</b>
                    </div>
                  ))}
                </div>
                <p>{analysis.graph.edges.length} directional evidence links between changed code, contracts, consumers, and tests.</p>
              </div>
            </div>
          </section>
      )}

      {analysis && activePanel === "rehearse" && (
          <section className={clsx("module rehearsal", !scenario && "rehearsal--inactive")} id="panel-rehearse" role="tabpanel" aria-label="Release rehearsal">
            <div className="module__heading module__heading--split">
              <div>
                <span className="module__index">03 / RELEASE RAIL</span>
                <h2>{scenario ? scenario.title : "Arm a rehearsal to turn evidence into consequences."}</h2>
              </div>
              {scenario && <button className="button button--outline" type="button" onClick={branch} disabled={busy === "branch"}><GitBranch size={17} /> {busy === "branch" ? "Branching…" : "Branch this moment"}</button>}
            </div>

            {scenario ? (
              <>
                <div className="metrics-row metrics-row--scenario">
                  <Metric label="Traffic affected" value={scenario.state.trafficAffected} suffix="%" level={scenario.state.trafficAffected > 25 ? "danger" : "neutral"} />
                  <Metric label="Client error" value={scenario.state.clientErrorRate} suffix="%" level={scenario.state.clientErrorRate > 10 ? "danger" : "safe"} />
                  <Metric label="Support load" value={scenario.state.supportLoad} suffix="/100" level={scenario.state.supportLoad > 50 ? "danger" : "warning"} />
                  <Metric label="On-call urgency" value={scenario.state.onCallUrgency} suffix="/100" level={scenario.state.onCallUrgency > 50 ? "danger" : "warning"} />
                  <Metric label="Test confidence" value={scenario.state.testConfidence} suffix="/100" level={scenario.state.testConfidence > 70 ? "safe" : "warning"} />
                  <Metric label="State" value={scenario.state.releaseStatus} level={scenario.state.releaseStatus === "at-risk" ? "danger" : scenario.state.releaseStatus === "contained" ? "safe" : "warning"} />
                </div>
                <p className="disclaimer"><TimerReset size={15} /> Scenario metrics are rule-based rehearsal outcomes. They are not production telemetry, forecasts, or deployment actions.</p>
                <div className="decision-grid">
                  <DecisionButton strategy="full-rollout" label="Full rollout" detail="Expose all traffic to the candidate." disabled={Boolean(busy)} onClick={decide} />
                  <DecisionButton strategy="canary" label="Canary" detail="Reveal a narrow failure path first." disabled={Boolean(busy)} onClick={decide} />
                  <DecisionButton strategy="compatibility-adapter" label="Compatibility adapter" detail="Keep legacy consumers alive during transition." disabled={Boolean(busy)} onClick={decide} />
                  <DecisionButton strategy="rollback" label="Rollback" detail="Contain this branch; preserve the evidence." disabled={Boolean(busy)} onClick={decide} />
                </div>
                <div className="release-rail" aria-label="Simulation event timeline">
                  {scenario.events.map((item, index) => (
                    <article className={clsx("rail-event", `rail-event--${item.tone}`)} key={item.id}>
                      <span className="rail-event__dot" aria-hidden="true" /><span className="rail-event__serial">{String(index + 1).padStart(2, "0")}</span>
                      <div><p className="rail-event__actor">{item.actor.replaceAll("-", " ")}</p><h3>{item.title}</h3><p>{item.detail}</p><small>RULE / {item.rule}</small></div>
                    </article>
                  ))}
                </div>

                {alternateScenarios.length > 0 && <div className="compare-bar"><span><Copy size={16} /> Compare this branch with:</span>{alternateScenarios.map((item) => <button type="button" key={item.id} onClick={() => compare(item)} disabled={busy === "compare"}>{item.title}</button>)}</div>}
                {comparison && <div className="comparison"><div className="comparison__heading"><GitBranch size={17} /><span>{comparison.primary.title}</span><ArrowRight size={14} /><span>{comparison.alternate.title}</span></div><div className="comparison__grid">{comparison.deltas.map((item) => <div key={item.label} className={clsx("comparison__row", `comparison__row--${item.better}`)}><span>{item.label}</span><b>{String(item.primary)}</b><ArrowRight size={14} /><b>{String(item.alternate)}</b><em>{item.better === "tie" ? "tied" : `${item.better} lower-risk`}</em></div>)}</div></div>}
              </>
            ) : <div className="empty-stage"><Play size={28} /><p>The evidence map is ready. Arm the rehearsal to make a release decision and observe the causal trace.</p></div>}
          </section>
      )}

      {analysis && activePanel === "decide" && (
        <>
          <section className="module mitigations">
            <div className="module__heading module__heading--split">
              <div><span className="module__index">04 / MITIGATION DESK</span><h2>Turn the rehearsal into release work.</h2></div>
              <button className="button button--model" type="button" disabled={busy === "advisor" || !canUseModel || !advisorAvailable} onClick={askAdvisor}><Sparkles size={17} /> {busy === "advisor" ? "Requesting advisor…" : advisorAvailable ? "Ask configured advisor" : "Advisor not configured"}</button>
            </div>
            <p className="module__subcopy">{advisorAvailable ? "Deterministic proposals are available now. Advisor assistance only receives the selected, redacted evidence above and never changes simulation metrics." : "Deterministic proposals are available now. Use $branchline in Codex with no extra key, or configure a compatible advisor endpoint for browser-side assistance."}</p>
            <div className="mitigation-list">
              {mitigations.map((mitigation) => (
                <article className={clsx("mitigation", `mitigation--${mitigation.status}`)} key={mitigation.id}>
                  <div className="mitigation__source">{mitigation.source === "model" ? <><Sparkles size={15} /> Advisor proposal</> : <><ShieldCheck size={15} /> Deterministic proposal</>}</div>
                  <h3>{mitigation.editedContent ?? mitigation.title}</h3>
                  <p>{mitigation.rationale}</p>
                  <dl><div><dt>OWNER</dt><dd>{mitigation.owner}</dd></div><div><dt>VERIFY</dt><dd>{mitigation.verification}</dd></div><div><dt>FALLBACK</dt><dd>{mitigation.fallback}</dd></div></dl>
                  {mitigation.testSnippet && <pre><code>{mitigation.testSnippet}</code></pre>}
                  <div className="mitigation__actions">
                    <span className={clsx("status", `status--${mitigation.status}`)}>{mitigation.status}</span>
                    {mitigation.status === "proposed" && <><button type="button" onClick={() => changeMitigation(mitigation, "accepted")} disabled={busy === mitigation.id}><Check size={15} /> accept</button><button type="button" onClick={() => changeMitigation(mitigation, "rejected")} disabled={busy === mitigation.id}><X size={15} /> reject</button></>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="export-zone">
            <div><span className="module__index">05 / HANDOFF</span><h2>Leave with the trace, not the theatre.</h2><p>Export repository evidence, scenario assumptions, the full event rail, and mitigation decisions for review.</p></div>
            <div className="export-zone__actions"><button className="button button--primary" type="button" onClick={() => download("markdown")} disabled={!scenario || busy === "export"}><FileDown size={17} /> Markdown brief</button><button className="button button--outline" type="button" onClick={() => download("json")} disabled={!scenario || busy === "export"}>JSON audit</button></div>
          </section>
        </>
      )}
    </main>
  );
}
