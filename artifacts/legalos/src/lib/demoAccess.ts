/**
 * Access control for the gated product showcase.
 *
 * The showcase is the real app running on a fictional firm, handed out as a
 * sales tool rather than left open to the web. Codes live server-side, so the
 * only thing shipped to the browser is the question, never the answer.
 *
 * Worth being clear about the limit of this: the app is a client-side bundle,
 * so a determined visitor with devtools can always poke at the UI. What the
 * gate genuinely buys is that the showcase isn't casually browsable, isn't
 * linkable, and each recipient's code can be revoked on its own.
 */

import { resetTourForFreshShowcase } from "@/hooks/useCoachMarks";

const GRANT_KEY = "legalos_showcase_grant";

export interface ShowcaseGrant {
  /** Who the code was issued to, if the code carried a label. */
  label?: string;
}

/** The showcase-access edge function — codes are checked server-side only. */
const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/showcase-access`;

/** Headers for an unauthenticated public edge-function call. */
export function publicFunctionHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return {
    "Content-Type": "application/json",
    ...(key ? { apikey: key, Authorization: `Bearer ${key}` } : {}),
  };
}

export function readShowcaseGrant(): ShowcaseGrant | null {
  try {
    const raw = sessionStorage.getItem(GRANT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShowcaseGrant;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function hasShowcaseGrant(): boolean {
  return readShowcaseGrant() !== null;
}

export function storeShowcaseGrant(grant: ShowcaseGrant) {
  try {
    sessionStorage.setItem(GRANT_KEY, JSON.stringify(grant));
    // A fresh grant is a fresh showcase session: whoever just entered the
    // code gets the welcome screen and the tour offer, even if this browser
    // has seen them before (see the function's own note).
    resetTourForFreshShowcase();
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The visitor
    // simply re-enters the code on the next load rather than seeing a crash.
  }
}

export function clearShowcaseGrant() {
  try {
    sessionStorage.removeItem(GRANT_KEY);
  } catch {
    // Nothing to do — the grant expires with the tab regardless.
  }
}

export type VerifyResult =
  | { ok: true; grant: ShowcaseGrant }
  | { ok: false; message: string };

/** Checks a code with the server and, on success, remembers it for this tab. */
export async function verifyShowcaseCode(code: string, signal?: AbortSignal): Promise<VerifyResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, message: "Enter your access code." };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: publicFunctionHeaders(),
      body: JSON.stringify({ code: trimmed }),
      signal,
    });
  } catch {
    return { ok: false, message: "Couldn't reach the server. Check your connection and try again." };
  }

  if (res.ok) {
    // A 2xx status alone isn't proof the server actually approved the code —
    // a proxy/cache could return an empty or unrelated 200 body. Only an
    // explicit `ok: true` payload (the shape the server always sends on a
    // real match) counts as success; anything else is a real failure, not a
    // grant to wave through.
    const okBody = await parseJsonBody<{ ok?: boolean; label?: string }>(res);
    if (okBody?.ok !== true) {
      return { ok: false, message: "Something went wrong verifying that code. Try again." };
    }
    const grant: ShowcaseGrant = okBody.label ? { label: okBody.label } : {};
    storeShowcaseGrant(grant);
    return { ok: true, grant };
  }

  // A malformed/empty body reads very differently depending on what's behind
  // it: a genuinely empty body is how the server signals "wrong code" today,
  // but a non-empty body that fails to parse (e.g. a gateway's HTML error
  // page) is a real backend failure and must not be mislabeled as one.
  const text = await res.text().catch(() => "");
  let parsed: { message?: string } | undefined;
  try {
    parsed = text ? (JSON.parse(text) as { message?: string }) : undefined;
  } catch {
    parsed = undefined;
  }
  if (parsed?.message) return { ok: false, message: parsed.message };
  if (text) return { ok: false, message: `Something went wrong (${res.status}). Try again.` };
  return { ok: false, message: "That code isn't valid." };
}

async function parseJsonBody<T>(res: Response): Promise<T | undefined> {
  const text = await res.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/** Pulls an access code out of a shared link, e.g. /demo?key=ACME-7F3K. */
export function codeFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    const code = params.get("key") ?? params.get("code");
    return code && code.trim() ? code.trim() : null;
  } catch {
    return null;
  }
}
