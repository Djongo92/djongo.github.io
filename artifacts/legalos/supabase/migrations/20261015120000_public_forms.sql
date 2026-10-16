-- ===========================================================================
-- Public forms, moved off the old Express API server onto edge functions:
--   showcase-access  — checks an invitation code (codes live in the
--                      DEMO_ACCESS_CODES secret; nothing is stored)
--   demo-request     — "request an invitation" form → demo_requests
--   report-lead      — marketing-site report sign-up → report_leads
-- All three tables are service_role only (no anon/authenticated access),
-- mirroring teaser_rate_limit / url_cache exactly. Emails are personal data:
-- nothing here is ever readable from the browser.
-- ===========================================================================
CREATE TABLE public.demo_requests (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  firm_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.report_leads (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  source      TEXT NOT NULL DEFAULT 'serbia-visibility-report',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One shared bucket table for the three forms, keyed "<form>:<ip hash>".
CREATE TABLE public.public_form_rate_limit (
  bucket_key    TEXT NOT NULL PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.demo_requests TO service_role;
GRANT ALL ON public.report_leads TO service_role;
GRANT ALL ON public.public_form_rate_limit TO service_role;
REVOKE ALL ON public.demo_requests FROM anon, authenticated;
REVOKE ALL ON public.report_leads FROM anon, authenticated;
REVOKE ALL ON public.public_form_rate_limit FROM anon, authenticated;

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_form_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.demo_requests
  FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "service role only" ON public.report_leads
  FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "service role only" ON public.public_form_rate_limit
  FOR ALL TO public USING (false) WITH CHECK (false);

CREATE INDEX idx_public_form_rate_limit_window ON public.public_form_rate_limit (window_start);
