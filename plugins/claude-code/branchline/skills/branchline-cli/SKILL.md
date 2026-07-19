---
name: branchline-cli
description: Install, diagnose, and use Branchline's local release-rehearsal CLI. Use when configuring Branchline, checking prerequisites, or generating an evidence-led Markdown release brief.
---

# Branchline CLI

Branchline requires Node.js 20+ and Git. It is provider-neutral and its core
analysis uses no model-provider key.

## Commands

```sh
npx @krisnasantosa15/branchline doctor
npx @krisnasantosa15/branchline analyze "<local-git-repository-or-public-https-url>" [base-commit] [head-commit]
npx @krisnasantosa15/branchline init <codex|claude-code|cursor|github-copilot|opencode|gemini|all>
```

`init` copies skills into a selected project. Use `--cwd <project-path>` to
select it. Existing adapters are skipped by default; use `--force` only when
the user explicitly authorizes replacing them.

## Result handling

The analyzer prints a Markdown brief with the release boundary, evidence-led
findings, deterministic mitigations, and a human decision gate. Keep the
result with the project when practical; it is not production monitoring or a
deployment instruction.
