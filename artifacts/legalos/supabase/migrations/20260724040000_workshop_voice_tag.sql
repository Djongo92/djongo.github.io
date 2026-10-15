-- Senior-PM idea: Workshop memory is scoped per-firm (client_id), so once
-- a firm has 2+ people actually using it, a junior associate's edits and a
-- senior partner's blend into one "voice" — a quality regression once
-- usage grows, not a feature. voice_tag lets a kept/edited draft optionally
-- be attributed to a specific person (free text, not a firm_members FK —
-- keeps this additive and simple rather than requiring every caller to
-- resolve a real member id); NULL means "firm-wide", unchanged behavior
-- for the common single-writer case.
ALTER TABLE public.workshop_style_examples
  ADD COLUMN voice_tag TEXT;

-- Replaces the Phase 2 4-arg version (arg list, not just body, is
-- changing) — matching-voice-tag rows sort first (by NOT DISTINCT FROM,
-- so untagged rows still match an untagged query), non-matching rows fill
-- any remaining slots rather than being excluded outright, so a firm with
-- only one tagged example still benefits from its untagged history too.
DROP FUNCTION IF EXISTS public.match_workshop_style_examples(UUID, TEXT, vector(1024), INT);

CREATE OR REPLACE FUNCTION public.match_workshop_style_examples(
  p_client_id UUID,
  p_tool_id TEXT,
  p_query_embedding vector(1024),
  p_limit INT,
  p_voice_tag TEXT DEFAULT NULL
)
RETURNS TABLE (input_summary TEXT, final_text TEXT, verdict TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE
AS $$
  SELECT input_summary, final_text, verdict, created_at
  FROM public.workshop_style_examples
  WHERE client_id = p_client_id
    AND tool_id = p_tool_id
    AND verdict IN ('approved', 'edited')
    AND embedding IS NOT NULL
  ORDER BY (voice_tag IS NOT DISTINCT FROM p_voice_tag) DESC, embedding <=> p_query_embedding
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.match_workshop_style_examples FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_workshop_style_examples TO service_role;
