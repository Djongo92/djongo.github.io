// Internal operator tooling, not linked from any nav — reachable only by
// whoever knows the /ops/directory-queue URL. Lets the operator see which
// firm lookups (visibility-audit-reputation's fuzzy match) and directory
// removal requests are still pending, so market_directory_data actually
// gets maintained instead of silently accumulating misses. Gated behind
// the same benchmark scope as the rest of the private app — currently a
// no-op while BYPASS_ACCESS_CONTROL is set in _shared/access.ts, but wired
// correctly for when that's turned back on.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { action, id } = await req.json().catch(() => ({ action: "list" }));

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    if (action === "dismiss_lookup" && id) {
      const { error } = await serviceClient.from("directory_lookup_requests").delete().eq("id", id);
      if (error) return new Response(JSON.stringify({ error: "Couldn't dismiss" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "dismiss_removal" && id) {
      const { error } = await serviceClient.from("directory_removal_requests").delete().eq("id", id);
      if (error) return new Response(JSON.stringify({ error: "Couldn't dismiss" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [lookups, removals] = await Promise.all([
      serviceClient.from("directory_lookup_requests").select("id, market, firm_domain_or_name, requested_at").order("requested_at", { ascending: false }).limit(200),
      serviceClient.from("directory_removal_requests").select("id, market, firm_name, note, requested_at").order("requested_at", { ascending: false }).limit(200),
    ]);

    return new Response(JSON.stringify({
      lookupRequests: lookups.data ?? [],
      removalRequests: removals.data ?? [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ops-directory-queue error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
