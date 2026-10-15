---
name: Supabase edge functions deploy path
description: How to deploy edge functions and migrations from this workspace to the hosted Supabase project — the CLI works via --use-api flag; no Docker needed.
---

Changes under `artifacts/legalos/supabase/functions/**` and new files under
`artifacts/legalos/supabase/migrations/**` only take effect once deployed to
the real Supabase project. The Supabase CLI does NOT persist as a global
install across sessions — invoke it via `npx -y supabase@latest` (works fine).

## Deploying edge functions

```bash
cd artifacts/legalos
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN \
  npx -y supabase@latest functions deploy <slug> \
  --project-ref kosmxczrwrhzmmloxobq \
  --no-verify-jwt \
  --use-api
```

The `--use-api` flag bundles server-side (Supabase's servers resolve imports)
without requiring Docker. Without it, the CLI tries to pull a Docker image and
fails with DNS resolution errors inside this sandbox. The `SUPABASE_ACCESS_TOKEN`
secret must be set (it is — added to Replit Secrets).

The command uploads the function's `index.ts` plus every `_shared/*.ts` file it
imports and deploys them as a single ESZip bundle to the hosted project.

## Applying migrations

Run SQL directly against the hosted project via the Management API:

```bash
SQL=$(cat artifacts/legalos/supabase/migrations/<file>.sql)
curl -s -X POST "https://api.supabase.com/v1/projects/kosmxczrwrhzmmloxobq/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}"
```

Returns `[]` on success, an error object on failure.

## Verifying deployment

```bash
pnpm --filter @workspace/legalos run verify:deployment
```

This runs `tests/deployment-verify.mjs` which probes both function slugs (expects
any HTTP status except 404) and checks backing tables via the PostgREST HEAD endpoint.
Exit 0 = all deployed; exit 1 = something is missing.

## New-function checklist

`artifacts/legalos/supabase/functions/README.md` holds the deploy command and
the checklist for adding a new function (deploy comment header, `--use-api`
deploy, KNOWN_UNDEPLOYED same-release removal, migration apply + ledger
record). Point new functions at it rather than re-deriving this file.

## Client gate

Functions known to be undeployed are listed in `KNOWN_UNDEPLOYED` in
`artifacts/legalos/src/lib/edgeFunctionAvailability.ts`. Remove a slug from that
set **in the same release that deploys the function** or the feature stays
silently off. The runtime-404 fallback handles any function that 404s at runtime
(24h TTL, self-heals after deploy without a client change).

**Why:** confirmed by deploying firm-profile and executive-report-schedule via
`--use-api` after plain body POST via the Management API failed with BOOT_ERROR
(edge runtime cannot resolve esm.sh imports at cold-start from raw TypeScript;
ESZip bundles pre-resolve all imports).

## Auditing what's actually deployed

The repo has no record of deployed state, so audit by probing: an
unauthenticated POST to a function is enough (404 = undeployed, any other
status = live). `pnpm --filter @workspace/legalos run probe:functions` does
this for every slug the web client calls and cross-checks KNOWN_UNDEPLOYED,
failing on dead-unlisted AND live-but-still-listed slugs — so rerun it after
any deployment and remove the slug from KNOWN_UNDEPLOYED in the same change.
Dynamic slug constants must be named `FUNCTION_NAME` or end in `_FN` or the
extractor (and probe) can't see them; a test pins this convention.

## Migration ledger + schema-drift guard (since 2026-08-01)

Prod now HAS a `supabase_migrations.schema_migrations` ledger, seeded with all
versions after nine silently-unapplied migrations were applied (drift found by
the new guard: 8 missing tables, ~20 missing columns). The guard is
`tests/schema-drift-check.mjs` (`check:schema-drift` script + vitest wrapper
in the normal test workflow): it parses `supabase/migrations/` into declared
tables/columns, asserts each exists live via information_schema, and asserts
every local migration version is recorded in the ledger. `--seed-ledger`
bootstraps/backfills the ledger.

**Why:** with ad-hoc Management API applies, "the migration file exists in the
repo" proves nothing about prod — firm_roles was missing for days and the
identity resolver errored silently.
**How to apply:** when shipping a migration, apply it via the Management API
AND insert its version into `supabase_migrations.schema_migrations` in the
same change (or run `node tests/schema-drift-check.mjs --seed-ledger` after
applying). The drift test fails until both are done. Note: the
firm_signals_schedule migration needed `CREATE EXTENSION pg_cron; pg_net`
first, and its weekly job silently skips until `app.cron_secret` /
CRON_SECRET are configured.

## Cron secret configuration (since 2026-08-01)

Hosted Supabase's Management API role (`postgres`, `rolsuper=false`) CANNOT
set custom GUCs — `ALTER DATABASE` / `ALTER ROLE` / `ALTER FUNCTION ... SET
app.cron_secret` all fail `42501: permission denied to set parameter`. The
migration-comment advice to `ALTER DATABASE postgres SET app.cron_secret`
only works from the dashboard SQL editor. Working path: store the value in
Supabase Vault (`SELECT vault.create_secret('<v>', 'cron_secret', ...)`) and
have the wrapper read `vault.decrypted_secrets` (migration
20260801000002_firm_signals_schedule_vault.sql), paired with a `supabase
secrets set CRON_SECRET=<same>` rotation — the old value is unrecoverable
(secrets list shows digests only).

**Why:** the weekly firm-signals job skipped every run for days behind a
WARNING; three failed GUC attempts proved the wall.
**How to apply:** any future scheduled function needing a shared secret
should use Vault from the start; verify a manual trigger via side effects
(e.g. `firm_signals.fetched_at`), NOT `net._http_response` — pg_net's ~2s
default capture window always records `timed_out` for a multi-minute batch,
but the request IS delivered and runs to completion. Also: Python urllib to
api.supabase.com gets Cloudflare 1010 — use curl.

## Live smoke tests in vitest

Live smoke scripts (tests/*.mjs calling the real Supabase project) can run in
the normal vitest workflow, but need `// @vitest-environment node` at the top
of the test file: the default happy-dom fetch emulates browser CORS and
blocks cross-origin calls to api.supabase.com. `src/test/setup.ts` guards its
window.matchMedia patch for exactly this. Smoke fixtures must be cleanup-safe
(track created ids incrementally, cleanup in an internal finally, delete
signup-trigger firms explicitly — auth.users deletion does NOT cascade to
firms) and use per-run random passwords.

- Edge functions do NOT see workspace secrets: anything an edge function needs (e.g. AI_INTEGRATIONS_OPENAI_BASE_URL/API_KEY after setupReplitAIIntegrations) must ALSO be set via `npx supabase secrets set --project-ref $REF KEY="$KEY"` — piping from the shell env works without displaying values.

## Live AI stress gate (opt-in)

Heavy live smokes stay out of the default vitest run behind explicit env
opt-ins (`SMOKE_FULL_TEASER=1`, `SMOKE_AI_STRESS=1`); the wrapper test
skipIfs on both the opt-in flag and the smoke creds. Gotcha: big-law sites
(dlapiper.com etc.) 4xx the URL-fetching AI tools' scraper — live payloads
must target fetchable sites (example.com/org) or the gate pages falsely.
