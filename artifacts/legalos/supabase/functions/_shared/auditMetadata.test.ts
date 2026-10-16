import { describe, it, expect } from "vitest";
import { computeAuditConfidence, computeDataWindow } from "./auditMetadata";
import type { PeerStats } from "./percentileFormula";

const stats = (overrides: Partial<PeerStats>): PeerStats => ({
  value: 10, peerMedian: 5, p90Threshold: 9, highestObserved: 12,
  sampleSize: 7, comparisonDate: "2026-07-27T00:00:00.000Z", lowConfidence: false, widened: false,
  ...overrides,
});

describe("computeAuditConfidence", () => {
  it("takes the smallest sample size across metrics — the weakest link", () => {
    const result = computeAuditConfidence([stats({ sampleSize: 20 }), stats({ sampleSize: 6 }), stats({ sampleSize: 12 })]);
    expect(result.sampleSize).toBe(6);
  });

  it("scores full confidence when every metric met the minimum sample", () => {
    const result = computeAuditConfidence([stats({ lowConfidence: false }), stats({ lowConfidence: false })]);
    expect(result.confidenceScore).toBe(1);
  });

  it("scores partial confidence when only some metrics met the minimum sample", () => {
    const result = computeAuditConfidence([
      stats({ lowConfidence: false }), stats({ lowConfidence: false }),
      stats({ lowConfidence: true }), stats({ lowConfidence: true }),
    ]);
    expect(result.confidenceScore).toBe(0.5);
  });

  it("ignores null/undefined entries (a metric that scored 'missing' has no comparison to grade)", () => {
    const result = computeAuditConfidence([stats({ lowConfidence: false }), null, undefined, stats({ lowConfidence: false })]);
    expect(result.confidenceScore).toBe(1);
  });

  it("returns nulls when there are no peer-normalized metrics at all", () => {
    const result = computeAuditConfidence([null, undefined]);
    expect(result.sampleSize).toBeNull();
    expect(result.confidenceScore).toBeNull();
  });
});

describe("computeDataWindow", () => {
  it("spans exactly windowDays back from now", () => {
    const now = new Date("2026-07-27T00:00:00.000Z");
    const { start, end } = computeDataWindow(now, 60);
    expect(end).toBe("2026-07-27T00:00:00.000Z");
    expect(start).toBe("2026-05-28T00:00:00.000Z");
  });
});
