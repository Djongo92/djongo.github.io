// Lets a client see their own unpublished audits without a public-read RLS
// policy to scope one to (no real session/JWT — verify_jwt = false
// throughout). service_role, scoped by clientId server-side — same pattern
// already used for url_cache and shared_artifacts writes.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { computePercentile } from "../_shared/runVisibilityAudit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
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

    // A real access token — never a client-asserted clientId — decides
    // identity when one is present (see _shared/verifiedClientId.ts).
    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    const { data, error } = await serviceClient
      .from("market_visibility_audits")
      .select("*")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("visibility-audit-get error:", error);
      return new Response(JSON.stringify({ error: "Couldn't load audits" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // History for the dashboard's trend line — every snapshot ever recorded
    // for this client, newest first. The frontend groups by domain+market.
    const { data: history, error: historyError } = await serviceClient
      .from("market_visibility_audit_history")
      .select("audited_domain, market, peer_group, total_score, performance_score, social_score, seo_authority_score, thought_leadership_score, reputation_score, recorded_at")
      .eq("client_id", clientId)
      .order("recorded_at", { ascending: true });

    if (historyError) console.error("visibility-audit-get history error:", historyError);

    // Peer position for the dashboard's "where you stand" visual — computed
    // fresh rather than stored, since the peer group's own scores can move
    // between visits even when this firm's own audit hasn't changed.
    const audits = await Promise.all((data ?? []).map(async (row) => {
      const result = await computePercentile(serviceClient, row.market, row.peer_group, row.total_score);
      return { ...row, percentile: result?.percentile ?? null, peer_count: result?.peerCount ?? 0 };
    }));

    return new Response(JSON.stringify({ audits, history: history ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-get error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
