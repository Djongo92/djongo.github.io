-- ===========================================================================
-- Public teaser rate limiting (Batch E item 17): the one genuinely public,
-- no-password surface in the app (Performance + GBP binary only) is
-- IP-rate-limited instead of gated. Stores a hash of the caller's IP, never
-- the raw address. service_role only, no anon/authenticated access at all —
-- mirrors url_cache exactly.
-- ===========================================================================
CREATE TABLE public.teaser_rate_limit (
  ip_hash       TEXT NOT NULL PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.teaser_rate_limit TO service_role;
REVOKE ALL ON public.teaser_rate_limit FROM anon, authenticated;

ALTER TABLE public.teaser_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.teaser_rate_limit
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE INDEX idx_teaser_rate_limit_window ON public.teaser_rate_limit (window_start);
