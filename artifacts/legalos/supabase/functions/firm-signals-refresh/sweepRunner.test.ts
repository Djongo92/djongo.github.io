// Tests for the sweep engine (runSweep) — specifically the timer-armed
// self-chain handoff introduced after code review caught the loop-top
// dispatch never firing behind a slow first batch (a batch can take up to
// the ~120s PSI deadline; the isolate is wall-clock-killed at ~2min; a
// loop-top check never regains control in that window).
//
// Runs under the Deno test gate (`pnpm --filter @workspace/legalos run
// test:deno`). Everything is exercised through a fetch router: PostgREST
// for the directory + firm_signals, googleapis for PSI, and a stub
// self-call URL that captures chain dispatches.

// Env must be set before the module graph loads: firmSignals.ts snapshots
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY at import time.
const STUB_URL = "https://stub.supabase.local";
Deno.env.set("SUPABASE_URL", STUB_URL);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-service-role-key");

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
const { runSweep } = await import("./sweepRunner.ts");

const SELF_URL = "https://stub.supabase.local/functions/v1/firm-signals-refresh";

const jsonOk = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const psiBody = () => ({
  lighthouseResult: {
    categories: {
      performance: { score: 0.8 },
      accessibility: { score: 0.9 },
      seo: { score: 0.7 },
    },
  },
});

const DEPS = {
  supabaseUrl: STUB_URL,
  serviceRoleKey: "stub-service-role-key",
  cronSecret: "stub-cron-secret",
  psiKey: "stub-psi-key",
  placesKey: undefined, // only: "psi" sweeps never touch Places
};

interface RouterState {
  /** Domains served by the stub directory, in order. */
  firms: string[];
  /** Per-domain PSI latency (ms) — simulates slow Lighthouse runs. */
  psiDelayMs: (domain: string) => number;
  /** Statuses the self-call returns, in order of attempts. */
  dispatchStatuses: number[];
  /** Latency (ms) before the self-call responds — simulates a slow 202. */
  dispatchDelayMs: number;
  /** Events in order — the primary assertion surface. */
  events: Array<[string, string | number]>;
  dispatchAttempts: Array<{ depth: number; offset: number }>;
  upsertedDomains: string[];
}

const mkState = (
  firms: string[],
  psiDelayMs: (d: string) => number,
  dispatchStatuses: number[] = [202],
  dispatchDelayMs = 0,
): RouterState => ({
  firms, psiDelayMs, dispatchStatuses, dispatchDelayMs,
  events: [], dispatchAttempts: [], upsertedDomains: [],
});

function installRouter(state: RouterState) {
  globalThis.fetch = async (input: Request | URL | string, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.startsWith(SELF_URL)) {
      const body = JSON.parse(String(init?.body ?? "{}"));
      state.dispatchAttempts.push({ depth: body.depth, offset: body.offset });
      state.events.push(["dispatch", body.offset]);
      const status = state.dispatchStatuses.length > 1
        ? state.dispatchStatuses.shift()!
        : state.dispatchStatuses[0];
      if (state.dispatchDelayMs > 0) {
        await new Promise((r) => setTimeout(r, state.dispatchDelayMs));
        state.events.push(["dispatch-resolved", body.offset]);
      }
      return jsonOk({ started: true }, status);
    }

    if (url.startsWith(`${STUB_URL}/rest/v1/market_directory_data`)) {
      return jsonOk(state.firms.map((d) => ({ firm_name: d, firm_domain: d })));
    }

    if (url.startsWith(`${STUB_URL}/rest/v1/firm_signals`)) {
      if (!init?.method || init.method === "GET") {
        return jsonOk([]); // nothing fresh — every firm is due
      }
      // Upsert: capture which domain was written.
      const body = JSON.parse(String(init.body ?? "{}"));
      state.upsertedDomains.push(String(body.firm_domain ?? ""));
      state.events.push(["upsert", String(body.firm_domain ?? "")]);
      return jsonOk([body], 201);
    }

    if (url.includes("googleapis.com/pagespeedonline")) {
      const target = new URL(url).searchParams.get("url") ?? "";
      const domain = state.firms.find((d) => target.includes(d)) ?? target;
      if (!state.events.some(([k, v]) => k === "psi-start" && v === domain)) {
        state.events.push(["psi-start", domain]);
      }
      await new Promise((r) => setTimeout(r, state.psiDelayMs(domain)));
      state.events.push(["psi-end", domain]);
      return jsonOk(psiBody());
    }

    return jsonOk({ error: `unrouted: ${url}` }, 500);
  };
}

