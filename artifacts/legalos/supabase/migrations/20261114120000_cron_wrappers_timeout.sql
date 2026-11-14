-- The cron wrappers called net.http_post with pg_net's default 5 s timeout.
-- Edge functions routinely take longer (cold start + DB work), so every
-- scheduled run recorded a client-side timeout in net._http_response and
-- nothing could tell a finished run from an aborted one. All six wrappers
-- now go through one helper with a timeout that covers the edge runtime's
-- own wall-clock limit (150 s), so the response — status and body — is
-- recorded and the daily monitor (tests/cron-alert-check.mjs) can read it.
--
-- Wrapper names and cron.job commands are unchanged; only their bodies are.

CREATE OR REPLACE FUNCTION public.internal_invoke_cron_function(p_slug text)
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
    RAISE WARNING '[%] cron secret is not configured — skipping scheduled run. Store it in Supabase Vault as ''cron_secret''.', p_slug;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://qeopoiumlnzqwaqzwqcj.supabase.co/functions/v1/' || p_slug,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', _cron_secret
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.internal_invoke_cron_function(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_invoke_cron_function(text) TO service_role;

CREATE OR REPLACE FUNCTION public.internal_trigger_firm_signals_refresh()
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN PERFORM public.internal_invoke_cron_function('firm-signals-refresh'); END; $$;

CREATE OR REPLACE FUNCTION public.internal_trigger_network_insights_refresh()
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN PERFORM public.internal_invoke_cron_function('network-insights'); END; $$;

CREATE OR REPLACE FUNCTION public.internal_trigger_visibility_audit_rerun_due()
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN PERFORM public.internal_invoke_cron_function('visibility-audit-rerun-due'); END; $$;

CREATE OR REPLACE FUNCTION public.internal_trigger_competitor_alerts_check()
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN PERFORM public.internal_invoke_cron_function('competitor-alerts-check'); END; $$;

CREATE OR REPLACE FUNCTION public.internal_trigger_weekly_score_digest()
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN PERFORM public.internal_invoke_cron_function('weekly-score-digest'); END; $$;

CREATE OR REPLACE FUNCTION public.internal_trigger_press_outlets_health()
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN PERFORM public.internal_invoke_cron_function('press-outlets-health'); END; $$;
