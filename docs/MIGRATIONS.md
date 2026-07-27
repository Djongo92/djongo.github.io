# Database migrations

Migrations live in `supabase/migrations/`, named
`YYYYMMDDHHMMSS_short_description.sql`, applied in filename order. This
project cannot run `supabase db push` directly from every environment
(direct Postgres connections aren't always routable) — the fallback is the
Supabase Management API's SQL endpoint
(`POST https://api.supabase.com/v1/projects/{ref}/database/query` with an
access token), which every migration in this repo's history has been
verified against at least once.

## Rules

1. **Every new table gets an explicit GRANT block and RLS.** No table is
   left with default-open access. The default posture is service-role-only
   (`GRANT ALL ... TO service_role; REVOKE ALL ... FROM anon,
   authenticated;` + a `USING (false) WITH CHECK (false)` policy) unless
   there's a specific, deliberate reason for a public-read policy (e.g.
   `market_visibility_audits` allows `SELECT` where `is_public = true`,
   because that's the entire point of a public leaderboard).
2. **Never trust a client-asserted identity in a write policy.** If a
   table needs "see your own rows," that goes through a service-role edge
   function that resolves identity server-side
   (`_shared/verifiedClientId.ts`), not an RLS policy scoped to a
   client-supplied `client_id`.
3. **Historical/append-only tables are never updated or deleted, by
   convention, RLS, and code.** `market_visibility_audit_history` is the
   canonical example: RLS blocks all non-service-role access outright, and
   the only code path that touches it is a single `INSERT` in
   `runVisibilityAudit.ts`. If you're adding another append-only history
   table, follow that exact pattern.
4. **Adding a column to an existing table must never silently change
   existing data's meaning.** Pick a default that's either genuinely
   correct for old rows (e.g. `methodology_version DEFAULT 1` on
   `market_visibility_audits`, because rows that already exist really were
   scored by methodology v1) or nullable. Never backfill a computed value
   for old rows as part of the same migration that adds the column — that's
   a silent rewrite of a stored result, which this project treats as a hard
   line (see `CLAUDE.md` §3 / `docs/DECISIONS.md`).
5. **A methodology/formula change is a new version, scored forward — never
   a rewrite of a past result.** If you change how a score is computed,
   bump the relevant version constant (e.g. `METHODOLOGY_VERSION` in
   `_shared/auditMetadata.ts`) and let new runs pick it up; don't touch
   already-stored scores.
6. **Never put a real secret value in a migration file.** Secrets are
   Supabase project settings, not SQL.
7. **One logical change per migration file.** Don't bundle an unrelated
   schema change into a migration named for something else — the filename
   is the changelog.

## Applying a migration locally / to a fresh project

```bash
supabase link --project-ref <ref>
supabase db push
```

If that hangs (direct Postgres connection not routable from your
environment), apply the SQL directly via the Management API instead:

```bash
curl -sS -X POST "https://api.supabase.com/v1/projects/<ref>/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --rawfile q supabase/migrations/<file>.sql '{query: $q}')"
```

## After adding a migration

- Update `src/integrations/supabase/types.ts` (the typed Supabase client's
  schema) if the frontend queries the new/changed table or column via the
  typed client (`@/integrations/supabase/client`) rather than a raw
  `fetch()` to an edge function. This file is hand-maintained in this repo
  (no CI step regenerates it) — a stale entry here doesn't break anything
  at runtime, but it does produce real, silent-until-you-look TypeScript
  errors (see `docs/TESTING.md` for why those were invisible for a while).
- Redeploy any edge function whose query shape changed.