const realFetch = globalThis.fetch;
async function withRouter<T>(state: RouterState, fn: (s: RouterState) => Promise<T>): Promise<T> {
  installRouter(state);
  try {
    return await fn(state);
  } finally {
    globalThis.fetch = realFetch;
  }
}

// Fast knobs: the failure mode only exists when the first batch outlives
// the dispatch timer, so tests shrink both into the millisecond range.
const FAST_KNOBS = {
  batchSize: 2,
  interBatchDelayMs: 0,
  timeBudgetMs: 10_000,
  dispatchAfterMs: 50,
  dispatchRetryDelayMs: 20,
  selfUrl: SELF_URL,
};

// sanitizeOps/sanitizeResources are off for the same reason as the sibling
// psiSignalRefresh tests: supabase-js keeps an internal interval alive after
// createClient, which the sanitizers would report as a leak.
Deno.test({ name: "slow first batch: dispatch fires mid-flight at the batch's START (conservative replay), parent stops after its batch", sanitizeOps: false, sanitizeResources: false }, async () => {
  const state = mkState(["a1.test", "a2.test", "b1.test", "b2.test"], (d) => (d.startsWith("a") ? 400 : 0));
  await withRouter(state, async (s) => {
    const summary = await runSweep(DEPS, "psi", 0, 0, FAST_KNOBS);

    // The dispatch must carry the START of the in-flight first batch
    // (offset 0): if this isolate dies before the batch's upserts land,
    // the successor replays the batch instead of skipping it permanently.
    assertEquals(s.dispatchAttempts, [{ depth: 1, offset: 0 }]);

    // Mid-flight proof: the dispatch event lands between the first batch's
    // psi-start and psi-end — the old loop-top check could never do that.
    const idxStart = s.events.findIndex(([k, v]) => k === "psi-start" && v === "a1.test");
    const idxDispatch = s.events.findIndex(([k]) => k === "dispatch");
    const idxEnd = s.events.findIndex(([k, v]) => k === "psi-end" && v === "a1.test");
    assert(
      idxStart >= 0 && idxDispatch > idxStart && idxDispatch < idxEnd,
      `dispatch must fire mid-batch: ${JSON.stringify(s.events)}`,
    );

    // Parent processed only its first batch, then yielded to the successor.
    assertEquals(s.upsertedDomains.sort(), ["a1.test", "a2.test"]);
    assertEquals(summary.pagespeed.ok, 2);
    assertEquals(summary.total, 4);
  });
});

Deno.test({ name: "fast sweep: completes in one link, dispatches nothing", sanitizeOps: false, sanitizeResources: false }, async () => {
  const state = mkState(["a1.test", "a2.test", "b1.test"], () => 0);
  await withRouter(state, async (s) => {
    const summary = await runSweep(DEPS, "psi", 0, 0, {
      ...FAST_KNOBS,
      dispatchAfterMs: 5_000, // timer would fire long after the loop ends
    });
    assertEquals(s.dispatchAttempts, []);
    assertEquals(s.upsertedDomains.sort(), ["a1.test", "a2.test", "b1.test"]);
    assertEquals(summary.pagespeed.ok, 3);
  });
});

Deno.test({ name: "failed dispatch: timer retries once, chain still fires with the same replay boundary", sanitizeOps: false, sanitizeResources: false }, async () => {
  const state = mkState(["a1.test", "a2.test", "b1.test", "b2.test"], (d) => (d.startsWith("a") ? 400 : 0), [500, 202]);
  await withRouter(state, async (s) => {
    const summary = await runSweep(DEPS, "psi", 0, 0, FAST_KNOBS);
    assertEquals(s.dispatchAttempts, [{ depth: 1, offset: 0 }, { depth: 1, offset: 0 }]);
    assertEquals(s.upsertedDomains.sort(), ["a1.test", "a2.test"]);
    assertEquals(summary.pagespeed.ok, 2);
  });
});

