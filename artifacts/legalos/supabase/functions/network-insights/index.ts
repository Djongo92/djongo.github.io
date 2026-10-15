// Deploy before going live: supabase functions deploy network-insights
// --project-ref <ref> --no-verify-jwt --use-api (see ../README.md).
// Network Intelligence (task #122): anonymised, peer-group-scoped benchmark
// insights for the dashboard. Two modes:
//   1. Session path (dashboard): verifies the caller fail-closed, requires
//      2+ of the firm's own audits, serves the 7-day cache when fresh,
//      otherwise computes + caches. Aggregate statistics only.
//   2. Cron path (x-cron-secret): weekly batch recompute for every firm
//      with 2+ audits, so the dashboard never waits on aggregation.
// Privacy floor: no cohort statistic is ever produced from fewer than
// MIN_COHORT_FIRMS distinct firms.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId } from "../_shared/verifiedClientId.ts";
import {
  buildNetworkInsights,
  getOwnAudits,
  getPeerScope,
  getCohort,
  nextCronBatch,
  MIN_COHORT_FIRMS,
  MIN_OWN_AUDITS,
  INSIGHTS_TTL_MS,
  type NetworkInsight,
} from "../_shared/networkInsights.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendCronAlert, withCronAlert } from "../_shared/cronAlert.ts";

const corsHeaders = ACCESS_CORS_HEADERS;

// deno-lint-ignore no-explicit-any
type ServiceClient = any;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Computes + caches one firm's insights. Returns the payload to serve. */
async function computeForFirm(serviceClient: ServiceClient, firmId: string): Promise<{
  insights: NetworkInsight[];
  cohortSize: number | null;
}> {
  const scope = await getPeerScope(serviceClient, firmId);
  if (!scope) return { insights: [], cohortSize: null };
  const cohort = await getCohort(serviceClient, scope);
  const insights = buildNetworkInsights(cohort, firmId);
  const rawSize = new Set(cohort.map((f) => f.clientId)).size;
  // PRIVACY: never persist or return an exact cohort size below the
  // disclosure floor — a precise "2" for a narrow market/tier/size scope
  // would itself leak membership and enable probing.
  const cohortSize = rawSize >= MIN_COHORT_FIRMS ? rawSize : null;
  const { error } = await serviceClient.from("network_insights").upsert({
    firm_id: firmId,
    insights,
    cohort_size: cohortSize ?? 0,
    computed_at: new Date().toISOString(),
  });
  if (error) console.error("network-insights cache write error:", error.message);
  return { insights, cohortSize };
}

// Task #219: withCronAlert only ever fires for requests carrying the correct
// x-cron-secret, so session-path 5xxs never alert — cron alerting is for
// scheduled runs, not a general error tracker.
Deno.serve(withCronAlert("network-insights", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── Cron path: checked BEFORE requireAccess (the scheduler sends no
  //    user session). Matches the firm-signals-refresh handshake.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) {
    try {
      // Complete, deterministic eligible-firm sweep (DB-side GROUP BY —
      // see migration 20260810040000). Every firm with 2+ audits is
      // refreshed every run; the cap is an abuse guard far above pilot
      // scale, not a sampling strategy.
      const { data: eligible, error } = await serviceClient.rpc("network_insights_eligible_firms");
      if (error) throw error;
      const firmIds = ((eligible ?? []) as { client_id: string }[]).map((r) => r.client_id);

      // Durable batched sweep: a single invocation has a finite wall-clock
      // budget, so the full eligible list is walked in CRON_BATCH_SIZE
      // chunks across daily runs via a persisted cursor. The cursor only
      // advances past firms actually refreshed — a timeout mid-batch is
      // retried from the last success on the next run, and no firm is ever
      // permanently skipped.
      const { data: state } = await serviceClient
        .from("network_insights_cron_state")
        .select("last_client_id")
        .eq("id", 1)
        .maybeSingle();
      const { batch, nextCursor } = nextCronBatch(firmIds, state?.last_client_id ?? null);

      let refreshed = 0;
      let lastOk: string | null = null;
      for (const firmId of batch) {
        try {
          await computeForFirm(serviceClient, firmId);
          refreshed++;
          lastOk = firmId;
        } catch (e) {
          console.error(`network-insights cron: firm ${firmId} failed, stopping batch:`, e);
          break;
        }
      }
      // Advance only past completed firms; if the batch was cut short, the
      // next run resumes at the first unprocessed firm.
      const completedAll = refreshed === batch.length;
      const persistCursor = completedAll ? nextCursor : lastOk;
      // A cut-short batch still returns 200 (the cursor makes the next run
      // resume, so partial progress is not a hard failure) — but it IS a
      // failing run someone should hear about: one aggregate alert (#219).
      if (!completedAll) {
        await sendCronAlert("network-insights", {
          message: `batch cut short: ${refreshed} of ${batch.length} firm(s) refreshed`,
          detail: { eligible: firmIds.length, batch: batch.length, refreshed, resumeFrom: persistCursor },
        });
      }
      await serviceClient.from("network_insights_cron_state").upsert({
        id: 1,
        last_client_id: persistCursor,
        updated_at: new Date().toISOString(),
      });
      return json({ ok: true, refreshed, eligible: firmIds.length, batch: batch.length, sweepComplete: completedAll && nextCursor === null });
    } catch (e) {
      console.error("network-insights cron error:", e);
      return json({ ok: false, error: "refresh failed" }, 500);
    }
  }

  // ── Session path ──────────────────────────────────────────────────────
  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { accessToken, activeFirmId } = await req.json();
    if (typeof accessToken !== "string" || !accessToken) {
      return json({ error: "Sign in to view peer insights." }, 401);
    }
    // Fail-closed: insights are computed only for the firm the session
    // proves membership in, honouring the activeFirmId workspace pin.
    const firmId = await resolveVerifiedClientId(
      serviceClient,
      accessToken,
      typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined,
    );
    if (!firmId) return json({ error: "Sign in to view peer insights." }, 401);

    // Gate: insights only make sense with enough of the firm's own history.
    const ownAudits = await getOwnAudits(serviceClient, firmId);
    if (ownAudits.length < MIN_OWN_AUDITS) {
      return json({ gated: true, insights: [], auditsCompleted: ownAudits.length, auditsNeeded: MIN_OWN_AUDITS });
    }

    // Serve the weekly cache when fresh; compute (and cache) otherwise.
    const { data: cached } = await serviceClient
      .from("network_insights")
      .select("insights, cohort_size, computed_at")
      .eq("firm_id", firmId)
      .maybeSingle();
    if (cached && Date.now() - new Date(cached.computed_at).getTime() < INSIGHTS_TTL_MS) {
      return json({
        gated: false,
        insights: cached.insights,
        // Cached rows store 0 for below-floor cohorts — suppress the number.
        cohortSize: cached.cohort_size >= MIN_COHORT_FIRMS ? cached.cohort_size : null,
        computedAt: cached.computed_at,
      });
    }

    const { insights, cohortSize } = await computeForFirm(serviceClient, firmId);
    return json({
      gated: false,
      insights,
      cohortSize,
      computedAt: new Date().toISOString(),
      minCohort: MIN_COHORT_FIRMS,
    });
  } catch (e) {
    console.error("network-insights error:", e);
    return json({ error: "Peer insights are temporarily unavailable." }, 500);
  }
}));
