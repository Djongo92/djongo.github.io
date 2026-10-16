// Lists a client's own campaigns (see campaigns migration) — scoped
// server-side by clientId, same pattern as client-wins-get.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken } = await req.json();
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

    // Strict identity: these rows only ever belong to a signed-in account,
    // so a missing/unverifiable token is a 401 — never a fallback to the
    // caller-asserted clientId (a one-request IDOR into any account's
    // rows). The header fallback covers callers whose session travels in
    // headers (mobile), not the body.
    const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
    const clientId = await resolveVerifiedClientId(serviceClient, identityToken);
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Sign in to use this feature." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data, error } = await serviceClient
      .from("campaigns")
      .select("id, market, audited_domain, name, status, started_at, ended_at, linked_runs, created_at, updated_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("campaigns-get error:", error);
      return new Response(JSON.stringify({ error: "Couldn't load campaigns" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ campaigns: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("campaigns-get error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
