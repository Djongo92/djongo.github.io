-- §11 — Consultant layer: multi-client workspace switching itself needed
-- no new tables (see _shared/verifiedClientId.ts's requestedFirmId and
-- firm-profile's multi-membership fix) — these three additions cover
-- white-label branding, internal-vs-client-visible notes, and saved
-- before/after snapshots.

-- White-label: the workspace's own logo, shown in the app chrome instead
-- of LegalOS branding when a consultant is acting as this client. Solo
-- accounts keep using the existing per-browser useFirmLogo (localStorage)
-- fallback — this only matters once a workspace is actually shared.
ALTER TABLE public.firm_profiles ADD COLUMN logo_data_url TEXT;

-- Internal-vs-client-visible notes: reuses §8's workflow comments rather
-- than a separate notes system — a consultant leaving "this client is slow
-- to sign off" needs the same thread UI as a client-visible status update,
-- just hidden from the client's own team members viewing the same item.
ALTER TABLE public.battle_plan_workflow_comments
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'client' CHECK (visibility IN ('internal', 'client'));

-- Saved audit snapshots: market_visibility_audit_history already records
-- every run automatically, but a consultant doing before/after engagement
-- reporting wants to explicitly bookmark and NAME a moment ("Before
-- engagement", "End of Q1 campaign") rather than hunt through an
-- unlabeled trend line for the right point.
CREATE TABLE public.audit_snapshots (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id      UUID NOT NULL,
  audit_id       UUID REFERENCES public.market_visibility_audits (id) ON DELETE SET NULL,
  label          TEXT NOT NULL,
  market         TEXT NOT NULL,
  audited_domain TEXT NOT NULL,
  display_name   TEXT,
  total_score    NUMERIC NOT NULL,
  categories     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by     UUID REFERENCES auth.users (id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_snapshots_client ON public.audit_snapshots (client_id, created_at DESC);

GRANT SELECT ON public.audit_snapshots TO authenticated;
GRANT ALL ON public.audit_snapshots TO service_role;
REVOKE ALL ON public.audit_snapshots FROM anon;

ALTER TABLE public.audit_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view their own snapshots"
ON public.audit_snapshots
FOR SELECT TO authenticated
USING (client_id = auth.uid() OR client_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "snapshot writes via service role only" ON public.audit_snapshots FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "snapshot updates via service role only" ON public.audit_snapshots FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "snapshot deletes via service role only" ON public.audit_snapshots FOR DELETE TO public USING (false);
