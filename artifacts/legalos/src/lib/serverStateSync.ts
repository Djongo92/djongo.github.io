// Generic push/pull for one localStorage-backed hook's value against
// user_app_state (see supabase/functions/user-state-get|set), for a real
// account only — anonymous/demo use never calls this (getCurrentUser()
// returns no userId, both are no-ops). Same client_id/verifiedClientId
// ownership pattern as everything else — see useReadingProgress.ts, the
// first hook migrated this way, for the full read/write rationale.
import { getCurrentUser } from "./currentUser";
import { edgeHeaders } from "./edgeAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// §11 firm pinning: every user-state read and write must target the same
// firm — the server resolves identity per call, so an unpinned read and a
// later unpinned write can land in different firms for a consultant with
// several client firms (caught in review). The pin is the explicitly chosen
// workspace when one is set (the same localStorage key useActiveWorkspace
// reads), else the resolvedClientId echoed from the last pull. The server
// validates the pin against live membership, so a stale or foreign pin can
// never widen access — it only falls back to auto-detection.
const WORKSPACE_KEY = "legalos_active_workspace";
let lastResolvedClientId: string | null = null;

/** Records the identity a user-state-get resolved to, so later writes pin
 *  to the same firm. Exported for hooks that call user-state-get directly
 *  (useBattlePlanCache's batched fetch). Pass null to reset. */
export function noteResolvedClientId(id: string | null) {
  lastResolvedClientId = id;
}

const readActiveFirmId = (): string | null => {
  try {
    return localStorage.getItem(WORKSPACE_KEY);
  } catch {
    return null;
  }
};

const firmPin = () => readActiveFirmId() ?? lastResolvedClientId ?? undefined;

export function pushServerState(key: string, value: unknown) {
  const { userId, accessToken } = getCurrentUser();
  if (!userId) return;
  fetch(`${SUPABASE_URL}/functions/v1/user-state-set`, {
    method: "POST",
    headers: edgeHeaders(),
    body: JSON.stringify({ clientId: userId, accessToken, key, value, activeFirmId: firmPin() }),
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
      body: JSON.stringify({
        clientId: userId,
        accessToken,
        keys: [key],
        activeFirmId: readActiveFirmId() ?? undefined,
      }),
    });
    const data = await resp.json();
    if (typeof data?.resolvedClientId === "string") noteResolvedClientId(data.resolvedClientId);
    return data?.state?.[key] as T | undefined;
  } catch {
    return undefined;
  }
}
