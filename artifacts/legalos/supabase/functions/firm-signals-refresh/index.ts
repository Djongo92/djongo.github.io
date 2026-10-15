// Weekly CRON job: pre-fetches PageSpeed Insights and Google Business Profile
// data for every benchmark firm in the Serbia market, storing results in the
// firm_signals table so individual audit runs can use cached data instead of
// making live API calls during the audit itself.
//
// Scheduling: configured via the migration 20260730000001_firm_signals_schedule.sql
// (pg_cron + pg_net, weekly Sunday 02:00 UTC). The CRON_SECRET is read from
// Supabase Vault at call-time rather than being embedded in the schedule SQL.
//
// Concurrency model: firms are processed in batches of BATCH_SIZE concurrently.
// PSI (two parallel requests per firm) and Places (two sequential requests per
// firm) run concurrently with each other per firm. The sweep engine itself
// (batching, TTL-skip resume, timer-armed self-chaining) lives in
// ./sweepRunner.ts — extracted so the handoff behavior is Deno-testable.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientIdSet, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { fetchGbpSignalWithKey } from "../_shared/googlePlacesFetcher.ts";
import { calculateGbpScore } from "../_shared/gbpScoreFormula.ts";
import { upsertFirmSignal, normalizeDomain } from "../_shared/firmSignals.ts";
import { checkGbpRefreshRateLimit } from "../_shared/rateLimit.ts";
import { computeReputationScore } from "../_shared/reputationScore.ts";
import { recomputeFromRawMetrics } from "../_shared/recomputeFromRawMetrics.ts";
import { PLACES_TTL_HOURS, MAX_SWEEP_CHAIN_DEPTH } from "./config.ts";
import { runSweep } from "./sweepRunner.ts";
import { sendCronAlert, withCronAlert } from "../_shared/cronAlert.ts";

const corsHeaders = ACCESS_CORS_HEADERS;

