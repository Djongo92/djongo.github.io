-- Atomic append+prune for firm_profiles.synthesis_notes.
-- The workshop-synthesis edge function fires once per workshop run; bursts
-- of concurrent runs made a read-modify-write in application code lose
-- notes (two writers read the same array, last write wins). This RPC does
-- the prepend-and-trim inside a single UPDATE, which Postgres executes
-- under a row lock — no lost notes, no retry loop needed.
-- Semantics mirror appendSynthesisNote in
-- supabase/functions/_shared/postRunSynthesis.ts (keep them in sync).
CREATE OR REPLACE FUNCTION public.append_synthesis_note(
  p_firm_id uuid,
  p_note jsonb,
  p_cap integer DEFAULT 50
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.firm_profiles fp
  SET synthesis_notes = (
    SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
    FROM (
      SELECT elem, ord
      FROM (
        SELECT p_note AS elem, 0::bigint AS ord
        UNION ALL
        SELECT e, n
        FROM jsonb_array_elements(COALESCE(fp.synthesis_notes, '[]'::jsonb))
          WITH ORDINALITY AS t(e, n)
      ) combined
      ORDER BY ord
      LIMIT p_cap
    ) capped
  )
  WHERE fp.firm_id = p_firm_id;
$$;

-- Writes to firm_profiles are service-role only (see the table's RLS
-- policies); this function inherits that posture.
REVOKE ALL ON FUNCTION public.append_synthesis_note(uuid, jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.append_synthesis_note(uuid, jsonb, integer) FROM anon;
REVOKE ALL ON FUNCTION public.append_synthesis_note(uuid, jsonb, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.append_synthesis_note(uuid, jsonb, integer) TO service_role;

-- Per-firm rate limit bucket for the synthesis endpoint (column names match
-- what _shared/rateLimit.ts's checkRateLimitGeneric reads/writes).
CREATE TABLE IF NOT EXISTS public.synthesis_rate_limit (
  firm_id uuid PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.synthesis_rate_limit ENABLE ROW LEVEL SECURITY;

-- Service-role only: the edge function checks/enforces it; users never
-- touch this table directly.
REVOKE ALL ON public.synthesis_rate_limit FROM anon;
REVOKE ALL ON public.synthesis_rate_limit FROM authenticated;
GRANT ALL ON public.synthesis_rate_limit TO service_role;
