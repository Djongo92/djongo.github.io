// Verifies a user-supplied password against the configured GUIDEBOOK_PASSWORD,
// WORKSHOP_PASSWORD, or BENCHMARK_PASSWORD secret and returns a short-lived
// HMAC access token. This is the ONLY edge function that should accept a raw
// password.

import { signToken, ACCESS_CORS_HEADERS, type Scope } from "../_shared/access.ts";

const corsHeaders = ACCESS_CORS_HEADERS;

// Constant-time string compare to avoid timing oracles.
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";
    const scope = body?.scope as Scope;

    if (scope !== "guidebook" && scope !== "workshop" && scope !== "benchmark") {
      return new Response(JSON.stringify({ error: "Invalid scope" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!password || password.length > 200) {
      return new Response(JSON.stringify({ error: "Password required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SCOPE_SECRET_NAME = { guidebook: "GUIDEBOOK_PASSWORD", workshop: "WORKSHOP_PASSWORD", benchmark: "BENCHMARK_PASSWORD" } as const;
    const expected = Deno.env.get(SCOPE_SECRET_NAME[scope]);
    if (!expected) {
      return new Response(JSON.stringify({ error: "Access not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!safeEqual(password, expected)) {
      // Small delay to discourage brute force on serverless.
      await new Promise((r) => setTimeout(r, 250));
      return new Response(JSON.stringify({ error: "Incorrect password" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await signToken(scope);
    // 12h TTL in ms — keep client and server in sync.
    return new Response(JSON.stringify({ token, scope, ttlMs: 12 * 60 * 60 * 1000 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-access error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});