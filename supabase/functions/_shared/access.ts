// HMAC-signed access tokens issued by verify-access and validated by every
// AI-spending edge function. Replaces the prior client-side password gates.
//
// Token format:  base64url(`${scope}.${exp}`) + "." + base64url(HMAC-SHA256)
// scope is "guidebook", "workshop", or "benchmark"; tokens are valid for 12 hours.

const enc = new TextEncoder();
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

const b64u = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const b64uDecode = (s: string): Uint8Array => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const importKey = async (secret: string) =>
  await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

export type Scope = "guidebook" | "workshop" | "benchmark";

export async function signToken(scope: Scope): Promise<string> {
  const secret = Deno.env.get("ACCESS_TOKEN_SECRET");
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET not configured");
  const exp = Date.now() + TTL_MS;
  const payload = `${scope}.${exp}`;
  const key = await importKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return `${b64u(enc.encode(payload))}.${b64u(sig)}`;
}

export async function verifyToken(token: string | null | undefined): Promise<{ scope: Scope; exp: number } | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const secret = Deno.env.get("ACCESS_TOKEN_SECRET");
  if (!secret) return null;

  let payloadStr: string;
  try {
    payloadStr = new TextDecoder().decode(b64uDecode(parts[0]));
  } catch {
    return null;
  }
  const [scope, expStr] = payloadStr.split(".");
  if (scope !== "guidebook" && scope !== "workshop" && scope !== "benchmark") return null;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;

  let sig: Uint8Array;
  try {
    sig = b64uDecode(parts[1]);
  } catch {
    return null;
  }
  const key = await importKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, sig, enc.encode(payloadStr));
  if (!ok) return null;
  return { scope: scope as Scope, exp };
}

// TEMPORARY: password gating disabled at the user's request while the app
// is private/pre-launch. Set back to false to re-enable — nothing else
// needs to change, requireAccess falls straight back to normal HMAC checks.
const BYPASS_ACCESS_CONTROL = true;

/**
 * Edge-function middleware. Returns null if access is granted, or a Response
 * to send back to the caller if not. Reads the token from `x-access-token`.
 * If `required` is "workshop", only workshop-scoped tokens are accepted.
 * Defaults to accepting either scope (any authenticated reader).
 */
export async function requireAccess(
  req: Request,
  corsHeaders: Record<string, string>,
  required: Scope | "any" = "any",
): Promise<Response | null> {
  if (BYPASS_ACCESS_CONTROL) return null;
  const token = req.headers.get("x-access-token");
  const claims = await verifyToken(token);
  const ok = claims && (required === "any" || claims.scope === required);
  if (!ok) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. Please re-enter the access password." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return null;
}

/** Standard CORS allow-list (add x-access-token to allowed headers). */
export const ACCESS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-access-token, x-supabase-client-platform, x-supabase-client-platform-version",
  "Access-Control-Max-Age": "86400",
};