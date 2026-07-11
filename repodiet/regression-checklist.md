# RepoDiet Regression Checklist

## Build checks

- [ ] Install dependencies
- [ ] Run typecheck
- [ ] Run lint
- [ ] Run production build

## Suggested commands

```bash
npm install
npm run lint
npx tsc --noEmit
npm run build
```

## Route checks

- [ ] /
- [ ] /app
- [ ] /docs
- [ ] /okx

## API checks

- [ ] /api/findings/run
- [ ] /api/patch-kit/generate
- [ ] /api/scans/run

## Protected files

RepoDiet did not generate delete operations for:

- env files
- config files
- lockfiles
- app routes
- API routes
- public assets
