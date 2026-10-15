// Logs a self-reported new-client win with a rough source tag — see the
// client_wins migration for why this exists instead of a CRM. Scoped by
// clientId server-side, same pattern as user-state-set/workshop-style-feedback.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const VALID_SOURCES = ["organic_search", "directory", "referral", "social", "other"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, market, auditedDomain, source } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!market || typeof market !== "string" || !auditedDomain || typeof auditedDomain !== "string") {
      return new Response(JSON.stringify({ error: "market and auditedDomain are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_SOURCES.includes(source)) {
      return new Response(JSON.stringify({ error: "Unsupported source" }), {
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
    const { error } = await serviceClient.from("client_wins").insert({ client_id: clientId, market, audited_domain: auditedDomain, source });

    if (error) {
      console.error("client-win-log error:", error);
      return new Response(JSON.stringify({ error: "Couldn't log this win" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("client-win-log error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
