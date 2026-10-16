-- firm_signals: pre-fetched external API signals for benchmark firms.
-- Populated by the firm-signals-refresh edge function (weekly CRON job).
-- Consumed by performanceScore.ts and reputationScore.ts as a warm cache
-- so individual audits don't need a live API round-trip for data that was
-- already fetched for the benchmark run.
--
-- signal_type values:
--   'pagespeed'     — Google PageSpeed Insights (desktop + mobile Lighthouse)
--   'google_places' — Google Places API (GBP rating, reviews, completeness)
--
-- is_unverifiable: true when the API returned a bot-protection / 403 / no
-- listing found response — scored as missing, not penalised as zero.

CREATE TABLE IF NOT EXISTS public.firm_signals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_domain      text NOT NULL,          -- normalized: lowercase, no protocol, no www, no trailing slash
  signal_type      text NOT NULL CHECK (signal_type IN ('pagespeed', 'google_places')),
  payload          jsonb NOT NULL DEFAULT '{}',
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL,
  is_unverifiable  boolean NOT NULL DEFAULT false,
  UNIQUE (firm_domain, signal_type)
);

-- Regular (non-partial) index on the lookup columns.
-- The UNIQUE constraint already enforces uniqueness on (firm_domain, signal_type);
-- this index also covers expires_at so the application-side WHERE expires_at > now()
-- filter can be satisfied efficiently without a volatile predicate in DDL.
CREATE INDEX IF NOT EXISTS firm_signals_lookup_idx
  ON public.firm_signals (firm_domain, signal_type, expires_at);

-- RLS: only service-role functions read/write this table.
ALTER TABLE public.firm_signals ENABLE ROW LEVEL SECURITY;

-- Block all anon/authenticated reads — scoring data is internal.
-- Service-role bypasses RLS entirely; the explicit grant below makes intent clear.
CREATE POLICY "no_public_access" ON public.firm_signals
  FOR ALL TO anon, authenticated USING (false);

GRANT ALL ON public.firm_signals TO service_role;
