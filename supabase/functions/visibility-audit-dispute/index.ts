// §6 — Evidence and corrections: a member disputes one specific metric on
// an already-scored audit (with a reason), the correction is logged against
// their identity, the audit's five category scores recompute in-process
// from the corrected raw_metrics (no re-fetch — see
// _shared/recomputeFromRawMetrics.ts), and the previous value is preserved
// both in the correction log and as a new market_visibility_audit_history
// snapshot tagged source: "correction".
//
// Ownership mirrors visibility-audit-verify-domain: resolveClientId decides
// which client_id owns the audit (a real access token beats a client-
// asserted clientId; a firm's shared client_id once it has >1 member).
// Additionally, if the caller belongs to a firm, their role is checked
// against the same CAN_EDIT_ROLES set firm-profile uses — a read-only
// executive or a partner contributor can see a correction's evidence but
// not file one. A solo account (no firm) that owns the audit outright needs
// no further role check.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { recomputeFromRawMetrics } from "../_shared/recomputeFromRawMetrics.ts";
import { applyMetricCorrection } from "../_shared/metricCorrections.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

// Mirrors src/lib/roles.ts's canEditFirmProfile column — disputing a metric
// is treated the same as editing the firm's own profile data.
const CAN_DISPUTE_ROLES = new Set(["owner", "admin", "marketing", "consultant", "member"]);

const VALID_CATEGORIES = new Set(["performance", "social", "seoAuthority", "thoughtLeadership", "reputation"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, auditId, category, metricPath, correctedValue, reason } = await req.json();

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
    if (!category || typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
      return new Response(JSON.stringify({ error: "category is invalid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!metricPath || typeof metricPath !== "string") {
      return new Response(JSON.stringify({ error: "metricPath is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return new Response(JSON.stringify({ error: "A reason of at least 5 characters is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    let correctedByUserId: string | null = null;
    let correctedByLabel: string | null = null;
    if (accessToken && typeof accessToken === "string") {
      const { data: userData } = await serviceClient.auth.getUser(accessToken);
      if (userData?.user) {
        correctedByUserId = userData.user.id;
        correctedByLabel = userData.user.email ?? null;

        const { data: membership } = await serviceClient
          .from("firm_members")
          .select("role")
          .eq("user_id", correctedByUserId)
          .maybeSingle();
        if (membership && !CAN_DISPUTE_ROLES.has(membership.role)) {
          return new Response(JSON.stringify({ error: "Your role doesn't have permission to dispute a metric" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const { data: audit, error: auditError } = await serviceClient
      .from("market_visibility_audits")
      .select("id, market, peer_group, audited_domain, raw_metrics, provenance, total_score, methodology_version, data_window_start, data_window_end, sample_size, confidence_score")
      .eq("id", auditId)
      .eq("client_id", clientId) // ownership check — never trust a bare id from the client
      .maybeSingle();

    if (auditError) {
      console.error("visibility-audit-dispute lookup error:", auditError);
      return new Response(JSON.stringify({ error: "Couldn't load the audit" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!audit) {
      return new Response(JSON.stringify({ error: "Audit not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = applyMetricCorrection(category, metricPath, correctedValue, audit.raw_metrics ?? {}, audit.market);
    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scores = recomputeFromRawMetrics(audit.market, result.patchedRawMetrics);

    const { data: updatedAudit, error: updateError } = await serviceClient
      .from("market_visibility_audits")
      .update({
        raw_metrics: result.patchedRawMetrics,
        performance_score: scores.performance_score,
        social_score: scores.social_score,
        seo_authority_score: scores.seo_authority_score,
        thought_leadership_score: scores.thought_leadership_score,
        reputation_score: scores.reputation_score,
        manual_override: true,
        manual_override_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", auditId)
      .select("id, total_score")
      .single();

    if (updateError || !updatedAudit) {
      console.error("visibility-audit-dispute update error:", updateError);
      return new Response(JSON.stringify({ error: "Couldn't save the correction" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: correctionError } = await serviceClient
      .from("market_visibility_metric_corrections")
      .insert({
        audit_id: auditId,
        category,
        metric_path: metricPath,
        previous_value: result.previousValue,
        corrected_value: correctedValue,
        reason: reason.trim(),
        corrected_by: correctedByUserId,
        corrected_by_label: correctedByLabel,
        previous_total_score: audit.total_score,
        new_total_score: updatedAudit.total_score,
      });
    if (correctionError) console.error("visibility-audit-dispute correction log error:", correctionError);

    // Append-only trend snapshot, tagged distinctly from an ordinary re-run —
    // the data window/sample size/confidence don't change from a correction
    // (it isn't a new measurement), only the scores and raw_metrics do.
    const { error: historyError } = await serviceClient
      .from("market_visibility_audit_history")
      .insert({
        client_id: clientId,
        audited_domain: audit.audited_domain,
        market: audit.market,
        peer_group: audit.peer_group,
        performance_score: scores.performance_score,
        social_score: scores.social_score,
        seo_authority_score: scores.seo_authority_score,
        thought_leadership_score: scores.thought_leadership_score,
        reputation_score: scores.reputation_score,
        total_score: updatedAudit.total_score,
        methodology_version: audit.methodology_version,
        data_window_start: audit.data_window_start,
        data_window_end: audit.data_window_end,
        sample_size: audit.sample_size,
        confidence_score: audit.confidence_score,
        raw_metrics: result.patchedRawMetrics,
        provenance: audit.provenance,
        source: "correction",
      });
    if (historyError) console.error("visibility-audit-dispute history insert error:", historyError);

    return new Response(JSON.stringify({
      ok: true,
      auditId,
      previousTotalScore: audit.total_score,
      newTotalScore: updatedAudit.total_score,
      scores,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-dispute error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
