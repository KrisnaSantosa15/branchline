# Branchline — hackathon submission kit

## Track

**Developer tools**

## One-line description

Branchline lets engineering teams rehearse a real release before shipping it: it turns a local Git diff into an evidence map, runs branching impact scenarios, and produces testable mitigations and a release brief.

## Short project description

Code review tells developers what changed; incident response tells them what already broke. Branchline occupies the missing middle: a release-impact rehearsal.

Connect a local Git repository, select a base and candidate commit, and Branchline identifies changed contracts, direct source consumers, tests, and other release signals. A release captain then runs a deterministic scenario with a full rollout, canary, compatibility adapter, or rollback. Each decision changes a transparent shared state and appends an evidence-linked event to the release rail. Teams can branch a scenario, compare outcomes, accept mitigation cards, and export the decision record.

For nuanced recommendations, the included `$branchline` Codex skill gives GPT-5.6 only the locally generated, redacted evidence brief and returns a structured mitigation proposal for review—without a second application key. The standalone browser advisor is deliberately provider-neutral and is optional. No model controls risk metrics, writes to a repository, deploys code, or makes a decision for the team.

## Three-minute demo flow

| Time | What to show | What to say |
| --- | --- | --- |
| 0:00–0:20 | Open the connected Branchline fixture. | “A field is optional in the last safe release and required in this candidate. This is a deceptively small change with an operational blast radius.” |
| 0:20–0:45 | Build the evidence map. | “Branchline finds the tightened `riskLevel` contract, its legacy client, and its test—each connection is linked to an actual file.” |
| 0:45–1:20 | Arm the rehearsal and choose Canary. | “The canary is not a fake outage dashboard. Deterministic rules explain exactly why the legacy client, support queue, and on-call state change.” |
| 1:20–1:45 | Choose Compatibility adapter. | “The safer path is not just suggested—it changes the state, adds a compatibility window, and raises test confidence.” |
| 1:45–2:15 | Branch, choose Full rollout, compare. | “Now we replay the same release from the same moment. The branch exposes 76% traffic, 32% client error, and a high on-call urgency beside the controlled path.” |
| 2:15–2:40 | Accept the contract-test mitigation and export the Markdown brief. | “The output is work the team can use: owner, verification, fallback, test proposal, evidence, and decision trace.” |
| 2:40–3:00 | Run `$branchline` in Codex with the same release boundary. | “GPT-5.6 proposes reviewable mitigations from explicit redacted evidence through the Codex skill—no extra browser-app key. Codex built the engine, interface, tests, and verification workflow; deterministic rules keep the product auditable.” |

## Why GPT-5.6 and Codex matter

- **GPT-5.6:** via the `$branchline` Codex skill, converts narrowly scoped, redacted evidence into structured mitigation proposals where professional judgment and explanation matter. It is not used for opaque scoring.
- **Codex:** accelerated the full build—from analysis architecture and fixture design to UI implementation, test creation, browser automation, and submission documentation.
- **Technical quality:** the app contains a real local Git integration, SQLite persistence, a deterministic simulation engine, validated API boundaries, exported artifacts, and a fixture-backed verification path.

## Judge test account / data

No test account is needed. Run `npm install`, `npm run fixture:reset`, and `npm run dev`; the generated fixture repository provides a deterministic end-to-end release scenario.

## Suggested repository checklist

- [ ] Public repository with this README and the MIT license.
- [ ] `.env.local` excluded from source control.
- [ ] `npm test`, `npm run typecheck`, and `npm run build` green.
- [ ] A <3-minute public demo video following the script above.
- [ ] Codex `/feedback` session ID added to the Devpost submission.
