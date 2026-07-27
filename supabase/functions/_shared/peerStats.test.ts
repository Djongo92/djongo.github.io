import { describe, it, expect } from "vitest";
import { peerStatsFor } from "./peerStats";
import { MIN_PEER_SAMPLE } from "./percentileFormula";

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

describe("peerStatsFor", () => {
  it("uses the peer group as-is when the sample is already sufficient", async () => {
    const scoped = [row(100), row(200), row(300), row(400)]; // 4 peers + own = 5
    const client = makeMockClient(scoped);
    const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 500, "firm-under-test.com");
    expect(stats.sampleSize).toBe(5);
    expect(stats.widened).toBe(false);
    expect(stats.lowConfidence).toBe(false);
  });

  it("widens to the whole market when the peer group alone is too small (§2 minimum sample rule)", async () => {
    const scoped = [row(100)]; // 1 peer + own = 2, below MIN_PEER_SAMPLE
    const marketWide = [row(100), row(150), row(200), row(250), row(300), row(350)]; // 6 + own = 7
    const client = makeMockClient(scoped, marketWide);
    const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 500, "firm-under-test.com");
    expect(stats.widened).toBe(true);
    expect(stats.sampleSize).toBe(7);
    expect(stats.lowConfidence).toBe(false);
  });

  it("flags low confidence when even the widened market-wide set is still too small", async () => {
    const scoped: { raw_metrics: Record<string, unknown> }[] = [];
    const marketWide = [row(100)]; // 1 + own = 2, still below MIN_PEER_SAMPLE
    const client = makeMockClient(scoped, marketWide);
    const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 500, "firm-under-test.com");
    expect(stats.sampleSize).toBeLessThan(MIN_PEER_SAMPLE);
    expect(stats.lowConfidence).toBe(true);
  });

  it("falls back to the caller's own value alone when the query errors, rather than throwing", async () => {
    const client = makeMockClient([], [], { error: true });
    const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 500, "firm-under-test.com");
    expect(stats.sampleSize).toBe(1);
    expect(stats.value).toBe(500);
    expect(stats.lowConfidence).toBe(true);
  });

  it("ignores rows missing the requested category or metric", async () => {
    const scoped = [
      { raw_metrics: {} },
      { raw_metrics: { social: {} } },
      { raw_metrics: { thoughtLeadership: { followers: 99999 } } }, // wrong category key
    ];
    const marketWide = [row(10), row(20), row(30), row(40), row(50)];
    const client = makeMockClient(scoped, marketWide);
    const stats = await peerStatsFor(client, "serbia", "regional", "social", "followers", 42, "firm-under-test.com");
    // None of the scoped rows contribute a value, so it widens.
    expect(stats.widened).toBe(true);
    expect(stats.sampleSize).toBe(6); // 5 market-wide + own value
  });
});
