# Branchline — product plan

## Product promise

**Run the release that will never happen.** Branchline turns a real local Git change and its repository context into an explainable release-impact rehearsal. Engineering teams can inspect affected contracts and dependencies, exercise release choices against a stateful simulation, and leave with concrete mitigations: test cases, rollout checks, and an exportable decision record.

Branchline forecasts *plausible impact scenarios*; it never claims to predict production with certainty.

## Intended users and jobs

| User | Job to be done |
| --- | --- |
| Developer opening a pull request | Find breaking contracts and missing tests before review or deployment. |
| Tech lead / release captain | Compare rollout strategies and document a defensible go/no-go decision. |
| SRE / support partner | Understand who and what will be affected, with clear assumptions rather than an opaque risk score. |

## Complete product workflow

1. The user creates a workspace and connects a local Git repository by selecting an approved path.
2. Branchline indexes safe repository metadata: tracked file paths, package manifests, OpenAPI/GraphQL contracts where present, test locations, imports, and Git history relevant to the selected base and head commits.
3. The user selects a diff. The system classifies changes such as public API contract changes, type changes, deleted exports, configuration changes, database migrations, and dependency updates.
4. The Impact Map shows affected files, endpoints, tests, consumers, and confidence/assumptions for every relationship.
5. The user starts a rehearsal. Branchline creates a deterministic shared world state and a transparent cast of operational actors (for example, legacy client, API gateway, background worker, CI, on-call, and support).
6. The user makes release decisions—feature flag, canary, compatibility adapter, migration order, full rollout, rollback—while the actors respond through permitted actions. State changes render as a timeline, risk map, and impact metrics.
7. Branchline recommends mitigations with linked evidence from the diff and repository. The user can accept, edit, or reject each one.
8. The user exports a release brief containing assumptions, decisions, simulation outcomes, proposed tests, and the final checklist. A shareable workspace record preserves the full audit trail.

## Functional scope

### Repository intelligence

- Local Git repositories only in the first release; no remote repository credential is required.
- First-class analysis for TypeScript and JavaScript: imports/exports, public types, route handlers, package changes, and test discovery.
- Repository-agnostic diff analysis for any text-based language, so every connected repository has a useful baseline.
- OpenAPI and GraphQL schema diffing when specification files are detected.
- Dependency/contract graph with evidence links back to exact files and changed lines.
- Secrets and credentials scanner before content may be sent to a model; the user can deselect files and review the proposed context bundle.

### Release rehearsal

- Scenario templates: API contract break, migration ordering failure, dependency upgrade regression, feature-flag drift, and background-job schema mismatch.
- A structured simulation engine owns all world state and computes deterministic consequences from defined rules.
- GPT-5.6 interprets repository evidence, explains likely pathways, proposes actor actions, and writes mitigations in a constrained JSON schema. It does not silently change simulation metrics.
- Decision controls: rollout shape, traffic percentage, flag state, compatibility window, migration sequencing, rollback trigger, and communication choice.
- Branching and comparison: duplicate a scenario at any decision point and compare outcome timelines.

### Outputs that teams can use

- Test suggestions generated as editable source files or test snippets, linked to the failure mechanism they cover.
- A rollout checklist with named owner, evidence, verification command, and fallback step.
- Markdown and JSON export; print-friendly HTML release brief.
- Workspace history with scenario versions, decisions, and accepted/rejected mitigations.

## Product boundaries

- Branchline does not execute untrusted project code by default. Any future test-runner integration must use an explicit command allowlist and a clearly shown local execution consent screen.
- It does not auto-merge, deploy, create pull requests, or contact external systems.
- It does not claim a probabilistic production outage forecast without observed telemetry. Its language remains scenario-based and evidence-linked.
- Initial language depth is TypeScript/JavaScript. This is intentional quality scope, not a fake claim of universal static analysis.

## Architecture

```text
Browser workspace
  ├─ Repository connection + consent
  ├─ Impact graph / simulation timeline / decision controls
  └─ Export and audit views
          │
Next.js application server
  ├─ Workspace API + authentication boundary
  ├─ Local repository adapter
  ├─ Diff, AST, contract, and secret analysis
  ├─ Evidence graph builder
  ├─ Deterministic simulation engine
  ├─ GPT-5.6 structured-reasoning adapter
  └─ Report and test-artifact generator
          │
Persistence
  ├─ SQLite for local development
  └─ Postgres-compatible schema for hosted deployment
```

### Technology choices

- Next.js, React, TypeScript, Tailwind CSS, and accessible component primitives.
- Drizzle ORM with SQLite locally and Postgres in deployment.
- `simple-git` for controlled Git metadata and diff access.
- TypeScript compiler API / `ts-morph` for first-class TypeScript and JavaScript analysis.
- `@apidevtools/swagger-parser` or equivalent for OpenAPI validation and a GraphQL schema parser for contract analysis.
- A small in-process graph model initially; it is persisted relationally rather than hidden in an external black box.
- OpenAI Responses API configured through environment variables. Model selection is explicit and defaults to the challenge model when credentials are present.
- Vitest for unit/integration tests and Playwright for the primary user journey.

## Data model

| Entity | Key data |
| --- | --- |
| Workspace | name, approved repository root, consent settings, timestamps |
| RepositorySnapshot | commit SHA, selected base SHA, safe metadata, index status |
| ChangeSet | diff, classified changes, evidence references, user selections |
| GraphNode / GraphEdge | type, source path, stable identifier, confidence, evidence |
| Scenario | template, assumptions, world-state version, branch parent |
| SimulationEvent | actor, action, before/after state, rule/evidence source |
| Mitigation | category, proposal, linked risks, owner, acceptance state |
| Export | format, scenario version, generated artifact path |

## Privacy and security

- Source remains local unless the user explicitly permits selected excerpts to be sent to the model provider.
- Secret scanning runs before context construction; matching values are redacted, never merely highlighted.
- Repository root validation rejects paths outside the user-selected root.
- The audit trail distinguishes deterministic findings, model-generated hypotheses, and user decisions.
- Authentication and encryption-at-rest become mandatory when Branchline is deployed for multi-user use.

## Quality bar and verification

The release is complete only when all of these are true:

- A new user can follow the README to install, configure, and run the project.
- A TypeScript fixture repository can be connected, indexed, diffed, and rehearsed without manual database edits.
- A contract-breaking fixture produces an evidence-linked impact map, a changing simulation timeline, and at least one editable test suggestion.
- Scenario branching produces two distinct, persisted outcomes from the same decision point.
- Exports include all assumptions and evidence identifiers.
- Unit tests cover diff classification, graph construction, rules, redaction, and report generation.
- Playwright verifies connection → analysis → rehearsal decision → mitigation → export.
- Keyboard navigation, colour contrast, loading/error states, and empty states are reviewed in the running interface.

## Build sequence

1. Application foundation, persistence, fixture repository, and repository consent flow.
2. Diff/AST/contract analyzers plus evidence graph and redaction pipeline.
3. Stateful simulation engine with a single API-contract scenario and timeline UI.
4. GPT-5.6 structured analysis, mitigation review, test generation, and export.
5. Scenario branching, repository history, accessibility polish, full test suite, README, sample repository, and deployment instructions.

## Demo narrative

An engineer changes a response field from optional to required. Branchline shows the legacy client and contract test that are affected, then rehearses a full rollout that produces client failures and support pressure. The engineer branches the scenario, chooses a compatibility adapter plus canary release, observes a controlled outcome, accepts a generated contract test, and exports the release brief.
