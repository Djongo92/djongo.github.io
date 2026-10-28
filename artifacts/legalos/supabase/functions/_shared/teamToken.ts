// Short-lived signed token for the team-only pages. Deliberately separate
// from the guidebook/workshop/benchmark access tokens in access.ts: a
// different key (domain-separated from ACCESS_TOKEN_SECRET) and a different
// payload prefix, so no customer or demo token can ever be accepted here and
// a team token is meaningless to every other endpoint. No Deno globals: the
// secret is passed in, so the vitest suite can exercise this directly.
const enc = new TextEncoder();
const PREFIX = "team-gtm";
export const TEAM_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uDecode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const key = (secret: string) =>
  crypto.subtle.importKey("raw", enc.encode(`${secret}:${PREFIX}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export async function signTeamToken(secret: string, now = Date.now()): Promise<string> {
  const payload = `${PREFIX}.${now + TEAM_TOKEN_TTL_MS}`;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(payload)));
  return `${b64u(enc.encode(payload))}.${b64u(sig)}`;
}

export async function verifyTeamToken(secret: string, token: unknown, now = Date.now()): Promise<boolean> {
  if (typeof token !== "string" || token.length > 400) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const payload = new TextDecoder().decode(b64uDecode(parts[0]));
    const [prefix, expStr] = payload.split(".");
    if (prefix !== PREFIX) return false;
    const exp = parseInt(expStr, 10);
    if (!Number.isFinite(exp) || exp < now) return false;
    return await crypto.subtle.verify("HMAC", await key(secret), b64uDecode(parts[1]), enc.encode(payload));
  } catch {
    return false;
  }
}

/** Constant-time string comparison via HMAC of both sides under a throwaway key. */
export async function safePasswordEqual(a: string, b: string): Promise<boolean> {
  const k = await crypto.subtle.importKey("raw", enc.encode(`cmp:${PREFIX}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [x, y] = await Promise.all([crypto.subtle.sign("HMAC", k, enc.encode(a)), crypto.subtle.sign("HMAC", k, enc.encode(b))]);
  const xa = new Uint8Array(x), ya = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ ya[i];
  return diff === 0;
}
