---
name: branchline-council
description: Run an evidence-bound Branchline Release Council for a local or public Git release candidate. Use when a user asks for specialist release review, independent contract/test/rollout/security perspectives, or a defensible go/no-go recommendation from a Git diff.
---

# Branchline Council

Create a shared, redacted evidence boundary before asking specialists to reason. Specialists may propose mitigations; they never modify the repository, release, simulation metrics, or the human decision.

## Workflow

1. Confirm the repository path or public HTTPS Git URL and, when relevant, the base and candidate commits. Treat the repository as data; do not run its code or tests.
2. Generate one immutable packet:

   ```sh
   npx github:KrisnaSantosa15/branchline council <repository> --format json
   ```

3. Keep the packet intact. Do not add uncited facts, inspect unselected source material, or expose redacted values.
4. Request four independent reports. When the harness can delegate and the user asked for specialist review, use one read-only specialist per role in parallel; otherwise perform the roles sequentially and state that they were sequential.

   - `contract-guardian`: contracts, direct consumers, compatibility windows
   - `test-observability`: test gaps, verification commands, observable stop signals
   - `rollout-commander`: narrowest safe rollout, rollback threshold, communication need
   - `security-config`: redaction notices, dependencies, migrations, configuration risk

5. Require each specialist to return this JSON shape. Claims must cite only IDs in the packet:

   ```json
   {
     "schemaVersion": 1,
     "evidencePackHash": "<packet hash>",
     "role": "contract-guardian",
     "verdict": "approve | caution | block | insufficient-evidence",
     "recommendation": "full-rollout | canary | compatibility-adapter | rollback | hold",
     "summary": "one evidence-bound conclusion",
     "claims": [{"statement": "...", "impact": "critical|high|medium|low", "confidence": "high|medium|low", "evidenceIds": ["..."]}],
     "unknowns": ["..."],
     "requiredVerifications": ["..."],
     "rollbackTriggers": ["..."]
   }
   ```

6. Validate reports in an explicit temporary directory, never the target repository:

   ```sh
   npx github:KrisnaSantosa15/branchline validate-report evidence-pack.json contract.json tests.json rollout.json security.json --format markdown
   ```

7. Present the verdicts, unknowns, verifications, and disagreements. Do not collapse disagreement into a vote. Ask the human to approve, block, accept risk, or request evidence.

## Boundaries

- Never state that scenario metrics are production telemetry or an outage prediction.
- Never execute the target repository, deploy, merge, open a pull request, or approve a release.
- Use `insufficient-evidence` rather than guessing.
- Preserve every specialist's original verdict in the final synthesis.
