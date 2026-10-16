// Tests for computeTrendSummary — the single derivation every export format
// (PDF / DOCX / PPTX) renders its trend block from, so the formats can't
// drift on wording, rounding, or thin-sample gating.
import { describe, it, expect } from "vitest";
import { computeTrendSummary, type ExecutiveReportHistoryPoint } from "./executiveReportData";

const point = (over: Partial<ExecutiveReportHistoryPoint> = {}): ExecutiveReportHistoryPoint => ({
  recordedAt: "2026-07-01T00:00:00Z",
  totalScore: 40,
  confidenceScore: 1,
  sampleSize: 12,
  rawMetric: null,
  ...over,
});

describe("computeTrendSummary", () => {
  it("returns null with fewer than two measurements — no trend to show", () => {
    expect(computeTrendSummary([])).toBeNull();
    expect(computeTrendSummary([point()])).toBeNull();
  });

  it("renders the signed delta line from first→last with the measurement count", () => {
    const trend = computeTrendSummary([
      point({ recordedAt: "2026-07-01T00:00:00Z", totalScore: 40 }),
      point({ recordedAt: "2026-08-01T00:00:00Z", totalScore: 43.24 }),
    ]);
    expect(trend?.delta).toBe(3.2);
    expect(trend?.deltaLine).toBe(
      `+3.2 points since ${new Date("2026-07-01T00:00:00Z").toLocaleDateString()} (2 measurements)`,
    );
  });

  it("prefixes a negative delta with a minus, not a plus", () => {
    const trend = computeTrendSummary([
      point({ totalScore: 50 }),
      point({ totalScore: 48.5 }),
    ]);
    expect(trend?.delta).toBe(-1.5);
    expect(trend?.deltaLine.startsWith("-1.5 points since")).toBe(true);
  });

  it("flags only points with a recorded confidence below 1 — null (older rows) is not 'thin'", () => {
    const trend = computeTrendSummary([
      point({ confidenceScore: null }), // predates the field — not counted
      point({ confidenceScore: 0.4 }),  // thin
      point({ confidenceScore: 1 }),    // full sample
    ]);
    expect(trend?.thinCount).toBe(1);
    expect(trend?.thinSampleNote).toBe(
      "1 of 3 historical points were recorded on a thin peer sample (low confidence) — a sharp dip there may be sampling, not regression.",
    );
  });

  it("omits the thin-sample caveat when every point had a full sample", () => {
    const trend = computeTrendSummary([point(), point({ totalScore: 41 })]);
    expect(trend?.thinCount).toBe(0);
    expect(trend?.thinSampleNote).toBeNull();
  });

  it("surfaces the LATEST point's evidence line, and only when it was recorded", () => {
    const withEvidence = computeTrendSummary([
      point({ rawMetric: "old evidence" }),
      point({ totalScore: 41, rawMetric: "1,850 followers · ★ 4.6 GBP" }),
    ]);
    expect(withEvidence?.evidenceLine).toBe("Latest snapshot evidence: 1,850 followers · ★ 4.6 GBP");

    const without = computeTrendSummary([point(), point({ totalScore: 41, rawMetric: null })]);
    expect(without?.evidenceLine).toBeNull();
  });
});
