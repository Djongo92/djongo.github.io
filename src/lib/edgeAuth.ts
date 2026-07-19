// Client helper for the access-token system. Tokens are issued by the
// `verify-access` edge function after password verification.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const TOKEN_KEYS = {
  guidebook: "guidebook_access_token",
  workshop: "workshop_access_token",
} as const;

const EXPIRY_KEYS = {
  guidebook: "guidebook_access_expires",
  workshop: "workshop_access_expires",
} as const;

export type Scope = keyof typeof TOKEN_KEYS;

export function getAccessToken(scope?: Scope): string | null {
  // If no scope given, prefer workshop (broader) then guidebook.
  const tryGet = (s: Scope) => {
    const tok = localStorage.getItem(TOKEN_KEYS[s]);
    const exp = parseInt(localStorage.getItem(EXPIRY_KEYS[s]) || "0", 10);
    if (tok && exp && exp > Date.now()) return tok;
    return null;
  };
  if (scope) return tryGet(scope);
  return tryGet("workshop") || tryGet("guidebook");
}

export function hasValidAccess(scope: Scope): boolean {
  return !!getAccessToken(scope);
}

export function clearAccess(scope: Scope) {
  localStorage.removeItem(TOKEN_KEYS[scope]);
  localStorage.removeItem(EXPIRY_KEYS[scope]);
}

/** Verifies a password against the server and stores the returned token. */
export async function verifyPassword(scope: Scope, password: string): Promise<boolean> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/verify-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ scope, password }),
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  if (!data?.token) return false;
  localStorage.setItem(TOKEN_KEYS[scope], data.token);
  localStorage.setItem(EXPIRY_KEYS[scope], String(Date.now() + (data.ttlMs ?? 12 * 60 * 60 * 1000)));
  return true;
}

/** Build standard headers for an authenticated edge-function call. */
export function edgeHeaders(scope?: Scope): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_KEY}`,
    apikey: SUPABASE_KEY,
  };
  const tok = getAccessToken(scope);
  if (tok) h["x-access-token"] = tok;
  return h;
}