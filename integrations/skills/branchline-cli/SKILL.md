---
name: branchline-cli
description: Install, diagnose, and invoke Branchline's portable local release-rehearsal CLI. Use when configuring Branchline for an agent harness, checking its prerequisites, or producing a Markdown release brief.
---

# Branchline CLI

Branchline is a local command-line release rehearsal tool. The analyzer needs
Node.js 20+ and Git, and it only reads committed Git content.

## Commands

```sh
branchline doctor
branchline analyze "<local-git-repository-or-public-https-url>" [base-commit] [head-commit]
branchline init <codex|claude-code|cursor|github-copilot|opencode|gemini|all>
```

`init` copies skills into a project; it does not alter application source code.
Use `--cwd <project-path>` to choose the target and `--force` only when the
user explicitly wants to replace an existing adapter.

## Result handling

The analyzer prints a Markdown brief with the release boundary, evidence-led
findings, deterministic mitigations, and an explicit human decision gate. Keep
the raw evidence with the project when practical, and never describe these
findings as production monitoring or a deployment instruction.
