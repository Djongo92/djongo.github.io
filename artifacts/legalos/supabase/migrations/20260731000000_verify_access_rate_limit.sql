-- ===========================================================================
-- Rate limiting for verify-access, the guidebook/workshop/benchmark password
-- check. It previously had only a flat 250ms delay on a wrong guess -- no
-- counter -- which does not slow down an attacker who rotates source IPs or
-- simply fires attempts in parallel. Matches the posture already used by the
-- Express API's /api/demo-access limiter (10 attempts / 10 minutes): a real
-- per-caller counter, not a delay alone.
--
-- Same posture as the other rate-limit tables: service_role only, stores only
-- a keyed hash of the caller's IP, never the raw address.
-- ===========================================================================
CREATE TABLE public.verify_access_rate_limit (
  ip_hash       TEXT NOT NULL PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.verify_access_rate_limit TO service_role;
REVOKE ALL ON public.verify_access_rate_limit FROM anon, authenticated;

ALTER TABLE public.verify_access_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.verify_access_rate_limit
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE INDEX idx_verify_access_rate_limit_window ON public.verify_access_rate_limit (window_start);

-- ---------------------------------------------------------------------------
-- Atomic attempt consumption. The other rate-limit buckets in this file
-- (teaser, directory index) read the current count and then upsert it, which
-- races under concurrent requests -- every simultaneous caller observes the
-- same pre-increment count and all pass, so the cap never actually binds
-- under parallel load. That is tolerable for buckets guarding cheap,
-- non-adversarial endpoints, but this one exists specifically to stop
-- concurrent password-guessing, so it has to be exact: row-locked, and
-- denies (fails closed) on any error rather than defaulting to allowed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_verify_access_attempt(
  p_key       TEXT,
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
  INSERT INTO public.verify_access_rate_limit (ip_hash, window_start, request_count, updated_at)
  VALUES (p_key, v_now, 0, v_now)
  ON CONFLICT (ip_hash) DO NOTHING;

  -- Locks the row for the rest of the transaction, so a second concurrent
  -- caller for the same key blocks here until the first has committed its
  -- increment -- eliminating the read-then-upsert race.
  PERFORM 1 FROM public.verify_access_rate_limit WHERE ip_hash = p_key FOR UPDATE;

  SELECT t.request_count, t.window_start INTO v_count, v_start
    FROM public.verify_access_rate_limit t WHERE t.ip_hash = p_key;

  IF v_start < v_now - v_win THEN
    v_count := 0;
    v_start := v_now;
  END IF;

  IF v_count + 1 > p_limit THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  UPDATE public.verify_access_rate_limit
     SET request_count = v_count + 1, window_start = v_start, updated_at = v_now
   WHERE ip_hash = p_key;

  RETURN QUERY SELECT true, GREATEST(0, p_limit - (v_count + 1));
END;
$$;

REVOKE ALL ON FUNCTION public.consume_verify_access_attempt(TEXT, INTEGER, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_verify_access_attempt(TEXT, INTEGER, BIGINT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_verify_access_attempt(TEXT, INTEGER, BIGINT) TO service_role;
