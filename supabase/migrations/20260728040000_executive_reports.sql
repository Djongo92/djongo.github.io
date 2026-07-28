-- §9 — Reports and exports: the executive report is its own artifact, not
-- a shortened dashboard — a score/percentile/narrative/next-steps summary
-- generated for a partner or board audience, exported as PDF/PPTX/DOCX/
-- XLSX. On-demand generation happens entirely client-side (same pattern as
-- the Battle Plan PDF and Pitch Deck .pptx — no server round trip needed,
-- the browser already has everything it needs). These two tables exist
-- only for the MONTHLY SCHEDULED path, where nobody's browser is open to
-- generate anything: a cron job snapshots the numbers and files a
-- notification pointing the user back to the in-app Executive Report card
-- to actually produce the polished, AI-narrated export — this codebase has
-- no SMTP configured (CLAUDE.md), so "monthly report" can't mean "emailed
-- PDF," only "ready and waiting next time you open the app."
CREATE TABLE public.executive_report_schedules (
  client_id         UUID NOT NULL PRIMARY KEY,
  enabled           BOOLEAN NOT NULL DEFAULT false,
  last_generated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.executive_reports (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id      UUID NOT NULL,
  market         TEXT NOT NULL,
  audited_domain TEXT NOT NULL,
  display_name   TEXT,
  total_score    NUMERIC NOT NULL,
  percentile     INTEGER,
  categories     JSONB NOT NULL DEFAULT '{}'::jsonb, -- snapshot of the 5 category scores at generation time
  source         TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scheduled')),
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_executive_reports_client ON public.executive_reports (client_id, generated_at DESC);

GRANT ALL ON public.executive_report_schedules TO service_role;
REVOKE ALL ON public.executive_report_schedules FROM anon, authenticated;

GRANT SELECT ON public.executive_reports TO authenticated;
GRANT ALL ON public.executive_reports TO service_role;
REVOKE ALL ON public.executive_reports FROM anon;

ALTER TABLE public.executive_report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules via service role only" ON public.executive_report_schedules FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "members can view their own report snapshots"
ON public.executive_reports
FOR SELECT TO authenticated
USING (client_id = auth.uid() OR client_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "report writes via service role only" ON public.executive_reports FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "report updates via service role only" ON public.executive_reports FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "report deletes via service role only" ON public.executive_reports FOR DELETE TO public USING (false);
