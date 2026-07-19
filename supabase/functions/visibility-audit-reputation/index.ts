import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { computeReputationScore } from "../_shared/reputationScore.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { market, domainOrName, gbpListed } = await req.json();
    if (!market || typeof market !== "string") {
      return new Response(JSON.stringify({ error: "market is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!domainOrName || typeof domainOrName !== "string") {
      return new Response(JSON.stringify({ error: "domainOrName is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const result = await computeReputationScore(serviceClient, market, domainOrName, gbpListed === true);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-reputation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
