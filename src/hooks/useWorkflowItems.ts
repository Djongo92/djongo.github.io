// §8 — Workflow: list/create/update/delete Battle Plan workflow items, add
// comments (text/voice/evidence), and create a partner review link. Same
// clientId + accessToken shape as useMarketVisibility.ts.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type WorkflowStatus = "todo" | "in_progress" | "in_review" | "approved" | "done";

export interface WorkflowItem {
  id: string;
  title: string;
  description: string | null;
  source: "custom" | "roadmap_action";
  source_ref: { phaseLabel?: string; chapterRef?: string } | null;
  status: WorkflowStatus;
  assigned_to_user_id: string | null;
  assigned_to_label: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowComment {
  id: string;
  item_id: string;
  author_label: string;
  body: string | null;
  voice_note_data_url: string | null;
  evidence_url: string | null;
  created_at: string;
}

export interface WorkflowItemPatch {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  assignedToUserId?: string | null;
  assignedToLabel?: string | null;
  status?: WorkflowStatus;
}

export const useWorkflowItems = () => {
  const { user, session } = useAuth();
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [comments, setComments] = useState<WorkflowComment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/workflow-items-manage`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, action: "list" }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setItems(data.items ?? []);
        setComments(data.comments ?? []);
      }
    } catch {
      // Dashboard's empty state covers a failed/empty load.
    } finally {
      setLoading(false);
    }
  }, [user?.id, session?.access_token]);

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback(async (input: {
    title: string; description?: string; source?: "custom" | "roadmap_action";
    sourceRef?: { phaseLabel?: string; chapterRef?: string }; dueDate?: string;
  }): Promise<{ ok: true } | { error: string }> => {
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/workflow-items-manage`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, action: "create", ...input }),
    });
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't create the workflow item" };
    await reload();
    return { ok: true };
  }, [user?.id, session?.access_token, reload]);

  const update = useCallback(async (id: string, patch: WorkflowItemPatch): Promise<{ ok: true } | { error: string }> => {
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/workflow-items-manage`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, action: "update", id, patch }),
    });
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't update the workflow item" };
    await reload();
    return { ok: true };
  }, [user?.id, session?.access_token, reload]);

  const remove = useCallback(async (id: string): Promise<{ ok: true } | { error: string }> => {
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/workflow-items-manage`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, action: "delete", id }),
    });
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't delete the workflow item" };
    await reload();
    return { ok: true };
  }, [user?.id, session?.access_token, reload]);

  const addComment = useCallback(async (
    itemId: string, body?: string, voiceNoteDataUrl?: string, evidenceUrl?: string,
  ): Promise<{ ok: true } | { error: string }> => {
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/workflow-comment-add`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, itemId, body, voiceNoteDataUrl, evidenceUrl }),
    });
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't add the comment" };
    await reload();
    return { ok: true };
  }, [user?.id, session?.access_token, reload]);

  const createPartnerLink = useCallback(async (
    itemIds: string[], recipientLabel?: string, expiresInDays?: number,
  ): Promise<{ linkId: string; expiresAt: string } | { error: string }> => {
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/workflow-partner-link`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, action: "create", itemIds, recipientLabel, expiresInDays }),
    });
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't create the review link" };
    return { linkId: data.linkId, expiresAt: data.expiresAt };
  }, [user?.id, session?.access_token]);

  return { items, comments, loading, reload, create, update, remove, addComment, createPartnerLink };
};
