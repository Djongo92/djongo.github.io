# CLAUDE.md — Uvid (LegalOS)

Read this before touching code. It describes the repo **as it is**, not as it
was first planned. Where this file and the code disagree, the code wins, and
this file should be fixed in the same change.

> History: this file used to be the "LegalOS Build Brief" (Batches A–F: the
> market visibility audit, 200-point v1 methodology, Lovable/Gemini AI,
> password-only access). That brief is **fully shipped and superseded**: the
> scale is now 500 points (methodology v3), AI runs on Anthropic, real
> Supabase Auth accounts exist, and the brand is Uvid. Don't re-implement
> anything from it; it's in git history if you need the original reasoning.

## Hard stops — ask the human first

- **Never put a real secret value** in a commit, code comment, log line, or
  summary. Secrets live only in the Supabase dashboard (Edge Functions →
  Secrets) and GitHub Actions secrets.
- **Anything that needs a new paid API key or subscription** that isn't
  already configured. Note what's needed and why, carry on with whatever
  doesn't depend on it. (Existing paid integrations: see "Secrets" below.)
- **`GUIDEBOOK_PASSWORD`, `WORKSHOP_PASSWORD`, `BENCHMARK_PASSWORD`, the
  `verify-access` function and the HMAC token format** in
  `_shared/access.ts`. Legacy tokens still sitting in buyers' browsers depend
  on them. Don't change or remove without the owner.
- **Production database.** There is one Supabase project
  (`qeopoiumlnzqwaqzwqcj`) and every environment — including isolated agent
  worktrees — talks to it. Migrations you apply are live immediately. Check
  prod for existing objects before DB work.
- **Never reference, cite, or compare against third-party visibility
  rankings or their publishers** anywhere (product, code, comments, copy,
  data). Owner directive; the methodology stands on its own.

Everything else — schema, RLS, new functions, components — proceed, verify,
commit.

## What this is

**Uvid** — market visibility intelligence for law firms. Internal/legacy name
**LegalOS** survives in package dirs, storage keys, export file names and the
`legalos.rs` URLs (the uvid domain isn't registered yet). User-facing copy
says "Uvid"; don't rename internal identifiers for cosmetics (logs users out,
breaks run commands).

Product surfaces:
- **Visibility Score** — a measured, peer-benchmarked 500-point audit across
  five categories (below), persisted in `market_visibility_audits`, with a
  public **Visibility Index** per market (`/visibility-index/:market`) and a
  public no-account **teaser** (`/teaser`, IP-rate-limited).
- **Command Center** dashboard, analytics, campaigns, client wins, workflow
  board, executive reports (PDF/DOCX/PPTX/CSV), consultant workspaces.
- **Guidebook** (chapters in `src/data/chapters/`), **Workshop** AI tools,
  and the **Battle Plan** PDF export.
- Marketing site and an Expo mobile app (source only, not deployed from here).

Only **Serbia** is a configured market (`marketVisibilityConfig.ts`).
Hungary/Romania were deliberately removed — unverified reference numbers with
no seed data. Adding a market means verified directory data + config + tests,
not just a config entry.

## Repo layout

```
artifacts/legalos/            Web app (Vite + React 18 + TS + shadcn + Tailwind v3), served at /app/
  src/                        pages/, components/, hooks/, lib/, data/
  supabase/config.toml        per-function verify_jwt — EVERY function needs an entry (see Deploy)
  supabase/functions/         Deno edge functions — the entire backend
    _shared/                  methodology.ts (all weights), access.ts (auth), rateLimit.ts,
                              anthropic.ts (AI), safeFetch.ts, cache.ts, *Formula.ts (pure scoring)
  supabase/migrations/        timestamped SQL
  scripts/census/             bulk "census" audit tooling for the public index
  tests/                      node smoke/probe scripts (live project), not unit tests
artifacts/legalos-marketing/  Marketing site (Vite + Tailwind v4), served at /
artifacts/legalos-mobile/     Expo app
scripts/build-site.mjs        builds marketing + app into site-dist/
amcham-serbia-website/        separate AmCham demo (Cloudflare Pages) — not part of Uvid
.agents/memory/               detailed project notes from earlier sessions — read MEMORY.md there
docs/PROJECT_NOTES.md         rebrand rules, architecture decisions
```

