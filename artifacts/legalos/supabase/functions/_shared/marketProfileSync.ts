// Task #156 — converge the two jurisdiction fields. The lightweight market
// picker (onboarding / mobile Firm Profile screen) saves firm_context.market
// into user_app_state, while the firm profile keeps its own authoritative
// firm_profiles.jurisdictions. Task #147 made the profile win at prompt time,
// but the stored values could still disagree forever: pick Czechia in the
// picker while the profile says Poland and every prompt runs on the
// precedence rule instead of one true value.
//
// This module write-throughs the picked market into the firm profile at the
// moment a signed-in member saves firm_context — the same place all three
// picker surfaces (web Settings/onboarding, mobile) already converge
// (user-state-set). Anonymous/teaser flows never reach it: user-state-set
// requires a verified session, and a caller with no live firm membership
// (nothing to sync into) is skipped, keeping their market localStorage-only.
//
// The sync is deliberately best-effort: a failure here must never fail the
// firm_context save itself — the #147 precedence rule still covers any row
// the sync missed.
// deno-lint-ignore-file no-explicit-any

/** Mirrors firm-profile/index.ts's CAN_EDIT_ROLES (canEditFirmProfile in
 *  src/lib/roles.ts). The write-through is a firm-profile edit by another
 *  door, so it must clear the same bar: a read-only executive or partner
 *  contributor saving their personal firm_context must NOT be able to move
 *  the firm's jurisdictions. */
const CAN_EDIT_ROLES = new Set(["owner", "admin", "marketing", "consultant", "member"]);

/**
 * Returns the jurisdictions array the profile should hold after adopting
 * `market` as the primary jurisdiction, or null when no write is needed.
 *
 * resolveEffectiveMarket (firmContextLine.ts) treats the FIRST non-blank
 * entry as the firm's primary market, so convergence means: the picked
 * market leads the list. Existing entries are preserved (a multi-
 * jurisdiction firm keeps its secondary markets); the market is moved to
 * the front if present elsewhere (case-insensitive), prepended otherwise.
 */
export function mergeMarketIntoJurisdictions(
  market: string | null | undefined,
  jurisdictions: string[] | null | undefined,
): string[] | null {
  const picked = typeof market === "string" ? market.trim() : "";
  if (!picked) return null;

  const existing = (jurisdictions ?? []).filter((j) => typeof j === "string" && j.trim());
  const first = existing[0]?.trim();
  if (first && first.toLowerCase() === picked.toLowerCase()) return null; // already primary

  const rest = existing.filter((j) => j.trim().toLowerCase() !== picked.toLowerCase());
  return [picked, ...rest];
}

/**
 * Best-effort write-through of a saved firm_context.market into
 * firm_profiles.jurisdictions. Never throws; logs and returns on any
 * failure so the caller's own save path is unaffected.
 *
 * `firmPin` is the caller's workspace-switcher firm (activeFirmId from the
 * web, requestedFirmId echoed from mobile) — honored only when it names a
 * live membership, same posture as firm-profile/index.ts.
 */
export async function syncMarketToFirmProfile(
  serviceClient: any,
  accessToken: unknown,
  market: unknown,
  firmPin?: string,
): Promise<void> {
  try {
    if (typeof market !== "string" || !market.trim()) return;
    if (typeof accessToken !== "string" || !accessToken) return;

    const { data: userData, error: userError } = await serviceClient.auth.getUser(accessToken);
    if (userError || !userData?.user) return;
    const userId = userData.user.id;

    const { data: memberships, error: memberError } = await serviceClient
      .from("firm_members")
      .select("firm_id, role, access_expires_at")
      .eq("user_id", userId);
    if (memberError) {
      console.error("marketProfileSync: membership lookup failed:", memberError);
      return;
    }
    const isLive = (m: { access_expires_at?: string | null }) =>
      !m.access_expires_at || new Date(m.access_expires_at).getTime() > Date.now();
    const live = (memberships ?? []).filter(isLive);
    const membership = (firmPin ? live.find((m) => m.firm_id === firmPin) : undefined) ?? live[0];

    // No firm membership → nothing to sync into (solo/legacy identity keeps
    // the client-side market as its only market — by design).
    if (!membership) return;
    if (!CAN_EDIT_ROLES.has(membership.role)) return;

    const { data: profile, error: profileError } = await serviceClient
      .from("firm_profiles")
      .select("jurisdictions")
      .eq("firm_id", membership.firm_id)
      .maybeSingle();
    if (profileError) {
      console.error("marketProfileSync: profile read failed:", profileError);
      return;
    }

    const merged = mergeMarketIntoJurisdictions(market, profile?.jurisdictions);
    if (!merged) return; // already converged

    const { error: upsertError } = await serviceClient
      .from("firm_profiles")
      .upsert(
        {
          firm_id: membership.firm_id,
          jurisdictions: merged,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
        { onConflict: "firm_id" },
      );
    if (upsertError) {
      console.error("marketProfileSync: profile upsert failed:", upsertError);
    }
  } catch (e) {
    console.error("marketProfileSync: unexpected error:", e);
  }
}
