/**
 * Battle Plan partner review — the mobile side of the web's PartnerReview.tsx.
 *
 * A single-purpose, expiring link a partner opens with NO login: the link id
 * itself is the bearer token. view/comment/approve are public by design (the
 * edge function authorizes them by linkId, not by session), so these calls
 * carry only the standard anon edge headers — no session JWT.
 *
 * Contract (workflow-partner-link edge function):
 *   { action: "view",    linkId }                 → { recipientLabel, items[], comments[] }
 *   { action: "comment", linkId, itemId, body }   → mutation; reload after
 *   { action: "approve", linkId, itemId }         → mutation; reload after
 *
 * Voice notes: the web sends an optional voiceNoteDataUrl. Mobile SKIPS voice
 * recording (no recorder wired here) and posts text comments only — see the
 * partner-review screen's note. Existing voice notes on comments are surfaced
 * as a "voice note" marker rather than played, since there's no audio element.
 */
import { SUPABASE_URL, edgeHeaders } from './supabase';

const PARTNER_LINK_FN = 'workflow-partner-link';

export interface ReviewItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
}

export interface ReviewComment {
  id: string;
  item_id: string;
  author_label: string;
  body: string | null;
  voice_note_data_url: string | null;
  created_at: string;
}

export interface ReviewBoard {
  recipientLabel: string | null;
  items: ReviewItem[];
  comments: ReviewComment[];
}

/**
 * POST to the partner-link edge function. Resolves with parsed JSON or throws
 * an Error carrying the server's message — the screen turns a throw into its
 * clean expired/invalid error state.
 */
async function call<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_URL) {
    throw new Error("Partner review links aren't available right now — please ask for a fresh link later.");
  }
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${PARTNER_LINK_FN}`, {
    method: 'POST',
    headers: edgeHeaders(),
    body: JSON.stringify(payload),
  });
  const text = await resp.text().catch(() => '');
  let data: (T & { error?: string }) | undefined;
  try {
    data = text ? (JSON.parse(text) as T & { error?: string }) : undefined;
  } catch {
    data = undefined;
  }
  if (!resp.ok) {
    throw new Error(data?.error || 'Something went wrong');
  }
  return (data ?? ({} as T)) as T;
}

/** Load the review board for a link. Throws on expired/invalid links. */
export async function loadPartnerReview(linkId: string): Promise<ReviewBoard> {
  const data = await call<{ recipientLabel?: string | null; items?: ReviewItem[]; comments?: ReviewComment[] }>({
    action: 'view',
    linkId,
  });
  return {
    recipientLabel: data.recipientLabel ?? null,
    items: data.items ?? [],
    comments: data.comments ?? [],
  };
}

/** Post a text comment on an item. Voice notes are intentionally omitted. */
export async function postPartnerComment(linkId: string, itemId: string, body: string): Promise<void> {
  await call({ action: 'comment', linkId, itemId, body });
}

/** Approve an item. */
export async function approvePartnerItem(linkId: string, itemId: string): Promise<void> {
  await call({ action: 'approve', linkId, itemId });
}
