-- Senior-PM idea: a light "what are we working on" layer, distinct from a
-- real CRM/PM tool (explicitly out of scope for this build) — just a named
-- window (planned/live/done) that groups a handful of existing Workshop
-- outputs together, so a firm (or the managing partner checking in on the
-- Battle Plan) can see what's actually in flight.
--
-- linked_runs stores a lightweight SNAPSHOT of each attached WorkshopRun
-- ({runId, toolId, toolLabel, title, preview}), not a foreign key — Workshop
-- run history itself lives in user_app_state as a rolling, prunable
-- localStorage-synced list, so a real join would break the moment an old
-- run ages out. A snapshot survives that.
--
-- started_at/ended_at exist so the score tie-back (computed client-side
-- from market_visibility_audit_history, already fetched for the trend
-- chart) can show what moved during this window — framed as "what
-- happened while this ran", never a causal claim.
--
-- Same posture as every other client-owned table: service_role only.
CREATE TABLE public.campaigns (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id      UUID NOT NULL,
  market         TEXT NOT NULL,
  audited_domain TEXT NOT NULL,
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'live', 'done')),
  started_at     TIMESTAMPTZ,
  ended_at       TIMESTAMPTZ,
  linked_runs    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_client ON public.campaigns (client_id, created_at DESC);

GRANT ALL ON public.campaigns TO service_role;
REVOKE ALL ON public.campaigns FROM anon, authenticated;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.campaigns
FOR ALL
TO public
USING (false)
WITH CHECK (false);
