// Generic push/pull for one localStorage-backed hook's value against
// user_app_state (see supabase/functions/user-state-get|set), for a real
// account only — anonymous/demo use never calls this (getCurrentUser()
// returns no userId, both are no-ops). Same client_id/verifiedClientId
// ownership pattern as everything else — see useReadingProgress.ts, the
// first hook migrated this way, for the full read/write rationale.
import { getCurrentUser } from "./currentUser";
import { edgeHeaders } from "./edgeAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function pushServerState(key: string, value: unknown) {
  const { userId, accessToken } = getCurrentUser();
  if (!userId) return;
  fetch(`${SUPABASE_URL}/functions/v1/user-state-set`, {
    method: "POST",
    headers: edgeHeaders(),
    body: JSON.stringify({ clientId: userId, accessToken, key, value }),
  }).catch(() => {
    // Best-effort — local storage already has it.
  });
}

export async function pullServerState<T>(key: string): Promise<T | undefined> {
  const { userId, accessToken } = getCurrentUser();
  if (!userId) return undefined;
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/user-state-get`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ clientId: userId, accessToken, keys: [key] }),
    });
    const data = await resp.json();
    return data?.state?.[key] as T | undefined;
  } catch {
    return undefined;
  }
}