## Commands

pnpm workspace, Node 22. CI uses **pnpm 10** — use the same locally when
touching the lockfile (`npx pnpm@10 install`), or pnpm 11 rewrites
`pnpm-workspace.yaml`.

```bash
pnpm install
pnpm run typecheck                               # all packages
pnpm --filter @workspace/uvid run test           # vitest: web + pure edge formulas
pnpm --filter @workspace/uvid run test:deno      # every Deno.test file, auto-discovered (needs deno 2.x)
pnpm --filter @workspace/uvid run dev            # http://localhost:21341/app/
SITE_BASE=/ node scripts/build-site.mjs          # exactly what ships → site-dist/
```

Live-project checks (need credentials, hit production): `check:schema-drift`,
`probe:functions`, `smoke:*` — see `artifacts/legalos/package.json`.

After any change: typecheck + vitest must pass before committing; run the
Deno tests too if you touched edge code (they also type-check the edge
modules, which nothing else does). CI (`.github/workflows/ci.yml`) runs all
of it plus the mobile tests and the site build on every PR, and both deploy
workflows run it first — a red check means nothing deploys.

Edge-function tests: a file that calls `Deno.test(` runs under Deno, any
other `*.test.ts` under `supabase/functions` runs under vitest (esm.sh
supabase-js is aliased to the npm package there). Both sets are derived from
file contents by `scripts/denoTestFiles.mjs` — there is no list to update.
Write expected scores from `methodology.ts` constants, not literals.

## Architecture rules

**Access control** (`_shared/access.ts`, details in
`.agents/memory/access-control-model.md`). `requireAccess` checks, first match
wins: legacy HMAC password token (`x-access-token`) → real Supabase session
(unmetered) → anonymous, only for functions on the explicit allowlist, and
metered. New functions are **denied to anonymous by default**. Metering is
spend control, not authorization. Functions whose permission depends on the
action (e.g. share links: public "view", privileged "create") parse the body
and call `requireAccess` only on the privileged branch. Middleware never
reads the body. The web client sends the session JWT in `Authorization`
(never a custom header — deployed CORS rejects it).

**Gateway JWT check is off everywhere** (`verify_jwt = false`); the client
key is a `sb_publishable_…` key, which is not a JWT. Authorization lives in
the function. Cron-invoked functions check `x-cron-secret` against
`CRON_SECRET` and are wrapped in `withCronAlert`.

**Database.** Every new table: explicit GRANT block + RLS. Default posture is
service-role-only writes via edge functions. `market_visibility_audits` is
readable only where `is_public = true`; a firm's own unpublished result is
read through `visibility-audit-get` (service role, scoped server-side). Never
let a client set `is_public` directly.

**Scoring** (`_shared/methodology.ts` is the single source of every weight;
`METHODOLOGY_VERSION = 3`, `TOTAL_MAX = 500`):

| Category (user-facing name) | key | Max |
|---|---|---|
| Website Experience | `performance` | 50 |
| Social Presence | `social` | 75 |
| Search Authority | `seoAuthority` | 100 |
| Thought Leadership | `thoughtLeadership` | 150 |
| Recognition | `reputation` | 125 |

- Every audit stores `methodology_version`, `raw_metrics` and per-metric
  `provenance`; scores are recomputed from stored raw metrics, never by
  re-fetching paid data. Older (v1/v2, 200-point) readings are converted at
  display, never mixed.
- **Missing is not zero.** A missing input gets `missing`/`pending`
  provenance and is excluded from the measured max; the peer pool never sees
  estimated numbers. Use the shared measured-totals helpers.
- Naming canon (`.agents/memory/visibility-naming-canon.md`): "Visibility
  Index", not "rankings"/"directory"; copy says standing/position/measured,
  never rank/outrank; no "peer group" jargon in UI.

**AI.** All model calls go through `_shared/anthropic.ts`
(`ANTHROPIC_API_KEY`). Fetched or pasted web text enters prompts only inside
`<page_copy>` tags with the untrusted-copy rule. Changing prompt semantics
means bumping the response cache key.