// Task #219: withCronAlert covers foreground throws on cron requests;
// background sweep crashes are caught by the .catch(sendCronAlert) below;
// chain handoff failures are covered by the onChainFailure dep in runSweep.
// The on-demand GBP path (no x-cron-secret) never triggers an alert.
Deno.serve(withCronAlert("firm-signals-refresh", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Two entry modes share this function:
  //   1. Weekly CRON batch (x-cron-secret) — the scheduled path below.
  //   2. On-demand single-domain GBP refresh from a signed-in firm (the
  //      "Refresh GBP data" button in Analytics → Reputation): same Places
  //      fetch + signal upsert as the batch job, then the caller's latest
  //      audit for that domain is re-scored in place so the displayed score
  //      moves immediately instead of at the next audit run.
  //
  // OPERATIONAL STATE (2026-08-13): the weekly pg_cron job
  // "firm-signals-refresh" is PAUSED (cron.job.active = false) by product
  // decision until paid clients land — GBP data was backfilled once via a
  // manual places-only run. The PSI leg's isolate-memory blowout that used
  // to crash the full sweep is FIXED (fields mask in
  // _shared/psiFetchWithFallback.ts — multi-MB Lighthouse payloads are no
  // longer buffered; verified by a full 90-firm sweep). To re-enable:
  // `update cron.job set active = true where jobname = 'firm-signals-refresh'`.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    if (req.method === "POST") return handleOnDemandGbpRefresh(req, corsHeaders);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Optional body: { only: "places" | "psi" } — run one signal type only.
  // PSI fetches are the memory-heavy leg (multi-MB Lighthouse payloads held
  // in isolate memory have OOM-killed the worker at ~90-firm scale), so a
  // places-only sweep is the supported way to backfill GBP data without
  // dragging PSI along. Parse defensively: pg_cron sends "{}", but a JSON
  // null body must not crash the job.
  const parsed: unknown = await req.json().catch(() => null);
  const body =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  const onlyRaw = body.only;
  const only = onlyRaw === "places" || onlyRaw === "psi" ? onlyRaw : null;
  // Chain cursor from the self-invocation link that called us (see
  // runSweep). Both are clamped defensively — an unbounded or non-finite
  // depth/offset would silently suppress or corrupt chaining.
  const depth = typeof body.depth === "number" && Number.isFinite(body.depth) && body.depth >= 0
    ? Math.min(Math.floor(body.depth), MAX_SWEEP_CHAIN_DEPTH)
    : 0;
  const offset = typeof body.offset === "number" && Number.isFinite(body.offset) && body.offset >= 0
    ? Math.floor(body.offset)
    : 0;

  // Respond 202 immediately and run the sweep in the background. Even with
  // lean PSI payloads, a full-directory sweep exceeds the gateway's 150s
  // idle timeout (slow sites × real Lighthouse runs) — the caller must not
  // need a live connection. TTL-skip inside processFirm makes re-invocation
  // idempotent: if the worker's wall clock cuts a sweep short, re-invoke and
  // it resumes where it stopped. Sweep failures surface in function logs.
  EdgeRuntime.waitUntil(
    runSweep(
      {
        supabaseUrl: Deno.env.get("SUPABASE_URL")!,
        serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        cronSecret,
        psiKey: Deno.env.get("PAGESPEED_API_KEY"),
        placesKey: Deno.env.get("GOOGLE_PLACES_API_KEY"),
        // Chain handoff failures alert directly (task #219): the cron caller
        // only sees the 202 so a broken chain is otherwise invisible.
        onChainFailure: async (message, detail) => {
          await sendCronAlert("firm-signals-refresh", { message, detail });
        },
      },
      only, depth, offset,
    )
      .then((summary) => console.log("[firm-signals-refresh] complete:", JSON.stringify(summary)))
      // The cron caller only ever sees the 202 — a crashed background sweep
      // is invisible to cron.job_run_details, so it alerts directly (#219).
      // One alert per run: runSweep either resolves with a summary or
      // rejects exactly once.
      .catch(async (e) => {
        console.error("[firm-signals-refresh] sweep crashed:", e);
        await sendCronAlert("firm-signals-refresh", {
          message: e instanceof Error ? e.message : String(e),
          detail: { only, depth, offset },
        });
      }),
  );

  return new Response(JSON.stringify({ started: true }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}));

// Supabase edge runtime global (background tasks after the response).
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

/**
 * On-demand mode (#28): re-fetch Google Places for ONE domain and re-score
 * the caller's latest audit for it in place. Strictly account-only (a
 * verified session — never a caller-asserted clientId) AND ownership-gated:
 * the requested domain must match an audit the caller owns, checked before
 * any rate-limit consumption or external spend — otherwise any signed-in
 * user could refresh arbitrary domains (the per-domain limiter is trivially
 * bypassed by rotating fresh domains) or burn a real firm's daily bucket
 * before that firm uses it. The rate-limit unit is an atomic DB-side
 * reservation consumed before the fetch: a failed lookup (bot protection,
 * no listing) upserts an unverifiable signal just like the batch job and
 * still burns the day's refresh.
 */
async function handleOnDemandGbpRefresh(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { auditId, accessToken } = await req.json();
    if (!auditId || typeof auditId !== "string") return json({ error: "auditId is required" }, 400);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
    // Ownership is a SET, not a single resolved identity: audits can be
    // keyed to the user's own id (legacy solo rows) or to any firm they
    // hold a live membership in (shared-firm rows; consultants hold
    // several). resolveVerifiedClientId's single implicit pick would
    // falsely 404 legitimately-owned audits whenever the pick doesn't line
    // up — the audit row's own client_id is the disambiguator.
    const clientIds = await resolveVerifiedClientIdSet(serviceClient, identityToken);
    if (!clientIds) return json({ error: "Sign in to use this feature." }, 401);

    // Ownership gate FIRST, before any rate-limit consumption or external
    // spend: the auditId must belong to the caller, and the domain is
    // derived server-side from that audit row — never trusted from the
    // request. Audits store audited_domain as the user entered it
    // (sometimes a full URL), so matching a request-supplied string against
    // it would both miss legitimately-owned audits and let arbitrary
    // domains through. Rejecting here means an unowned audit never reaches
    // the limiter or the Places API at all.
    const { data: audit } = await serviceClient
      .from("market_visibility_audits")
      .select("id, client_id, market, peer_group, audited_domain, display_name, raw_metrics, provenance, total_score, methodology_version, data_window_start, data_window_end, sample_size, confidence_score")
      .eq("id", auditId)
      .in("client_id", clientIds)
      .maybeSingle();
    if (!audit) {
      return json({ error: "No audit found for this on your account — run your audit first." }, 404);
    }
    // The identity the audit is actually keyed to — used for the history
    // snapshot so it lands on the same rows as the audit itself.
    const auditClientId = audit.client_id;

    const domain = normalizeDomain(audit.audited_domain);
    if (!domain) return json({ error: "This audit's domain can't be refreshed." }, 400);

    const placesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!placesKey) return json({ error: "GBP lookup isn't configured on this environment" }, 503);

    // Atomic reservation (DB-side row lock, fail-closed) — the
    // read-then-upsert helper races under concurrent requests and cannot
    // guarantee one refresh per 24h.
    const rl = await checkGbpRefreshRateLimit(serviceClient, domain);
    if (!rl.allowed) {
      return json({ error: "GBP data was refreshed recently — you can refresh once every 24 hours." }, 429);
    }

    const firmName = audit.display_name || domain;

    const { details, is_unverifiable, raw } = await fetchGbpSignalWithKey(firmName, domain, placesKey);
    const { score: gbpScore } = details ? calculateGbpScore(details) : { score: 0 };
    await upsertFirmSignal(
      serviceClient, domain, "google_places",
      { ...raw, score: gbpScore, details: details ?? null },
      PLACES_TTL_HOURS, is_unverifiable,
    );

    // Re-score reputation against the fresh signal (computeReputationScore
    // reads firm_signals) and recompute the audit in place — the same
    // pattern visibility-audit-dispute uses, so Analytics shows the new
    // score on the next refetch instead of after the next full audit run.
    // deno-lint-ignore no-explicit-any
    const existingRaw = (audit.raw_metrics ?? {}) as Record<string, any>;
    const rep = await computeReputationScore(
      serviceClient, audit.market, audit.audited_domain,
      Boolean(existingRaw.reputation?.gbpListed),
    );
    const patchedRawMetrics = { ...existingRaw, reputation: { ...(existingRaw.reputation ?? {}), ...rep.raw } };
    const scores = recomputeFromRawMetrics(audit.market, patchedRawMetrics);

    const { data: updatedAudit, error: updateError } = await serviceClient
      .from("market_visibility_audits")
      .update({
        raw_metrics: patchedRawMetrics,
        performance_score: scores.performance_score,
        social_score: scores.social_score,
        seo_authority_score: scores.seo_authority_score,
        thought_leadership_score: scores.thought_leadership_score,
        reputation_score: scores.reputation_score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", audit.id)
      .select("id, total_score")
      .single();

    if (updateError || !updatedAudit) {
      console.error("[firm-signals-refresh] on-demand audit update error:", updateError);
      return json({ error: "Couldn't save the refreshed score" }, 500);
    }

    // Trend snapshot tagged "refresh" — distinct from a full audit run and
    // from a manual correction (see the 20260801020000 migration for the
    // widened CHECK).
    const { error: historyError } = await serviceClient
      .from("market_visibility_audit_history")
      .insert({
        client_id: auditClientId,
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
        raw_metrics: patchedRawMetrics,
        provenance: audit.provenance,
        source: "refresh",
      });
    if (historyError) console.error("[firm-signals-refresh] on-demand history insert error:", historyError);

    return json({
      ok: true,
      refreshed: true,
      auditUpdated: true,
      auditId: audit.id,
      previousTotalScore: audit.total_score,
      newTotalScore: updatedAudit.total_score,
      reputationScore: scores.reputation_score,
      unverifiable: is_unverifiable,
    });
  } catch (e) {
    console.error("[firm-signals-refresh] on-demand error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}
