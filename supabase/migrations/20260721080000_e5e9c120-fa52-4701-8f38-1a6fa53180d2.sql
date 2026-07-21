-- ===========================================================================
-- Rate limiting for the public Directory Standing Index (Chambers/Legal 500
-- breadth+quality computed straight from market_directory_data, no audit
-- participation required). Separate bucket from teaser_rate_limit — this
-- endpoint makes no external paid API calls (just a DB read + arithmetic),
-- so it gets a much more generous limit; sharing the teaser's tight bucket
-- would break a leaderboard meant to be freely shared and re-visited.
-- Same posture as the other rate-limit tables: service_role only, stores
-- only a hash of the caller's IP, never the raw address.
-- ===========================================================================
CREATE TABLE public.directory_index_rate_limit (
  ip_hash       TEXT NOT NULL PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.directory_index_rate_limit TO service_role;
REVOKE ALL ON public.directory_index_rate_limit FROM anon, authenticated;

ALTER TABLE public.directory_index_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.directory_index_rate_limit
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE INDEX idx_directory_index_rate_limit_window ON public.directory_index_rate_limit (window_start);
