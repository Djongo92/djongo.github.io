// HTTP entrypoint for the full five-category Market Visibility Score — see
// _shared/runVisibilityAudit.ts for the actual orchestration, shared with
// visibility-audit-rerun-due's scheduled path.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { runVisibilityAudit, VALID_PEER_GROUPS } from "../_shared/runVisibilityAudit.ts";
import { DMV_MARKETS } from "../_shared/marketVisibilityConfig.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, auditedDomain, displayName, market, peerGroup, gbpListed, social } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!auditedDomain || typeof auditedDomain !== "string") {
      return new Response(JSON.stringify({ error: "auditedDomain is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!market || typeof market !== "string" || !DMV_MARKETS[market]) {
      return new Response(JSON.stringify({ error: "Unsupported market" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!peerGroup || typeof peerGroup !== "string" || !VALID_PEER_GROUPS.has(peerGroup)) {
      return new Response(JSON.stringify({ error: "Invalid peerGroup" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // A real access token — never a client-asserted clientId — decides
    // identity when one is present (see _shared/verifiedClientId.ts).
    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    const result = await runVisibilityAudit(serviceClient, { clientId, auditedDomain, displayName, market, peerGroup, gbpListed, social });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-run error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
