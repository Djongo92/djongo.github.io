// Scheduled re-run for audits that opted into auto_rerun (LegalOS build
// brief item 10) — without this, a score only ever updates when someone
// manually re-runs it, so the trend line and public ranking go stale
// between visits. Invoked on a schedule via pg_cron + pg_net (set up
// alongside this function's deploy, not committed here since it embeds a
// secret), never by an end-user request — so it is gated by a dedicated
// CRON_SECRET rather than the benchmark HMAC scope every other audit
// endpoint uses. Reuses the exact same scoring path as visibility-audit-run
// (see _shared/runVisibilityAudit.ts) so a scheduled re-run and a manual
// one can never drift apart.
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { runVisibilityAudit } from "../_shared/runVisibilityAudit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

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

    // Due = auto_rerun on, a frequency set, and it's been at least that
    // many days since the last run. Postgres does the date arithmetic so
    // this doesn't depend on clock skew between the cron caller and the DB.
    const { data: dueRows, error: dueError } = await serviceClient
      .rpc("market_visibility_audits_due_for_rerun");

    if (dueError) {
      console.error("visibility-audit-rerun-due lookup error:", dueError);
      return new Response(JSON.stringify({ error: "Couldn't look up due audits" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reran = 0;
    let failed = 0;
    for (const row of dueRows ?? []) {
      const lastIntake = (row.last_intake ?? {}) as { gbpListed?: boolean; social?: unknown };
      const result = await runVisibilityAudit(serviceClient, {
        clientId: row.client_id,
        auditedDomain: row.audited_domain,
        displayName: row.display_name,
        market: row.market,
        peerGroup: row.peer_group,
        gbpListed: lastIntake.gbpListed === true,
        social: lastIntake.social,
      });
      if (result.ok) reran++;
      else {
        failed++;
        console.error(`visibility-audit-rerun-due: failed to rerun ${row.id} (${row.audited_domain}):`, result.error);
      }
    }

    return new Response(JSON.stringify({ checked: (dueRows ?? []).length, reran, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-rerun-due error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
