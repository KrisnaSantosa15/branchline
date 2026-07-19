---
name: branchline-review
description: Resolve a Branchline Release Council review into a concise, human-owned release decision record. Use when Council reports disagree, a release captain needs to approve/block/accept risk, or a team needs evidence-linked follow-up checks and rollback triggers.
---

# Branchline Review

Turn validated Council reports into a human decision record. The reviewer makes the release decision; the agent only preserves evidence, disagreement, and follow-up work.

## Workflow

1. Start from an evidence pack and the original specialist JSON reports. Do not summarize a report that cannot be validated.
2. Validate all reports against their common packet hash:

   ```sh
   npx github:KrisnaSantosa15/branchline validate-report evidence-pack.json *.json --format markdown
   ```

   Use explicit report paths rather than a broad glob if unrelated JSON files could be included.

3. Display only four decision elements first: overall verdict, unresolved disagreement, required verification, and rollback trigger.
4. Ask the release captain to select exactly one status: `approved`, `blocked`, `accepted-risk`, or `request-evidence`. Do not select it on their behalf.
5. Capture the user's rationale, named follow-ups, owner, and due condition. A risk acceptance must preserve the blocking claim and the stated expiry/rollback trigger.
6. Return a compact decision record:

   ```json
   {
     "evidencePackHash": "<packet hash>",
     "status": "approved | blocked | accepted-risk | request-evidence",
     "decisionNote": "human-provided rationale",
     "requiredFollowUps": ["owner: verification or rollback condition"],
     "preservedDisagreements": ["verdict/recommendation conflicts"]
   }
   ```

## Boundaries

- Never decide for the human or quietly turn a block into an approval.
- Never drop an original claim, unknown, or rollback trigger from an accepted-risk record.
- Never treat missing evidence as evidence of safety.
