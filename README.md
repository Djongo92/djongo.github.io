# LegalOS

A market-visibility product for law firms: an interactive marketing
guidebook, a ten-tool AI "Workshop," a Battle Plan PDF export, and a
peer-group-normalized **Market Visibility Score** — an externally verified,
peer-benchmarked number (PageSpeed, legal-directory standing, thought
leadership, social presence) that gets more meaningful as more firms run it.

Built on Vite + React + TypeScript + shadcn/ui + Tailwind, with Supabase
(Postgres + Deno edge functions) as the backend.

## Quick start

```bash
npm install
cp .env.example .env        # fill in the two VITE_ vars, see docs/ENVIRONMENT.md
npm run dev                 # http://localhost:8080
```

```bash
npm run test                # vitest — pure formula/logic unit tests
npm run build                # production build (vite)
npm run lint                 # eslint
```

To type-check the app, use `npx tsc --noEmit -p tsconfig.app.json` —
**not** a bare `npx tsc --noEmit`. The root `tsconfig.json` only declares
project references and has no `files`, so a bare invocation silently
checks zero files and reports no errors regardless of what's broken. This
project's own history has been bitten by this once already; don't repeat it.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the pieces fit together
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) — every environment variable / secret, what it's for, where it's read
- [`docs/EDGE_FUNCTIONS.md`](docs/EDGE_FUNCTIONS.md) — inventory of every Supabase edge function
- [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) — how to write and land a database migration safely
- [`docs/TESTING.md`](docs/TESTING.md) — what's tested, what isn't, and why
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — how a change actually reaches production
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — short records of the significant technical calls and why
- [`SECURITY.md`](SECURITY.md) — reporting a vulnerability, this project's security posture
- [`CLAUDE.md`](CLAUDE.md) — the original Market Visibility Score build brief (historical; still the source of truth for the scoring formulas' *intent*, even as the implementation has moved past its v1.0 methodology — see `docs/DECISIONS.md`)

## Repository layout

```
src/                    Frontend (Vite + React + TypeScript)
  components/           UI — Workshop tools, dashboard, visibility score, Battle Plan PDF
  pages/                Routed pages (public index pages, /join, /rankings, etc.)
  hooks/                Data-fetching + local state (useAuth, useFirmContext, useMarketVisibility, ...)
  lib/                  Pure logic shared between components and (via relative import) edge functions
  data/                 Demo/sample data for the "Load demo data" flow

supabase/
  functions/            Deno edge functions — one directory per function
    _shared/            Pure formulas, auth/access helpers, Supabase-client helpers — shared across functions
  migrations/           Timestamped SQL migrations, applied in filename order

docs/                   Everything listed above
```

## The two authorization systems, and why both exist

- **HMAC-signed access tokens** (`supabase/functions/_shared/access.ts`) — the
  original shared-password gate for the guidebook/workshop purchase flow.
  Currently bypassed (`BYPASS_ACCESS_CONTROL = true`) while the app is
  private/pre-launch, but the code path is intact and this is a live,
  possibly revenue-generating flow — don't remove it casually.
- **Real Supabase Auth** (`useAuth.ts`, `firms`/`firm_members` tables) — real
  user accounts, firm/organization membership, and roles, for anything that
  needs a persistent identity (Battle Plan ownership, team invites, audit
  history, evidence disputes). The two systems run side by side on purpose;
  see `docs/DECISIONS.md` for why they weren't unified.

## License

Proprietary — all rights reserved.
