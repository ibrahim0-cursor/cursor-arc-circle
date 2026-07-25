# Cursor Cleanup Prompt

You are cleaning a JavaScript/TypeScript repo using RepoDiet findings.

## Rules
- Do not delete framework routes, layouts, API routes, config files, env files, lockfiles, or public assets without confirmation.
- Safe candidates are 0, so do not generate delete operations yet. Only propose a review plan and group findings by safest-first cleanup order.
- For unique review items, inspect imports and runtime usage before changing.
- After every cleanup batch, run lint and build.
- Preserve app behavior.

## Repo
- URL: https://github.com/velz-cmd/Meridian
- Branch: main
- Framework: Unknown JS/TS
- Package manager: npm

## Findings summary
- Duplicate clusters: 0
- Unused files: 5
- Unused dependencies: 0
- Orphan patterns: 0
- AI-slop signals: 0
- Safe candidates: 0
- Raw review findings: 0
- Unique review items: 5
- Do not touch protected items: 0

## Safe candidates
- (none)

## Unique review items
- `scripts/sync-vercel-env.mjs` — File is not referenced by import graph or framework entry points.
- `scripts/test-birdeye-delayed.mjs` — File is not referenced by import graph or framework entry points.
- `scripts/test-birdeye.mjs` — File is not referenced by import graph or framework entry points.
- `scripts/test-detect-flow.mjs` — File is not referenced by import graph or framework entry points.
- `scripts/test-keys.mjs` — File is not referenced by import graph or framework entry points.

## Do not touch
- (none)

## Task
Create a conservative cleanup PR that removes only safe files first, then proposes review changes separately.
