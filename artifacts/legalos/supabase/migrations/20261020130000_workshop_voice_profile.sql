-- A firm's distilled "voice profile": a short style guide the Workshop
-- writes from everything the firm has kept or edited, and then feeds to
-- EVERY tool (via buildFirmContext). Rebuilt periodically as the firm keeps
-- more drafts, so the Workshop sounds more like the firm the more it's used.
-- Same posture as workshop_style_examples: no anon/authenticated access;
-- only edge functions (service_role) read or write it.
CREATE TABLE IF NOT EXISTS public.workshop_voice_profiles (
  client_id     UUID NOT NULL PRIMARY KEY,
  profile       TEXT NOT NULL,
  example_count INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.workshop_voice_profiles TO service_role;
REVOKE ALL ON public.workshop_voice_profiles FROM anon, authenticated;
ALTER TABLE public.workshop_voice_profiles ENABLE ROW LEVEL SECURITY;
