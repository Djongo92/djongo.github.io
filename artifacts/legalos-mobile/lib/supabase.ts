import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Uvid] Supabase env vars missing — running in demo-only mode.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Standard headers for any edge-function call.
 *
 * Pass the current session JWT to authenticate as a real user. Authorization
 * always carries the anon key — that's how the Supabase gateway accepts the
 * call at all — so a real session has to travel in its own header. Server-side
 * requireAccess reads it to exempt signed-in users from the anonymous per-IP
 * AI quota that guards the public demo.
 */
export function edgeHeaders(accessToken?: string | null): HeadersInit {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
  };
  if (accessToken) h['x-user-token'] = accessToken;
  return h;
}

/** POST to a Supabase edge function. Returns parsed JSON or throws. */
export async function callFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: edgeHeaders(data.session?.access_token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Read as text first — a malformed/non-JSON body (e.g. a proxy error
    // page) is a different failure than a legitimate empty body, and both
    // used to collapse into the same generic `{}`/`HTTP <status>` message.
    const text = await res.text().catch(() => '');
    let parsed: { error?: string } | undefined;
    try {
      parsed = text ? JSON.parse(text) as { error?: string } : undefined;
    } catch {
      parsed = undefined;
    }
    if (parsed?.error) throw new Error(parsed.error);
    throw new Error(text ? `HTTP ${res.status}: ${text.slice(0, 200)}` : `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
