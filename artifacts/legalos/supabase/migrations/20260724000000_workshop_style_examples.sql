-- Phase 1 of Workshop "memory": lets 4 voice-driven tools (Bio Rewriter,
-- Headline Lab, Copywriter, Rewrite) inject a firm's own recently-kept
-- drafts back into future prompts as few-shot style examples, instead of
-- generating from a blank slate every single time. Deliberately not
-- semantic search (no embeddings, no new API key) — recency within the
-- same client_id + tool_id is a fine proxy for relevance at this volume.
-- A real embeddings-backed Phase 2 can layer on top of this same table
-- later without a migration, since raw text is already what's stored.
--
-- No anon/authenticated access at all — mirrors user_app_state exactly.
-- A client never reads/writes this table directly; only through
-- workshop-style-feedback (writes) and each generation function (reads),
-- both service_role.
CREATE TABLE public.workshop_style_examples (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id      UUID NOT NULL,
  tool_id        TEXT NOT NULL CHECK (tool_id IN ('bio', 'headlines', 'copywriter', 'rewrite')),
  input_summary  TEXT NOT NULL,
  final_text     TEXT NOT NULL,
  verdict        TEXT NOT NULL CHECK (verdict IN ('approved', 'edited', 'rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workshop_style_examples_lookup
  ON public.workshop_style_examples (client_id, tool_id, created_at DESC);

GRANT ALL ON public.workshop_style_examples TO service_role;
REVOKE ALL ON public.workshop_style_examples FROM anon, authenticated;

ALTER TABLE public.workshop_style_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.workshop_style_examples
FOR ALL
TO public
USING (false)
WITH CHECK (false);
