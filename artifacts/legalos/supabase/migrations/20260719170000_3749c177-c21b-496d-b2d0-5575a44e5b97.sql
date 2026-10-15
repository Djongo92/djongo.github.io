-- ===========================================================================
-- Benchmark rate limiting: caps how often a single client_id can run the
-- full (PSI + Gemini-backed) audit. Without this, anyone holding the
-- benchmark password could call visibility-audit-run in an unbounded loop
-- and run up PageSpeed/Gemini usage indefinitely. Same shape and posture
-- as teaser_rate_limit — service_role only, no anon/authenticated access.
-- ===========================================================================
CREATE TABLE public.benchmark_rate_limit (
  client_id     UUID NOT NULL PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.benchmark_rate_limit TO service_role;
REVOKE ALL ON public.benchmark_rate_limit FROM anon, authenticated;

ALTER TABLE public.benchmark_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.benchmark_rate_limit
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE INDEX idx_benchmark_rate_limit_window ON public.benchmark_rate_limit (window_start);
