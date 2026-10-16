// Deno-native test, run by the test:deno script — this file is excluded from
// vitest, and a vitest-excluded _shared file without a Deno runner is dead
// coverage. Mirrors the pattern of peerStatsProvenance.test.ts.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { peerStatsFor, metricValueOf } from "./peerStats.ts";
import { MIN_PEER_SAMPLE } from "./percentileFormula.ts";

// Mirrors supabase-js's PostgrestFilterBuilder: `.eq()` is chainable and the
// builder itself is thenable. Tracks which fields were filtered on so a test
// can tell a peer-group-scoped query apart from the widened, market-wide one.
function makeMockClient(
  scopedRows: { raw_metrics: Record<string, unknown> }[],
  marketWideRows: { raw_metrics: Record<string, unknown> }[] = [],
  opts: { error?: boolean } = {},
) {
  return {
    from: () => ({
      select: () => {
        const filters: string[] = [];
        const builder = {
          eq: (field: string) => {
            filters.push(field);
            return builder;
          },
          neq: () => builder,
          then: (resolve: (v: unknown) => void) => {
            if (opts.error) return resolve({ data: null, error: new Error("boom") });
            const scoped = filters.includes("peer_group");
            resolve({ data: scoped ? scopedRows : marketWideRows, error: null });
          },
        };
        return builder;
      },
    }),
    // deno-lint-ignore no-explicit-any
  } as any;
}

const row = (followers: number) => ({ raw_metrics: { social: { followers } } });

Deno.test("uses the peer group as-is when the sample is already sufficient", async () => {
  const scoped = [row(100), row(200), row(300), row(400)]; // 4 peers + own = 5
  const client = makeMockClient(scoped);
  const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 500, "firm-under-test.com");
  assertEquals(stats.sampleSize, 5);
  assertEquals(stats.widened, false);
  assertEquals(stats.lowConfidence, false);
});

Deno.test("widens to the whole market when the peer group alone is too small (§2 minimum sample rule)", async () => {
  const scoped = [row(100)]; // 1 peer + own = 2, below MIN_PEER_SAMPLE
  const marketWide = [row(100), row(150), row(200), row(250), row(300), row(350)]; // 6 + own = 7
  const client = makeMockClient(scoped, marketWide);
  const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 500, "firm-under-test.com");
  assertEquals(stats.widened, true);
  assertEquals(stats.sampleSize, 7);
  assertEquals(stats.lowConfidence, false);
});

Deno.test("flags low confidence when even the widened market-wide set is still too small", async () => {
  const marketWide = [row(100)]; // 1 + own = 2, still below MIN_PEER_SAMPLE
  const client = makeMockClient([], marketWide);
  const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 500, "firm-under-test.com");
  assert(stats.sampleSize < MIN_PEER_SAMPLE);
  assertEquals(stats.lowConfidence, true);
});

Deno.test("falls back to the caller's own value alone when the query errors, rather than throwing", async () => {
  const client = makeMockClient([], [], { error: true });
  const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 500, "firm-under-test.com");
  assertEquals(stats.sampleSize, 1);
  assertEquals(stats.value, 500);
  assertEquals(stats.lowConfidence, true);
});

Deno.test("ignores rows missing the requested category or metric", async () => {
  const scoped = [
    { raw_metrics: {} },
    { raw_metrics: { social: {} } },
    { raw_metrics: { thoughtLeadership: { followers: 99999 } } }, // wrong category key
  ];
  const marketWide = [row(10), row(20), row(30), row(40), row(50)];
  const client = makeMockClient(scoped, marketWide);
  const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 42, "firm-under-test.com");
  // None of the scoped rows contribute a value, so it widens.
  assertEquals(stats.widened, true);
  assertEquals(stats.sampleSize, 6); // 5 market-wide + own value
});

Deno.test("unwraps seoAuthority's per-metric PeerStats records into the peer pool (writer/reader contract)", async () => {
  // seoScore.ts persists each metric as a full PeerStats object for
  // client-side auditability. If the pool reader doesn't unwrap .value,
  // every SEO peer query is empty and each firm benchmarks against itself
  // (p90 = own value → ratio 1.0 → saturated max score for everyone).
  const seoRow = (refs: number) => ({
    raw_metrics: {
      seoAuthority: {
        referringDomains: {
          value: refs, peerMedian: 0, p90Threshold: 0, highestObserved: 0,
          sampleSize: 1, comparisonDate: "2026-08-13T00:00:00.000Z", lowConfidence: true, widened: false,
        },
      },
    },
  });
  const scoped = [seoRow(10), seoRow(20), seoRow(30), seoRow(40)];
  const client = makeMockClient(scoped);
  const stats = await peerStatsFor(client, "serbia", "regional", "seoAuthority", "referringDomains", 5, "firm-under-test.com");
  assertEquals(stats.sampleSize, 5); // 4 unwrapped peers + own — objects not dropped
  assertEquals(stats.widened, false);
  // p90 of [5, 10, 20, 30, 40] = 36: real differentiation, not self-benchmark.
  assertEquals(stats.p90Threshold, 36);
});

Deno.test("excludes categories carrying a substitution flag from peer aggregates (keep-and-mark policy)", async () => {
  // Single-strategy PSI fallbacks copy the measured strategy's numbers to
  // the missing one and flag it. Those numerics are estimates and must not
  // enter anyone else's benchmark.
  const perfRow = (perfAvg: number, flag?: Record<string, unknown>) => ({
    raw_metrics: { performance: { perfAvg, ...(flag ?? {}) } },
  });
  const scoped = [
    perfRow(90),
    perfRow(80),
    perfRow(70),
    perfRow(60),
    perfRow(99, { mobileFromDesktop: true }), // excluded
    perfRow(95, { desktopFromMobile: true }), // excluded
  ];
  const client = makeMockClient(scoped);
  const stats = await peerStatsFor(client, "serbia", "regional", "performance", "perfAvg", 50, "firm-under-test.com");
  assertEquals(stats.sampleSize, 5); // 4 clean peers + own value
  assert(stats.p90Threshold < 95); // the flagged 99/95 never entered the pool
});

Deno.test("metricValueOf reads plain numbers, unwraps PeerStats records, rejects junk", () => {
  assertEquals(metricValueOf({ followers: 42 }, "followers"), 42);
  assertEquals(metricValueOf({ rank: { value: 293, sampleSize: 1 } }, "rank"), 293);
  assertEquals(metricValueOf({ rank: { value: "293" } }, "rank"), null); // string value — not a measurement
  assertEquals(metricValueOf({ rank: null }, "rank"), null);
  assertEquals(metricValueOf({}, "missing"), null);
  assertEquals(metricValueOf(undefined, "anything"), null);
});
