-- On-demand GBP refresh (#28): a firm that improves its Google Business
-- Profile shouldn't wait up to 7 days for the weekly firm-signals-refresh
-- batch to notice. Analytics → Reputation gets a "Refresh GBP data" button
-- hitting firm-signals-refresh's new single-domain mode, which re-fetches
-- Places for one domain and re-scores the caller's latest audit in place.
--
-- 1. gbp_refresh_rate_limit — per-domain bucket for the generic rateLimit.ts
--    helper (same shape as teaser_rate_limit): caps paid Places API spend at
--    one on-demand refresh per domain per 24h. Service-role only, like every
--    rate-limit table here.
CREATE TABLE public.gbp_refresh_rate_limit (
  domain        TEXT NOT NULL PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.gbp_refresh_rate_limit TO service_role;
REVOKE ALL ON public.gbp_refresh_rate_limit FROM anon, authenticated;

ALTER TABLE public.gbp_refresh_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.gbp_refresh_rate_limit
FOR ALL TO public USING (false) WITH CHECK (false);

-- 2. History rows can now be tagged source='refresh' — a GBP on-demand
--    refresh inserts a trend snapshot that is NOT a full audit run and NOT
--    a manual correction, so trend charts can label it honestly instead of
--    borrowing either of the two existing tags.
ALTER TABLE public.market_visibility_audit_history
DROP CONSTRAINT market_visibility_audit_history_source_check;
ALTER TABLE public.market_visibility_audit_history
ADD CONSTRAINT market_visibility_audit_history_source_check
CHECK (source IN ('run', 'correction', 'refresh'));
