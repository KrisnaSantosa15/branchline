# Branchline — implementation contract

This document turns the product plan into buildable commitments. It is the source of truth while Branchline is under construction.

## Release objective

Ship a locally runnable, deployable engineering workspace that accepts a genuine local Git repository, analyzes a selected change, runs a deterministic release rehearsal, persists user choices, generates concrete mitigations, and exports the result.

"Complete" means the user can complete this journey themselves. A static canned dashboard, mock interaction, or unlabelled fallback does not count.

## Experience direction

Branchline should feel like a **flight recorder for a software release**: dense, calm, highly legible, and unexpectedly cinematic. It is not a generic SaaS dashboard.

- Canvas: ink-black graphite with a subtle grid and terminal-noise texture.
- Signal colours: acid chartreuse for verified/safe signals, ember orange for cautions, signal red for breakage, and ice blue for user decisions.
- Type: a technical mono face for evidence and events paired with a high-contrast editorial face for release narrative.
- Signature interface: a living **release rail** that shows actors, choices, causal events, and recovery points as a single vertical operational trace.
- Accessibility: motion may be reduced, no meaning relies on colour alone, controls remain keyboard usable, and charts have textual equivalents.

## Definition of the first production release

### Required, working capabilities

1. **Repository connection**
   - User provides a local repository path inside an approved server-side root.
   - Branchline validates the path, confirms it is a Git work tree, lists recent commits, and persists a workspace.
   - A user can choose base and head commits, and see the exact diff summary.

2. **Evidence-led analysis**
   - Diff parser identifies added/removed files, altered exports, changed route contracts, test changes, package changes, configuration changes, and likely database migrations.
   - TypeScript/JavaScript import analysis produces an evidence graph for changed files and direct consumers.
   - Secret patterns are redacted before any model request and surfaced as a privacy warning.
   - Every finding includes a confidence level and one or more repository evidence references.

3. **Deterministic rehearsal**
   - An API-contract scenario consumes actual analysis findings, not a hard-coded response.
   - User selects a release posture: full rollout, canary, compatibility adapter, or rollback.
   - The deterministic rules engine updates measurable world state: traffic affected, client error rate, support load, on-call urgency, test confidence, and release status.
   - Timeline events state both the rule and the related evidence. They are persisted and replayable.
   - The user can branch from any decision point and compare two outcomes.

4. **Mitigation and test artifacts**
   - Branchline generates editable mitigation cards and a contract-test proposal based on the identified contract change.
   - Without an API key, the deterministic artifact generator remains fully usable and the UI truthfully labels model assistance as unavailable.
   - With `OPENAI_API_KEY`, selected redacted evidence can be sent to the Responses API using `gpt-5.6`; structured output is validated before becoming a proposal.
   - Users accept, edit, or reject each mitigation. Decisions persist.

5. **Report and persistence**
   - Workspaces, analysis, scenarios, events, and mitigation decisions survive server restart in a local SQLite database.
   - Export is available as Markdown and JSON. The Markdown brief is readable without Branchline.
   - The report records evidence, assumptions, deterministic outcomes, model-generated suggestions, and user decisions separately.

6. **Operational quality**
   - Loading, empty, invalid-path, no-diff, parser failure, missing-model-key, and export failure states are designed—not omitted.
   - Sample repositories are shipped for evaluation without external credentials.
   - The README contains setup, privacy boundaries, supported repositories, commands, architecture, and a short demo path.

### Explicit non-goals for this release

- Automatic deploys, pull requests, repository writes, or arbitrary test execution.
- Claims to predict real outages or customer behaviour.
- Native analysis parity for every programming language.
- Multi-tenant collaboration, SSO, and hosted repository credentials. The persistence schema will not prevent these later.

## Technical contract

| Layer | Decision |
| --- | --- |
| Web application | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS with a bespoke token system and CSS animation |
| Persistence | Drizzle ORM + SQLite (`better-sqlite3`) locally |
| Local Git boundary | `simple-git`; only metadata and selected diffs are read |
| Static analysis | TypeScript compiler API plus safe text heuristics |
| Validation | Zod at all route/model boundaries |
| Model integration | Official OpenAI JavaScript SDK and Responses API; `gpt-5.6` alias |
| Tests | Vitest unit/integration tests and Playwright browser tests |
| Deployment | Node-compatible deployment with documented writable database volume requirements |

## API surface

| Route | Behaviour |
| --- | --- |
| `POST /api/workspaces` | Validate and connect a local repository. |
| `GET /api/workspaces/:id` | Return the persisted workspace and recent analysis. |
| `POST /api/workspaces/:id/analyze` | Build a change set, evidence graph, and initial mitigation set. |
| `POST /api/scenarios` | Start or branch a scenario from an analysis/snapshot. |
| `POST /api/scenarios/:id/decisions` | Apply one release decision and append deterministic events. |
| `GET /api/scenarios/:id/compare/:otherId` | Return comparison metrics and divergent events. |
| `POST /api/mitigations/:id` | Accept, edit, or reject a mitigation. |
| `POST /api/exports` | Generate a Markdown or JSON release brief. |
| `POST /api/ai/mitigations` | Optional, consent-gated, redacted structured suggestion request. |

## Repository fixture contract

The repository contains a deliberately small but real TypeScript fixture application with two commits:

- `baseline`: an optional `riskLevel` response field and a contract test.
- `breaking-change`: `riskLevel` becomes required while a legacy client/test consumer remains incompatible.

Automated tests connect the fixture, select these two commits, validate the classified API contract finding, simulate both a full rollout and a canary-with-compatibility path, and inspect the exported report.

## Verification matrix

| Journey | Automated proof |
| --- | --- |
| Connect repository | API/integration test and Playwright validation/error state |
| Analyze change | Unit fixture asserts classified findings, evidence graph, and redaction |
| Run scenario | Rules-engine unit tests assert exact metric/event changes |
| Branch and compare | Integration test asserts independent persisted world state |
| Create artifacts | Unit tests assert test/checklist content references evidence |
| Export | Snapshot test verifies Markdown and JSON include decisions/assumptions |
| Browser journey | Playwright: connect → analyze → simulate → mitigate → export |

## Build order and gates

1. Scaffold application, schema, visual tokens, and fixture repository.
2. Build repository adapter and evidence analysis with tests before UI integration.
3. Build the deterministic simulation engine and tests before adding generative explanations.
4. Build the flight-recorder interface around real persisted data.
5. Add model assistance behind consent and configuration gates.
6. Run unit, integration, lint, type, and browser verification; then complete the submission material.

No later stage may replace an earlier real integration with demo data merely to improve the presentation.
