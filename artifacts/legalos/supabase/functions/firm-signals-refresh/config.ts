// Refresh cadence and TTL constants — extracted so they can be imported
// from tests without pulling in Deno.serve or any network dependencies.

/** How often the cron job fires (days). Must match the pg_cron schedule. */
export const CRON_INTERVAL_DAYS = 7;

/** Batch size for concurrent firm processing. Each firm fans out to PSI +
 *  Places fetches. PSI responses were multi-MB Lighthouse JSON until the
 *  fields mask in _shared/psiFetchWithFallback.ts shrank them to bytes — 4
 *  concurrent firms are comfortably inside isolate memory now (the pre-mask
 *  OOM is pinned by the psiFetchWithFallback Deno test). TTL-skip makes
 *  re-runs idempotent if wall-clock cuts in. */
export const BATCH_SIZE = 4;

/** Delay between batches to avoid sustained rate-limit pressure (ms). */
export const INTER_BATCH_DELAY_MS = 400;

/** PageSpeed Insights signal TTL.
 *  Must be > CRON_INTERVAL_DAYS * 24 so signals stay warm across the full
 *  weekly refresh interval. Set to 8 days (1-day safety buffer). */
export const PSI_TTL_HOURS = (CRON_INTERVAL_DAYS + 1) * 24; // 192 h

/** Sweep resume window: firms whose signal row was fetched within this
 *  window are skipped, so a crashed or wall-clock-cut sweep RESUMES where
 *  it stopped instead of re-fetching from the top every invocation
 *  (without a skip, waves re-did a random ~dozen firms each time and
 *  coverage never converged past one invocation's reach). 4 days sits
 *  under the 7-day cron cadence, so a weekly run still refreshes
 *  everything, while same-day re-invokes converge instantly. */
export const SWEEP_SKIP_FRESH_HOURS = 96;

/** Hard cap on sweep self-chaining (each link re-invokes the function while
 *  stale firms remain). One invocation's wall clock covers only ~a dozen
 *  firms, so 91 firms need ~8-15 links; 30 is far above that and stops a
 *  pathological state (e.g. every firm failing fast = "progress") from
 *  looping forever. */
export const MAX_SWEEP_CHAIN_DEPTH = 30;

/** Per-invocation work budget (ms). Background tasks are wall-clock-killed
 *  early (~2 min observed), so the sweep loop must STOP starting new batches
 *  and reach the self-chain handoff before the isolate dies — a chain block
 *  after an unbounded loop never executes. 90s leaves comfortable headroom
 *  for the final batch to finish and the chain fetch to dispatch. */
export const SWEEP_TIME_BUDGET_MS = 90_000;

/** When to hand off to the next self-chained link (ms into the run). Armed
 *  as a TIMER by sweepRunner (not a loop-top check): a single batch can
 *  outlive the whole dispatch window (up to the ~120s PSI deadline — slow
 *  firms' first batches were observed at 90s+, past the isolate's ~2min
 *  wall-clock kill), so the handoff must fire mid-await. The successor
 *  resumes at the START of the parent's in-flight batch (conservative
 *  replay): if the parent is killed before that batch's upserts land, no
 *  firm is permanently skipped; when the parent survives, upserts are
 *  idempotent and the successor's freshness skip makes the overlap cheap. */
export const CHAIN_DISPATCH_AFTER_MS = 55_000;

/** Google Places signal TTL.
 *  GBP listings change infrequently; 3-day buffer over the weekly cadence. */
export const PLACES_TTL_HOURS = (CRON_INTERVAL_DAYS + 3) * 24; // 240 h
