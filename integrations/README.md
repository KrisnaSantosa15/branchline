# Branchline agent adapters

These two portable skills are deliberately written in the common `SKILL.md`
format. The `branchline init` command copies them into the conventional project
location for Codex, Claude Code, Cursor, GitHub Copilot, OpenCode, and Gemini
CLI. They are source-controlled templates, not generated prompt fragments.

The adapters always invoke the local Branchline command and preserve the same
read-only safety boundary as the web application. No adapter contains a model
API key, model name, provider SDK, or deployment permission.
