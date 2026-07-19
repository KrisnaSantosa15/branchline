# Branchline — hackathon submission kit

## Track

**Developer tools**

## One-line description

Branchline lets engineering teams rehearse a real release before shipping it: it turns a local Git diff into an evidence map, runs branching impact scenarios, convenes an evidence-bound release Council, and produces a policy-checkable human decision record.

## Short project description

Code review tells developers what changed; incident response tells them what already broke. Branchline occupies the missing middle: a release-impact rehearsal.

Connect a local Git repository, select a base and candidate commit, and Branchline identifies changed contracts, direct source consumers, tests, and other release signals. A release captain then runs a deterministic scenario with a full rollout, canary, compatibility adapter, or rollback. Each decision changes a transparent shared state and appends an evidence-linked event to the release rail. Teams can branch a scenario, compare outcomes, accept mitigation cards, and export the decision record.

The Council creates one immutable, redacted evidence pack for four specialist perspectives—contract, test/observability, rollout, and security/configuration. Reports are schema-validated against that exact packet; conflicts are shown explicitly; and a human writes the final approve, block, accepted-risk, or request-evidence decision. The same decision ledger is included in exports and can be required by a portable CI policy.

For nuanced recommendations, the included `$branchline` Codex skill gives GPT-5.6 only the locally generated, redacted evidence brief and returns a structured mitigation proposal for review—without a second application key. Branchline is also distributed as native Codex and Claude Code plugins, portable skills for Cursor, GitHub Copilot, OpenCode, and Gemini CLI, a GitHub Actions policy gate, and a provider-neutral MCP server. The standalone browser advisor is deliberately provider-neutral and optional. No model controls risk metrics, writes to a repository, deploys code, or makes a decision for the team.

## Three-minute demo flow

| Time | What to show | What to say |
| --- | --- | --- |
| 0:00–0:20 | Open the connected Branchline fixture. | “A field is optional in the last safe release and required in this candidate. This is a deceptively small change with an operational blast radius.” |
| 0:20–0:45 | Build the evidence map. | “Branchline finds the tightened `riskLevel` contract, its legacy client, and its test—each connection is linked to an actual file.” |
| 0:45–1:20 | Arm the rehearsal and choose Canary. | “The canary is not a fake outage dashboard. Deterministic rules explain exactly why the legacy client, support queue, and on-call state change.” |
| 1:20–1:45 | Choose Compatibility adapter. | “The safer path is not just suggested—it changes the state, adds a compatibility window, and raises test confidence.” |
| 1:45–2:15 | Branch, choose Full rollout, compare. | “Now we replay the same release from the same moment. The branch exposes 76% traffic, 32% client error, and a high on-call urgency beside the controlled path.” |
| 2:15–2:35 | Open Council, create the evidence packet, import one specialist report, and save a human decision. | “Every specialist sees the same immutable packet; Branchline rejects uncited claims and carries the human decision into the export.” |
| 2:35–2:50 | Run `branchline check` or show the GitHub Action policy result. | “Teams can require test confidence, compatibility safeguards, Council coverage, and a human decision before a release is green.” |
| 2:50–3:00 | Run `$branchline` or connect the read-only MCP server in Codex. | “GPT-5.6 adds reviewable reasoning from explicit redacted evidence—no extra browser-app key. Codex built the engine, Council workflow, tests, and integration surface; deterministic rules keep it auditable.” |

## Why GPT-5.6 and Codex matter

- **GPT-5.6:** via the `$branchline` Codex skill or read-only MCP tools, converts narrowly scoped, redacted evidence into structured mitigation proposals and Council perspectives where professional judgment and explanation matter. It is not used for opaque scoring.
- **Codex:** accelerated the full build—from analysis architecture and fixture design to UI implementation, test creation, browser automation, and submission documentation.
- **Technical quality:** the app contains a real local Git integration, SQLite persistence, a deterministic simulation engine, immutable evidence hashes, validated Council/API boundaries, human release ledger exports, portable CI policy gates, a standard MCP server, a publishable `npx` CLI, native Codex and Claude Code plugins, and fixture-backed verification paths.

## Judge test account / data

No test account is needed. Run `npm install`, `npm run fixture:reset`, and `npm run dev`; the generated fixture repository provides a deterministic end-to-end release scenario. For agent-distribution checks, run `npm run test:distribution`, `npm run test:codex-plugin`, `npm run test:claude-plugin`, and `npm run test:mcp`.

## Suggested repository checklist

- [ ] Public repository with this README and the MIT license.
- [ ] `.env.local` excluded from source control.
- [ ] `npm test`, `npm run typecheck`, and `npm run build` green.
- [ ] A <3-minute public demo video following the script above.
- [ ] Codex `/feedback` session ID added to the Devpost submission.