**Demo.** `/app/demo` is the real app on fixture data (`src/data/demoData.ts`),
behind server-verified showcase codes. Demo-only deviations go through
`<DemoOnly>` — reframe, never invent numbers. Fixture rows must carry the same
fields as real rows.

## Deploy

- **Static site:** push to `main` → `.github/workflows/deploy-pages.yml`
  (GitHub Pages). Vercel config (`vercel.json`) is the optional alternative.
- **Edge functions:** push touching `supabase/functions/**` or `config.toml`
  on `main` → `.github/workflows/deploy-functions.yml` deploys **all**
  functions, reading `verify_jwt` from `config.toml`. **A function missing
  from `config.toml` is deployed with `verify_jwt = true` and breaks** (cron
  and publishable-key callers get 401). Add the entry in the same change as
  the function. Checklist: `supabase/functions/README.md`.
- After deploying, CI runs `probe:functions` (POSTs `{}` to every function
  the client calls; consumes a few units of the anonymous demo quota).
- **Migrations are not deployed by CI.** Apply via the Management API and
  record the version in `supabase_migrations.schema_migrations`;
  `check:schema-drift` fails until both are done. CI runs it as a separate,
  non-gating check (needs the `SUPABASE_ACCESS_TOKEN` Actions secret).
- **Monitoring:** `.github/workflows/monitor.yml` runs daily: site, app
  shell and database answer, and `check:cron-alerts` finds nothing new in
  `public.cron_alerts` from the last 25h. That table holds scheduled-job
  failures and browser errors (job `web-client`, sent by
  `src/lib/errorReporting.ts` → `client-error-report`). A red run is emailed
  by GitHub. The app is wrapped in `AppErrorBoundary`; lazily loaded
  sections use `lazyWithReload` (one reload when a deploy renamed the
  chunk) — use it for any new `lazy()` import.
- Client-side, `KNOWN_UNDEPLOYED` in `src/lib/edgeFunctionAvailability.ts`
  must match reality; `probe:functions` enforces it.

## Secrets (names only — values live in Supabase)

`ACCESS_TOKEN_SECRET`, `GUIDEBOOK_PASSWORD`/`WORKSHOP_PASSWORD`/`BENCHMARK_PASSWORD`
(hard stop), `ANTHROPIC_API_KEY`, `PAGESPEED_API_KEY`, `GOOGLE_PLACES_API_KEY`,
SEO provider (first configured wins: `AHREFS_API_KEY` → `MOZ_ACCESS_ID`+`MOZ_SECRET_KEY`
→ `DATAFORSEO_LOGIN`+`DATAFORSEO_PASSWORD` → `OPENPAGERANK_API_KEY`; none →
Search Authority reports `not_configured`), `VOYAGE_API_KEY`, `CRON_SECRET`,
`CRON_ALERT_WEBHOOK_URL`, `CENSUS_BATCH_SECRET`, `DEMO_ACCESS_CODES`,
`TEAM_PASSWORD`. If SEO scores suddenly drop to zero market-wide, check the
provider's account balance before touching code.

## Known open items

- Chapter audio ("Listen" / voice notes) is a "coming soon" placeholder.
- Only Serbia is configured; there's no repeatable new-market process yet.
- URLs still point at `legalos.rs` until the uvid domain is registered.
- Production runs on the **free Supabase plan** (the daily monitor also
  keeps it from being paused): no restorable backups or point-in-time
  recovery. Upgrading is the owner's call.
- Migrations are still applied by hand; the schema-drift check reports but
  doesn't block deploys.
- Largest components worth splitting: `dashboard/CommandCenter.tsx`,
  `battlePlanPdf.ts`, `MarketVisibilityScore.tsx`, `pages/Index.tsx`.

## Out of scope unless the owner asks

Full CRM/BD hub, Knowledge Hub, Webflow publishing pipeline, named AI-agent
roster, directory submission drafting, conference tracking, per-firm
recurring billing (the `plan`/entitlements seam exists in
`_shared/entitlements.ts` but grants everything today — keep it that way
until real gating is specified).
