-- Multi-seat firms — schema foundation only (LegalOS build brief item 11).
--
-- Today one real account == one client_id == one market_visibility_audits
-- owner; a managing partner and a marketer each have to run their own
-- audit rather than sharing one firm's history. This migration lays the
-- groundwork (firms + firm_members, auto-provisioned 1:1 on signup) without
-- touching market_visibility_audits or any other existing table — that
-- wiring (client_id -> firm_id resolution in
-- _shared/verifiedClientId.ts, an invite flow, an edge function to read/
-- manage membership) is real, separable follow-up work, deliberately not
-- attempted in this pass so the already-shipped audit system isn't
-- disturbed by a wide, risky refactor for a feature nothing consumes yet.
--
-- Every real user gets a solo firm (name defaulted from their email) the
-- moment they sign up, via a trigger on auth.users — so "add a teammate"
-- later is just inserting a second firm_members row against an existing
-- firm, not a schema migration for every existing account.
CREATE TABLE public.firms (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.firm_members (
  firm_id    UUID NOT NULL REFERENCES public.firms (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (firm_id, user_id)
);

CREATE INDEX idx_firm_members_user ON public.firm_members (user_id);

GRANT SELECT ON public.firms TO authenticated;
GRANT SELECT ON public.firm_members TO authenticated;
GRANT ALL ON public.firms TO service_role;
GRANT ALL ON public.firm_members TO service_role;
REVOKE ALL ON public.firms FROM anon;
REVOKE ALL ON public.firm_members FROM anon;

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;

-- A user can see the firm(s) and fellow members of any firm they belong to.
-- Writes are service_role only (there is no invite/create flow yet — when
-- one is built, it goes through an edge function, same posture as every
-- other write path in this project).
CREATE POLICY "members can view their own firm"
ON public.firms
FOR SELECT
TO authenticated
USING (id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "writes via service role only"
ON public.firms
FOR INSERT TO public WITH CHECK (false);

CREATE POLICY "updates via service role only"
ON public.firms
FOR UPDATE TO public USING (false) WITH CHECK (false);

CREATE POLICY "deletes via service role only"
ON public.firms
FOR DELETE TO public USING (false);

CREATE POLICY "members can view their own firm's membership"
ON public.firm_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())
);

CREATE POLICY "writes via service role only"
ON public.firm_members
FOR INSERT TO public WITH CHECK (false);

CREATE POLICY "updates via service role only"
ON public.firm_members
FOR UPDATE TO public USING (false) WITH CHECK (false);

CREATE POLICY "deletes via service role only"
ON public.firm_members
FOR DELETE TO public USING (false);

-- Auto-provision a solo firm for every new real signup.
CREATE OR REPLACE FUNCTION public.handle_new_user_firm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_firm_id UUID;
BEGIN
  INSERT INTO public.firms (name)
  VALUES (COALESCE(split_part(NEW.email, '@', 1), 'My Firm'))
  RETURNING id INTO new_firm_id;

  INSERT INTO public.firm_members (firm_id, user_id, role)
  VALUES (new_firm_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_provision_firm
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_firm();
