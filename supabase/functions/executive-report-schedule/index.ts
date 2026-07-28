// §9 — Reports and exports: toggle monthly executive-report generation for
// a client, and list past snapshots. Mirrors visibility-audit-schedule's
// autoRerun toggle shape.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, action, enabled } = await req.json();
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
    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    if (action === "toggle") {
      const { data, error } = await serviceClient
        .from("executive_report_schedules")
        .upsert({ client_id: clientId, enabled: enabled === true, updated_at: new Date().toISOString() }, { onConflict: "client_id" })
        .select("*")
        .single();
      if (error || !data) {
        console.error("executive-report-schedule toggle error:", error);
        return new Response(JSON.stringify({ error: "Couldn't update the schedule" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ schedule: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action === "get" (default)
    const { data: schedule } = await serviceClient
      .from("executive_report_schedules")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();
    const { data: reports } = await serviceClient
      .from("executive_reports")
      .select("*")
      .eq("client_id", clientId)
      .order("generated_at", { ascending: false })
      .limit(12);

    return new Response(JSON.stringify({ schedule: schedule ?? null, reports: reports ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("executive-report-schedule error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
