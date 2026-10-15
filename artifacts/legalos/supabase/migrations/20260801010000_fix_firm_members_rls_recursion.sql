-- Fix infinite recursion (Postgres 42P17) in the firm_members SELECT policy.
--
-- 20260722040000's policy on firm_members checked
--   firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())
-- — a subquery on the very table the policy guards. Postgres detects the
-- self-reference and rejects EVERY authenticated read of firm_members, and
-- transitively every policy that subqueries firm_members (firms, firm_profiles,
-- and anything else membership-scoped). Symptom: signed-in users couldn't
-- read their own membership, so role-gated UI (e.g. the Firm Profile settings
-- form's canEdit) silently rendered read-only/disabled for everyone, while
-- service-role edge calls kept working — which is why nothing alerted.
--
-- Fix: resolve membership through a SECURITY DEFINER function (owned by
-- postgres, so it bypasses RLS and breaks the self-reference), and express
-- both membership-scoped SELECT policies in terms of it.
CREATE OR REPLACE FUNCTION public.is_firm_member(target_firm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.firm_members
    WHERE firm_id = target_firm_id AND user_id = auth.uid()
  );
$$;

-- Hygiene: anonymous callers have no membership to check (auth.uid() is
-- always null for them); don't expose the function there at all.
REVOKE EXECUTE ON FUNCTION public.is_firm_member(UUID) FROM anon;

DROP POLICY "members can view their own firm's membership" ON public.firm_members;
CREATE POLICY "members can view their own firm's membership"
ON public.firm_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_firm_member(firm_id)
);

DROP POLICY "members can view their own firm" ON public.firms;
CREATE POLICY "members can view their own firm"
ON public.firms
FOR SELECT
TO authenticated
USING (public.is_firm_member(id));
