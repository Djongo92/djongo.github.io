// client_id has always been trusted verbatim from the request body — fine
// when it was only ever a random per-browser id nobody else could guess.
// Now that a real account's client_id is auth.uid() (see
// visibility-audit-claim), that trust would let anyone read or write another
// user's audit just by sending their id. So whenever a real access token is
// supplied, it — not the client-asserted clientId — decides identity;
// anonymous callers (no token) keep the original trust model unchanged.
//
// Firm-aware: once a signed-in user belongs to a firm with more than one
// member, that firm's id becomes their client_id instead of their own
// auth.uid() — a shared identity so every teammate's audit calls land on the
// same rows (see visibility-audit-share-with-firm for the one-time backfill
// of a solo account's pre-existing audits). A firm with only one member
// (the common case — every account gets one on signup, see
// handle_new_user_firm) behaves exactly as before: this only changes
// behavior once a second person actually joins.
//
// §11 — Consultant layer: a consultant can belong to several client firms
// at once, so "pick whichever firm has >1 member" can't disambiguate which
// one they're currently acting as. `requestedFirmId` lets the caller (the
// workspace switcher) say explicitly — honored only if the user actually
// has a live (non-expired) membership row for that firm, never trusted
// blindly. A membership whose access_expires_at has passed is treated as
// absent everywhere in this function, both for the explicit-request path
// and the original >1-member auto-detection — expiring consultant access
// was schema-ready since §4 but never actually enforced until now.
// deno-lint-ignore no-explicit-any
export async function resolveClientId(serviceClient: any, clientId: string, accessToken?: unknown, requestedFirmId?: string): Promise<string> {
  if (!accessToken || typeof accessToken !== "string") return clientId;
  const { data, error } = await serviceClient.auth.getUser(accessToken);
  if (error || !data?.user) return clientId;
  const userId = data.user.id;

  const { data: memberFirms } = await serviceClient
    .from("firm_members")
    .select("firm_id, access_expires_at")
    .eq("user_id", userId);

  const isLive = (row: { access_expires_at?: string | null }) =>
    !row.access_expires_at || new Date(row.access_expires_at).getTime() > Date.now();
  const liveFirms = (memberFirms ?? []).filter(isLive);

  if (requestedFirmId && liveFirms.some((f) => f.firm_id === requestedFirmId)) {
    return requestedFirmId;
  }

  for (const { firm_id } of liveFirms) {
    const { count } = await serviceClient
      .from("firm_members")
      .select("*", { count: "exact", head: true })
      .eq("firm_id", firm_id);
    if ((count ?? 0) > 1) return firm_id;
  }

  return userId;
}
