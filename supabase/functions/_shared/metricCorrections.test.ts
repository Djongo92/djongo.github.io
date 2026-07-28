import { describe, it, expect } from "vitest";
import { applyMetricCorrection } from "./metricCorrections";

describe("applyMetricCorrection", () => {
  it("rejects a metric path that isn't on the whitelist", () => {
    const result = applyMetricCorrection("social", "social.notARealField", 5, {}, "serbia");
    expect("error" in result).toBe(true);
  });

  it("patches a lighthouse leaf and returns the previous value", () => {
    const raw = { performance: { desktop: { performance: 40, accessibility: 80, seo: 90 }, mobile: {} } };
    const result = applyMetricCorrection("performance", "performance.desktop.performance", 95, raw, "serbia");
    if ("error" in result) throw new Error(result.error);
    expect(result.previousValue).toBe(40);
    expect(result.patchedRawMetrics.performance.desktop.performance).toBe(95);
  });

  it("rejects an out-of-range lighthouse value", () => {
    const raw = { performance: { desktop: {}, mobile: {} } };
    const result = applyMetricCorrection("performance", "performance.desktop.seo", 150, raw, "serbia");
    expect("error" in result).toBe(true);
  });

  it("keeps social.followers and social.followersStats.value in sync", () => {
    const raw = { social: { followers: 500, followersStats: { value: 500, peerMedian: 400, p90Threshold: 1000, highestObserved: 1200, sampleSize: 8, comparisonDate: "2026-01-01", lowConfidence: false, widened: false } } };
    const result = applyMetricCorrection("social", "social.followers", 800, raw, "serbia");
    if ("error" in result) throw new Error(result.error);
    expect(result.patchedRawMetrics.social.followers).toBe(800);
    expect(result.patchedRawMetrics.social.followersStats.value).toBe(800);
    // p90Threshold untouched — no peer requery.
    expect(result.patchedRawMetrics.social.followersStats.p90Threshold).toBe(1000);
  });

  it("converts a 0-100 byline percentage input into the stored 0-1 fraction", () => {
    const raw = { thoughtLeadership: { bylinePct: 0.2 } };
    const result = applyMetricCorrection("thoughtLeadership", "thoughtLeadership.bylinePct", 75, raw, "serbia");
    if ("error" in result) throw new Error(result.error);
    expect(result.patchedRawMetrics.thoughtLeadership.bylinePct).toBe(0.75);
    expect(result.previousValue).toBeCloseTo(20, 5);
  });

  it("rejects a boolean field given a non-boolean value", () => {
    const result = applyMetricCorrection("reputation", "reputation.gbpListed", "yes", {}, "serbia");
    expect("error" in result).toBe(true);
  });

  it("rejects an unknown practice-area code for a directory table", () => {
    const result = applyMetricCorrection("reputation", "reputation.chambersRankedTables.ZZ", 2, {}, "serbia");
    expect("error" in result).toBe(true);
  });

  it("rejects a rank deeper than the market's deepest band", () => {
    // Serbia's chambers deepestBand is 4 (see marketVisibilityConfig.ts).
    const result = applyMetricCorrection("reputation", "reputation.chambersRankedTables.CC", 9, {}, "serbia");
    expect("error" in result).toBe(true);
  });

  it("recomputes avgRank and count when a directory ranked-table entry is corrected", () => {
    const raw = {
      reputation: {
        chambersRankedTables: { CC: 2 },
        chambers: { points: 0, count: 1, avgRank: 2, qualityStats: { value: 3, peerMedian: 2, p90Threshold: 4, highestObserved: 4, sampleSize: 6, comparisonDate: "2026-01-01", lowConfidence: false, widened: false } },
      },
    };
    const result = applyMetricCorrection("reputation", "reputation.chambersRankedTables.CC", 1, raw, "serbia");
    if ("error" in result) throw new Error(result.error);
    expect(result.previousValue).toBe(2);
    expect(result.patchedRawMetrics.reputation.chambersRankedTables.CC).toBe(1);
    expect(result.patchedRawMetrics.reputation.chambers.count).toBe(1);
    expect(result.patchedRawMetrics.reputation.chambers.avgRank).toBe(1);
    // invertedAvg = deepestBand(4) + 1 - avgRank(1) = 4
    expect(result.patchedRawMetrics.reputation.chambers.qualityStats.value).toBe(4);
    // p90Threshold preserved from the original qualityStats — no peer requery.
    expect(result.patchedRawMetrics.reputation.chambers.qualityStats.p90Threshold).toBe(4);
  });
});
