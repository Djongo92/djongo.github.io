-- Senior-PM idea: turn Competitor Tracking from a passive, pull-based tool
-- (you have to go check it) into a push-based re-engagement loop — a
-- notification the moment a tracked rival's published score passes yours,
-- rather than only finding out next time you happen to open the app.
--
-- was_ahead lets competitor-alerts-check notify only on a NEW overtake
-- (false -> true transition), never re-notifying every check while a
-- competitor stays ahead of you. Same posture as every other
-- client-owned state table: no anon/authenticated access at all, service
-- role only.
CREATE TABLE public.competitor_alert_state (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         UUID NOT NULL,
  competitor_domain TEXT NOT NULL,
  market            TEXT NOT NULL,
  was_ahead         BOOLEAN NOT NULL DEFAULT false,
  last_checked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (client_id, competitor_domain, market)
);

GRANT ALL ON public.competitor_alert_state TO service_role;
REVOKE ALL ON public.competitor_alert_state FROM anon, authenticated;

ALTER TABLE public.competitor_alert_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.competitor_alert_state
FOR ALL
TO public
USING (false)
WITH CHECK (false);
