-- ===========================================================================
-- market_visibility_audit_history: append-only snapshots of each audit run.
--
-- market_visibility_audits itself is an upsert keyed on (client_id,
-- audited_domain, market) — re-running an audit overwrites the same row, so
-- there's no way to show a firm their own score over time. This table exists
-- purely to make that possible: visibility-audit-run inserts one row here
-- every time it successfully computes an audit, never updates or deletes.
-- Same posture as market_directory_data / directory_lookup_requests —
-- service_role only, no anon/authenticated grants. Reads go through
-- visibility-audit-get (already scoped by client_id server-side), never a
-- public-read RLS policy.
-- ===========================================================================
CREATE TABLE public.market_visibility_audit_history (
  id                        UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                 UUID NOT NULL,
  audited_domain            TEXT NOT NULL,
  market                    TEXT NOT NULL,
  peer_group                TEXT NOT NULL,

  performance_score         NUMERIC NOT NULL DEFAULT 0,
  social_score              NUMERIC NOT NULL DEFAULT 0,
  seo_authority_score       NUMERIC NOT NULL DEFAULT 0,
  thought_leadership_score  NUMERIC NOT NULL DEFAULT 0,
  reputation_score          NUMERIC NOT NULL DEFAULT 0,
  total_score               NUMERIC NOT NULL DEFAULT 0,

  recorded_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.market_visibility_audit_history TO service_role;
REVOKE ALL ON public.market_visibility_audit_history FROM anon, authenticated;

ALTER TABLE public.market_visibility_audit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.market_visibility_audit_history
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE INDEX idx_market_visibility_audit_history_lookup
ON public.market_visibility_audit_history (client_id, audited_domain, market, recorded_at DESC);
