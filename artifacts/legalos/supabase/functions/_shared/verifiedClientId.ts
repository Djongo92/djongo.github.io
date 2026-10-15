// client_id was once trusted verbatim from the request body — fine when it
// was only ever a random per-browser id nobody else could guess. Now that a
// real account's client_id is auth.uid() (see visibility-audit-claim), that
// trust is an IDOR: send a foreign clientId, omit the token, read or write
// that account's rows. So every endpoint resolves identity from a verified
// access token, and the two resolvers below differ only in what a token-less
// caller may do:
//
//   resolveVerifiedClientId — account-only endpoints. No verified token, no
//     identity: returns null and the caller must 401. There is no legitimate
//     token-less caller for account-keyed state.
//
//   resolveClientIdGuarded — endpoints the legacy password tiers (benchmark /
//     workshop HMAC tokens) still call without a session, plus anonymous
//     browser-id flows. Token-less callers keep the original trust model,
//     but only for ids no account owns: an asserted clientId that matches an
//     auth user (a firm_members row) or a firm is an account's identity, and
//     claiming it without a verified token returns null → 401.
//
// The lenient "no/invalid token → trust the caller's clientId" resolver was
// deleted on purpose: account ids are not unguessable the way random
// per-browser ids were, so that fallback was an open door wherever it was
// reachable. Do not reintroduce it.
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
async function resolveForUser(serviceClient: any, userId: string, requestedFirmId?: string): Promise<string | null> {
  const { data: memberFirms, error: memberError } = await serviceClient
    .from("firm_members")
    .select("firm_id, access_expires_at")
    .eq("user_id", userId);

  // Fail closed, same bar as isAccountOwnedId's ownership probes: an errored
  // membership lookup must never read as "no memberships" — that silently
  // collapses a shared firm identity back to each user's personal id and
  // fragments every teammate's audits, state, and reports with no error
  // anywhere (this actually happened when prod was missing the
  // access_expires_at column). Null → the caller 401s, visibly.
  if (memberError) {
    console.error("resolveForUser: firm membership lookup failed:", memberError);
    return null;
  }

  const isLive = (row: { access_expires_at?: string | null }) =>
    !row.access_expires_at || new Date(row.access_expires_at).getTime() > Date.now();
  const liveFirms = (memberFirms ?? []).filter(isLive);

  if (requestedFirmId && liveFirms.some((f: { firm_id?: string | null }) => f.firm_id === requestedFirmId)) {
    return requestedFirmId;
  }

  for (const { firm_id } of liveFirms) {
    const { count, error: countError } = await serviceClient
      .from("firm_members")
      .select("*", { count: "exact", head: true })
      .eq("firm_id", firm_id);
    // Same fail-closed rule: an errored count must not read as "single-member
    // firm" (which skips the shared identity and lands on the personal id).
    if (countError) {
      console.error("resolveForUser: firm member count failed:", countError);
      return null;
    }
    if ((count ?? 0) > 1) return firm_id;
  }

  return userId;
}

/**
 * Pull an end-user session JWT off the request headers, for callers whose
 * session never travels in the body `accessToken` field (the mobile app
 * sends it in a header on every call). Mirrors access.ts's userJwtFrom:
 * explicit x-user-token first, then an Authorization bearer — ignored when
 * it is the project anon key, which rides that header on every gateway call,
 * signed in or not.
 *
 * Read via globalThis so this module stays importable in the vitest
 * (non-Deno) test runtime.
 */
export function headerSessionToken(req: Request): string | undefined {
  const explicit = req.headers.get("x-user-token");
  if (explicit && explicit.trim()) return explicit.trim();

  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return undefined;
  const token = match[1].trim();
  if (!token) return undefined;

  // deno-lint-ignore no-explicit-any
  const anonKey = (globalThis as any).Deno?.env?.get?.("SUPABASE_ANON_KEY") as string | undefined;
  if (anonKey && token === anonKey) return undefined;
  return token;
}

// deno-lint-ignore no-explicit-any
async function verifiedUserId(serviceClient: any, accessToken: string): Promise<string | null> {
  const { data, error } = await serviceClient.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user.id;
}

/**
 * Ownership-SET resolver for endpoints that target a specific row by id
 * rather than "the caller's current identity": returns EVERY client_id the
 * verified user is authorized to act as — their own auth.uid() plus every
 * firm they hold a live (non-expired) membership in.
 *
 * Why a set: rows can legitimately be keyed to any of these ids. A solo
 * account's pre-existing audits stay user-keyed (the firm backfill only
 * runs on share), shared-firm audits are firm-keyed, and a consultant holds
 * memberships in several client firms at once. resolveVerifiedClientId must
 * pick ONE identity for writes that key new rows, but using it to MATCH an
 * existing row by id falsely rejects legitimately-owned rows whenever the
 * pick doesn't line up. The targeted row's own client_id disambiguates
 * which firm the user is acting for — the caller only proves membership.
 * Returns null unless the token verifies; callers must reject with 401.
 */
