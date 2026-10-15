-- Belt-and-suspenders caller guard for consume_gbp_refresh (#28 review
-- follow-up): the REVOKE in 20260801030000 depends on PostgREST's schema
-- cache noticing the grant change, and default function EXECUTE grants in
-- Supabase make REVOKE fragile. Verified live: an anonymous caller could
-- invoke the RPC directly and consume the refresh bucket for an arbitrary
-- domain, griefing a real firm's one-per-24h refresh without ever touching
-- the ownership-gated edge function.
--
-- Fix: the function itself refuses any caller that isn't service_role.
-- auth.role() reflects the ORIGINAL caller's JWT role even inside a
-- SECURITY DEFINER function, so this holds no matter what the grants or
-- the PostgREST cache say. The edge function calls it with the service-role
-- key, which passes.
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
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
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

-- PUBLIC too: Supabase's default function privileges grant EXECUTE to
-- PUBLIC, and revoking only from anon/authenticated leaves that intact
-- (verified live via pg_proc.proacl — the sibling verify-access limiter
-- carries no public grant).
REVOKE EXECUTE ON FUNCTION public.consume_gbp_refresh(TEXT, INTEGER, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_gbp_refresh(TEXT, INTEGER, BIGINT) TO service_role;

-- Clear rows an anonymous direct-RPC caller consumed while the function was
-- exposed, so affected domains get their refresh back.
DELETE FROM public.gbp_refresh_rate_limit WHERE domain LIKE '%.example.com';

-- Make PostgREST pick up the grant change immediately instead of waiting
-- for its schema cache to expire.
NOTIFY pgrst, 'reload schema';
