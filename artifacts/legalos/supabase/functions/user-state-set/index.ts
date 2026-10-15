// Writes one key of a client's own server-backed app state (see
// 20260722030000 migration). Scoped by clientId server-side — same
// pattern as visibility-audit-publish.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId } from "../_shared/verifiedClientId.ts";
import { syncMarketToFirmProfile } from "../_shared/marketProfileSync.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, key, value, ifAbsent, requestedFirmId, activeFirmId } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!key || typeof key !== "string") {
      return new Response(JSON.stringify({ error: "key is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Strict identity — same reasoning as user-state-get: no token, no write,
    // no matter what clientId the caller asserts. The firm pin (activeFirmId
    // from the web, requestedFirmId echoed from mobile) targets the identity
    // a prior read resolved to; the resolver honors it only when it's one of
    // the caller's live member firms, so it can never widen access.
    const firmPin = typeof activeFirmId === "string" ? activeFirmId
      : typeof requestedFirmId === "string" ? requestedFirmId
      : undefined;
    const clientId = await resolveVerifiedClientId(serviceClient, accessToken, firmPin);
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Sign in to use this feature." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ifAbsent === true) {
      // Atomic create-if-absent (INSERT ... ON CONFLICT DO NOTHING). A caller
      // promoting a value it only *thinks* is missing — read-then-write
      // races, another device writing between its GET and this call — must
      // never overwrite what landed first. The response says who won and
      // hands back the authoritative stored value either way, so the caller
      // can show the truth and drop its local copy.
      const { data: createdRows, error: insertError } = await serviceClient
        .from("user_app_state")
        .upsert(
          { client_id: clientId, key, value: value ?? null, updated_at: new Date().toISOString() },
          { onConflict: "client_id,key", ignoreDuplicates: true },
        )
        .select("value");
      if (insertError) {
        console.error("user-state-set ifAbsent error:", insertError);
        return new Response(JSON.stringify({ error: "Couldn't save state" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (createdRows && createdRows.length > 0) {
        // Task #156 — same write-through as the unconditional save below:
        // the promoted local firm_context is now the stored truth.
        if (key === "firm_context" && value && typeof value === "object") {
          await syncMarketToFirmProfile(serviceClient, accessToken, (value as { market?: unknown }).market, firmPin);
        }
        return new Response(JSON.stringify({ ok: true, created: true, value: value ?? null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: existing } = await serviceClient
        .from("user_app_state")
        .select("value")
        .eq("client_id", clientId)
        .eq("key", key)
        .maybeSingle();
      return new Response(JSON.stringify({ ok: true, created: false, value: existing?.value ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await serviceClient
      .from("user_app_state")
      .upsert({ client_id: clientId, key, value: value ?? null, updated_at: new Date().toISOString() }, { onConflict: "client_id,key" });

    // Task #156 — a saved firm_context.market write-throughs into
    // firm_profiles.jurisdictions (picked market becomes the primary
    // jurisdiction) so the two fields converge instead of forking forever
    // behind task #147's prompt-time precedence. Best-effort: never fails
    // this save; skipped for callers without an editing firm membership.
    if (!error && key === "firm_context" && value && typeof value === "object") {
      await syncMarketToFirmProfile(serviceClient, accessToken, (value as { market?: unknown }).market, firmPin);
    }

    if (error) {
      console.error("user-state-set error:", error);
      return new Response(JSON.stringify({ error: "Couldn't save state" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("user-state-set error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
