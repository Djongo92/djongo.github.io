// Shared role gate for minting external bearer links (roast-share-link,
// workflow-partner-link). The membership lookup is scoped to BOTH the user
// AND the resolved firm: the original partner-link code queried firm_members
// by user_id alone with maybeSingle(), which returns an error/no row for any
// multi-firm user — and since the check only denied when a role was found,
// it silently AUTHORIZED them (code review on task #136). Fail closed: a
// query error or a missing membership row is a denial, never a pass.
//
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export const LINK_MANAGER_ROLES = new Set(["owner", "admin", "marketing", "consultant", "member"]);

export type LinkRoleGate =
  | { allowed: true }
  | { allowed: false; status: number; error: string };

export async function resolveLinkManagerRole(
  serviceClient: SupabaseClient,
  userId: string,
  firmId: string,
): Promise<LinkRoleGate> {
  const { data, error } = await serviceClient
    .from("firm_members")
    .select("role")
    .eq("user_id", userId)
    .eq("firm_id", firmId)
    .maybeSingle();

  if (error) {
    console.error("firmRoleGate query error:", error);
    return { allowed: false, status: 500, error: "Couldn't verify your firm role" };
  }
  if (!data?.role) {
    // No membership row for the resolved id is legitimate in exactly one
    // case: resolveForUser returns the user's OWN id for single-member
    // "firms" (see verifiedClientId.ts) — there is no firm_members row
    // because the identity is personal, and the user owns it outright.
    // No row + a different id means the resolver returned something the user
    // doesn't belong to — fail closed.
    if (firmId === userId) return { allowed: true };
    return { allowed: false, status: 403, error: "You're not a member of this firm" };
  }
  if (!LINK_MANAGER_ROLES.has(data.role)) {
    return { allowed: false, status: 403, error: "Your role can't create a share link" };
  }
  return { allowed: true };
}
