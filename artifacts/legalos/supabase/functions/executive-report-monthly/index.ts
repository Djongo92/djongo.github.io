// §9 — Reports and exports: monthly scheduled snapshot for every client
// that's opted in. Invoked on a schedule via pg_cron + pg_net (set up
// alongside this function's deploy, not committed here since it embeds a
// secret), gated by CRON_SECRET — same posture as
// visibility-audit-rerun-due. Deliberately doesn't call Claude again for a
// fresh narrative (that's the interactive path's job, in-app, where the
// polished PDF/PPTX/DOCX/XLSX actually gets generated) — this only
// snapshots the deterministic numbers and files a notification, since
// there's no SMTP configured to actually email a finished document.
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { computePercentile } from "../_shared/runVisibilityAudit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: schedules, error: scheduleError } = await serviceClient
      .from("executive_report_schedules")
      .select("client_id, last_generated_at")
      .eq("enabled", true);

    if (scheduleError) {
      console.error("executive-report-monthly schedule query error:", scheduleError);
      return new Response(JSON.stringify({ error: "Couldn't load schedules" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const due = (schedules ?? []).filter((s) =>
      !s.last_generated_at || Date.now() - new Date(s.last_generated_at).getTime() >= THIRTY_DAYS_MS,
    );

    let generated = 0;
    for (const schedule of due) {
      const { data: audits } = await serviceClient
        .from("market_visibility_audits")
        .select("market, peer_group, audited_domain, display_name, total_score, performance_score, social_score, seo_authority_score, thought_leadership_score, reputation_score")
        .eq("client_id", schedule.client_id)
        .order("updated_at", { ascending: false })
        .limit(1);

      const audit = audits?.[0];
      if (!audit) continue; // nothing to snapshot yet — don't file an empty report

      const percentileResult = await computePercentile(serviceClient, audit.market, audit.peer_group, audit.total_score);

      const { error: insertError } = await serviceClient.from("executive_reports").insert({
        client_id: schedule.client_id,
        market: audit.market,
        audited_domain: audit.audited_domain,
        display_name: audit.display_name,
        total_score: audit.total_score,
        percentile: percentileResult?.percentile ?? null,
        categories: {
          performance: audit.performance_score,
          social: audit.social_score,
          seoAuthority: audit.seo_authority_score,
          thoughtLeadership: audit.thought_leadership_score,
          reputation: audit.reputation_score,
        },
        source: "scheduled",
      });
      if (insertError) {
        console.error("executive-report-monthly insert error:", insertError);
        continue;
      }

      await serviceClient.from("notifications").insert({
        client_id: schedule.client_id,
        type: "executive_report",
        title: "This month's Executive Report is ready",
        body: `${Math.round(audit.total_score)}/200 for ${audit.display_name || audit.audited_domain} — open Reports to generate the PDF, PowerPoint, Word, or Excel export.`,
      });

      await serviceClient
        .from("executive_report_schedules")
        .update({ last_generated_at: new Date().toISOString() })
        .eq("client_id", schedule.client_id);

      generated++;
    }

    return new Response(JSON.stringify({ ok: true, checked: due.length, generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("executive-report-monthly error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
