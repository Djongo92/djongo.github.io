-- §8 — Workflow: turns the Battle Plan from a document into a system.
-- An item can be a roadmap action carried over (source_ref is a snapshot —
-- the roadmap itself lives in a per-user KV cache, not a table, so there's
-- no real id to foreign-key against; same "snapshot, not FK" precedent
-- campaigns.linked_runs already established) or a custom item a firm adds
-- directly. Assign/due-date/comment/evidence/approve/re-measure all hang
-- off battle_plan_workflow_items; canApproveWorkflow/canComment
-- (src/lib/roles.ts) were defined ahead of this feature and are enforced
-- here for the first time.
CREATE TABLE public.battle_plan_workflow_items (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id           UUID NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  source              TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('custom', 'roadmap_action')),
  source_ref          JSONB, -- { phaseLabel, chapterRef } snapshot when source = 'roadmap_action'
  status              TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'approved', 'done')),
  assigned_to_user_id UUID REFERENCES auth.users (id),
  assigned_to_label   TEXT, -- display name/email snapshot — works even for a non-member assignee
  due_date            DATE,
  created_by          UUID REFERENCES auth.users (id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workflow_items_client ON public.battle_plan_workflow_items (client_id, created_at DESC);

-- Voice notes are stored as a base64 data URL directly on the row, same
-- precedent as useFirmLogo.ts's firm-logo storage — this codebase has no
-- object-storage bucket set up yet, and a short recorded comment is small
-- enough that a text column is a reasonable v1 rather than standing up
-- Storage + its own RLS surface for one feature.
CREATE TABLE public.battle_plan_workflow_comments (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id           UUID NOT NULL REFERENCES public.battle_plan_workflow_items (id) ON DELETE CASCADE,
  author_label      TEXT NOT NULL,
  author_user_id    UUID REFERENCES auth.users (id), -- null for an anonymous partner-link comment
  body              TEXT,
  voice_note_data_url TEXT,
  evidence_url      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (body IS NOT NULL OR voice_note_data_url IS NOT NULL)
);
CREATE INDEX idx_workflow_comments_item ON public.battle_plan_workflow_comments (item_id, created_at ASC);

-- Single-purpose expiring mobile link for a partner who won't install
-- anything or log in — the id itself is the bearer token (same posture as
-- shared_artifacts/create-share), but unlike shared_artifacts this table
-- has NO anon grant at all: workflow items are more sensitive than a
-- shareable score card, so even the token-gated read goes through the
-- workflow-partner-link edge function (service_role) rather than a direct
-- RLS SELECT, per this project's established preference (see CLAUDE.md's
-- Batch A note on market_visibility_audits for the same reasoning).
CREATE TABLE public.battle_plan_partner_links (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID NOT NULL,
  item_ids        JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipient_label TEXT,
  created_by      UUID REFERENCES auth.users (id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  last_viewed_at  TIMESTAMPTZ
);

GRANT SELECT ON public.battle_plan_workflow_items TO authenticated;
GRANT ALL ON public.battle_plan_workflow_items TO service_role;
REVOKE ALL ON public.battle_plan_workflow_items FROM anon;

GRANT SELECT ON public.battle_plan_workflow_comments TO authenticated;
GRANT ALL ON public.battle_plan_workflow_comments TO service_role;
REVOKE ALL ON public.battle_plan_workflow_comments FROM anon;

GRANT ALL ON public.battle_plan_partner_links TO service_role;
REVOKE ALL ON public.battle_plan_partner_links FROM anon, authenticated;

ALTER TABLE public.battle_plan_workflow_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_plan_workflow_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_plan_partner_links ENABLE ROW LEVEL SECURITY;

-- Same posture as firm_profiles: any member of the owning client (solo
-- account or firm) can read; all writes are via service-role edge
-- functions (workflow-items-manage, workflow-comment-add,
-- workflow-partner-link) which enforce canComment/canApproveWorkflow.
CREATE POLICY "members can view their own workflow items"
ON public.battle_plan_workflow_items
FOR SELECT TO authenticated
USING (client_id = auth.uid() OR client_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "writes via service role only" ON public.battle_plan_workflow_items FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "updates via service role only" ON public.battle_plan_workflow_items FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "deletes via service role only" ON public.battle_plan_workflow_items FOR DELETE TO public USING (false);

CREATE POLICY "members can view comments on their own workflow items"
ON public.battle_plan_workflow_comments
FOR SELECT TO authenticated
USING (item_id IN (
  SELECT id FROM public.battle_plan_workflow_items
  WHERE client_id = auth.uid() OR client_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())
));

CREATE POLICY "comment writes via service role only" ON public.battle_plan_workflow_comments FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "comment updates via service role only" ON public.battle_plan_workflow_comments FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "comment deletes via service role only" ON public.battle_plan_workflow_comments FOR DELETE TO public USING (false);

CREATE POLICY "partner links via service role only" ON public.battle_plan_partner_links FOR ALL TO public USING (false) WITH CHECK (false);
