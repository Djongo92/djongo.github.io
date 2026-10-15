import { describe, it, expect } from "vitest";
import { percentileOf, computePeerStats, p90Ratio, MIN_PEER_SAMPLE } from "./percentileFormula";

describe("percentileOf", () => {
  it("returns the single value for a sample of one", () => {
    expect(percentileOf([42], 90)).toBe(42);
  });

  it("returns 0 for an empty sample", () => {
    expect(percentileOf([], 90)).toBe(0);
  });

  it("matches the standard linear-interpolation method on a known set", () => {
    // [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] — p90 via linear interpolation
    // (Excel PERCENTILE.INC / numpy default) is 91.
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentileOf(values, 90)).toBeCloseTo(91);
    expect(percentileOf(values, 50)).toBeCloseTo(55);
  });
});

describe("computePeerStats", () => {
  it("reports all six required values plus confidence/widen flags", () => {
    const values = [100, 200, 300, 400, 500];
    const stats = computePeerStats(values, 300, { now: new Date("2026-07-27T00:00:00Z") });
    expect(stats.value).toBe(300);
    expect(stats.sampleSize).toBe(5);
    expect(stats.highestObserved).toBe(500);
    expect(stats.peerMedian).toBe(300);
    expect(stats.comparisonDate).toBe("2026-07-27T00:00:00.000Z");
    expect(stats.lowConfidence).toBe(false);
    expect(stats.widened).toBe(false);
  });

  it("flags low confidence below the minimum sample size (defect §2 minimum sample rule)", () => {
    const values = [10, 20, 30]; // 3 firms — below MIN_PEER_SAMPLE (5)
    const stats = computePeerStats(values, 20);
    expect(stats.sampleSize).toBeLessThan(MIN_PEER_SAMPLE);
    expect(stats.lowConfidence).toBe(true);
  });

  it("carries the widened flag through when passed", () => {
    const stats = computePeerStats([1, 2, 3, 4, 5, 6], 3, { widened: true });
    expect(stats.widened).toBe(true);
  });
});

describe("p90Ratio", () => {
  it("caps at full marks for a firm AT the 90th percentile, not just above it", () => {
    const stats = { value: 90, p90Threshold: 90 };
    expect(p90Ratio(stats)).toBe(1);
  });

  it("caps at full marks for a firm above the threshold — a dominant outlier can't push others down further", () => {
    const stats = { value: 10_000, p90Threshold: 90 };
    expect(p90Ratio(stats)).toBe(1);
  });

  it("scales linearly below the threshold", () => {
    const stats = { value: 45, p90Threshold: 90 };
    expect(p90Ratio(stats)).toBeCloseTo(0.5);
  });

  it("returns 0 when the threshold is 0 (no signal to compare against)", () => {
    const stats = { value: 0, p90Threshold: 0 };
    expect(p90Ratio(stats)).toBe(0);
  });

  it("a single dominant firm no longer distorts the field (the actual §2 complaint)", () => {
    // One outlier at 10,000 among otherwise-modest firms. Under the old
    // divide-by-max approach, a firm at 500 would score 500/10000 = 5%.
    // Under p90 benchmarking, the 90th percentile of this set is far lower
    // than the outlier, so a solid-but-unspectacular firm still earns real
    // credit instead of being crushed by one rival.
    const values = [50, 80, 120, 150, 200, 250, 10_000];
    const stats = computePeerStats(values, 250);
    const oldWayRatio = 250 / 10_000; // 0.025 — the bug
    const newWayRatio = p90Ratio(stats);
    expect(newWayRatio).toBeGreaterThan(oldWayRatio * 2);
  });
});
