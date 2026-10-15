-- Insight usefulness ratings (task #127): one row per firm per Network
-- Insights card key. insight_key is the stable template key emitted by
-- _shared/networkInsights.ts — ratings keyed to it survive stat changes so
-- a template's usefulness accumulates across refreshes. Written ONLY by the
-- insight-rate edge function (service role); no client-facing RLS grant,
-- mirroring market_visibility_audit_history's posture.
CREATE TABLE public.insight_ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL,
  insight_key TEXT NOT NULL,
  rating      TEXT NOT NULL CHECK (rating IN ('useful', 'not_useful')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, insight_key)
);

ALTER TABLE public.insight_ratings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.insight_ratings TO service_role;
REVOKE ALL ON public.insight_ratings FROM anon, authenticated;
