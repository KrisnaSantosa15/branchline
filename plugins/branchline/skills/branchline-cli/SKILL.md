---
name: branchline-cli
description: Install, diagnose, and use Branchline's local release-rehearsal CLI. Use when configuring Branchline for a project, validating prerequisites, or generating an evidence-led Markdown release brief.
---

# Branchline CLI

Branchline requires Node.js 20+ and Git. It uses no model-provider key and
keeps release analysis local and read-only.

## Commands

```sh
npx github:KrisnaSantosa15/branchline doctor
npx github:KrisnaSantosa15/branchline analyze "<local-git-repository-or-public-https-url>" [base-commit] [head-commit]
npx github:KrisnaSantosa15/branchline init <codex|claude-code|cursor|github-copilot|opencode|gemini|all>
```

`init` copies skills into the target project. Use `--cwd <project-path>` to
select that project. It skips existing adapters by default; use `--force` only
when the user explicitly authorizes replacing an existing adapter.

## Interpretation

The output is a Markdown brief containing the release boundary, evidence-led
findings, deterministic mitigation proposals, and a human decision gate. It
does not replace production monitoring, code review, deployment controls, or
human release ownership.
