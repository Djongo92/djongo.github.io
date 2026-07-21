-- Real notification inbox. The sidebar Bell previously showed a purely
-- derived, re-computed-on-every-render list of "things currently wrong"
-- (weak categories, stale copyright) with no history and nothing to mark
-- read — every render recreated the same list, so nothing was ever a
-- "notification" in the normal sense. This table gives events a real,
-- persisted identity: created once, with a read/unread state that
-- survives across sessions.
--
-- Same identity posture as every other client-owned table: client_id is
-- the resolved identity (auth.uid(), or a firm id once resolveClientId
-- promotes it — see _shared/verifiedClientId.ts), never trusted directly
-- from a request; all reads/writes go through notifications-get /
-- notifications-mark-read (service_role only), mirroring user_app_state.
CREATE TABLE public.notifications (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  UUID NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at    TIMESTAMPTZ
);

CREATE INDEX idx_notifications_client ON public.notifications (client_id, created_at DESC);

GRANT ALL ON public.notifications TO service_role;
REVOKE ALL ON public.notifications FROM anon, authenticated;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.notifications
FOR ALL
TO public
USING (false)
WITH CHECK (false);
