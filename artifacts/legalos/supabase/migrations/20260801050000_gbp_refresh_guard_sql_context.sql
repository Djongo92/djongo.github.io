-- Refine the consume_gbp_refresh caller guard (#28): 20260801040000 raised
-- for ANY caller whose auth.role() wasn't service_role — but direct SQL
-- (Management API, migrations, psql, and the live vitest limiter test that
-- exercises the RPC through the Management API) carries no JWT at all, so
-- auth.role() is NULL there and the guard fired on fully-privileged
-- administrative contexts it was never meant to block.
--
-- The threat model is API callers: anonymous/authenticated PostgREST
-- requests always carry a JWT role. Direct SQL access is already god-mode
-- by definition. Guard only when a role is present.
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
  -- PostgREST callers always carry a JWT role; only service_role may call.
  -- Direct SQL (no JWT at all → auth.role() NULL) is already privileged.
  IF auth.role() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'consume_gbp_refresh: service_role only';
  END IF;

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
