-- The two daily jobs (visibility-audit-rerun-due-daily at 03:00 UTC and
-- competitor-alerts-check-daily at 04:00 UTC) were scheduled ad hoc with the
-- shared x-cron-secret embedded LITERALLY in the cron.job command — readable
-- by any role that can read cron.job, and their schedules were never recorded
-- in migrations at all. This migration moves both onto the same Vault-backed
-- wrapper pattern as firm-signals-refresh (20260801000002): a SECURITY DEFINER
-- function reads the secret from vault.decrypted_secrets ('cron_secret'),
-- falling back to the app.cron_secret GUC if the dashboard path is ever used,
-- and the cron command becomes a bare function call with no secret in it.

CREATE OR REPLACE FUNCTION public.internal_trigger_visibility_audit_rerun_due()
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
    RAISE WARNING '[visibility-audit-rerun-due] cron secret is not configured — skipping scheduled run. Store it in Supabase Vault as ''cron_secret'' (or set app.cron_secret from the dashboard SQL editor).';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://kosmxczrwrhzmmloxobq.supabase.co/functions/v1/visibility-audit-rerun-due',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', _cron_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.internal_trigger_visibility_audit_rerun_due() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_trigger_visibility_audit_rerun_due() TO service_role;

CREATE OR REPLACE FUNCTION public.internal_trigger_competitor_alerts_check()
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
    RAISE WARNING '[competitor-alerts-check] cron secret is not configured — skipping scheduled run. Store it in Supabase Vault as ''cron_secret'' (or set app.cron_secret from the dashboard SQL editor).';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://kosmxczrwrhzmmloxobq.supabase.co/functions/v1/competitor-alerts-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', _cron_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.internal_trigger_competitor_alerts_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_trigger_competitor_alerts_check() TO service_role;

-- Re-schedule both jobs under the same names, replacing the inline-secret
-- commands. cron.schedule is idempotent on jobname — it updates the existing
-- job in place, so the schedule times are preserved and no duplicate is made.
SELECT cron.schedule(
  'visibility-audit-rerun-due-daily',
  '0 3 * * *',
  'SELECT public.internal_trigger_visibility_audit_rerun_due()'
);

SELECT cron.schedule(
  'competitor-alerts-check-daily',
  '0 4 * * *',
  'SELECT public.internal_trigger_competitor_alerts_check()'
);
