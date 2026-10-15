// Unit tests for the Network Intelligence insight builders: privacy floor,
// momentum/cadence math, category-standing gap selection, and the guarantee
// that nothing is emitted from a thin cohort.
import { describe, it, expect } from "vitest";
import { buildNetworkInsights, nextCronBatch, MIN_COHORT_FIRMS, type CohortFirm } from "./networkInsights";

let seq = 0;
const firm = (
  clientId: string,
  totals: number[],
  opts: { social?: number[]; thought?: number[]; runs?: number } = {},
): CohortFirm => ({
  clientId,
  runCount90d: opts.runs ?? 0,
  audits: totals.map((t, i) => ({
    totalScore: t,
    socialScore: opts.social?.[i] ?? 10,
    thoughtScore: opts.thought?.[i] ?? 20,
    createdAt: new Date(2026, 5, ++seq).toISOString(),
  })),
});

describe("privacy floor", () => {
  it("returns nothing below MIN_COHORT_FIRMS distinct firms, even with perfect data", () => {
    const cohort = [firm("a", [100, 140], { runs: 8 }), firm("b", [100, 101])];
    expect(cohort.length).toBeLessThan(MIN_COHORT_FIRMS);
    expect(buildNetworkInsights(cohort, "a")).toEqual([]);
  });

  it("duplicate client_ids do not count toward the floor", () => {
    const one = firm("a", [100, 140], { runs: 8 });
    const dupe = { ...one, audits: [...one.audits] };
    expect(buildNetworkInsights([one, dupe, firm("b", [90, 95])], "a")).toEqual([]);
  });
});

describe("buildNetworkInsights", () => {
  const cohort = [
    firm("own", [120, 122], { social: [8, 8], thought: [18, 18], runs: 1 }),
    firm("p1", [100, 130], { runs: 7 }),
    firm("p2", [110, 138], { runs: 6 }),
    firm("p3", [100, 102], { runs: 0 }),
    firm("p4", [105, 106], { runs: 1 }),
    firm("p5", [100, 112, 125], { runs: 9 }),
    firm("p6", [90, 95, 100, 110], { runs: 6 }),
  ];

  const insights = buildNetworkInsights(cohort, "own");

  it("emits the momentum insight when active workshop users out-improve quiet ones", () => {
    const m = insights.find((i) => i.key === "workshop-momentum");
    expect(m).toBeDefined();
    expect(m!.stat).toMatch(/^\+\d+ pts$/);
    expect(m!.title).toContain("Workshop");
    expect(m!.sampleSize).toBe(6); // peer-only: 6 peers with 2+ audits, requester excluded
  });

  it("emits the cadence insight when 3+-audit firms out-improve 2-audit firms", () => {
    const c = insights.find((i) => i.key === "audit-cadence");
    expect(c).toBeDefined();
    expect(c!.detail).toContain("3+ audits");
  });

  it("emits category-standing only when the own-vs-peer gap exceeds 5% of category max", () => {
    // own social 8/20 vs peers avg 10/20 → gap 2/20 = 10% → emitted
    const s = insights.find((i) => i.key === "category-standing");
    expect(s).toBeDefined();
    expect(s!.title).toContain("Social");

    // Own firm matching peers → no gap insight.
    const flat = [
      firm("own", [100, 100], { social: [10, 10], thought: [20, 20] }),
      firm("p1", [100, 100], { social: [10, 10], thought: [20, 20] }),
      firm("p2", [100, 100], { social: [10, 10], thought: [20, 20] }),
      firm("p3", [100, 100], { social: [10, 10], thought: [20, 20] }),
    ];
    expect(buildNetworkInsights(flat, "own").find((i) => i.key === "category-standing")).toBeUndefined();
  });

  it("peer comparisons exclude the requesting firm's own numbers", () => {
    // Own firm has wildly high social — if it leaked into the peer average,
    // the gap would invert and the insight would flip direction.
    const skewed = [
      firm("own", [100, 100], { social: [20, 20], thought: [45, 45], runs: 9 }),
      firm("p1", [100, 130], { social: [5, 5], runs: 7 }),
      firm("p2", [100, 128], { social: [5, 5], runs: 7 }),
      firm("p3", [100, 101], { social: [5, 5], runs: 0 }),
    ];
    const s = buildNetworkInsights(skewed, "own").find((i) => i.key === "category-standing");
    expect(s).toBeUndefined(); // own ≥ peers on both categories → no gap to report
  });

  it("caps at 3 insights and marks small samples as emerging", () => {
    expect(insights.length).toBeLessThanOrEqual(3);
    for (const i of insights) {
      expect(["emerging", "solid"]).toContain(i.confidence);
      expect(i.sampleSize).toBeGreaterThan(0);
    }
    expect(insights.every((i) => i.confidence === "emerging")).toBe(true); // n=7 < 8
  });

  it("emits nothing when no pattern clears its threshold (honest silence)", () => {
    const flatline = ["a", "b", "c", "d"].map((id) => firm(id, [100, 100]));
    expect(buildNetworkInsights(flatline, "a")).toEqual([]);
  });
});

