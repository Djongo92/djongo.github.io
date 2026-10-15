/**
 * Firm-invite redemption — the mobile side of the web's JoinFirm.tsx.
 *
 * A shareable-link invite (no email/SMTP in this project): whoever holds the
 * token and is signed in joins that firm. Identity is verified server-side
 * from the caller's real Supabase access token, so redemption REQUIRES an
 * authenticated session — there's no anonymous fallback (see the firm-invite
 * edge function). The web contract (JoinFirm.tsx) is:
 *   POST ${SUPABASE_URL}/functions/v1/firm-invite
 *   body { accessToken: session.access_token, action: "redeem", token }
 *   success → { firmName }   error → { error }
 *
 * The session JWT rides in the body as `accessToken` AND in the edge headers'
 * own `x-user-token` (edgeHeaders) — Authorization always carries the anon
 * key, so a real session must travel separately or the call reads as
 * anonymous and 401s (project memory).
 */
import { SUPABASE_URL, edgeHeaders } from './supabase';

export type RedeemResult =
  | { ok: true; firmName: string }
  | { ok: false; error: string };

/**
 * Redeem a firm invite token as the signed-in user identified by
 * `accessToken`. The caller is responsible for having a live session; pass
 * its `access_token` here.
 */
export async function redeemFirmInvite(
  accessToken: string,
  token: string,
): Promise<RedeemResult> {
  if (!SUPABASE_URL) {
    return { ok: false, error: "Invites require the full platform. Sign in at the web app to activate." };
  }
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/firm-invite`, {
      method: 'POST',
      headers: edgeHeaders(accessToken),
      body: JSON.stringify({ accessToken, action: 'redeem', token }),
    });
    const text = await resp.text().catch(() => '');
    let data: { firmName?: string; error?: string } | undefined;
    try {
      data = text ? (JSON.parse(text) as { firmName?: string; error?: string }) : undefined;
    } catch {
      data = undefined;
    }
    if (!resp.ok) {
      return { ok: false, error: data?.error || "Couldn't join that firm." };
    }
    // Mirror the web's fallback label so an empty firmName still reads cleanly.
    return { ok: true, firmName: data?.firmName ?? 'the firm' };
  } catch {
    return { ok: false, error: "Couldn't reach the invite service." };
  }
}
