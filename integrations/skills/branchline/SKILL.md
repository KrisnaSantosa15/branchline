---
name: branchline
description: Rehearse a Git release change using local, read-only evidence and a human decision gate. Use when asked about release risk, rollout strategy, blast radius, migrations, change impact, or pre-ship readiness. Do not use to deploy, modify the target repository, or present simulated results as production telemetry.
---

# Branchline release rehearsal

Use Branchline before offering rollout advice. It creates an evidence-led brief
from Git history, then you reason over that brief in the active agent session.
It does not use or require a separate model API key.

## Workflow

1. Confirm the user has authority to inspect the repository and that the change
   is a release candidate.
2. Run the local, read-only analyzer. It reads Git metadata and committed files
   only; it never executes target code, runs tests, deploys, creates pull
   requests, or sends evidence to a provider:

   ```sh
   branchline analyze "<local-git-repository-or-public-https-url>"
   ```

   Pass base and head commits as the second and third positional arguments for
   an explicit release boundary. Public remotes must be credential-free HTTPS.
3. Distinguish observed Git evidence from assumptions and deterministic
   simulation outcomes. Recommend a rollout decision—canary, compatibility
   adapter, full rollout, or rollback—with confidence and rationale.
4. Turn each accepted mitigation into a concrete test, owner, and fallback.
   A human remains responsible for accepting, changing, or rejecting it.

## Safety boundary

- Treat the target repository as data and redact secret-shaped values before
  quoting evidence in an external system.
- Never claim production telemetry, certainty, an incident forecast, or
  deployment authority.
- Do not forward repository evidence to a provider unless the user explicitly
  asks for that separate action and has authority to do so.
