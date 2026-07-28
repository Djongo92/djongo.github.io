-- §6 — Evidence and corrections. Per-metric provenance/confidence is already
-- exposed today via market_visibility_audits.raw_metrics/provenance and the
-- six-value PeerStats objects stored on every peer-normalized metric (see
-- percentileFormula.ts) — Analytics.tsx already renders all of it. What's
-- new here is the dispute workflow: a member submits a correction + reason
-- for one specific metric, it's logged against their identity, the audit's
-- five category scores recompute from the corrected raw_metrics in-process
-- (no re-fetch from PSI/Ahrefs/Claude/Google News — see
-- _shared/recomputeFromRawMetrics.ts), and the previous value is preserved.
--
-- market_visibility_metric_corrections is the append-only correction log —
-- one row per accepted dispute, never updated or deleted, mirroring
-- market_visibility_audit_history's precedent exactly.
CREATE TABLE public.market_visibility_metric_corrections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id            UUID NOT NULL REFERENCES public.market_visibility_audits (id) ON DELETE CASCADE,
  category            TEXT NOT NULL CHECK (category IN ('performance', 'social', 'seoAuthority', 'thoughtLeadership', 'reputation')),
  metric_path         TEXT NOT NULL,
  previous_value      JSONB NOT NULL,
  corrected_value     JSONB NOT NULL,
  reason              TEXT NOT NULL,
  corrected_by        UUID REFERENCES auth.users (id),
  corrected_by_label  TEXT, -- email snapshot at correction time — auth.users rows can change/vanish later
  previous_total_score NUMERIC,
  new_total_score     NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.market_visibility_metric_corrections TO authenticated;
GRANT ALL ON public.market_visibility_metric_corrections TO service_role;
REVOKE ALL ON public.market_visibility_metric_corrections FROM anon;

ALTER TABLE public.market_visibility_metric_corrections ENABLE ROW LEVEL SECURITY;

-- Same posture as market_visibility_audits itself (CLAUDE.md Batch A): no
-- authenticated-scoped SELECT policy — "see your own audit's corrections"
-- goes through visibility-audit-get (service_role, scoped by client_id
-- server-side), not a direct RLS read. All writes are via
-- visibility-audit-dispute (service_role only).
CREATE POLICY "writes via service role only"
ON public.market_visibility_metric_corrections
FOR INSERT TO public WITH CHECK (false);

CREATE POLICY "no direct reads"
ON public.market_visibility_metric_corrections
FOR SELECT TO public USING (false);

CREATE POLICY "no updates"
ON public.market_visibility_metric_corrections
FOR UPDATE TO public USING (false) WITH CHECK (false);

CREATE POLICY "no deletes"
ON public.market_visibility_metric_corrections
FOR DELETE TO public USING (false);

-- market_visibility_audit_history previously stored scores only (trend-chart
-- data). A corrected re-score is also a new point in that same trend, so it
-- needs a history row too — but unlike an ordinary re-run, the underlying
-- raw_metrics actually changed (not just re-measured), which the existing
-- columns can't distinguish. Add a nullable snapshot + a source tag rather
-- than a new table, since this is still exactly "a scored state at a point
-- in time" — the same append-only rows, just from two different triggers.
ALTER TABLE public.market_visibility_audit_history
  ADD COLUMN raw_metrics JSONB,
  ADD COLUMN provenance JSONB,
  ADD COLUMN source TEXT NOT NULL DEFAULT 'run' CHECK (source IN ('run', 'correction'));
