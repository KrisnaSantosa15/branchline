---
name: branchline-review
description: Resolve a Branchline Release Council review into a concise, human-owned release decision record. Use when Council reports disagree, a release captain needs to approve/block/accept risk, or a team needs evidence-linked follow-up checks and rollback triggers.
---

# Branchline Review

Start from the evidence pack and original specialist reports. Validate them with `npx github:KrisnaSantosa15/branchline validate-report <pack> <reports...> --format markdown`; do not summarize an unvalidated report.

Show the overall verdict, unresolved disagreements, required verification, and rollback trigger first. Ask the release captain to choose exactly one of `approved`, `blocked`, `accepted-risk`, or `request-evidence`. Preserve the human rationale, named follow-ups, and original blocking claim in the record. Never decide for the human or interpret absent evidence as safety.
