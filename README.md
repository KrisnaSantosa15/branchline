# Branchline

> **Run the release that will never happen.**

Branchline is an evidence-led release-impact rehearsal workspace for local or public remote Git changes. It reads a selected diff, maps affected contracts and source consumers, lets a release captain test rollout choices in a deterministic simulation, and turns the safer path into an exportable release brief with testable mitigations.

It is deliberately not an outage oracle. Branchline labels its outputs as **scenario-based rehearsal results**, links them to repository evidence, and keeps a human in charge of every release decision.

## Why it matters

Most code-review tools stop at “this diff looks risky.” Branchline closes the loop:

```text
Real Git diff
  → evidence map of changed contracts and consumers
  → stateful release rehearsal
  → branching rollout decisions
  → accepted mitigations + test proposal + exportable release brief
```

The result is a working release decision tool, not a chat UI that summarizes a pull request.

## Features

- Connect a real local Git work tree, constrained to a configured approved root, or a credential-free public HTTPS Git URL shallow-cloned into a managed cache.
- Select base and head commits to inspect an actual diff.
- Analyze TypeScript/JavaScript changes for optional-to-required contract changes, routes, exports, tests, dependencies, configuration, and migrations.
- Surface an evidence graph spanning changed files, contracts, direct source consumers, and tests.
- Detect and redact secret-shaped values before optional model context is assembled.
- Rehearse full rollout, canary, compatibility adapter, and rollback decisions against deterministic state rules.
- Persist scenario branches, a full causal event rail, mitigation decisions, and reports in SQLite.
- Generate editable, deterministic contract-test and release-checklist proposals.
- Optionally request a reviewable mitigation proposal from a configured, Chat Completions-compatible advisor—or use `$branchline` in Codex with no separate provider key.
- Compare scenario branches and download Markdown or JSON release briefs.

## Stack

- Next.js 16 + React + TypeScript
- SQLite via `better-sqlite3`
- `simple-git` for controlled Git reads and shallow bare remote clones
- Optional, Chat Completions-compatible advisor endpoint for browser-side suggestions
- Vitest for engine verification
- Playwright CLI for live browser workflow verification

## Quick start

### Prerequisites

- Node.js 22+
- Git installed and available on `PATH`

### Run locally

```powershell
cd D:\Projects\exploration\branchline
npm install
Copy-Item .env.example .env.local
npm run fixture:reset
npm run dev
```

Open `http://localhost:3000`, then connect the generated fixture repository:

```text
D:\Projects\exploration\branchline\fixtures\release-fixture
```

Choose the older `baseline: optional release risk contract` commit as the base and `feat: require release risk level` as the head. Build the impact map, arm a rehearsal, choose **Canary**, then **Compatibility adapter**. Branch the scenario and test **Full rollout** to compare both release paths.

### Environment

```dotenv
# Optional browser-side advisor. Any compatible Chat Completions endpoint works;
# use HTTPS unless this is a loopback local provider. The deterministic product works without it.
BRANCHLINE_ADVISOR_ENDPOINT=
BRANCHLINE_ADVISOR_API_KEY=
BRANCHLINE_ADVISOR_MODEL=

# Branchline rejects repository paths outside this root.
BRANCHLINE_REPO_ROOT=D:\\Projects\\exploration

```

The browser advisor is deliberately provider-neutral and only receives user-selected, redacted evidence. For a no-extra-key route, `$branchline` generates the same local brief for the Codex agent already in the user's session; GPT-5.6 provides the release reasoning in that agent workflow.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development application. |
| `npm run build` | Build the production application. |
| `npm run typecheck` | Run TypeScript validation. |
| `npm test` | Run fixture-backed analysis, simulation, and artifact tests. |
| `npm run fixture:reset` | Recreate the two-commit local Git fixture. |
| `npm run branchline -- <path>` | Print a read-only evidence and mitigation brief for a Codex agent. |

## Codex skill

Branchline includes a repo-scoped `$branchline` skill at [`.agents/skills/branchline/SKILL.md`](.agents/skills/branchline/SKILL.md). Open this repository as the Codex workspace (or restart Codex after cloning) and use it to run a read-only release rehearsal with the agent already in your Codex session:

```powershell
npm run branchline -- "D:\projects\service-api"
# Or use a public HTTPS Git source:
npm run branchline -- "https://github.com/org/service-api.git"
```

This route needs no separate model key: Codex reasons over the locally generated, redacted evidence. A standalone browser app cannot access or forward the user's Codex/ChatGPT credentials, so its optional advisor is intentionally configured separately.

## Privacy and safety

- Branchline reads local repositories only inside `BRANCHLINE_REPO_ROOT`. It also accepts credential-free public HTTPS Git URLs, which it shallow-clones as bare repositories into its own managed cache.
- It does not execute repository code, run arbitrary tests, make pull requests, deploy, or contact external systems.
- Potential secrets are redacted before any optional advisor request is prepared.
- Advisor suggestions are proposals validated as structured data; they never alter scenario metrics or apply changes automatically.
- All metrics in the release rail are deterministic scenario outputs. They are not observed production telemetry or a promise that a real incident will occur.

## How the simulation works

The rules engine is intentionally separate from the model layer. A detected optional-to-required contract change produces reproducible effects for each release decision:

- **Full rollout** applies the risk to the full simulated traffic share, increasing client errors, support load, and on-call urgency.
- **Canary** exposes a narrow failure path and keeps the release in an observation state.
- **Compatibility adapter** opens a transition window, reduces simulated client impact, and increases test confidence.
- **Rollback** contains the rehearsal branch without changing any real deployment.

Each event cites the rule and source evidence that produced it. This makes the result reviewable rather than mysterious.

## Verification performed

```text
✓ npm test       — 6 fixture-backed tests passed
✓ npm run typecheck
✓ npm run build
✓ Browser workflow: connect → analyze → arm → canary → compatibility adapter
  → accept mitigation → branch → full rollout → compare → Markdown export
```

## Hackathon implementation notes

Codex accelerated the full product build: project architecture, local Git analysis, deterministic scenario design, test fixture creation, database/API implementation, interface construction, and browser verification.

GPT-5.6 is used through the `$branchline` Codex skill where it adds value rather than replacing deterministic controls: interpreting selected redacted evidence and proposing a structured mitigation for human review. The standalone browser advisor remains provider-neutral. The core simulation stays deterministic and evidence-linked so teams can interrogate why a risk path exists.

See [HACKATHON.md](HACKATHON.md) for the project description and a <3-minute demo narrative.
