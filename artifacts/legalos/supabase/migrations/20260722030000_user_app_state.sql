-- Server-backed storage for real accounts (LegalOS build brief item 8).
-- Every guidebook/workshop/battle-plan hook today is localStorage-only —
-- fine for an anonymous browser, but a real account should carry state
-- across devices. This is the shared infra for that: one small key/value
-- table, keyed by client_id (== auth.uid() for a real session, same
-- pattern as market_visibility_audits — see _shared/verifiedClientId.ts).
--
-- Scope for this pass: the table + user-state-get/set functions, plus
-- useReadingProgress migrated as the first (and only, this pass) consumer
-- — proof the pattern works end to end, not a full migration of every
-- hook. The other ~8 localStorage hooks (Workshop history, Battle Plan
-- cache, goals, competitors, bookmarks, checklists, annotations,
-- implementation) stay local-only for now; each is a small, mechanical
-- follow-up once this pattern is proven.
--
-- No anon/authenticated access at all — mirrors url_cache exactly. A
-- client never reads/writes this table directly; only through the two
-- service_role edge functions, each re-verifying identity from a real
-- access token when one is present.
CREATE TABLE public.user_app_state (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  UUID NOT NULL,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (client_id, key)
);

CREATE INDEX idx_user_app_state_client ON public.user_app_state (client_id);

GRANT ALL ON public.user_app_state TO service_role;
REVOKE ALL ON public.user_app_state FROM anon, authenticated;

ALTER TABLE public.user_app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.user_app_state
FOR ALL
TO public
USING (false)
WITH CHECK (false);
