-- Deterministic eligible-firm list for the weekly network-insights refresh.
-- The first version selected firms from the newest 10,000 audit rows and an
-- arbitrary slice of a Map — older eligible firms could be starved forever.
-- This function computes eligibility DB-side (complete, deterministically
-- ordered) so the cron sweep covers every firm with 2+ audits, every week.
CREATE OR REPLACE FUNCTION public.network_insights_eligible_firms()
RETURNS TABLE(client_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.client_id
  FROM public.market_visibility_audits m
  GROUP BY m.client_id
  HAVING count(*) >= 2
  ORDER BY m.client_id;
$$;

REVOKE ALL ON FUNCTION public.network_insights_eligible_firms() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.network_insights_eligible_firms() FROM anon;
REVOKE ALL ON FUNCTION public.network_insights_eligible_firms() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.network_insights_eligible_firms() TO service_role;
