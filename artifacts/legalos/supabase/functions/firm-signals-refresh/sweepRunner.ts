// Sweep engine for firm-signals-refresh, extracted from index.ts so the
// chaining/handoff behavior is Deno-testable without Deno.serve, and so the
// tuning knobs (batch size, dispatch timing, retry delay) can be shrunk in
// tests — a 55s real-world dispatch timer is otherwise untestable.
// Must stay import-safe: no env reads, no network, no serve at module scope.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchGbpSignalWithKey } from "../_shared/googlePlacesFetcher.ts";
import { calculateGbpScore } from "../_shared/gbpScoreFormula.ts";
import { upsertFirmSignal, normalizeDomain } from "../_shared/firmSignals.ts";
import {
  BATCH_SIZE,
  CHAIN_DISPATCH_AFTER_MS,
  INTER_BATCH_DELAY_MS,
  MAX_SWEEP_CHAIN_DEPTH,
  PLACES_TTL_HOURS,
  SWEEP_SKIP_FRESH_HOURS,
  SWEEP_TIME_BUDGET_MS,
} from "./config.ts";
import { refreshPsiSignal } from "./psiSignalRefresh.ts";

export interface FirmRow {
  firm_name: string;
  firm_domain: string | null;
}

export interface FirmCounts {
  psiOk: number; psiFailed: number; psiSkipped: number;
  placesOk: number; placesFailed: number; placesSkipped: number;
}

/** Secrets/endpoints the runner needs — passed in by index.ts (which owns
 *  env access) so this module never reads process state at import time. */
export interface SweepDeps {
  supabaseUrl: string;
  serviceRoleKey: string;
  cronSecret: string;
  psiKey: string | undefined;
  placesKey: string | undefined;
  /** Optional — called ONCE when both chain-handoff attempts fail so the
   *  broken chain generates an alert rather than a silent log line. */
  onChainFailure?: (message: string, detail: unknown) => Promise<void>;
}

