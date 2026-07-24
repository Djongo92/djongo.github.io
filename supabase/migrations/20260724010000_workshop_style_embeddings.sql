-- Phase 2 of Workshop "memory": real semantic similarity on top of Phase 1's
-- recency-based table (20260724000000_workshop_style_examples.sql). Adds an
-- embedding column, populated via Voyage AI (VOYAGE_API_KEY) at write time.
-- Nullable and best-effort — a row with no embedding (key not configured
-- yet, or the embedding call hiccuped) just falls back to Phase 1's
-- recency ordering for that firm+tool; nothing ever fails because of a
-- missing embedding.
--
-- No ANN index (ivfflat/hnsw) here on purpose: every real query is already
-- scoped to one client_id + tool_id via match_workshop_style_examples below,
-- which narrows to at most a few dozen rows per firm per tool — a plain
-- exact ORDER BY on that already-tiny, already-filtered set is both simpler
-- and more accurate than an approximate index tuned for a large, unscoped
-- corpus this table will never have.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.workshop_style_examples
  ADD COLUMN embedding vector(1024);

-- SECURITY INVOKER (default) is fine: only ever called via a service_role
-- client, which bypasses RLS entirely — same trust boundary as every other
-- read/write on this table. Explicit REVOKE/GRANT below is defense in depth.
CREATE OR REPLACE FUNCTION public.match_workshop_style_examples(
  p_client_id UUID,
  p_tool_id TEXT,
  p_query_embedding vector(1024),
  p_limit INT
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
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.match_workshop_style_examples FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_workshop_style_examples TO service_role;
