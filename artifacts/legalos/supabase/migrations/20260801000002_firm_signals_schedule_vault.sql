-- The original schedule migration (20260730000001) reads the shared cron
-- secret from the `app.cron_secret` Postgres setting — but hosted Supabase
-- denies the Management API role every way of setting custom GUCs (ALTER
-- DATABASE / ALTER ROLE / ALTER FUNCTION ... SET all fail with 42501), so
-- that setting could never be configured from this workspace and the weekly
-- job silently skipped every run. This wrapper reads the secret from
-- Supabase Vault instead, falling back to the GUC so the documented
-- dashboard path (ALTER DATABASE ... SET app.cron_secret) still works if it
-- is ever set there. The raw secret stays out of committed DDL either way.
CREATE OR REPLACE FUNCTION public.internal_trigger_firm_signals_refresh()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  _cron_secret text;
BEGIN
  _cron_secret := current_setting('app.cron_secret', true);

  -- GUC unset (the norm when configuring via the Management API): fall back
  -- to the Vault secret named 'cron_secret'.
  IF _cron_secret IS NULL OR _cron_secret = '' THEN
    SELECT decrypted_secret INTO _cron_secret
      FROM vault.decrypted_secrets
      WHERE name = 'cron_secret'
      ORDER BY created_at DESC
      LIMIT 1;
  END IF;

  IF _cron_secret IS NULL OR _cron_secret = '' THEN
    RAISE WARNING '[firm-signals-refresh] cron secret is not configured — skipping scheduled refresh. Store it in Supabase Vault as ''cron_secret'' (or set app.cron_secret from the dashboard SQL editor).';
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
