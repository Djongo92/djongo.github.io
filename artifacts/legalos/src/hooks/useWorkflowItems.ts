// §8 — Workflow: list/create/update/delete Battle Plan workflow items, add
// comments (text/voice/evidence), and create a partner review link. Same
// clientId + accessToken shape as useMarketVisibility.ts.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { isDemoMode } from "@/lib/demoMode";
import {
  listBoard,
  createItem,
  updateItem,
  removeItem,
  addBoardComment,
  createDemoPartnerLink,
} from "@/lib/demoWorkflowStore";
import { isEdgeFunctionAvailable, recordEdgeFunctionStatus } from "@/lib/edgeFunctionAvailability";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const ITEMS_FN = "workflow-items-manage";
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
  visibility: "internal" | "client";
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
  const { activeFirmId } = useActiveWorkspace();
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [comments, setComments] = useState<WorkflowComment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    // Demo mode never touches Supabase — the showcase runs the real board UI
    // on a local store so the visitor can actually use the tool.
    if (isDemoMode()) {
      const board = listBoard();
      setItems(board.items);
      setComments(board.comments);
      setLoading(false);
      return;
    }
    if (!isEdgeFunctionAvailable(ITEMS_FN)) {
      // Dashboard's empty state covers the unavailable service.
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/${ITEMS_FN}`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, action: "list" }),
      });
      recordEdgeFunctionStatus(ITEMS_FN, resp.status);
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
  }, [user?.id, session?.access_token, activeFirmId]);

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback(async (input: {
    title: string; description?: string; source?: "custom" | "roadmap_action";
    sourceRef?: { phaseLabel?: string; chapterRef?: string }; dueDate?: string;
  }): Promise<{ ok: true } | { error: string }> => {
    if (isDemoMode()) {
      createItem(input);
      await reload();
      return { ok: true };
    }
    if (!isEdgeFunctionAvailable(ITEMS_FN)) return { error: UNAVAILABLE };
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/${ITEMS_FN}`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, action: "create", ...input }),
    });
    recordEdgeFunctionStatus(ITEMS_FN, resp.status);
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't create the workflow item" };
    await reload();
    return { ok: true };
  }, [user?.id, session?.access_token, activeFirmId, reload]);

  const update = useCallback(async (id: string, patch: WorkflowItemPatch): Promise<{ ok: true } | { error: string }> => {
    if (isDemoMode()) {
      updateItem(id, patch);
      await reload();
      return { ok: true };
    }
    if (!isEdgeFunctionAvailable(ITEMS_FN)) return { error: UNAVAILABLE };
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/${ITEMS_FN}`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, action: "update", id, patch }),
    });
    recordEdgeFunctionStatus(ITEMS_FN, resp.status);
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't update the workflow item" };
    await reload();
    return { ok: true };
  }, [user?.id, session?.access_token, activeFirmId, reload]);

  const remove = useCallback(async (id: string): Promise<{ ok: true } | { error: string }> => {
    if (isDemoMode()) {
      removeItem(id);
      await reload();
      return { ok: true };
    }
    if (!isEdgeFunctionAvailable(ITEMS_FN)) return { error: UNAVAILABLE };
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/${ITEMS_FN}`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, action: "delete", id }),
    });
    recordEdgeFunctionStatus(ITEMS_FN, resp.status);
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't delete the workflow item" };
    await reload();
    return { ok: true };
  }, [user?.id, session?.access_token, activeFirmId, reload]);

  const addComment = useCallback(async (
    itemId: string, body?: string, voiceNoteDataUrl?: string, evidenceUrl?: string, visibility?: "internal" | "client",
  ): Promise<{ ok: true } | { error: string }> => {
    if (isDemoMode()) {
      addBoardComment(itemId, body, voiceNoteDataUrl, evidenceUrl, visibility);
      await reload();
      return { ok: true };
    }
    if (!isEdgeFunctionAvailable(COMMENT_FN)) return { error: UNAVAILABLE };
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/${COMMENT_FN}`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, itemId, body, voiceNoteDataUrl, evidenceUrl, visibility }),
    });
    recordEdgeFunctionStatus(COMMENT_FN, resp.status);
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't add the comment" };
    await reload();
    return { ok: true };
  }, [user?.id, session?.access_token, activeFirmId, reload]);

  const createPartnerLink = useCallback(async (
    itemIds: string[], recipientLabel?: string, expiresInDays?: number,
  ): Promise<{ linkId: string; expiresAt: string } | { error: string }> => {
    // The review page is server-backed, so the demo can't mint a real link —
    // return a clearly-labelled sample and let the board say so.
    if (isDemoMode()) return createDemoPartnerLink(expiresInDays);
    if (!isEdgeFunctionAvailable(PARTNER_LINK_FN)) return { error: UNAVAILABLE };
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/${PARTNER_LINK_FN}`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, action: "create", itemIds, recipientLabel, expiresInDays }),
    });
    recordEdgeFunctionStatus(PARTNER_LINK_FN, resp.status);
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || "Couldn't create the review link" };
    return { linkId: data.linkId, expiresAt: data.expiresAt };
  }, [user?.id, session?.access_token, activeFirmId]);

  return {
    items, comments, loading, reload, create, update, remove, addComment, createPartnerLink,
    // In demo mode the board runs on the local store, so it's always usable.
    available: isDemoMode() || isEdgeFunctionAvailable(ITEMS_FN),
  };
};

const UNAVAILABLE = "The Battle Plan workflow service hasn't been switched on yet.";

const COMMENT_FN = "workflow-comment-add";

const PARTNER_LINK_FN = "workflow-partner-link";
