-- Task #136 — shareable read-only links for Roast My Deck results, so a firm
-- can send a roast to a partner who has no account. Same posture as
-- battle_plan_partner_links (20260728030000_workflow.sql): the link id is the
-- bearer token, and the table has NO anon/authenticated grant — every read
-- goes through the roast-share-link service-role edge function, which gates
-- on the unguessable link id + expiry. A roast is a firm's internal critique
-- of its own deck; a direct anon SELECT is not acceptable.
CREATE TABLE public.roast_share_links (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID NOT NULL,
  payload         JSONB NOT NULL,          -- the full DeckRoastResult JSON
  file_name       TEXT,
  recipient_label TEXT,
  created_by      UUID REFERENCES auth.users (id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  last_viewed_at  TIMESTAMPTZ
);

ALTER TABLE public.roast_share_links ENABLE ROW LEVEL SECURITY;

-- No policies: service_role bypasses RLS, and it is the only role granted
-- anything. The edge function is the sole reader/writer.
GRANT ALL ON public.roast_share_links TO service_role;
REVOKE ALL ON public.roast_share_links FROM anon, authenticated;
