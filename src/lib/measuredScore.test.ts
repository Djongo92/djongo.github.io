import { describe, it, expect } from "vitest";
import { computeMeasuredTotals } from "./measuredScore";

describe("computeMeasuredTotals", () => {
  it("excludes a missing category from the denominator (defect 1.2)", () => {
    // 80 points total, but SEO & Authority (max 60) is unconfigured/missing.
    // The naive /200 reading is 40%; the true measured reading is 80/140 = ~57%.
    const categories = {
      performance: { score: 14, provenance: "api" },
      social: { score: 9, provenance: "self_reported" },
      seoAuthority: { score: 0, provenance: "missing" },
      thoughtLeadership: { score: 20, provenance: "ai_classified" },
      reputation: { score: 37, provenance: "api" },
    };
    const result = computeMeasuredTotals(categories);
    expect(result.score).toBe(80);
    expect(result.measuredMax).toBe(140);
    expect(result.fullMax).toBe(200);
    expect(result.isPartial).toBe(true);
    expect(result.excludedLabels).toEqual(["SEO & Authority"]);
  });

  it("uses the full 200 when nothing is missing", () => {
    const categories = {
      performance: { score: 18, provenance: "api" },
      social: { score: 15, provenance: "self_reported" },
      seoAuthority: { score: 45, provenance: "api" },
      thoughtLeadership: { score: 30, provenance: "ai_classified" },
      reputation: { score: 40, provenance: "api" },
    };
    const result = computeMeasuredTotals(categories);
    expect(result.measuredMax).toBe(200);
    expect(result.isPartial).toBe(false);
    expect(result.excludedLabels).toEqual([]);
  });

  it("returns all-excluded, zero totals for null categories", () => {
    const result = computeMeasuredTotals(null);
    expect(result.score).toBe(0);
    expect(result.measuredMax).toBe(0);
    expect(result.fullMax).toBe(200);
    expect(result.isPartial).toBe(true);
  });
});
