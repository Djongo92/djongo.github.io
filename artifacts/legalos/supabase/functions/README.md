# Edge functions — deploy before going live

A function directory landing in this repo does **nothing** until it is deployed
to the hosted Supabase project. The CLI works from this workspace via the
Management API (`--use-api` bundles server-side — no Docker, which this
sandbox can't run):

```bash
cd artifacts/legalos
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN \
  supabase functions deploy <slug> \
  --project-ref qeopoiumlnzqwaqzwqcj \
  --no-verify-jwt \
  --use-api
```

`SUPABASE_ACCESS_TOKEN` is in Replit Secrets. Full details (migrations via the
Management API, the schema-drift ledger, probing what's live) live in
`.agents/memory/supabase-edge-deploy-gap.md`.

## Checklist for adding a new function

1. Write the function with a one-line header comment noting it must be
   deployed with the command above before going live (see `firm-profile/` or
   `executive-report-schedule/` for the format).
2. Deploy it with the command above.
3. If the client gates on it: remove the slug from `KNOWN_UNDEPLOYED` in
   `src/lib/edgeFunctionAvailability.ts` **in the same release**, or the
   feature stays silently off. `pnpm --filter @workspace/legalos run
   probe:functions` fails on live-but-still-listed (and dead-unlisted) slugs.
4. If it is a scheduled (cron) function: wrap the `Deno.serve` handler in
   `withCronAlert("<job-name>", handler)` from `_shared/cronAlert.ts` so a
   failing run (thrown error or 5xx on a request carrying the correct
   `x-cron-secret`) sends one webhook alert naming the job. Partial failures
   that don't 5xx (per-row errors aggregated into a 200, background sweeps)
   call `sendCronAlert(...)` directly, once per run. Delivery goes to the
   `CRON_ALERT_WEBHOOK_URL` function secret (Slack/Discord-compatible
   payload): `supabase secrets set CRON_ALERT_WEBHOOK_URL=<url>`. If unset,
   alerts are loudly logged but not delivered.
5. If it needs a table: apply the migration via the Management API AND record
   its version in `supabase_migrations.schema_migrations` in the same change —
   `pnpm --filter @workspace/legalos run check:schema-drift` fails until both
   are done.
