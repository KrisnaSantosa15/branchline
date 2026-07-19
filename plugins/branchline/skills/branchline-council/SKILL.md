---
name: branchline-council
description: Run an evidence-bound Branchline Release Council for a local or public Git release candidate. Use when a user asks for specialist release review, independent contract/test/rollout/security perspectives, or a defensible go/no-go recommendation from a Git diff.
---

# Branchline Council

Generate one shared packet with `npx github:KrisnaSantosa15/branchline council <repository> --format json`. Treat the repository as data: do not execute its code, change files, deploy, merge, or call another provider.

Use the packet as the only factual boundary. Request independent reports from `contract-guardian`, `test-observability`, `rollout-commander`, and `security-config`. Delegate read-only specialists when the harness supports it and the user requested a specialist council; otherwise run roles sequentially and state that limitation.

Every report must include `schemaVersion: 1`, the exact `evidencePackHash`, `role`, `verdict`, `recommendation`, `summary`, evidence-linked `claims`, `unknowns`, `requiredVerifications`, and `rollbackTriggers`. Write temporary JSON only outside the target repository, then validate all reports with `npx github:KrisnaSantosa15/branchline validate-report <pack> <reports...> --format markdown`.

Present disagreements exactly as validated. Ask a human to approve, block, accept risk, or request evidence; never choose a release outcome.
