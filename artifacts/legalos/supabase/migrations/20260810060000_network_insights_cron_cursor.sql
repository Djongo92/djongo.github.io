-- Durable batching for the network-insights refresh (review follow-up):
-- a single edge-function invocation has a finite wall-clock budget, so the
-- weekly sweep is replaced by DAILY bounded batches walked via this
-- persisted cursor. Every eligible firm is refreshed within
-- ceil(firms / 50) days — well inside the 7-day insights TTL at pilot
-- scale — and a failed/timed-out batch resumes from the last success.

CREATE TABLE IF NOT EXISTS public.network_insights_cron_state (
  id             integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton row
  last_client_id uuid,                                          -- NULL = sweep restarts from the top
  updated_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.network_insights_cron_state (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.network_insights_cron_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.network_insights_cron_state FROM anon;
REVOKE ALL ON public.network_insights_cron_state FROM authenticated;
GRANT ALL ON public.network_insights_cron_state TO service_role;

-- Replace the weekly one-shot with the daily batch schedule.
SELECT cron.unschedule('network-insights-weekly');

SELECT cron.schedule(
  'network-insights-daily-batch',
  '15 4 * * *',
  $cron$SELECT public.internal_trigger_network_insights_refresh()$cron$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'network-insights-daily-batch');
