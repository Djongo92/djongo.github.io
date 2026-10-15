-- Senior-PM idea: close the loop from "your score went up" to "did that
-- produce a client" — the single biggest unproven assumption behind the
-- whole Market Visibility Score. This is deliberately NOT a CRM (out of
-- scope per the build brief) — just a one-click, self-reported log of
-- "we got a new client, here's roughly where they came from", timestamped
-- so it can be shown alongside the score trend the firm already has.
-- Same posture as every other client-owned table: service_role only.
CREATE TABLE public.client_wins (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id      UUID NOT NULL,
  market         TEXT NOT NULL,
  audited_domain TEXT NOT NULL,
  source         TEXT NOT NULL CHECK (source IN ('organic_search', 'directory', 'referral', 'social', 'other')),
  logged_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_wins_client ON public.client_wins (client_id, logged_at DESC);

GRANT ALL ON public.client_wins TO service_role;
REVOKE ALL ON public.client_wins FROM anon, authenticated;

ALTER TABLE public.client_wins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.client_wins
FOR ALL
TO public
USING (false)
WITH CHECK (false);
