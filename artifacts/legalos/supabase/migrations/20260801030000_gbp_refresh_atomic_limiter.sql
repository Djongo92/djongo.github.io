-- Atomic rate limiter for on-demand GBP refresh (#28 review fix).
--
-- 20260801020000 wired checkGbpRefreshRateLimit to the generic
-- read-then-upsert helper — but that helper races under concurrent requests
-- (two simultaneous callers both read request_count=0, both pass, both call
-- Google Places). This bucket is the only thing between a signed-in caller
-- and real per-call Places spend, so it needs the same DB-side row-locking
-- pattern as consume_demo_ai_quota / consume_verify_access_attempt: lock the
-- bucket row FOR UPDATE, then check-and-increment inside one transaction.
-- Concurrent callers serialize on the row lock; the second sees the
-- consumed bucket and is denied. The client wrapper denies on RPC error —
-- a limiter that fails open is not a limiter.
CREATE OR REPLACE FUNCTION public.consume_gbp_refresh(
  p_domain    TEXT,
  p_limit     INTEGER,
  p_window_ms BIGINT
)
RETURNS TABLE (allowed BOOLEAN, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now   TIMESTAMPTZ := now();
  v_win   INTERVAL := make_interval(secs => p_window_ms / 1000.0);
  v_count INTEGER;
  v_start TIMESTAMPTZ;
BEGIN
  -- Materialise the bucket row at zero so it can be locked; nothing is
  -- consumed here — the increment below is the only write that counts.
  INSERT INTO public.gbp_refresh_rate_limit (domain, window_start, request_count, updated_at)
  VALUES (p_domain, v_now, 0, v_now)
  ON CONFLICT (domain) DO NOTHING;

  SELECT request_count, window_start INTO v_count, v_start
  FROM public.gbp_refresh_rate_limit
  WHERE domain = p_domain
  FOR UPDATE;

  IF v_start < v_now - v_win THEN
    v_count := 0;
    v_start := v_now;
  END IF;

  IF v_count >= p_limit THEN
    allowed := false;
    remaining := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.gbp_refresh_rate_limit
  SET window_start = v_start, request_count = v_count + 1, updated_at = v_now
  WHERE domain = p_domain;

  allowed := true;
  remaining := GREATEST(0, p_limit - (v_count + 1));
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_gbp_refresh(TEXT, INTEGER, BIGINT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_gbp_refresh(TEXT, INTEGER, BIGINT) TO service_role;
