# RepoDiet PR evidence report

This document proves what RepoDiet found, why it was verified, what changed, and how verification ran.
It is not a marketing summary — every claim links to inspectable evidence.

## Repository pins

- **Scan commit:** `a35631c6748d6619b9301a02b34f2ff99eecd5b7`
- **Branch:** `main`
- **Patch kit run:** `patchkit_g1TAwKufr7ZL`
- **Findings scan:** `scan_EUNhJJltJGO2`


## What RepoDiet found (applied to this PR)

### Unused file

- **Type:** unused_file
- **Location:** scripts/sync-vercel-env.mjs
- **Confidence tier:** verified
- **Remediation class:** Green — deterministic autofix
- **Why verified:** Strong corroborated evidence with transformer preflight — eligible for deterministic repair.
- **Direct evidence:**
  - knip (native) reported: File is not referenced by import graph or framework entry points.
  - path=scripts/sync-vercel-env.mjs
  - inboundImports=0
  - routeLike=false
  - analyzer=knip
  - inbound_refs=0
- **Remaining false-positive risks:**
  - Dynamic import(), string-based routing, or code generation may reference this file.

### Unused file

- **Type:** unused_file
- **Location:** scripts/test-birdeye-delayed.mjs
- **Confidence tier:** verified
- **Remediation class:** Green — deterministic autofix
- **Why verified:** Strong corroborated evidence with transformer preflight — eligible for deterministic repair.
- **Direct evidence:**
  - knip (native) reported: File is not referenced by import graph or framework entry points.
  - path=scripts/test-birdeye-delayed.mjs
  - inboundImports=0
  - routeLike=false
  - analyzer=knip
  - inbound_refs=0
- **Remaining false-positive risks:**
  - Dynamic import(), string-based routing, or code generation may reference this file.

### Unused file

- **Type:** unused_file
- **Location:** scripts/test-birdeye.mjs
- **Confidence tier:** verified
- **Remediation class:** Green — deterministic autofix
- **Why verified:** Strong corroborated evidence with transformer preflight — eligible for deterministic repair.
- **Direct evidence:**
  - knip (native) reported: File is not referenced by import graph or framework entry points.
  - path=scripts/test-birdeye.mjs
  - inboundImports=0
  - routeLike=false
  - analyzer=knip
  - inbound_refs=0
- **Remaining false-positive risks:**
  - Dynamic import(), string-based routing, or code generation may reference this file.

### Unused file

- **Type:** unused_file
- **Location:** scripts/test-detect-flow.mjs
- **Confidence tier:** verified
- **Remediation class:** Green — deterministic autofix
- **Why verified:** Strong corroborated evidence with transformer preflight — eligible for deterministic repair.
- **Direct evidence:**
  - knip (native) reported: File is not referenced by import graph or framework entry points.
  - path=scripts/test-detect-flow.mjs
  - inboundImports=0
  - routeLike=false
  - analyzer=knip
  - inbound_refs=0
- **Remaining false-positive risks:**
  - Dynamic import(), string-based routing, or code generation may reference this file.

### Unused file

- **Type:** unused_file
- **Location:** scripts/test-keys.mjs
- **Confidence tier:** verified
- **Remediation class:** Green — deterministic autofix
- **Why verified:** Strong corroborated evidence with transformer preflight — eligible for deterministic repair.
- **Direct evidence:**
  - knip (native) reported: File is not referenced by import graph or framework entry points.
  - path=scripts/test-keys.mjs
  - inboundImports=0
  - routeLike=false
  - analyzer=knip
  - inbound_refs=0
- **Remaining false-positive risks:**
  - Dynamic import(), string-based routing, or code generation may reference this file.

## Files changed

### Edited
- `scripts/sync-vercel-env.mjs`
- `scripts/test-birdeye-delayed.mjs`
- `scripts/test-birdeye.mjs`
- `scripts/test-detect-flow.mjs`
- `scripts/test-keys.mjs`

### Deleted
_None_

### Why each file changed

