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
    const { clientId: rawClientId, accessToken, activeFirmId } = await req.json();
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
    // §11 — activeFirmId lets a consultant belonging to several client
    // firms pick which workspace's data this call should return.
    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken, typeof activeFirmId === "string" ? activeFirmId : undefined);

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

    // §6 — evidence log: every accepted correction for this client's own
    // audits, so the UI can show "corrected" badges and a per-metric
    // history without a direct RLS read (this table has none — service
    // role only, same posture as the audits themselves).
    const auditIds = audits.map((a) => a.id);
    let corrections: unknown[] = [];
    if (auditIds.length > 0) {
      const { data: correctionRows, error: correctionsError } = await serviceClient
        .from("market_visibility_metric_corrections")
        .select("id, audit_id, category, metric_path, previous_value, corrected_value, reason, corrected_by_label, previous_total_score, new_total_score, created_at")
        .in("audit_id", auditIds)
        .order("created_at", { ascending: false });
      if (correctionsError) console.error("visibility-audit-get corrections error:", correctionsError);
      corrections = correctionRows ?? [];
    }

    // §11 — saved before/after snapshots for this client, newest first.
    const { data: snapshots, error: snapshotsError } = await serviceClient
      .from("audit_snapshots")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (snapshotsError) console.error("visibility-audit-get snapshots error:", snapshotsError);

    return new Response(JSON.stringify({ audits, history: history ?? [], corrections, snapshots: snapshots ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-get error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
