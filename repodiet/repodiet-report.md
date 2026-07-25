# RepoDiet Cleanup Report

## Repository

- Owner/repo: velz-cmd/Meridian
- Branch: main
- URL: https://github.com/velz-cmd/Meridian
- Framework: Unknown JS/TS
- Package manager: npm

## Summary

- Duplicate clusters: 0
- Unused files: 5
- Unused dependencies: 0
- Orphan patterns: 0
- AI-slop signals: 0
- Safe candidates: 0

- Raw review findings: 0
- Unique review items: 0
- Do not touch protected items: 0

## Count semantics

- **Raw review findings** — total findings flagged `review_first` before path deduplication.
- **Unique review items** — deduplicated files/packages documented for patch review.
- **Do not touch** — protected framework, config, route, and runtime paths.

## Key findings

- **unused_file** (safe_candidate) `scripts/sync-vercel-env.mjs` — File is not referenced by import graph or framework entry points.
- **unused_file** (safe_candidate) `scripts/test-birdeye-delayed.mjs` — File is not referenced by import graph or framework entry points.
- **unused_file** (safe_candidate) `scripts/test-birdeye.mjs` — File is not referenced by import graph or framework entry points.
- **unused_file** (safe_candidate) `scripts/test-detect-flow.mjs` — File is not referenced by import graph or framework entry points.
- **unused_file** (safe_candidate) `scripts/test-keys.mjs` — File is not referenced by import graph or framework entry points.

## Patch policy

RepoDiet generated a conservative patch bundle.
No protected framework/runtime files were included in automatic delete operations.

## Next steps

1. Review Safe Candidates.
2. Apply cleanup patch.
3. Run regression checklist.
4. Re-run RepoDiet.
