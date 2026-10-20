// HMAC-signed access tokens issued by verify-access and validated by every
// AI-spending edge function. Replaces the prior client-side password gates.
//
// Token format:  base64url(`${scope}.${exp}`) + "." + base64url(HMAC-SHA256)
// scope is "guidebook", "workshop", or "benchmark"; tokens are valid for 12 hours.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { clientIpFrom, consumeDemoAiQuota } from "./rateLimit.ts";
import { hasEntitlement, type EntitlementFirm } from "./entitlements.ts";

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

// ---------------------------------------------------------------------------
// Access model. Replaces the old blanket BYPASS_ACCESS_CONTROL escape hatch,
// which left every AI-spending endpoint callable by anyone who read the anon
// key out of the JS bundle.
//
// Three tiers, checked in order — first one to grant access wins:
//
//   1. Legacy HMAC password token (`x-access-token`), the original
//      guidebook/workshop/benchmark scopes. Still honored so tokens already
//      sitting in someone's localStorage keep working.
//   2. A real Supabase session. Signed-in users are the paying product and
//      get unmetered access.
//   3. Anonymous callers — the public demo at /app/demo, plus anyone poking
//      the endpoint directly. Allowed only for an explicit allowlist of
//      functions, and metered. Anything not on a list gets 401: an anonymous
//      caller has no business reading account state or driving admin routes,
//      and "metered but reachable" is not an acceptable posture for those.
// ---------------------------------------------------------------------------

/** Unauthenticated calls allowed per IP per window. Signed-in users are exempt. */
const ANON_AI_LIMIT = 8;
const ANON_AI_WINDOW_MS = 60 * 60 * 1000; // 1h

/**
 * Absolute ceiling on anonymous calls across every caller in the same window.
 *
 * The per-IP bucket keys off proxy headers, which someone calling the function
 * endpoint directly can vary per request to mint unlimited fresh buckets. This
 * bounds total anonymous spend regardless of how many identities they forge.
 * Real demo traffic sits far below it; signed-in users never touch it.
 */
const ANON_GLOBAL_LIMIT = 200;
const ANON_GLOBAL_WINDOW_MS = 60 * 60 * 1000; // 1h

/**
 * Functions the public demo is allowed to call without an account. Every one
 * of these spends real Anthropic credits (plus create-share, which writes a
 * share row for the demo's "Share score card" button), so they are metered.
 */
const DEMO_METERED_FUNCTIONS = new Set([
  "ask-the-book",
  "chapter-chat",
  "competitor-analysis",
  "create-share",
  "firm-maturity-plan",
  "generate-quiz",
  "generate-roadmap",
  "global-advisor",
  "personalize-actions",
  "roast-homepage",
  "score-website",
  "steal-homepage",
  "visibility-audit-narrative",
  "workshop-article",
  "workshop-autopsy",
  "workshop-bio-rewrite",
  "workshop-calendar",
  "workshop-case-study",
  "workshop-competitor-teardown",
  "workshop-copywriter",
  "workshop-deck-roast",
  "workshop-headlines",
  "workshop-linkedin",
  "workshop-page-draft",
  "workshop-pitch-deck",
  "workshop-practice-audit",
  "workshop-press-pitch",
  "workshop-rewrite",
  "workshop-slide-visual",
  "workshop-submission",
]);

// There is deliberately no blanket "public function" exemption list here.
// A function that is public for one action and privileged for another —
// workflow-partner-link, where anyone holding a review link may view/comment/
// approve but only a firm member may mint a new link — cannot be classified
// from the URL alone, because the action lives in the request body and this
// middleware must never read it. Those functions parse their body first and
// call requireAccess only on the privileged branch.

/** Trailing path segment of a /functions/v1/<name> request URL. */
function functionNameFrom(req: Request): string {
  try {
    const segments = new URL(req.url).pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? "";
  } catch {
    return "";
  }
}

// deno-lint-ignore no-explicit-any
let serviceClientSingleton: SupabaseClient<any, any, any> | null = null;

// deno-lint-ignore no-explicit-any
function getServiceClient(): SupabaseClient<any, any, any> | null {
  if (serviceClientSingleton) return serviceClientSingleton;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  serviceClientSingleton = createClient(url, key, { auth: { persistSession: false } });
  return serviceClientSingleton;
}

/**
 * Pull an end-user Supabase JWT off the request, if one is present.
 *
 * Prefers an explicit `x-user-token` header. requireAccess must never touch
 * the request body — handlers downstream still call `req.json()`, and a
 * Request body can only be read once — so the session cannot travel in the
 * payload the way mobile passes `accessToken` for identity resolution.
 *
 * Falls back to `Authorization: Bearer`, but ignores the value when it is the
 * project anon key: that header is how every Supabase function call
 * authenticates with the gateway, so it is present even for logged-out
 * callers and would otherwise read as "signed in".
 */
