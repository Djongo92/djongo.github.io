// Client-side helpers for Workshop's Phase 1 "memory" — same clientId/
// accessToken resolution pattern as useMarketVisibility.ts, so a signed-in
// user's feedback lands on their real identity and an anonymous browser's
// still works via the same random per-browser id used elsewhere.
import { getOrCreateClientId } from "@/lib/clientId";
import { getCurrentUser } from "@/lib/currentUser";
import { fnUrl, authHeaders } from "@/components/workshop/shared";

export type StyleToolId = "bio" | "headlines" | "copywriter" | "rewrite";
export type StyleVerdict = "approved" | "edited" | "rejected";

export async function recordStyleFeedback(
  toolId: StyleToolId,
  inputSummary: string,
  finalText: string,
  verdict: StyleVerdict,
): Promise<void> {
  const { userId, accessToken } = getCurrentUser();
  const clientId = userId ?? getOrCreateClientId();
  try {
    await fetch(fnUrl("workshop-style-feedback"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ clientId, accessToken, toolId, inputSummary, finalText, verdict }),
    });
  } catch (e) {
    // Best-effort — a failed feedback save shouldn't interrupt the user's
    // actual workflow (they already have their copy either way).
    console.error("recordStyleFeedback failed:", e);
  }
}

/** clientId/accessToken to send alongside a generation request, so the backend can fetch this firm's style memory. */
export function styleMemoryIdentity(): { clientId: string; accessToken: string | null } {
  const { userId, accessToken } = getCurrentUser();
  return { clientId: userId ?? getOrCreateClientId(), accessToken };
}
