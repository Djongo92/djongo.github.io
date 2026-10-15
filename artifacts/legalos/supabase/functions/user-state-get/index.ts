// Reads a client's own server-backed app state (see 20260722030000
// migration). Scoped by clientId server-side — same pattern as
// visibility-audit-get. Returns all keys for the client if `keys` is
// omitted, or just the requested ones.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, keys, activeFirmId, requestedFirmId } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Strict identity: this state only ever belongs to a signed-in account,
    // so there is no legitimate token-less caller — anything else 401s
    // instead of falling back to trusting the caller-supplied clientId.
    // Firm pin (§11): the web sends activeFirmId (its workspace-switcher
    // convention), mobile echoes a prior resolvedClientId as requestedFirmId
    // — either is honored only against live membership, so it can pin but
    // never widen access.
    const firmPin = typeof activeFirmId === "string" ? activeFirmId
      : typeof requestedFirmId === "string" ? requestedFirmId
      : undefined;
    const clientId = await resolveVerifiedClientId(serviceClient, accessToken, firmPin);
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Sign in to use this feature." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let query = serviceClient.from("user_app_state").select("key, value").eq("client_id", clientId);
    if (Array.isArray(keys) && keys.length > 0) query = query.in("key", keys);

    const { data, error } = await query;
    if (error) {
      console.error("user-state-get error:", error);
      return new Response(JSON.stringify({ error: "Couldn't load state" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state: Record<string, unknown> = {};
    for (const row of data ?? []) state[row.key] = row.value;

    // resolvedClientId lets callers pin follow-up writes (user-state-set's
    // requestedFirmId) to the exact identity this read resolved to — without
    // it, separate resolver calls can pick different firms for a consultant
    // with several client firms.
    return new Response(JSON.stringify({ state, resolvedClientId: clientId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("user-state-get error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
