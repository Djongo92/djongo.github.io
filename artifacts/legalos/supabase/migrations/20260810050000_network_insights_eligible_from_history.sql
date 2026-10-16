-- Fix the eligible-firm source for the weekly network-insights refresh:
-- market_visibility_audits is upserted current-state (one row per
-- client/domain/market), so counting rows there permanently capped every
-- firm at 1 audit and starved the cron of eligible firms. Eligibility
-- ("2+ audits") must be counted on the append-only history table.
CREATE OR REPLACE FUNCTION public.network_insights_eligible_firms()
RETURNS TABLE(client_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.client_id
  FROM public.market_visibility_audit_history h
  GROUP BY h.client_id
  HAVING count(*) >= 2
  ORDER BY h.client_id;
$$;

REVOKE ALL ON FUNCTION public.network_insights_eligible_firms() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.network_insights_eligible_firms() FROM anon;
REVOKE ALL ON FUNCTION public.network_insights_eligible_firms() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.network_insights_eligible_firms() TO service_role;
