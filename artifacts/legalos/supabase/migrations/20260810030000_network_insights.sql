-- Network Intelligence (task #122): weekly-computed, anonymised cross-firm
-- benchmark cache + the pg_cron job that refreshes it.
--
-- PRIVACY POSTURE: this table only ever holds AGGREGATE statistics (insight
-- text + a sample size). No firm name, domain, or raw audit row is stored
-- here, and the network-insights edge function refuses to compute any
-- statistic for a cohort smaller than 3 firms. Access is service-role only
-- — the dashboard reads insights through the edge function, never directly.

CREATE TABLE IF NOT EXISTS public.network_insights (
  -- client_id-style identity (same pattern as market_visibility_audits:
  -- equals firms.id for signed-in firms, but no FK so anonymous-identity
  -- audits never break a cache write).
  firm_id      uuid PRIMARY KEY,
  insights     jsonb NOT NULL DEFAULT '[]'::jsonb,
  cohort_size  integer NOT NULL DEFAULT 0,
  computed_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.network_insights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.network_insights FROM anon;
REVOKE ALL ON public.network_insights FROM authenticated;
GRANT ALL ON public.network_insights TO service_role;

-- Weekly refresh. Follows the firm-signals Vault pattern: the shared cron
-- secret is read from Supabase Vault (name 'cron_secret') with the legacy
-- app.cron_secret GUC as fallback — hosted Supabase denies setting custom
-- GUCs via the Management API, which is why the Vault path exists.
CREATE OR REPLACE FUNCTION public.internal_trigger_network_insights_refresh()
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
    RAISE WARNING '[network-insights] cron secret is not configured — skipping scheduled refresh. Store it in Supabase Vault as ''cron_secret''.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://qeopoiumlnzqwaqzwqcj.supabase.co/functions/v1/network-insights',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', _cron_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;

-- Mondays 04:15 UTC — after the Sunday 02:00 firm-signals refresh, staggered
-- so the two jobs never contend.
SELECT cron.schedule(
  'network-insights-weekly',
  '15 4 * * 1',
  $cron$SELECT public.internal_trigger_network_insights_refresh()$cron$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'network-insights-weekly');
