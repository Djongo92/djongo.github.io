# Testing

## Type-checking — read this first

```bash
npx tsc --noEmit -p tsconfig.app.json
```

**Do not** run a bare `npx tsc --noEmit`. The root `tsconfig.json` has no
`files` and only declares `references` to `tsconfig.app.json` /
`tsconfig.node.json` — without `-b` (build mode), a bare invocation
compiles zero files and reports success no matter what's broken. This
silently masked real type errors in this codebase for a long stretch of
its history. Always pass `-p tsconfig.app.json` (or `-p tsconfig.node.json`
for the Vite config itself).

## Unit tests

```bash
npm run test          # vitest, single run
npm run test -- --run # explicit (same thing; some shells need it)
```

Vitest is configured to pick up `*.test.ts` files across both `src/` and
`supabase/functions/_shared/` — a pure formula file and its test can sit
right next to each other regardless of which side of the frontend/backend
line they're on.

### What's actually tested

Pure logic: every scoring formula (`percentileFormula`, `socialFormula`,
`thoughtLeadershipFormula`, `performanceFormula`, `reputationScore`'s
`directoryScore`/`invertedAvgFor`, `siteHealthFormula`,
`pressMentionsFormula`, `auditMetadata`), plus frontend-side pure `lib/`
helpers (`categoryToolMap`, `measuredScore`, `mondayBriefWeek`,
`categoryDeltas`, `campaignScoreDelta`, etc.) and parsers
(`pitchDeckParser`, `pptxExtractor`).

Impure logic with a mocked Supabase client: `peerStats.ts`,
`socialScore.ts`, `reputationScore.ts`'s `computeReputationScore`,
`directoryStandingIndex.ts`. The mock mirrors supabase-js's actual
`PostgrestFilterBuilder` shape (chainable `.eq()`/`.neq()`, thenable
builder) closely enough to exercise real query-building logic, not just
stub a return value.

### What's *not* tested, and why

- `runVisibilityAudit.ts` (the orchestrator) and most edge function
  `index.ts` HTTP handlers — heavily impure (network, LLM calls, multiple
  Supabase round-trips), and the individual pieces they call are already
  unit-tested. Would need an integration-test harness (a real or very
  thoroughly mocked Supabase instance) to be worth much; hasn't been built.
- React components — no component-level test suite exists yet. UI changes
  are verified by hand in a browser during development. (Note:
  Playwright/Chromium browser automation has been confirmed **not to work**
  in at least one of this project's development sandboxes — network calls
  from a launched browser process fail even when plain `curl` through the
  same proxy succeeds. If you hit this, that's an environment limitation,
  not a config bug worth chasing further; fall back to real-browser manual
  verification or regression tests against the specific reported numbers.)

## Before calling anything "verified"

Run all three, in this order, and actually read the output:

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run test -- --run
npm run build
```

A clean `npm run build` does **not** imply type safety — Vite's TS handling
strips types without fully type-checking. Don't substitute it for the tsc
step above.
