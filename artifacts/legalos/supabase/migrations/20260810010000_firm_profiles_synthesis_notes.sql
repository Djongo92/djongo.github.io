-- Post-run synthesis storage (workshop-synthesis edge function).
-- A JSONB array of structured notes appended after each workshop run:
--   [{ at, tool, toolLabel, note, tags }]
-- Newest first, pruned to the last 50 on write by the edge function.
-- Inherits firm_profiles' existing RLS posture: members can read their own
-- firm's row; all writes go through service-role edge functions, so the
-- synthesis writer can never cross firms (it resolves the caller's firm
-- fail-closed from the session token before writing).
ALTER TABLE public.firm_profiles
  ADD COLUMN IF NOT EXISTS synthesis_notes jsonb NOT NULL DEFAULT '[]'::jsonb;
