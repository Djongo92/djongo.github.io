// Redeem half of the firm-invite flow, extracted from index.ts so the
// single-use race guard is unit-testable without a live Supabase project
// (redeem.test.ts, run by the Deno test gate). The client is a structural
// type — the real handler passes the service-role supabase-js client, the
// test passes a fake that emulates PostgREST's atomic conditional UPDATE.
//
// THE INVARIANT: a single-use invite must be claimed with the conditional
// atomic UPDATE (used_at IS NULL + unexpired) BEFORE membership is granted.
// The read above it exists only for precise error messages — it is NOT the
// authority. Reverting to read-then-write reintroduces the double-join race
// that redeem.test.ts "concurrent redeems" guards against.

export interface RedeemResult {
  status: number;
  body: Record<string, unknown>;
}

// Minimal structural view of the supabase-js query builder this flow uses.
// Loose on purpose: the real client satisfies it, and the test fake only
// has to model the chains below.
// deno-lint-ignore no-explicit-any
export type RedeemClient = { from: (table: string) => any };

export async function redeemInvite(
  client: RedeemClient,
  token: unknown,
  userId: string,
): Promise<RedeemResult> {
  if (!token || typeof token !== "string") {
    return { status: 400, body: { error: "token is required" } };
  }

  const { data: invite, error: inviteError } = await client
    .from("firm_invites")
    .select("token, firm_id, role, expires_at, used_at, used_by, firms(name)")
    .eq("token", token)
    .maybeSingle();

  if (inviteError) {
    console.error("firm-invite redeem lookup error:", inviteError);
    return { status: 500, body: { error: "Couldn't look up that invite" } };
  }
  if (!invite) {
    return { status: 404, body: { error: "Invite not found" } };
  }
  if (invite.used_at) {
    // Idempotent retry: the SAME user re-redeeming their own invite
    // (screen remount, double-tap, retry after a network drop) gets the
    // success payload again rather than an error wall — their membership
    // already exists. Anyone else holding the token still gets rejected.
    if ((invite as { used_by: string | null }).used_by === userId) {
      const firmName = (invite as { firms: { name: string } | null }).firms?.name ?? "the firm";
      return { status: 200, body: { firmId: invite.firm_id, firmName, alreadyMember: true } };
    }
    return { status: 400, body: { error: "This invite has already been used" } };
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { status: 400, body: { error: "This invite has expired" } };
  }

  // Claim the invite ATOMICALLY before creating membership: the read above
  // exists only for precise error messages — this conditional UPDATE is the
  // authority. Only one concurrent request can flip used_at from NULL, so
  // two simultaneous redeems can no longer both join the firm.
  const { data: claimed, error: claimError } = await client
    .from("firm_invites")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("token")
    .maybeSingle();

  if (claimError) {
    console.error("firm-invite claim error:", claimError);
    return { status: 500, body: { error: "Couldn't redeem that invite" } };
  }
  if (!claimed) {
    // Lost the race to a concurrent redeem (or it expired between the read
    // and the claim).
    return { status: 400, body: { error: "This invite has already been used" } };
  }

  const { error: memberInsertError } = await client
    .from("firm_members")
    .upsert({ firm_id: invite.firm_id, user_id: userId, role: invite.role ?? "marketing" }, { onConflict: "firm_id,user_id" });
  if (memberInsertError) {
    // Best-effort rollback so a transient membership failure doesn't burn a
    // single-use invite — the user can simply retry.
    console.error("firm-invite redeem insert error:", memberInsertError);
    await client
      .from("firm_invites")
      .update({ used_by: null, used_at: null })
      .eq("token", token)
      .eq("used_by", userId);
    return { status: 500, body: { error: "Couldn't join the firm" } };
  }

  const firmName = (invite as { firms: { name: string } | null }).firms?.name ?? "the firm";
  return { status: 200, body: { firmId: invite.firm_id, firmName } };
}
