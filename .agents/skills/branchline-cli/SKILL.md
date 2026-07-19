---
name: branchline-cli
description: Install, diagnose, and invoke Branchline's local, read-only Git release-rehearsal CLI. Use when configuring Branchline for an agent, checking prerequisites, or generating an evidence-led Markdown release brief.
---

# Branchline CLI

Branchline requires Node.js 20+ and Git. Its core analysis uses no
model-provider API key and never executes the target repository.

## Commands

```sh
npx github:KrisnaSantosa15/branchline doctor
npx github:KrisnaSantosa15/branchline analyze "<local-git-repository-or-public-https-url>" [base-commit] [head-commit]
npx github:KrisnaSantosa15/branchline init <codex|claude-code|cursor|github-copilot|opencode|gemini|all>
```

`init` copies portable skills into the selected project. Use `--cwd
<project-path>` to select it. Existing adapters are skipped unless `--force` is
explicitly authorized.

## Result handling

The analyzer prints a Markdown brief with release boundaries, evidence-led
findings, deterministic mitigations, and a human decision gate. It is not
production telemetry or a deployment instruction.