// deno-lint-ignore no-explicit-any
export async function resolveVerifiedClientIdSet(serviceClient: any, accessToken?: unknown): Promise<string[] | null> {
  if (!accessToken || typeof accessToken !== "string") return null;
  const userId = await verifiedUserId(serviceClient, accessToken);
  if (!userId) return null;

  const { data: memberFirms, error: memberError } = await serviceClient
    .from("firm_members")
    .select("firm_id, access_expires_at")
    .eq("user_id", userId);

  // Fail closed like resolveForUser: an errored lookup must never degrade to
  // a personal-id-only set, or teammates lose access to firm-keyed rows
  // silently.
  if (memberError) {
    console.error("resolveVerifiedClientIdSet: firm membership lookup failed:", memberError);
    return null;
  }

  const liveFirmIds = (memberFirms ?? [])
    .filter((row: { firm_id: string; access_expires_at?: string | null }) =>
      !row.access_expires_at || new Date(row.access_expires_at).getTime() > Date.now())
    .map((row: { firm_id: string }) => row.firm_id)
    .filter((firmId: string) => firmId && firmId !== userId);

  return [userId, ...liveFirmIds];
}

/**
 * Strict resolver for account-only endpoints (user-state-get/set first;
 * now every endpoint whose rows are keyed by a real account and that has
 * no legitimate token-less caller). Returns null unless the token verifies;
 * callers must reject with 401.
 */
// deno-lint-ignore no-explicit-any
export async function resolveVerifiedClientId(serviceClient: any, accessToken?: unknown, requestedFirmId?: string): Promise<string | null> {
  if (!accessToken || typeof accessToken !== "string") return null;
  const userId = await verifiedUserId(serviceClient, accessToken);
  if (!userId) return null;
  return resolveForUser(serviceClient, userId, requestedFirmId);
}

// Account ids are auth.uids / firm ids — always UUIDs. A non-UUID id cannot
// belong to an account (and probing uuid columns with one errors spuriously).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Does any real account own this id? The complete registry is auth.users —
 * firm_members/firms are only provisioning artifacts (accounts created before
 * firm provisioning have no membership row, so membership alone is NOT a
 * sufficient ownership check) — plus the firms table for shared firm
 * identities. Every probe fails closed: an errored lookup must never read as
 * "unclaimed", or a transient outage reopens the IDOR this exists to close.
 */
// deno-lint-ignore no-explicit-any
export async function isAccountOwnedId(serviceClient: any, id: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;

  const [membership, firm] = await Promise.all([
    serviceClient
      .from("firm_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id),
    serviceClient
      .from("firms")
      .select("*", { count: "exact", head: true })
      .eq("id", id),
  ]);
  if (membership.error || firm.error) {
    console.error("isAccountOwnedId: ownership probe failed:", membership.error ?? firm.error);
    return true;
  }
  if ((membership.count ?? 0) > 0 || (firm.count ?? 0) > 0) return true;

  const { data, error } = await serviceClient.auth.admin.getUserById(id);
  if (error) {
    // deno-lint-ignore no-explicit-any
    const status = (error as any).status ?? (error as any).code;
    if (status === 404 || status === "user_not_found") return false;
    console.error("isAccountOwnedId: auth.users lookup failed:", error);
    return true;
  }
  return !!data?.user;
}

/**
 * Guarded resolver for endpoints with legitimate token-less callers (legacy
 * benchmark/workshop HMAC token holders, anonymous browser-id flows). A
 * verified token always wins, exactly like the strict resolver. Without one,
 * the caller-asserted clientId is trusted only if no account owns it — an id
 * matching an auth user or a firm belongs to someone, so claiming it
 * token-less is the IDOR this guard closes (returns null → caller 401s).
 */
// deno-lint-ignore no-explicit-any
export async function resolveClientIdGuarded(serviceClient: any, clientId: string, accessToken?: unknown, requestedFirmId?: string): Promise<string | null> {
  if (accessToken && typeof accessToken === "string") {
    const userId = await verifiedUserId(serviceClient, accessToken);
    if (userId) return resolveForUser(serviceClient, userId, requestedFirmId);
  }

  if (await isAccountOwnedId(serviceClient, clientId)) return null;
  return clientId;
}