/** Tuning overrides — production uses config.ts defaults; tests shrink them. */
export interface SweepKnobs {
  batchSize?: number;
  interBatchDelayMs?: number;
  timeBudgetMs?: number;
  dispatchAfterMs?: number;
  dispatchRetryDelayMs?: number;
  maxChainDepth?: number;
  skipFreshHours?: number;
  /** Overrides the self-invocation URL (tests capture dispatches locally). */
  selfUrl?: string;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processFirm(
  firm: FirmRow,
  serviceClient: SupabaseClient,
  psiKey: string | undefined,
  placesKey: string | undefined,
  recentPsi: Set<string>,
  recentPlaces: Set<string>,
): Promise<{ psi: "ok" | "failed" | "skipped"; places: "ok" | "failed" | "skipped" }> {
  const rawDomain = firm.firm_domain!;
  const domain = normalizeDomain(rawDomain);
  if (!domain) return { psi: "skipped", places: "skipped" };

  const siteUrl = rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`;

  // Run PSI and Places concurrently per firm — they are fully independent.
  // Each leg is skipped when its signal was refreshed within
  // SWEEP_SKIP_FRESH_HOURS (see runSweep) — that's what lets a resumed
  // sweep converge instead of re-fetching from the top every invocation.
  const [psiResult, placesResult] = await Promise.all([
    // ── PageSpeed Insights ──────────────────────────────────────────────
    // Fallback logic lives in ./psiSignalRefresh.ts (exported + Deno-tested;
    // mirrors the live-audit path in _shared/performanceScore.ts).
    psiKey && !recentPsi.has(domain)
      ? refreshPsiSignal(serviceClient, domain, siteUrl, psiKey)
      : Promise.resolve("skipped" as const),

    // ── Google Places (GBP) ─────────────────────────────────────────────
    placesKey && !recentPlaces.has(domain)
      ? (async () => {
          const { details, is_unverifiable, raw } = await fetchGbpSignalWithKey(
            firm.firm_name, domain, placesKey,
          );
          const { score } = details ? calculateGbpScore(details) : { score: 0 };
          await upsertFirmSignal(
            serviceClient, domain, "google_places",
            { ...raw, score, details: details ?? null },
            PLACES_TTL_HOURS, is_unverifiable,
          );
          return is_unverifiable ? "failed" as const : "ok" as const;
        })()
      : Promise.resolve("skipped" as const),
  ]);

  return { psi: psiResult, places: placesResult };
}

/** Re-invokes this function for the next sweep link. Awaits only the
 *  successor's instant 202, so the handoff lands while this isolate is
 *  definitely alive. A non-2xx means the chain is broken — logged loudly;
 *  the caller retries (timer retry / end-of-loop fallback), and the weekly
 *  cron resumes the rest via the skip window as the last resort. */
export async function dispatchNextSweepLink(
  deps: SweepDeps,
  only: "places" | "psi" | null,
  depth: number,
  offset: number,
  remainingHint: number,
  selfUrlOverride?: string,
): Promise<boolean> {
  const selfUrl = selfUrlOverride ?? `${deps.supabaseUrl}/functions/v1/firm-signals-refresh`;
  try {
    const resp = await fetch(selfUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: deps.serviceRoleKey,
        Authorization: `Bearer ${deps.serviceRoleKey}`,
        "x-cron-secret": deps.cronSecret,
      },
      body: JSON.stringify({ only, depth: depth + 1, offset }),
    });
    if (!resp.ok) {
      // Return false so the caller retries — a dead successor must not mark
      // the chain as fired.
      console.warn(`[firm-signals-refresh] chain re-invoke returned HTTP ${resp.status}`);
      return false;
    }
    console.log(
      `[firm-signals-refresh] chained next sweep (depth ${depth + 1}, offset ${offset}, ~${remainingHint} firms due)`,
    );
    return true;
  } catch (e) {
    console.warn("[firm-signals-refresh] chain re-invoke failed:", e);
    return false;
  }
}

export async function runSweep(
  deps: SweepDeps,
  only: "places" | "psi" | null,
  depth: number,
  offset: number,
  knobs: SweepKnobs = {},
) {
  const batchSize = knobs.batchSize ?? BATCH_SIZE;
  const interBatchDelayMs = knobs.interBatchDelayMs ?? INTER_BATCH_DELAY_MS;
  const timeBudgetMs = knobs.timeBudgetMs ?? SWEEP_TIME_BUDGET_MS;
  const dispatchAfterMs = knobs.dispatchAfterMs ?? CHAIN_DISPATCH_AFTER_MS;
  const dispatchRetryDelayMs = knobs.dispatchRetryDelayMs ?? 10_000;
  const maxChainDepth = knobs.maxChainDepth ?? MAX_SWEEP_CHAIN_DEPTH;
  const skipFreshHours = knobs.skipFreshHours ?? SWEEP_SKIP_FRESH_HOURS;

  const serviceClient = createClient(deps.supabaseUrl, deps.serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Deterministic order is load-bearing: chained links resume by offset, so
  // the directory order must be identical in every link.
  const { data: firms, error: firmsError } = await serviceClient
    .from("market_directory_data")
    .select("firm_name, firm_domain")
    .eq("market", "serbia")
    .not("firm_domain", "is", null)
    .order("firm_domain");

  if (firmsError || !firms) {
    throw new Error(`directory query failed: ${firmsError?.message ?? "no rows"}`);
  }

  const rows = firms as FirmRow[];
  const counts: FirmCounts = { psiOk: 0, psiFailed: 0, psiSkipped: 0, placesOk: 0, placesFailed: 0, placesSkipped: 0 };

  // Resume window: skip firms whose signal row was fetched within
  // SWEEP_SKIP_FRESH_HOURS. A wall-clock-cut sweep re-invoked later resumes
  // where it stopped instead of re-fetching from the top; a weekly run
  // (7d > 96h) still refreshes everything. One bulk query, not per-firm.
  const cutoff = new Date(Date.now() - skipFreshHours * 3600_000).toISOString();
  const { data: recentSignals, error: recentError } = await serviceClient
    .from("firm_signals")
    .select("firm_domain, signal_type")
    .gt("fetched_at", cutoff);
  if (recentError) {
    // Fail loud: degrading to "everyone is stale" would silently burn paid
    // API quota on the full directory in every chained link.
    throw new Error(`recent-signals query failed: ${recentError.message}`);
  }
  const recentPsi = new Set<string>();
  const recentPlaces = new Set<string>();
  for (const s of recentSignals ?? []) {
    const d = normalizeDomain(String(s.firm_domain ?? ""));
    if (!d) continue;
    if (s.signal_type === "pagespeed") recentPsi.add(d);
    else if (s.signal_type === "google_places") recentPlaces.add(d);
  }
  // Domains this invocation actually processed (success OR failure counts —
  // a failed fetch still wrote an advisory row and shouldn't be re-chained
  // immediately).
  const processed = new Set<string>();

  const wantPsi = only !== "places";
  const wantPlaces = only !== "psi";
  const isDue = (f: FirmRow): boolean => {
    const d = normalizeDomain(String(f.firm_domain ?? ""));
    if (!d || processed.has(d)) return false;
    return (wantPsi && !recentPsi.has(d)) || (wantPlaces && !recentPlaces.has(d));
  };
  const dispatchNext = (nextOffset: number, remainingHint: number) =>
    dispatchNextSweepLink(deps, only, depth, nextOffset, remainingHint, knobs.selfUrl);

  // Process firms in concurrent batches, time-boxed and cursor-chained over
  // the deterministically-ordered directory. The handoff is armed on a
  // TIMER, not checked at the loop top: a single slow batch can take up to
  // the PSI fetch deadline (~120s — observed: chronically-failing firms'
  // first batches took 90s+), and the loop would not regain control until
  // after the isolate's ~2min wall-clock kill — a loop-top dispatch then
  // never fires and the chain silently dies.
  //
  // CONSERVATIVE REPLAY: the successor is dispatched at the START of the
  // in-flight batch, not its end. If this isolate is wall-clock-killed
  // before the awaited batch's upserts land (a batch started at the 55s
  // timer can run past the ~2min kill), dispatching at the batch's END
  // would skip those firms permanently — every later link keeps the raw
  // offset and the freshness skip only excuses firms that actually wrote.
  // Replaying one batch is safe: upserts are idempotent, and the
  // successor's freshness query turns the replay into a cheap skip
  // whenever the parent's writes did land first. The overlap when both
  // survive is bounded to that one batch (see the reservation below).
  //
  // Because dispatch itself is async, the boundary is SYNCHRONOUSLY
  // RESERVED (`reservedAt`) before the self-call fetch starts: the loop
  // must wait for the handoff to resolve rather than start any NEW batch —
  // otherwise a slow 202 would let the parent keep advancing and grow the
  // overlap beyond the in-flight batch. The reservation is released only
  // after the dispatch AND its retry have both definitively failed (no
  // in-flight fetch can still succeed), at which point the parent safely
  // resumes owning the suffix itself.
  const startedAt = Date.now();
  let resumeAt = rows.length; // loop running to completion = nothing left
  let chainFired = false;
  let inFlightStart: number | null = null; // batch start while its await is outstanding
  let inFlightEnd = offset; // rows index just past the batch being awaited
  let reservedAt: number | null = null; // boundary handed off, dispatch pending

  const tryHandoff = async (): Promise<void> => {
    if (chainFired || reservedAt !== null || depth >= maxChainDepth) return;
    const boundary = inFlightStart ?? inFlightEnd;
    const dueAhead = rows.slice(boundary).filter(isDue).length;
    if (dueAhead === 0) return;
    // Reserve BEFORE the first await: from this line on the loop cannot
    // start a new batch until this handoff resolves.
    reservedAt = boundary;
    chainFired = await dispatchNext(reservedAt, dueAhead);
    if (!chainFired) {
      // Transient invoke failure (saturated/cold runtime): one retry. The
      // boundary is NOT recomputed — the reservation froze the parent, so
      // reservedAt is still the exact replay boundary.
      await sleep(dispatchRetryDelayMs);
      if (!chainFired) chainFired = await dispatchNext(reservedAt, dueAhead);
    }
    if (!chainFired) {
      reservedAt = null; // both attempts failed — release
      // Both timer dispatch AND its retry failed — alert so the chain break
      // is visible outside function logs. One alert per sweep (the timer fires
      // at most once per runSweep invocation).
      if (deps.onChainFailure) {
        await deps.onChainFailure(
          `chain handoff failed after 2 attempts (depth ${depth}, ${dueAhead} firms due)`,
          { depth, offset, dueAhead },
        );
      }
    }
  };
  const dispatchTimer = setTimeout(() => {
    void tryHandoff();
  }, dispatchAfterMs);

  try {
    for (let i = offset; i < rows.length; i += batchSize) {
      if (chainFired) break; // the timer already handed off the suffix
      if (Date.now() - startedAt > timeBudgetMs) {
        resumeAt = i;
        break;
      }
      if (reservedAt !== null && i >= reservedAt) {
        // A handoff covering this index is being dispatched right now —
        // wait for it to resolve instead of starting another batch and
        // growing the overlap. (Resolves quickly: the self-call awaits
        // only the successor's instant 202.)
        while (reservedAt !== null && !chainFired) await sleep(25);
        if (chainFired) break; // successor owns the suffix (incl. replay)
        continue; // released after failed dispatch — re-check, then proceed
      }
      const batch = rows.slice(i, i + batchSize);
      inFlightStart = i; // replay boundary if the timer fires mid-batch
      inFlightEnd = i + batch.length;
      const results = await Promise.all(
        batch.map((firm) => processFirm(
          firm, serviceClient,
          only === "places" ? undefined : deps.psiKey,
          only === "psi" ? undefined : deps.placesKey,
          recentPsi, recentPlaces,
        )),
      );
      inFlightStart = null; // batch's writes landed (or failed) — nothing to replay
      for (const r of results) {
        if (r.psi === "ok") counts.psiOk++;
        else if (r.psi === "failed") counts.psiFailed++;
        else counts.psiSkipped++;
        if (r.places === "ok") counts.placesOk++;
        else if (r.places === "failed") counts.placesFailed++;
        else counts.placesSkipped++;
      }
      for (const firm of batch) {
        const d = normalizeDomain(String(firm.firm_domain ?? ""));
        if (d) processed.add(d);
      }
      if (i + batchSize < rows.length) await sleep(interBatchDelayMs);
    }
  } finally {
    clearTimeout(dispatchTimer);
  }

  // Cursor fallback: the timer never fired (fast sweep) or its dispatch and
  // retry both failed — if due firms remain in the unprocessed suffix,
  // dispatch the next link to start exactly where we stopped. Progress-gated
  // and depth-capped so a pathological state can't loop forever; if the
  // chain breaks, the weekly cron resumes (the skip window covers what we
  // wrote).
  const progressed = counts.psiOk + counts.psiFailed + counts.placesOk + counts.placesFailed;
  const remaining = rows.slice(resumeAt).filter(isDue).length;

  if (!chainFired && remaining > 0 && progressed > 0 && depth < maxChainDepth) {
    await dispatchNext(resumeAt, remaining);
  }

  return {
    total: rows.length,
    pagespeed: { ok: counts.psiOk, failed: counts.psiFailed, skipped: counts.psiSkipped },
    places: { ok: counts.placesOk, failed: counts.placesFailed, skipped: counts.placesSkipped },
  };
}