Deno.test({ name: "delayed 202: parent waits at the reservation and never grows the overlap beyond the in-flight batch", sanitizeOps: false, sanitizeResources: false }, async () => {
  // First batch completes at ~100ms; the self-call's 202 doesn't arrive
  // until ~550ms — long after the batch AND the inter-batch delay. Without
  // the synchronous reservation the parent would start batch 2 before
  // chainFired flips, overlapping the successor on rows it never replayed.
  const state = mkState(["a1.test", "a2.test", "b1.test", "b2.test"], (d) => (d.startsWith("a") ? 100 : 0), [202], 500);
  await withRouter(state, async (s) => {
    const summary = await runSweep(DEPS, "psi", 0, 0, FAST_KNOBS);
    assertEquals(s.dispatchAttempts, [{ depth: 1, offset: 0 }]);
    // The in-flight batch (a*) is the intended replay overlap; the parent
    // must NEVER start a NEW batch (b*) while the handoff is pending.
    assertEquals(s.upsertedDomains.sort(), ["a1.test", "a2.test"]);
    assert(!s.events.some(([k, v]) => k === "psi-start" && String(v).startsWith("b")),
      `parent started a new batch during a pending handoff: ${JSON.stringify(s.events)}`);
    assertEquals(summary.pagespeed.ok, 2);
  });
});

Deno.test({ name: "timer firing during the inter-batch sleep reserves the next boundary (no batch in flight)", sanitizeOps: false, sanitizeResources: false }, async () => {
  // Instant batches, 150ms inter-batch sleep, 50ms dispatch timer: the
  // timer fires while the parent is BETWEEN batches — nothing is in
  // flight, so the boundary is the next unprocessed index (2), and the
  // parent must not start batch 2 while the handoff is pending.
  const state = mkState(["a1.test", "a2.test", "b1.test", "b2.test"], () => 0, [202], 30);
  await withRouter(state, async (s) => {
    const summary = await runSweep(DEPS, "psi", 0, 0, {
      ...FAST_KNOBS,
      interBatchDelayMs: 150,
    });
    assertEquals(s.dispatchAttempts, [{ depth: 1, offset: 2 }]);
    assertEquals(s.upsertedDomains.sort(), ["a1.test", "a2.test"]);
    assertEquals(summary.pagespeed.ok, 2);
  });
});

Deno.test({ name: "parent killed mid-batch: successor replaying from the dispatched boundary covers every firm", sanitizeOps: false, sanitizeResources: false }, async () => {
  // Simulates the wall-clock kill: the parent dispatched its successor at
  // the START of the in-flight batch and then "died" — emulated by
  // treating the parent's eventual writes as lost and running the
  // successor from the captured offset. Every directory firm must end up
  // processed; the freshness stub returns [] so nothing is excused.
  const state = mkState(["a1.test", "a2.test", "b1.test", "b2.test"], (d) => (d.startsWith("a") ? 400 : 0), [202]);
  await withRouter(state, async (s) => {
    await runSweep(DEPS, "psi", 0, 0, FAST_KNOBS);
    assertEquals(s.dispatchAttempts, [{ depth: 1, offset: 0 }]);
    const dispatchedOffset = s.dispatchAttempts[0].offset;

    // Successor run (depth 1) from the replay boundary; its dispatch timer
    // is set far out so this link itself doesn't chain.
    s.upsertedDomains = [];
    const successor = await runSweep(DEPS, "psi", 1, dispatchedOffset, {
      ...FAST_KNOBS,
      dispatchAfterMs: 60_000,
    });
    assertEquals(s.upsertedDomains.sort(), ["a1.test", "a2.test", "b1.test", "b2.test"]);
    assertEquals(successor.pagespeed.ok, 4);
  });
});

Deno.test({ name: "dispatch and retry both fail: reservation is released, parent processes the rest itself", sanitizeOps: false, sanitizeResources: false }, async () => {
  const state = mkState(["a1.test", "a2.test", "b1.test", "b2.test"], (d) => (d.startsWith("a") ? 100 : 0), [500, 500]);
  await withRouter(state, async (s) => {
    const summary = await runSweep(DEPS, "psi", 0, 0, FAST_KNOBS);
    // Two failed attempts at the same boundary, then the parent resumed and
    // finished the directory itself (loop completed → no fallback dispatch).
    assertEquals(s.dispatchAttempts, [{ depth: 1, offset: 0 }, { depth: 1, offset: 0 }]);
    assertEquals(s.upsertedDomains.sort(), ["a1.test", "a2.test", "b1.test", "b2.test"]);
    assertEquals(summary.pagespeed.ok, 4);
  });
});
