-- Schedules the weekly firm-signals-refresh edge function via pg_cron + pg_net.
--
-- ── Secret configuration ────────────────────────────────────────────────────
-- This function uses a SINGLE shared secret, CRON_SECRET, which must be
-- configured in TWO places (both set to the same value):
--
--   1. Supabase secrets dashboard (or CLI: supabase secrets set CRON_SECRET=<value>)
--      → makes it available as Deno.env.get("CRON_SECRET") inside the Edge Function.
--
--   2. PostgreSQL application setting, so pg_cron can pass it to the HTTP call:
--        ALTER DATABASE postgres SET app.cron_secret = '<same-value>';
--      → makes it available as current_setting('app.cron_secret') inside SQL.
--
-- Both steps are required. A mismatch causes the Edge Function to return 401.
-- Run step 2 once per project (not per migration run) via the Supabase SQL editor
-- or CLI with service_role credentials before the first scheduled run fires.
-- ────────────────────────────────────────────────────────────────────────────
--
-- pg_cron and pg_net are Supabase platform extensions — enable them in the
-- Supabase dashboard (Database → Extensions) before running this migration.

-- Wrapper function: reads the secret from the PostgreSQL app setting so the
-- raw CRON_SECRET value is never embedded in committed DDL.
-- SECURITY DEFINER is required because pg_cron runs the statement as the
-- postgres superuser; the DEFINER clause restricts revocation of EXECUTE
-- to service_role while still allowing pg_cron to call it.
CREATE OR REPLACE FUNCTION public.internal_trigger_firm_signals_refresh()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  _cron_secret text;
BEGIN
  -- current_setting returns '' or NULL when the setting is absent; treat both
  -- as unconfigured so the job fails safely rather than sending an empty header.
  _cron_secret := current_setting('app.cron_secret', true);

  IF _cron_secret IS NULL OR _cron_secret = '' THEN
    RAISE WARNING '[firm-signals-refresh] app.cron_secret database setting is not configured — skipping scheduled refresh. Run: ALTER DATABASE postgres SET app.cron_secret = ''<CRON_SECRET value>'';';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://qeopoiumlnzqwaqzwqcj.supabase.co/functions/v1/firm-signals-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', _cron_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.internal_trigger_firm_signals_refresh() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_trigger_firm_signals_refresh() TO service_role;

-- Weekly schedule: every Sunday at 02:00 UTC.
-- cron.schedule is idempotent on name — re-running this migration updates the
-- schedule rather than creating a duplicate.
SELECT cron.schedule(
  'firm-signals-refresh',
  '0 2 * * 0',
  'SELECT public.internal_trigger_firm_signals_refresh()'
);
