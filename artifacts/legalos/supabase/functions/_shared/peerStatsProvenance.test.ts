// Orchestration-level provenance gate test for the OTHER keep-and-mark rule:
// performance rows flagged mobileFromDesktop / desktopFromMobile carry
// substituted (estimated) numerics that stay in the flagged firm's own
// raw_metrics for honesty but must NEVER enter peer aggregates. The skip
// lives inside fetchPeerValues (peerStats.ts) — a refactor there could drop
// the gate while the peerStats unit tests' hand-rolled mocks keep passing
// vacuously. This test follows the runVisibilityAudit.test.ts pattern: a
// fake supabase query-builder service client returns a PUBLISHED-audit set
// exactly as the live `market_visibility_audits` query would, including
// flagged rows with sentinel numerics, and we assert those numerics never
// reach the computed peer stats:
//   1. a flagged row is excluded from sampleSize, and its sentinel value
//      never shows up in p90Threshold / peerMedian / highestObserved;
//   2. the same exclusion holds on the WIDENED market-wide tier — widening
//      must not become a side door for estimates;
//   3. as a positive control, the identical row WITHOUT the flag IS counted
//      — so if the stubbing here were wrong, the control fails instead of
//      the gate tests passing vacuously.
//
// Runs under the Deno test gate (`pnpm --filter @workspace/legalos run
// test:deno`, registered as the `test-deno` validation): peerStats.ts sits
// in the esm.sh/Deno module graph of the audit runner, so this file is
// exercised in the same runtime the deployed edge functions use.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { peerStatsFor } from "./peerStats.ts";

// Sentinel numerics: if either ever shows up in a computed stat, an
// estimated (substituted) PSI value leaked into the peer pool.
const LEAK_MOBILE_SUB = 999_331;
const LEAK_DESKTOP_SUB = 888_442;

type Row = { raw_metrics: Record<string, unknown>; audited_domain?: string };

const cleanRow = (perfAvg: number): Row => ({ raw_metrics: { performance: { perfAvg } } });
const flaggedRow = (perfAvg: number, flag: "mobileFromDesktop" | "desktopFromMobile"): Row => ({
  raw_metrics: { performance: { perfAvg, [flag]: true } },
});

// ── fake supabase service client ─────────────────────────────────────────
// Mirrors the recording query builder from runVisibilityAudit.test.ts:
// chainable, thenable, and it tracks which columns were filtered on so the
// peer-group-scoped tier can be told apart from the widened market-wide one
// — exactly the distinction fetchPeerValues's three-tier widening relies on.
function makeServiceClient(scopedRows: Row[], marketWideRows: Row[] = scopedRows) {
  const tiersQueried: string[] = [];
  // deno-lint-ignore no-explicit-any
  function builder(table: string): any {
    assertEquals(table, "market_visibility_audits", "peer values must come from published audits");
    const filters: string[] = [];
    // deno-lint-ignore no-explicit-any
    const b: any = {
      select: () => b,
      eq: (field: string) => {
        filters.push(field);
        return b;
      },
      neq: () => b,
      // deno-lint-ignore no-explicit-any
      then(resolve: (v: any) => void, reject?: (e: unknown) => void) {
        const scoped = filters.includes("peer_group");
        tiersQueried.push(scoped ? "peer_group" : "market_wide");
        assert(filters.includes("is_public"), "peer pool must only read PUBLISHED audits");
        return Promise.resolve({ data: scoped ? scopedRows : marketWideRows, error: null }).then(resolve, reject);
      },
    };
    return b;
  }
  return { client: { from: (table: string) => builder(table) }, tiersQueried };
}

function assertNoSentinel(stats: { peerMedian: number; p90Threshold: number; highestObserved: number }) {
  for (const [k, v] of Object.entries(stats)) {
    assert(v !== LEAK_MOBILE_SUB && v !== LEAK_DESKTOP_SUB, `${k}: estimated PSI sentinel leaked into peer stats (${v})`);
  }
}