describe("subgroup disclosure guard (a stat must never isolate one firm)", () => {
  it("suppresses momentum when the active subgroup is a single firm", () => {
    const thin = [
      firm("own", [100, 101], { runs: 0 }),
      firm("p1", [100, 140], { runs: 8 }), // sole active firm — its exact delta must not be published
      firm("p2", [100, 101], { runs: 0 }),
      firm("p3", [100, 100], { runs: 0 }),
    ];
    expect(buildNetworkInsights(thin, "own").find((i) => i.key === "workshop-momentum")).toBeUndefined();
  });

  it("suppresses cadence when the frequent-audit subgroup is a single firm", () => {
    const thin = [
      firm("own", [100, 101], { runs: 0 }),
      firm("p1", [100, 110, 140], { runs: 0 }), // sole 3+-audit firm
      firm("p2", [100, 101], { runs: 0 }),
      firm("p3", [100, 100], { runs: 0 }),
    ];
    expect(buildNetworkInsights(thin, "own").find((i) => i.key === "audit-cadence")).toBeUndefined();
  });

  it("the requester's own delta never feeds a published comparison (peer-only)", () => {
    // Own firm is the ONLY active workshop user — if the requester were
    // included, their own delta would leak as the "active" subgroup average.
    const ownIsActive = [
      firm("own", [100, 160], { runs: 9 }),
      firm("p1", [100, 101], { runs: 0 }),
      firm("p2", [100, 102], { runs: 0 }),
      firm("p3", [100, 100], { runs: 0 }),
    ];
    expect(buildNetworkInsights(ownIsActive, "own").find((i) => i.key === "workshop-momentum")).toBeUndefined();
  });

  it("suppresses category standing with fewer than MIN_COHORT_FIRMS peers (requester never counts)", () => {
    const twoPeers = [
      firm("own", [100, 100], { social: [8, 8], thought: [18, 18] }),
      firm("p1", [100, 100], { social: [14, 14], thought: [30, 30] }),
      firm("p2", [100, 100], { social: [14, 14], thought: [30, 30] }),
    ];
    expect(buildNetworkInsights(twoPeers, "own").find((i) => i.key === "category-standing")).toBeUndefined();
  });
});

describe("nextCronBatch (durable batched sweep)", () => {
  const ids = ["a1", "b2", "c3", "d4", "e5"]; // pre-sorted, as the RPC returns

  it("takes the first batch from a null cursor and advances the cursor", () => {
    const { batch, nextCursor } = nextCronBatch(ids, null, 2);
    expect(batch).toEqual(["a1", "b2"]);
    expect(nextCursor).toBe("b2");
  });

  it("resumes after the cursor and wraps to null when the sweep completes", () => {
    const mid = nextCronBatch(ids, "b2", 2);
    expect(mid.batch).toEqual(["c3", "d4"]);
    expect(mid.nextCursor).toBe("d4");

    const last = nextCronBatch(ids, "d4", 2);
    expect(last.batch).toEqual(["e5"]);
    expect(last.nextCursor).toBeNull(); // wrap: next run starts from the top
  });

  it("a cursor past every id (or an empty eligible list) yields an empty batch and wraps", () => {
    expect(nextCronBatch(ids, "z9", 2)).toEqual({ batch: [], nextCursor: null });
    expect(nextCronBatch([], null, 2)).toEqual({ batch: [], nextCursor: null });
  });

  it("every firm is covered across consecutive batches — none is ever skipped", () => {
    const many = Array.from({ length: 120 }, (_, i) => `f${String(i).padStart(4, "0")}`);
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let run = 0; run < 10 && (cursor !== null || run === 0); run++) {
      const { batch, nextCursor } = nextCronBatch(many, cursor, 50);
      seen.push(...batch);
      cursor = nextCursor;
    }
    expect(seen).toHaveLength(120);
    expect(new Set(seen).size).toBe(120); // no duplicates, no omissions
  });
});
