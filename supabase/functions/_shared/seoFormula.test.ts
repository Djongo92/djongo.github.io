import { describe, it, expect } from "vitest";
import { calculateSeoScore, SEO_MAX } from "./seoFormula";

describe("calculateSeoScore", () => {
  it("scores the full 60 points when all six metrics are at ratio 1", () => {
    const result = calculateSeoScore([1, 1, 1, 1, 1, 1]);
    expect(result.score).toBe(60);
    expect(result.metricsAvailable).toBe(6);
    expect(result.metricsTotal).toBe(6);
  });

  it("scores 0 when every metric is missing (no provider configured)", () => {
    const result = calculateSeoScore([null, null, null, null, null, null]);
    expect(result.score).toBe(0);
    expect(result.metricsAvailable).toBe(0);
    expect(result.metricsTotal).toBe(6);
  });

  it("does not divide by zero or blow up with no metrics available", () => {
    const result = calculateSeoScore([null, null, null, null, null, null]);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it("rescales to the available subset instead of treating missing metrics as earned zeros", () => {
    // Open PageRank case: only domainAuthority available, at the peer
    // group's 90th percentile (ratio 1) — should read as the full 60, not
    // 10 (1 metric's worth) out of 60.
    const result = calculateSeoScore([1, null, null, null, null, null]);
    expect(result.score).toBe(SEO_MAX);
    expect(result.metricsAvailable).toBe(1);
  });

  it("averages a partial subset proportionally, not against the full six", () => {
    // Moz case: 4 of 6 metrics available (no organic traffic/keywords),
    // two of them at ratio 1 and two at ratio 0.5 — average of the
    // *available* ratios is 0.75, not diluted by the two missing ones.
    const result = calculateSeoScore([1, 1, 0.5, 0.5, null, null]);
    expect(result.score).toBe(45); // 60 * 0.75
    expect(result.metricsAvailable).toBe(4);
  });

  it("scores a middling fully-measured firm proportionally", () => {
    const result = calculateSeoScore([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(result.score).toBe(30);
  });
});
