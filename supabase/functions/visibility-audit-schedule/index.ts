// Sets auto_rerun/rerun_frequency_days on a client's own audit row — the
// opt-in for visibility-audit-rerun-due's scheduled re-run. Mirrors
// visibility-audit-publish's posture exactly: service_role write,
// ownership checked server-side by clientId, never trusted from the
// request.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const VALID_FREQUENCIES = new Set([7, 14, 30, 90]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, auditId, autoRerun, rerunFrequencyDays } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!auditId || typeof auditId !== "string") {
      return new Response(JSON.stringify({ error: "auditId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (autoRerun === true && !VALID_FREQUENCIES.has(rerunFrequencyDays)) {
      return new Response(JSON.stringify({ error: "rerunFrequencyDays must be one of 7, 14, 30, 90" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    const { data, error } = await serviceClient
      .from("market_visibility_audits")
      .update({
        auto_rerun: autoRerun === true,
        rerun_frequency_days: autoRerun === true ? rerunFrequencyDays : null,
      })
      .eq("id", auditId)
      .eq("client_id", clientId) // ownership check — never trust a bare id from the client
      .select("id, auto_rerun, rerun_frequency_days")
      .maybeSingle();

    if (error) {
      console.error("visibility-audit-schedule update error:", error);
      return new Response(JSON.stringify({ error: "Couldn't update the schedule" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data) {
      return new Response(JSON.stringify({ error: "Audit not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-schedule error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
