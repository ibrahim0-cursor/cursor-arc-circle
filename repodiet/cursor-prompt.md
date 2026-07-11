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
- Unused files: 0
- Unused dependencies: 4
- Orphan patterns: 0
- AI-slop signals: 0
- Safe candidates: 0
- Raw review findings: 19
- Unique review items: 21
- Do not touch protected items: 0

## Safe candidates
- (none)

## Unique review items
- `src/components/gate/gate-overview-tab.tsx` — Import for "MarketPulse" is not used in src/components/gate/gate-overview-tab.tsx.
- `src/components/landing/arc-home-sections.tsx` — Import for "Radio" is not used in src/components/landing/arc-home-sections.tsx.
- `src/components/nexus/nexus-ab-swap.tsx` — Import for "useCallback" is not used in src/components/nexus/nexus-ab-swap.tsx.
- `src/components/nexus/nexus-agent-wallet-card.tsx` — Import for "useEffect" is not used in src/components/nexus/nexus-agent-wallet-card.tsx.
- `src/components/nexus/nexus-autopilot-panel.tsx` — Import for "estimateRequiredUsdc" is not used in src/components/nexus/nexus-autopilot-panel.tsx.
- `src/components/nexus/nexus-console.tsx` — Import for "Sparkles" is not used in src/components/nexus/nexus-console.tsx.
- `src/components/nexus/nexus-demo-trade-panel.tsx` — Import for "useCallback" is not used in src/components/nexus/nexus-demo-trade-panel.tsx.
- `src/components/nexus/nexus-direction-panel.tsx` — Import for "useConstitution" is not used in src/components/nexus/nexus-direction-panel.tsx.
- `src/components/nexus/nexus-quick-swap.tsx` — Import for "buildBscTestnetTradeTokens" is not used in src/components/nexus/nexus-quick-swap.tsx.
- `src/components/nexus/nexus-research-dossier.tsx` — Import for "BarChart3" is not used in src/components/nexus/nexus-research-dossier.tsx.
- `src/components/nexus/nexus-scan-actions.tsx` — Import for "Sparkles" is not used in src/components/nexus/nexus-scan-actions.tsx.
- `src/components/nexus/nexus-token-detect-panel.tsx` — Import for "Zap" is not used in src/components/nexus/nexus-token-detect-panel.tsx.
- `src/components/nexus/nexus-token-strip.tsx` — Import for "Layers" is not used in src/components/nexus/nexus-token-strip.tsx.
- `src/components/ui/toast-provider.tsx` — Import for "Info" is not used in src/components/ui/toast-provider.tsx.
- `src/hooks/use-testnet-holdings.ts` — Import for "useState" is not used in src/hooks/use-testnet-holdings.ts.
- `src/lib/alpha-desk-scan.ts` — Import for "mergeGmgnIntoSecurityReport" is not used in src/lib/alpha-desk-scan.ts.
- `src/lib/alpha-intel.ts` — Import for "TokenSocialIntel" is not used in src/lib/alpha-intel.ts.
- `src/lib/feed-curation.ts` — Import for "isStablecoin" is not used in src/lib/feed-curation.ts.
- `src/lib/gate-handler.ts` — Import for "fetchGateSnapshotsBatch" is not used in src/lib/gate-handler.ts.
- `src/lib/nexus-agent.ts` — Import for "fetchCryptoNewsHeadlines" is not used in src/lib/nexus-agent.ts.
- `src/lib/token-quote.ts` — Import for "TrendingToken" is not used in src/lib/token-quote.ts.

## Do not touch
- (none)

## Task
Create a conservative cleanup PR that removes only safe files first, then proposes review changes separately.
