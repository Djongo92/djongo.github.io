-- ===========================================================================
-- Rate limiting for unauthenticated calls to AI-spending edge functions.
--
-- The public demo (marketing "See a live demo" -> /app/demo) deliberately runs
-- the real Workshop / Battle Plan tools instead of canned fixtures, so the
-- output a prospect sees is genuine. That means real Anthropic spend on behalf
-- of someone with no account, so anonymous callers get a hard hourly cap while
-- signed-in sessions bypass this bucket entirely (see _shared/access.ts).
--
-- Separate bucket from teaser_rate_limit so a demo visit cannot exhaust the
-- teaser's quota (or vice versa) -- they are different funnel stages with
-- different per-call costs.
--
-- Same posture as the other rate-limit tables: service_role only, and the
-- per-caller rows store only a keyed hash of the IP, never the raw address.
-- The key is not always an IP hash though -- one reserved row holds the
-- market-wide ceiling -- hence bucket_key rather than ip_hash.
-- ===========================================================================
CREATE TABLE public.demo_ai_rate_limit (
  bucket_key    TEXT NOT NULL PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.demo_ai_rate_limit TO service_role;
REVOKE ALL ON public.demo_ai_rate_limit FROM anon, authenticated;

ALTER TABLE public.demo_ai_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.demo_ai_rate_limit
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- Atomic quota consumption, per-caller and market-wide in one shot.
--
-- The other rate-limit buckets read the current count and then upsert it,
-- which races: concurrent requests for the same key all observe the same
-- count and all pass, so the cap never actually binds under parallel load.
-- That is tolerable for the buckets guarding cheap endpoints, but this one is
-- the only thing between an anonymous caller and real per-call Anthropic
-- spend, so it has to be exact.
--
-- Two buckets are consumed together: the caller's own hourly allowance and a
-- market-wide ceiling. The ceiling exists because the per-caller key derives
-- from proxy headers, which someone hitting the function endpoint directly can
-- vary per request to mint unlimited fresh buckets.
--
-- Both are checked BEFORE either is incremented. Consuming the caller's unit
-- and only then discovering the global ceiling is full would charge them for a
-- request that never ran.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.consume_demo_ai_quota(TEXT, INTEGER, BIGINT);

CREATE OR REPLACE FUNCTION public.consume_demo_ai_quota(
  p_key              TEXT,
  p_limit            INTEGER,
  p_window_ms        BIGINT,
  p_global_key       TEXT,
  p_global_limit     INTEGER,
  p_global_window_ms BIGINT
)
RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, blocked_by TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now          TIMESTAMPTZ := now();
  v_win          INTERVAL := make_interval(secs => p_window_ms / 1000.0);
  v_global_win   INTERVAL := make_interval(secs => p_global_window_ms / 1000.0);
  v_first        TEXT;
  v_second       TEXT;
  v_count        INTEGER;
  v_start        TIMESTAMPTZ;
  v_global_count INTEGER;
  v_global_start TIMESTAMPTZ;
BEGIN
  IF p_key IS NULL OR p_global_key IS NULL OR p_key = p_global_key THEN
    RAISE EXCEPTION 'consume_demo_ai_quota: per-caller and global keys must both be set and differ';
  END IF;

  -- Materialise both rows at zero so they can be locked. Nothing is consumed
  -- here; the increments happen only after both limits have been checked.
  INSERT INTO public.demo_ai_rate_limit (bucket_key, window_start, request_count, updated_at)
  VALUES (p_key, v_now, 0, v_now), (p_global_key, v_now, 0, v_now)
  ON CONFLICT (bucket_key) DO NOTHING;

  -- Lock in a deterministic key order. Every concurrent caller wants the same
  -- global row plus their own, so without a fixed ordering two of them can sit
  -- holding one lock each waiting for the other.
  v_first  := LEAST(p_key, p_global_key);
  v_second := GREATEST(p_key, p_global_key);
  PERFORM 1 FROM public.demo_ai_rate_limit WHERE bucket_key = v_first FOR UPDATE;
  PERFORM 1 FROM public.demo_ai_rate_limit WHERE bucket_key = v_second FOR UPDATE;

  SELECT t.request_count, t.window_start INTO v_count, v_start
    FROM public.demo_ai_rate_limit t WHERE t.bucket_key = p_key;
  SELECT t.request_count, t.window_start INTO v_global_count, v_global_start
    FROM public.demo_ai_rate_limit t WHERE t.bucket_key = p_global_key;

  -- Roll each window forward independently once it has aged out.
  IF v_start < v_now - v_win THEN
    v_count := 0;
    v_start := v_now;
  END IF;
  IF v_global_start < v_now - v_global_win THEN
    v_global_count := 0;
    v_global_start := v_now;
  END IF;

  IF v_count + 1 > p_limit THEN
    RETURN QUERY SELECT false, 0, 'ip'::TEXT;
    RETURN;
  END IF;

  IF v_global_count + 1 > p_global_limit THEN
    -- Turned away by the ceiling, so leave their own allowance untouched.
    RETURN QUERY SELECT false, GREATEST(0, p_limit - v_count), 'global'::TEXT;
    RETURN;
  END IF;

  UPDATE public.demo_ai_rate_limit
     SET request_count = v_count + 1, window_start = v_start, updated_at = v_now
   WHERE bucket_key = p_key;

  UPDATE public.demo_ai_rate_limit
     SET request_count = v_global_count + 1, window_start = v_global_start, updated_at = v_now
   WHERE bucket_key = p_global_key;

  RETURN QUERY SELECT true, GREATEST(0, p_limit - (v_count + 1)), NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_demo_ai_quota(TEXT, INTEGER, BIGINT, TEXT, INTEGER, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_demo_ai_quota(TEXT, INTEGER, BIGINT, TEXT, INTEGER, BIGINT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_demo_ai_quota(TEXT, INTEGER, BIGINT, TEXT, INTEGER, BIGINT) TO service_role;