function userJwtFrom(req: Request): string | null {
  const explicit = req.headers.get("x-user-token");
  if (explicit && explicit.trim()) return explicit.trim();

  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  if (!token || token === Deno.env.get("SUPABASE_ANON_KEY")) return null;
  return token;
}

async function sessionUserId(jwt: string): Promise<string | null> {
  const serviceClient = getServiceClient();
  if (!serviceClient) return null;
  try {
    const { data, error } = await serviceClient.auth.getUser(jwt);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * The firm (and therefore plan) a signed-in user's call is acting as, for
 * entitlement purposes only. Deliberately simpler than
 * verifiedClientId.ts's resolveClientId — that function picks *which* of a
 * consultant's several firms an audit call is scoped to; this just needs
 * *a* plan to hand to hasEntitlement, so the first membership row is fine.
 * Returns null (not a default plan) when no firm can be resolved, so
 * hasEntitlement decides how to treat "unknown" rather than this function
 * quietly guessing.
 */
async function firmForUser(userId: string): Promise<EntitlementFirm | null> {
  const serviceClient = getServiceClient();
  if (!serviceClient) return null;
  try {
    const { data } = await serviceClient
      .from("firm_members")
      .select("firms ( plan )")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const firm = (data as { firms?: EntitlementFirm | EntitlementFirm[] | null } | null)?.firms;
    return (Array.isArray(firm) ? firm[0] : firm) ?? null;
  } catch {
    return null;
  }
}

const jsonResponse = (body: unknown, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Edge-function middleware. Returns null if access is granted, or a Response
 * to send back to the caller if not.
 *
 * `required` narrows the legacy token scope ("workshop" accepts only
 * workshop-scoped tokens). It does not restrict signed-in users, who always
 * pass, nor anonymous demo callers, who pass while under quota.
 */
export async function requireAccess(
  req: Request,
  corsHeaders: Record<string, string>,
  required: Scope | "any" = "any",
): Promise<Response | null> {
  // 1. Legacy HMAC password token.
  const claims = await verifyToken(req.headers.get("x-access-token"));
  if (claims && (required === "any" || claims.scope === required)) return null;

  // 2. Real signed-in Supabase session — unmetered, gated only by
  //    hasEntitlement (see _shared/entitlements.ts), which grants everything
  //    today. Resolving a firm/plan here — rather than only checking "is
  //    this a real session" — is the seam: the day hasEntitlement can
  //    actually say no, this call site already has what it needs to ask.
  const jwt = userJwtFrom(req);
  if (jwt) {
    const userId = await sessionUserId(jwt);
    if (userId) {
      const firm = await firmForUser(userId);
      if (hasEntitlement(firm, required)) return null;
    }
  }

  // 3. Anonymous — allowlisted functions only.
  const fnName = functionNameFrom(req);

  if (!DEMO_METERED_FUNCTIONS.has(fnName)) {
    return jsonResponse(
      { error: "unauthorized", message: "Sign in to use this feature." },
      401,
      corsHeaders,
    );
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    // Cannot meter without the service role key, and failing open here would
    // reopen the exact unlimited-spend hole this function exists to close.
    console.error("requireAccess: service client unavailable, refusing anonymous call");
    return jsonResponse(
      { error: "service_unavailable", message: "Access control is misconfigured on the server." },
      503,
      corsHeaders,
    );
  }

  const quotaExceeded = jsonResponse(
    {
      error: "demo_quota_exceeded",
      message:
        "You have used all the free demo runs available this hour. Create a free account to keep going.",
    },
    429,
    corsHeaders,
  );

  // Per-IP allowance and the market-wide ceiling are reserved in one atomic
  // step, so a caller refused by the ceiling does not burn their own quota on
  // a request that never ran.
  const quota = await consumeDemoAiQuota(serviceClient, clientIpFrom(req), {
    limit: ANON_AI_LIMIT,
    windowMs: ANON_AI_WINDOW_MS,
    globalLimit: ANON_GLOBAL_LIMIT,
    globalWindowMs: ANON_GLOBAL_WINDOW_MS,
  });

  if (!quota.allowed) {
    if (quota.blockedBy === "global") {
      console.warn("requireAccess: global anonymous ceiling reached, refusing demo call");
    }
    return quotaExceeded;
  }

  console.log(
    `requireAccess: anonymous ${fnName} allowed, ${quota.remaining} left for this IP this hour`,
  );
  return null;
}

/** Standard CORS allow-list (add x-access-token to allowed headers). */
export const ACCESS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-access-token, x-user-token, x-supabase-client-platform, x-supabase-client-platform-version",
  "Access-Control-Max-Age": "86400",
};