// Client-side helpers for Workshop's Phase 1 "memory" — same clientId/
// accessToken resolution pattern as useMarketVisibility.ts, so a signed-in
// user's feedback lands on their real identity and an anonymous browser's
// still works via the same random per-browser id used elsewhere.
import { getOrCreateClientId } from "@/lib/clientId";
import { getCurrentUser } from "@/lib/currentUser";
import { fnUrl, authHeaders } from "@/components/workshop/shared";

export type StyleToolId = "bio" | "headlines" | "copywriter" | "rewrite" | "article" | "pitch" | "linkedin" | "casestudy" | "submission" | "pagedraft";
export type StyleVerdict = "approved" | "edited" | "rejected";

export async function recordStyleFeedback(
  toolId: StyleToolId,
  inputSummary: string,
  finalText: string,
  verdict: StyleVerdict,
  voiceTag?: string,
): Promise<void> {
  const { userId, accessToken } = getCurrentUser();
  const clientId = userId ?? getOrCreateClientId();
  let activeFirmId: string | undefined;
  try {
    activeFirmId = localStorage.getItem("legalos_active_workspace") ?? undefined;
  } catch { /* storage unavailable — pin omitted, server auto-detects */ }
  try {
    await fetch(fnUrl("workshop-style-feedback"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ clientId, accessToken, activeFirmId, toolId, inputSummary, finalText, verdict, voiceTag: voiceTag?.trim() || undefined }),
    });
  } catch (e) {
    // Best-effort — a failed feedback save shouldn't interrupt the user's
    // actual workflow (they already have their copy either way).
    console.error("recordStyleFeedback failed:", e);
  }
}

/**
 * clientId/accessToken (+ activeFirmId workspace pin) to send alongside a
 * generation request, so the backend fetches THIS firm's style memory and
 * context profile. The pin matters for consultants: without it the server
 * auto-resolves to the first multi-member firm it finds, which may not be
 * the workspace selected in the switcher — a cross-client context leak.
 * The server validates the pin against live membership, so a stale or
 * foreign value can never widen access, only fall back to auto-detection.
 */
/**
 * Fire-and-forget post-run synthesis (task #120): after a workshop run
 * completes, ask the backend to distil what the run reveals about the firm
 * into firm_profiles.synthesis_notes — the loop that makes the firm context
 * profile grow with use. Account-only: anonymous/demo users have no real
 * firm profile, so we skip without firing. Never awaited, never throws.
 */
export function queueRunSynthesis(
  toolId: string,
  toolLabel: string,
  output: string | undefined,
  identity?: { clientId: string; accessToken: string | null; activeFirmId?: string },
): void {
  if (!output) return;
  // Identity is captured by the tool component at REQUEST time and passed
  // through — re-reading the workspace pin here would misattribute the run
  // if a consultant switches client workspaces while generation is in
  // flight (the output belongs to the firm it was generated for).
  const id = identity ?? styleMemoryIdentity();
  if (!id.accessToken) return; // anonymous/demo: no firm profile to grow
  try {
    fetch(fnUrl("workshop-synthesis"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...id, toolId, toolLabel, output: output.slice(0, 4000) }),
    }).catch((e) => console.debug("queueRunSynthesis failed (silent by design):", e));
  } catch { /* fire-and-forget */ }
}

export function styleMemoryIdentity(): { clientId: string; accessToken: string | null; activeFirmId?: string } {
  const { userId, accessToken } = getCurrentUser();
  let activeFirmId: string | undefined;
  try {
    activeFirmId = localStorage.getItem("legalos_active_workspace") ?? undefined;
  } catch { /* storage unavailable — pin omitted, server auto-detects */ }
  return { clientId: userId ?? getOrCreateClientId(), accessToken, activeFirmId };
}
