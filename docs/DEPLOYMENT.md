# Deployment

Two independent things have to ship for a change to actually reach
production: the static frontend (GitHub Pages) and the Supabase backend
(Postgres migrations + edge functions). Neither deploys automatically from
this repo's merges today — both are manual steps.

## Frontend (GitHub Pages)

`npm run build` produces `dist/`, built with a base path matching this
repo's Pages URL (`/djongo.github.io/`). The Pages workflow serves that
`dist/` output; a `404.html` SPA-fallback trick handles client-side routes
on a full page load/refresh. Merging a PR to `main` does not, by itself,
redeploy the site — check the repo's Pages settings/workflow for the actual
trigger before assuming a merge is live.

## Backend (Supabase)

1. **Migrations**: apply any new file in `supabase/migrations/` — see
   `docs/MIGRATIONS.md` for the two ways to do this (`supabase db push` or
   the Management API fallback). Requires a Supabase access token with
   write access to the project; not something available in every
   development environment.
2. **Edge functions**: redeploy every function whose code (including any
   `_shared/*` file it imports) changed:
   ```bash
   supabase functions deploy <function-name> --project-ref <ref>
   ```
   There's no single "deploy everything" step wired up — redeploy exactly
   the functions that changed, since importing a changed `_shared` file
   means every function that imports it needs redeploying too, not just
   the one you edited directly.
3. **Secrets**: see `docs/ENVIRONMENT.md`. A new secret needs to exist in
   the Supabase project *before* deploying a function that reads it, or
   the function will hit its "not configured" degraded path (by design —
   see the same doc).

## Scheduled jobs (pg_cron)

`visibility-audit-rerun-due` and `competitor-alerts-check` are invoked by
`pg_cron` + `pg_net`, not by an external scheduler:

```sql
select cron.schedule(
  'visibility-audit-rerun-due-daily',
  '0 3 * * *',
  $$select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/visibility-audit-rerun-due',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET value>'),
    body := '{}'::jsonb
  );$$
);
```

This SQL is run once directly against the database (not committed to a
migration file, since it would otherwise embed the real `CRON_SECRET`
value) — mirror the existing job's schedule/pattern when adding a new one,
and never commit the secret itself.

## What "shipped" actually means here

A merged PR means the code is on `main`. It does **not** mean:
- the frontend is redeployed to GitHub Pages,
- any new/changed migration has been applied to the live database, or
- any changed edge function has been redeployed.

Each of those is a separate, explicit action. When in doubt, verify rather
than assume — check the live site, query the database schema, or check
`supabase functions list`'s reported deploy timestamps.
