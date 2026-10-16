-- Recurring audits (LegalOS build brief item 10). Today a score only
-- updates when someone manually re-runs it, so the trend line and the
-- public ranking go stale between visits. This lets a firm opt an audit
-- into a periodic automatic re-run instead.
--
-- auto_rerun/rerun_frequency_days are set by the client via
-- visibility-audit-run (same ownership posture as every other column on
-- this table — service_role write only, RLS unchanged). The actual
-- re-running is done by visibility-audit-rerun-due, invoked on a schedule
-- (see the pg_cron job set up alongside this migration) — never by an
-- end-user request, so it is not gated by the benchmark HMAC scope like
-- the rest of the audit endpoints; it checks a dedicated CRON_SECRET
-- instead (set directly as a Supabase function secret, never committed).
ALTER TABLE public.market_visibility_audits
  ADD COLUMN auto_rerun BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN rerun_frequency_days INTEGER,
  ADD COLUMN last_intake JSONB NOT NULL DEFAULT '{}'::jsonb; -- { gbpListed, social } from the last run, so a scheduled re-run can replay the same self-reported inputs without asking again

-- security definer so visibility-audit-rerun-due (service_role) can find
-- due rows across every client_id in one call rather than needing a
-- separate service-role bypass per query; locked to service_role only —
-- never exposed to anon/authenticated the way the rest of this table is.
CREATE OR REPLACE FUNCTION public.market_visibility_audits_due_for_rerun()
RETURNS SETOF public.market_visibility_audits
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.market_visibility_audits
  WHERE auto_rerun = true
    AND rerun_frequency_days IS NOT NULL
    AND updated_at <= now() - (rerun_frequency_days || ' days')::interval;
$$;

REVOKE ALL ON FUNCTION public.market_visibility_audits_due_for_rerun() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.market_visibility_audits_due_for_rerun() TO service_role;
