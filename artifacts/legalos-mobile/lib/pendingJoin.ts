/**
 * Deep-link resume for firm-invite redemption.
 *
 * A partner can open /join/<token> before they're signed in. Redemption needs
 * a real session (the firm-invite edge function verifies identity server-side
 * with no anonymous fallback), so we can't redeem in place — we send them to
 * sign-in first. To resume the exact token after they authenticate we stash it
 * here; sign-in reads it on success and routes back to /join/<token>, which
 * then redeems against the fresh session.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_JOIN_KEY = 'pending_firm_invite_token';

/** Remember the token to resume after sign-in. Best-effort. */
export async function setPendingJoinToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_JOIN_KEY, token);
  } catch {
    // If the disk write fails the user can re-open the link; never crash auth.
  }
}

/** Read (and consume) a pending join token, if any. */
export async function takePendingJoinToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(PENDING_JOIN_KEY);
    if (token) await AsyncStorage.removeItem(PENDING_JOIN_KEY);
    return token;
  } catch {
    return null;
  }
}
