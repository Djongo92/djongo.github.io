-- Task #199 — weekly regional trade-press outlet health probe. The opt-in
-- vitest smoke (SMOKE_REGIONAL_PRESS=1) only catches a silently-dead outlet
-- when someone remembers to run it; this schedules the same probe so a dead
-- outlet surfaces within days. Same Vault-backed wrapper pattern as the
-- other cron jobs (20260810070000, 20260812000000): the cron command is a
-- bare function call with NO secret embedded, and the wrapper reads
-- 'cron_secret' from vault.decrypted_secrets with the app.cron_secret GUC as
-- the dashboard fallback. Monday 05:30 UTC — staggered from network-insights
-- (Mon 04:15) and the weekly digest (Mon 07:00).

CREATE TABLE public.press_outlet_health (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  outlet_id   TEXT NOT NULL,
  ok          BOOLEAN NOT NULL,
  item_count  INT NOT NULL,
  http_status INT,
  error       TEXT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Latest-per-outlet reads are the only access pattern (health dashboards,
-- the check:press-health script).
CREATE INDEX press_outlet_health_latest ON public.press_outlet_health (outlet_id, checked_at DESC);

GRANT ALL ON public.press_outlet_health TO service_role;
REVOKE ALL ON public.press_outlet_health FROM anon, authenticated;

ALTER TABLE public.press_outlet_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.press_outlet_health
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.internal_trigger_press_outlets_health()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  _cron_secret text;
BEGIN
  _cron_secret := current_setting('app.cron_secret', true);

  IF _cron_secret IS NULL OR _cron_secret = '' THEN
    SELECT decrypted_secret INTO _cron_secret
      FROM vault.decrypted_secrets
      WHERE name = 'cron_secret'
      ORDER BY created_at DESC
      LIMIT 1;
  END IF;

  IF _cron_secret IS NULL OR _cron_secret = '' THEN
    RAISE WARNING '[press-outlets-health] cron secret is not configured — skipping scheduled run. Store it in Supabase Vault as ''cron_secret'' (or set app.cron_secret from the dashboard SQL editor).';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://kosmxczrwrhzmmloxobq.supabase.co/functions/v1/press-outlets-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', _cron_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.internal_trigger_press_outlets_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_trigger_press_outlets_health() TO service_role;

-- cron.schedule is idempotent on jobname — safe to re-run.
SELECT cron.schedule(
  'press-outlets-health-weekly',
  '30 5 * * 1',
  'SELECT public.internal_trigger_press_outlets_health()'
);