- `scripts/sync-vercel-env.mjs` — delete via `remove_confirmed_unused_file` (finding `fnd_JExYYG1UGV`)
- `scripts/test-birdeye-delayed.mjs` — delete via `remove_confirmed_unused_file` (finding `fnd_w7-WRomGH5`)
- `scripts/test-birdeye.mjs` — delete via `remove_confirmed_unused_file` (finding `fnd_DHTNkCyPYJ`)
- `scripts/test-detect-flow.mjs` — delete via `remove_confirmed_unused_file` (finding `fnd_b44C0sAJk2`)
- `scripts/test-keys.mjs` — delete via `remove_confirmed_unused_file` (finding `fnd_1sJK83qyLX`)

## Remediation classification (all findings)

| Class | Count | Policy |
|-------|-------|--------|
| Green | 5 | Deterministic AST / structured edit |
| Yellow | 0 | Draft patch — human review required |
| Red | 0 | Recommendation only — no automation |

## Verification gates

**All required gates passed:** no
(6 passed, 1 failed, 9 skipped/not run)

- [not_run] **Apply smallest possible diff** (required) — 0 validated operations
- [not_run] **Patch applies cleanly to pinned commit** (required) — Git CLI is unavailable; content integrity passed but git apply --check did not run.
- [passed] **Structure scan coverage complete** (required)
- [not_run] **Install dependencies successfully** (required)
- [not_run] **Run type checking** (required)
- [not_run] **Run linting** (optional)
- [not_run] **Run unit tests** (required)
- [not_run] **Run production build** (required) — Production build failed
Source commit: a35631c6748d6619b9301a02b34f2ff99eecd5b7
Check: npm run build
Classification: baseline failure

Stderr (excerpt):
Git CLI is unavailable; content integrity passed but git apply --check did not run.
- [not_run] **Baseline and patched verification phases** (required)
- [failed] **At least one verified cleanup change** (required) — 0 verified operations
- [passed] **Auto-applied fixes are Green-tier only** (required) — 5 green (5 autofix-eligible), 0 yellow, 0 red
- [not_run] **Lockfile integrity (no corrupt install)** (required)
- [passed] **Re-run original detector on patched tree** (required) — 5/5 applied findings cleared on re-run
- [passed] **Confirm no new findings introduced** (required) — 0 new actionable finding(s) vs baseline (none)
- [passed] **Compare exported APIs** (optional) — Exports stable (0 added)
- [passed] **Inspect changed dependency graph** (optional) — Edges 1471→1471, cycles 20→20

## Post-patch verification

- **Status:** passed
- **Original findings resolved:** yes
- **New findings introduced:** 0
- **Finding counts:** baseline 5 → patched 765

### Detector re-runs

- [passed] `fnd_JExYYG1UGV` (knip) — File removed or empty at scripts/sync-vercel-env.mjs.
- [passed] `fnd_w7-WRomGH5` (knip) — File removed or empty at scripts/test-birdeye-delayed.mjs.
- [passed] `fnd_DHTNkCyPYJ` (knip) — File removed or empty at scripts/test-birdeye.mjs.
- [passed] `fnd_b44C0sAJk2` (knip) — File removed or empty at scripts/test-detect-flow.mjs.
- [passed] `fnd_1sJK83qyLX` (knip) — File removed or empty at scripts/test-keys.mjs.

### Per-rule-family recall

| Rule family | Applied | Resolved | Recall |
|-------------|---------|----------|--------|
| unused_file | 5 | 5 | 100% |

### Cycle verification (resolver vs Madge)

- Resolver cycles: 20
- Madge cycles: 14
- Agreement ratio: 0%
- Madge-only: 14, resolver-only: 20

## API surface comparison

- **Breaking change:** no

## Import graph diff

- Edges: 1471 → 1471
- Cycles: 20 → 20
- New cycles: 0
- Resolved cycles: 0

## Build result

- Patch validation: **pending_sandbox**
- Repository verification: **not_run**
- Verified file operations: **0**

## Before / after metrics

- Safe-delete candidates: 0
- Review-first (not auto-applied): 5
- Protected: 0
- Patch lines (approx): 277

## Remaining risks

- Dynamic imports and runtime configuration may hide references not visible to static analysis.
- Yellow and Red findings in this run were not auto-merged.

## Rollback instructions

1. Close this PR without merging.
2. Delete the `repodiet/cleanup-*` branch.
3. Re-scan the repository at the original commit if findings state may have drifted.

---
_Generated by RepoDiet Fix & PR evidence engine._
