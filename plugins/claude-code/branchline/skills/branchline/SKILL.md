---
name: branchline
description: Rehearse a Git release change using local evidence, deterministic mitigation proposals, and a human decision gate. Use when asked to assess release risk, rollout strategy, blast radius, contract migration, change impact, or pre-ship readiness. Do not use to deploy, modify a target repository, or portray simulations as production telemetry.
---

# Branchline release rehearsal

Use Branchline before offering rollout advice. It creates a local evidence brief
from Git history, then you reason over that brief in the active session. It
does not need or use a separate model API key.

## Workflow

1. Confirm the user has authority to inspect the repository and that the change
   is a release candidate.
2. Generate the local, read-only brief:

   ```sh
   npx github:KrisnaSantosa15/branchline analyze "<local-git-repository-or-public-https-url>"
   ```

   Pass base and head commits as the second and third positional arguments to
   choose an explicit release boundary. Public remotes must use credential-free
   HTTPS.
3. Separate observed Git evidence from assumptions and deterministic scenario
   outcomes. Recommend canary, compatibility adapter, full rollout, or rollback
   with explicit rationale and uncertainty.
4. Turn every accepted mitigation into a concrete test, named owner, and
   fallback. The human—not this plugin—accepts, changes, or rejects it.

## Safety boundary

- Branchline reads Git metadata and committed files only; it never executes
  target code, runs tests, deploys, or opens pull requests.
- Redact secret-shaped values before quoting evidence in an external system.
- Never claim production telemetry, certainty, incident prediction, or
  deployment authority.
- Do not forward repository evidence to a provider unless the user explicitly
  requests that action and has authority to make it.
