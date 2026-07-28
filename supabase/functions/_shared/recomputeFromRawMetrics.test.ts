import { describe, it, expect } from "vitest";
import { recomputeFromRawMetrics, recomputeDirectorySubScore } from "./recomputeFromRawMetrics";
import type { PeerStats } from "./percentileFormula";

const stats = (value: number, p90Threshold: number): PeerStats => ({
  value, peerMedian: p90Threshold / 2, p90Threshold, highestObserved: p90Threshold,
  sampleSize: 10, comparisonDate: "2026-01-01T00:00:00.000Z", lowConfidence: false, widened: false,
});

describe("recomputeFromRawMetrics", () => {
  it("scores nothing (all zero) for an empty raw_metrics object", () => {
    const result = recomputeFromRawMetrics("serbia", {});
    expect(result.total_score).toBe(0);
    expect(result.performance_score).toBe(0);
    expect(result.social_score).toBe(0);
    expect(result.thought_leadership_score).toBe(0);
    expect(result.reputation_score).toBe(0);
  });

  it("recomputes performance from stored desktop/mobile lighthouse categories", () => {
    const raw = {
      performance: {
        desktop: { performance: 100, accessibility: 100, seo: 100 },
        mobile: { performance: 100, accessibility: 100, seo: 100 },
      },
    };
    expect(recomputeFromRawMetrics("serbia", raw).performance_score).toBe(20);
  });

  it("recomputes social from stored PeerStats — a corrected followers value changes the ratio", () => {
    const raw = {
      social: {
        followersStats: stats(500, 1000),
        postsStats: stats(5, 10),
        platforms: { linkedin: true, instagram: false, twitter: false, facebook: false },
      },
    };
    const before = recomputeFromRawMetrics("serbia", raw).social_score;

    // Correct followers up to the peer 90th-percentile threshold — ratio goes from 0.5 to 1.0.
    const corrected = structuredClone(raw);
    corrected.social.followersStats.value = 1000;
    const after = recomputeFromRawMetrics("serbia", corrected).social_score;

    expect(after).toBeGreaterThan(before);
  });

  it("recomputes thought leadership from stored PeerStats and bylinePct fraction", () => {
    const raw = {
      thoughtLeadership: {
        postsStats: stats(10, 20),
        newsStats: stats(2, 4),
        bylinePct: 0.5,
      },
    };
    // 25*(10/20) + 5*0.5 + 15*(2/4) = 12.5 + 2.5 + 7.5 = 22.5
    expect(recomputeFromRawMetrics("serbia", raw).thought_leadership_score).toBeCloseTo(22.5, 5);
  });

  it("recomputes reputation gbp + directory points without a peer requery", () => {
    const raw = {
      reputation: {
        gbpListed: true,
        chambers: { points: 0, count: 2, avgRank: 2, qualityStats: stats(3, 4) },
      },
    };
    const result = recomputeFromRawMetrics("serbia", raw);
    // gbp 10 + chambers countScore (min(10, 10*2/7)) + qualityScore (5 * 3/4), rounded to 2 decimals
    const expectedCount = Math.min(10, 10 * (2 / 7));
    const expected = Math.round((10 + expectedCount + 5 * 0.75) * 100) / 100;
    expect(result.reputation_score).toBe(expected);
  });

  it("never fabricates a score for an unknown market", () => {
    const raw = { reputation: { gbpListed: true } };
    expect(recomputeFromRawMetrics("nowhere", raw).reputation_score).toBe(10);
  });
});

describe("recomputeDirectorySubScore", () => {
  it("returns zeros for an empty ranked-tables object", () => {
    const result = recomputeDirectorySubScore({}, 4, null);
    expect(result.count).toBe(0);
    expect(result.avgRank).toBeNull();
    expect(result.qualityStats).toBeNull();
  });

  it("recomputes avgRank/invertedAvg and keeps the existing p90Threshold", () => {
    const previous = stats(2, 4); // stale value, real p90Threshold to preserve
    const result = recomputeDirectorySubScore({ CC: 1, DR: 1 }, 4, previous);
    expect(result.count).toBe(2);
    expect(result.avgRank).toBe(1);
    // invertedAvg = deepest(4) + 1 - avgRank(1) = 4
    expect(result.qualityStats?.value).toBe(4);
    expect(result.qualityStats?.p90Threshold).toBe(4); // unchanged from `previous`
  });
});
