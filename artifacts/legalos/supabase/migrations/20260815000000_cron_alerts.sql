-- Task #219 — durable inbox for scheduled-job failure alerts. Every cron
-- edge function now wraps its handler with withCronAlert (or calls
-- sendCronAlert directly for partial failures), which POSTs to the
-- CRON_ALERT_WEBHOOK_URL function secret. That secret is set to the
-- cron-alert-inbox edge function URL, which writes one row per alert here.
--
-- Retention: rows older than 90 days are pruned automatically by the
-- cron-alert-inbox edge function on each write (no separate job needed
-- at current alert volume).

CREATE TABLE IF NOT EXISTS public.cron_alerts (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job         text        NOT NULL,
  message     text        NOT NULL,
  detail      text,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Index for dashboard queries ordered by recency.
CREATE INDEX IF NOT EXISTS cron_alerts_received_at_idx ON public.cron_alerts (received_at DESC);

-- Service role only — this table is never exposed to end users.
ALTER TABLE public.cron_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service-only" ON public.cron_alerts
  USING (false)
  WITH CHECK (false);