Deno.test("flagged mobileFromDesktop/desktopFromMobile rows are excluded from sampleSize, median and p90", async () => {
  const scoped = [
    cleanRow(10),
    cleanRow(20),
    cleanRow(30),
    cleanRow(40),
    flaggedRow(LEAK_MOBILE_SUB, "mobileFromDesktop"),
    flaggedRow(LEAK_DESKTOP_SUB, "desktopFromMobile"),
  ];
  const { client, tiersQueried } = makeServiceClient(scoped);
  // deno-lint-ignore no-explicit-any
  const stats = await peerStatsFor(client as any, "belgrade", "local", "performance", "perfAvg", 50, "firm-under-test.com");

  // 4 clean peers + own value = 5; the two flagged rows must not count.
  assertEquals(stats.sampleSize, 5);
  assertEquals(stats.lowConfidence, false);
  assertEquals(stats.widened, false);
  // Values seen: [10, 20, 30, 40, 50] — stats computed over CLEAN rows only.
  assertEquals(stats.peerMedian, 30);
  assertEquals(stats.p90Threshold, 46);
  assertEquals(stats.highestObserved, 50);
  assertNoSentinel(stats);
  // 4 clean peers + own already meet MIN_PEER_SAMPLE, so no widening query
  // should have run — the flagged rows must not shrink the sample into a
  // widened tier either.
  assertEquals(tiersQueried, ["peer_group"]);
});

Deno.test("widened market-wide tier applies the same gate — widening is not a side door for estimates", async () => {
  // Scoped tier: nothing but flagged rows → after the gate only the own
  // value remains, forcing the market-wide fallback.
  const scoped = [
    flaggedRow(LEAK_MOBILE_SUB, "mobileFromDesktop"),
    flaggedRow(LEAK_DESKTOP_SUB, "desktopFromMobile"),
  ];
  const marketWide = [
    ...scoped,
    cleanRow(15),
    cleanRow(25),
    cleanRow(35),
    cleanRow(45),
    cleanRow(55),
  ];
  const { client, tiersQueried } = makeServiceClient(scoped, marketWide);
  // deno-lint-ignore no-explicit-any
  const stats = await peerStatsFor(client as any, "belgrade", "local", "performance", "perfAvg", 65, "firm-under-test.com");

  assertEquals(stats.widened, true);
  assert(tiersQueried.includes("market_wide"), "expected the market-wide fallback to run");
  // 5 clean market-wide peers + own = 6; flagged rows excluded in BOTH tiers.
  assertEquals(stats.sampleSize, 6);
  // Values seen: [15, 25, 35, 45, 55, 65] — exact stats over CLEAN rows only.
  // A leaked sentinel would shift p90 to an interpolated (huge) value, so
  // the exact-value assertion is the real gate; assertNoSentinel is belt
  // and braces.
  assertEquals(stats.peerMedian, 40);
  assertEquals(stats.p90Threshold, 60);
  assertEquals(stats.highestObserved, 65);
  assertNoSentinel(stats);
});

Deno.test("positive control: the identical row WITHOUT the flag IS counted", async () => {
  // Same shape as the flagged rows, flags absent — if the stub or the metric
  // path were wrong, this control fails instead of the gate tests passing
  // vacuously.
  const scoped = [
    cleanRow(10),
    cleanRow(20),
    cleanRow(30),
    cleanRow(40),
    cleanRow(LEAK_MOBILE_SUB), // unflagged: a real (huge) measurement counts
  ];
  const { client } = makeServiceClient(scoped);
  // deno-lint-ignore no-explicit-any
  const stats = await peerStatsFor(client as any, "belgrade", "local", "performance", "perfAvg", 50, "firm-under-test.com");

  assertEquals(stats.sampleSize, 6);
  assertEquals(stats.highestObserved, LEAK_MOBILE_SUB);
});
