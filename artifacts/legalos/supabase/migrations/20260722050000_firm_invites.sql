-- Firm invite flow (LegalOS build brief item 11, continued from the
-- schema-only foundation in 20260722040000). No SMTP is configured in this
-- project, so this is a shareable-link invite rather than an email invite:
-- an owner generates a token via firm-invite (action "create"), shares the
-- resulting /join/:token link manually, and whoever opens it while signed
-- in redeems it (action "redeem") to join that firm as a member.
--
-- service_role only, same posture as every other write path — a client
-- never creates or redeems an invite directly against this table.
CREATE TABLE public.firm_invites (
  token      TEXT NOT NULL PRIMARY KEY,
  firm_id    UUID NOT NULL REFERENCES public.firms (id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by    UUID REFERENCES auth.users (id),
  used_at    TIMESTAMPTZ
);

CREATE INDEX idx_firm_invites_firm ON public.firm_invites (firm_id);

GRANT ALL ON public.firm_invites TO service_role;
REVOKE ALL ON public.firm_invites FROM anon, authenticated;

ALTER TABLE public.firm_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.firm_invites
FOR ALL
TO public
USING (false)
WITH CHECK (false);
