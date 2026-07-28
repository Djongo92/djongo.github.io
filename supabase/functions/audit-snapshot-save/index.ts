// §11 — Consultant layer: explicitly bookmark and NAME a moment in an
// audit's history (e.g. "Before engagement", "End of Q1 campaign") for
// before/after reporting — market_visibility_audit_history already records
// every run automatically, but it has no label a consultant could show a
// client, and no UI for picking "the one that matters" out of an otherwise
// unlabeled trend line.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, activeFirmId, auditId, label } = await req.json();

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
    if (!label || typeof label !== "string" || !label.trim()) {
      return new Response(JSON.stringify({ error: "label is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken, typeof activeFirmId === "string" ? activeFirmId : undefined);

    let userId: string | null = null;
    if (accessToken && typeof accessToken === "string") {
      const { data: userData } = await serviceClient.auth.getUser(accessToken);
      userId = userData?.user?.id ?? null;
    }

    const { data: audit, error: auditError } = await serviceClient
      .from("market_visibility_audits")
      .select("id, market, audited_domain, display_name, total_score, performance_score, social_score, seo_authority_score, thought_leadership_score, reputation_score")
      .eq("id", auditId)
      .eq("client_id", clientId) // ownership check — never trust a bare id from the client
      .maybeSingle();

    if (auditError) {
      console.error("audit-snapshot-save lookup error:", auditError);
      return new Response(JSON.stringify({ error: "Couldn't load the audit" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!audit) {
      return new Response(JSON.stringify({ error: "Audit not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await serviceClient
      .from("audit_snapshots")
      .insert({
        client_id: clientId,
        audit_id: auditId,
        label: label.trim().slice(0, 80),
        market: audit.market,
        audited_domain: audit.audited_domain,
        display_name: audit.display_name,
        total_score: audit.total_score,
        categories: {
          performance: audit.performance_score,
          social: audit.social_score,
          seoAuthority: audit.seo_authority_score,
          thoughtLeadership: audit.thought_leadership_score,
          reputation: audit.reputation_score,
        },
        created_by: userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("audit-snapshot-save insert error:", error);
      return new Response(JSON.stringify({ error: "Couldn't save the snapshot" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ snapshot: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("audit-snapshot-save error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
