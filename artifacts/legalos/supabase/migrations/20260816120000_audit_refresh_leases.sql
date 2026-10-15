-- Task: stop a crashed or interrupted audit from locking a firm out of
-- re-measuring for 24 hours.
--
-- The old refresh claim bumped market_visibility_audits.updated_at BEFORE the
-- paid measurement ran. Two proven failure modes:
--   1. A BEFORE UPDATE trigger (trg_market_visibility_audits_updated_at)
--      forces updated_at = now() on every UPDATE, so the "rollback to the
--      previous timestamp" on failure NEVER worked — any crashed or failed
--      run left the row looking fresh for up to 24h and the due-rerun
--      scheduler skipped it.
--   2. First-ever audits had no row to claim, so a burst of parallel requests
--      for a new domain could each start paid provider work.
--
-- Fix: a separate, expiring lease table + one atomic SECURITY DEFINER RPC
-- that decides serve_fresh / claimed / held in a single round trip.
-- updated_at goes back to meaning "last successful measurement" only.
-- A crash self-heals when the lease TTL (default 15 min) expires.

CREATE TABLE IF NOT EXISTS public.audit_refresh_leases (
  client_id      uuid        NOT NULL,
  audited_domain text        NOT NULL,
  market         text        NOT NULL,
  claimed_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  PRIMARY KEY (client_id, audited_domain, market)
);

-- Service-role only: RLS on with no policies denies anon/authenticated.
ALTER TABLE public.audit_refresh_leases ENABLE ROW LEVEL SECURITY;

-- Atomic refresh reservation. Returns exactly one of:
--   'serve_fresh' — a successful audit younger than the cooldown exists;
--                   serve it back, no lease taken.
--   'claimed'     — caller now holds the lease and must run the measurement,
--                   then release_audit_refresh() (success or failure).
--   'held'        — another run holds an unexpired lease; caller returns
--                   409 "audit already in progress". Covers first-ever
--                   audits too (no audit row needed to hold a lease).
CREATE OR REPLACE FUNCTION public.claim_audit_refresh(
  p_client_id      uuid,
  p_audited_domain text,
  p_market         text,
  p_cooldown_ms    bigint DEFAULT 86400000,  -- 24h fresh-serve window
  p_lease_ttl_ms   bigint DEFAULT 900000     -- 15 min crash self-heal
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated timestamptz;
BEGIN
  SELECT updated_at INTO v_updated
  FROM market_visibility_audits
  WHERE client_id = p_client_id
    AND audited_domain = p_audited_domain
    AND market = p_market;

  IF v_updated IS NOT NULL
     AND v_updated > now() - make_interval(secs => p_cooldown_ms / 1000.0) THEN
    RETURN 'serve_fresh';
  END IF;

  -- Atomic take-or-steal: insert wins for a brand-new key; the conflict
  -- branch only steals an EXPIRED lease. A live lease matches no row.
  INSERT INTO audit_refresh_leases (client_id, audited_domain, market, claimed_at, expires_at)
  VALUES (p_client_id, p_audited_domain, p_market, now(),
          now() + make_interval(secs => p_lease_ttl_ms / 1000.0))
  ON CONFLICT (client_id, audited_domain, market) DO UPDATE
    SET claimed_at = now(),
        expires_at = excluded.expires_at
    WHERE audit_refresh_leases.expires_at <= now();

  IF FOUND THEN
    RETURN 'claimed';
  END IF;
  RETURN 'held';
END;
$$;

-- Release the lease after the run finishes — success or failure — so a
-- failed run never locks the firm out and a successful one hands the guard
-- back to the fresh updated_at on the audit row.
CREATE OR REPLACE FUNCTION public.release_audit_refresh(
  p_client_id      uuid,
  p_audited_domain text,
  p_market         text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM audit_refresh_leases
  WHERE client_id = p_client_id
    AND audited_domain = p_audited_domain
    AND market = p_market;
$$;

REVOKE ALL ON FUNCTION public.claim_audit_refresh(uuid, text, text, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_audit_refresh(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_audit_refresh(uuid, text, text, bigint, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_audit_refresh(uuid, text, text) TO service_role;
