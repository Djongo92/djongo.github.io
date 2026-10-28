-- Internal go-to-market plan, served only to the team through the
-- team-gtm edge function. The table is created here; its CONTENT is written
-- directly in the database and deliberately never committed to this public
-- repository (it names real firms and holds pricing strategy).
-- No anon/authenticated access at all: service_role only, like url_cache.
CREATE TABLE IF NOT EXISTS public.gtm_plan (
  id         TEXT PRIMARY KEY,
  content    JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.gtm_plan TO service_role;
REVOKE ALL ON public.gtm_plan FROM anon, authenticated;
ALTER TABLE public.gtm_plan ENABLE ROW LEVEL SECURITY;
