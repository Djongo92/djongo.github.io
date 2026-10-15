/**
 * The demo-mode backing store for the §8 workflow board.
 *
 * The showcase runs the *real* WorkflowBoard UI, so the visitor can actually
 * use the PM-lite tool — add items, move them through the statuses, comment —
 * instead of looking at a screenshot. Demo mode never touches Supabase, so in
 * demo the hook swaps the edge calls for this local store, seeded by
 * demoData.buildDemoWorkflowBoard(). Everything stays in this browser.
 */
import type {
  WorkflowComment,
  WorkflowItem,
  WorkflowItemPatch,
  WorkflowStatus,
} from "@/hooks/useWorkflowItems";

const KEY = "demo_workflow_board";

interface Board {
  items: WorkflowItem[];
  comments: WorkflowComment[];
}

const EMPTY: Board = { items: [], comments: [] };

function read(): Board {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Board>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(board: Board) {
  try {
    localStorage.setItem(KEY, JSON.stringify(board));
  } catch {
    // Best-effort, like every other demo surface: a blocked-storage browser
    // just doesn't keep the changes.
  }
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function listBoard(): Board {
  return read();
}

export function createItem(input: {
  title: string;
  description?: string;
  source?: "custom" | "roadmap_action";
  sourceRef?: { phaseLabel?: string; chapterRef?: string };
  dueDate?: string;
}): WorkflowItem {
  const board = read();
  const now = new Date().toISOString();
  const item: WorkflowItem = {
    id: newId("demo-wf"),
    title: input.title,
    description: input.description ?? null,
    source: input.source ?? "custom",
    source_ref: input.sourceRef ?? null,
    status: "todo",
    assigned_to_user_id: null,
    assigned_to_label: null,
    due_date: input.dueDate ?? null,
    created_at: now,
    updated_at: now,
  };
  board.items.push(item);
  write(board);
  return item;
}

export function updateItem(id: string, patch: WorkflowItemPatch): void {
  const board = read();
  const item = board.items.find((i) => i.id === id);
  if (!item) return;
  if (patch.title !== undefined) item.title = patch.title;
  if (patch.description !== undefined) item.description = patch.description;
  if (patch.status !== undefined) item.status = patch.status as WorkflowStatus;
  if (patch.dueDate !== undefined) item.due_date = patch.dueDate;
  if (patch.assignedToUserId !== undefined) item.assigned_to_user_id = patch.assignedToUserId;
  if (patch.assignedToLabel !== undefined) item.assigned_to_label = patch.assignedToLabel;
  item.updated_at = new Date().toISOString();
  write(board);
}

export function removeItem(id: string): void {
  const board = read();
  write({
    items: board.items.filter((i) => i.id !== id),
    // Orphaned comments would be invisible cruft that survives re-seeding.
    comments: board.comments.filter((c) => c.item_id !== id),
  });
}

export function addBoardComment(
  itemId: string,
  body?: string,
  voiceNoteDataUrl?: string,
  evidenceUrl?: string,
  visibility: "internal" | "client" = "client",
): WorkflowComment {
  const board = read();
  const comment: WorkflowComment = {
    id: newId("demo-wfc"),
    item_id: itemId,
    // Honest attribution — this is a visitor trying the board, not a
    // fabricated team member saying something new.
    author_label: "You (demo)",
    body: body ?? null,
    voice_note_data_url: voiceNoteDataUrl ?? null,
    evidence_url: evidenceUrl ?? null,
    visibility,
    created_at: new Date().toISOString(),
  };
  board.comments.push(comment);
  write(board);
  return comment;
}

/**
 * The partner-review link is the one thing a local demo genuinely can't do —
 * the review page is server-backed. Return a recognisably fake link so the UI
 * can show what the flow produces, and let the board label it as a sample.
 */
export function createDemoPartnerLink(expiresInDays = 7): { linkId: string; expiresAt: string } {
  return {
    linkId: "demo-sample-link",
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
  };
}
