// Scheduled competitor-overtake detector — turns Competitor Tracking from a
// passive, pull-based tool into a push-based re-engagement loop. Invoked on
// a schedule via pg_cron + pg_net (set up alongside this function's deploy,
// not committed here since it embeds a secret — same posture as
// visibility-audit-rerun-due), gated by a dedicated CRON_SECRET rather than
// the benchmark HMAC scope every user-facing audit endpoint uses.
//
// Tracked competitors live in user_app_state (key = 'tracked_competitors'),
// written client-side by useTrackedCompetitors.ts — this is the server-side
// read of that same synced state, not a new tracking mechanism. Only ever
// compares against another firm's own already-published (is_public = true)
// audit — no new data exposure, same posture as the Visibility Index
// leaderboard reading the same rows.
//
// Notifies only on a NEW overtake (competitor_alert_state.was_ahead flips
// false -> true) — never re-notifies every check while a competitor stays
// ahead, and never notifies for "still behind" or "you're still ahead".
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

interface TrackedCompetitor {
  domain: string;
  displayName?: string;
}

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

    const { data: watchRows, error: watchError } = await serviceClient
      .from("user_app_state")
      .select("client_id, value")
      .eq("key", "tracked_competitors");

    if (watchError) {
      console.error("competitor-alerts-check: tracked_competitors lookup failed:", watchError);
      return new Response(JSON.stringify({ error: "Couldn't load tracked competitors" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let checked = 0;
    let notified = 0;

    for (const row of watchRows ?? []) {
      const competitors = (row.value ?? []) as TrackedCompetitor[];
      if (!Array.isArray(competitors) || competitors.length === 0) continue;

      const { data: ownAudits } = await serviceClient
        .from("market_visibility_audits")
        .select("audited_domain, market, total_score")
        .eq("client_id", row.client_id);
      if (!ownAudits || ownAudits.length === 0) continue;

      for (const own of ownAudits) {
        for (const comp of competitors) {
          checked++;
          const { data: compAudit } = await serviceClient
            .from("market_visibility_audits")
            .select("total_score, display_name")
            .eq("audited_domain", comp.domain)
            .eq("market", own.market)
            .eq("is_public", true)
            .maybeSingle();
          if (!compAudit) continue;

          const isAhead = compAudit.total_score > own.total_score;

          const { data: stateRow } = await serviceClient
            .from("competitor_alert_state")
            .select("was_ahead")
            .eq("client_id", row.client_id)
            .eq("competitor_domain", comp.domain)
            .eq("market", own.market)
            .maybeSingle();

          const wasAheadBefore = stateRow?.was_ahead ?? false;

          if (isAhead && !wasAheadBefore) {
            const name = compAudit.display_name || comp.displayName || comp.domain;
            const { error: notifyError } = await serviceClient.from("notifications").insert({
              client_id: row.client_id,
              type: "competitor_overtake",
              title: "A tracked competitor just passed you",
              body: `${name} is now at ${Math.round(compAudit.total_score)}/200, ahead of your ${Math.round(own.total_score)} in ${own.market}.`,
            });
            if (!notifyError) notified++;
            else console.error("competitor-alerts-check: notification insert failed:", notifyError);
          }

          const { error: upsertError } = await serviceClient.from("competitor_alert_state").upsert({
            client_id: row.client_id,
            competitor_domain: comp.domain,
            market: own.market,
            was_ahead: isAhead,
            last_checked_at: new Date().toISOString(),
          }, { onConflict: "client_id,competitor_domain,market" });
          if (upsertError) console.error("competitor-alerts-check: state upsert failed:", upsertError);
        }
      }
    }

    return new Response(JSON.stringify({ checked, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("competitor-alerts-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
