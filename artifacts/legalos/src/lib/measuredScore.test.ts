import { describe, it, expect } from "vitest";
import { computeMeasuredTotals, measuredScoreLabel, measuredExcludedNote, categoryScoreCell, pickHighestLeverageCategory, toScale500, scale500Suffix, historyScore500, measuredMaxFromProvenance } from "./measuredScore";

const FULL_PROVENANCE = {
  performance: "measured",
  social: "measured",
  seoAuthority: "measured",
  thoughtLeadership: "measured",
  reputation: "measured",
};

const PARTIAL = {
  performance: { score: 35, provenance: "api" },
  social: { score: 22.5, provenance: "self_reported" },
  seoAuthority: { score: 0, provenance: "missing" },
  thoughtLeadership: { score: 50, provenance: "ai_classified" },
  reputation: { score: 92.5, provenance: "api" },
};
const FULL = {
  performance: { score: 45, provenance: "api" },
  social: { score: 37.5, provenance: "self_reported" },
  seoAuthority: { score: 75, provenance: "api" },
  thoughtLeadership: { score: 75, provenance: "ai_classified" },
  reputation: { score: 100, provenance: "api" },
};

describe("computeMeasuredTotals", () => {
  it("excludes a missing category from the denominator (defect 1.2)", () => {
    // 200 points total, but Search Authority (max 100) is missing.
    // The naive /500 reading is 40%; the true measured reading is 200/400 = 50%.
    const result = computeMeasuredTotals(PARTIAL);
    expect(result.score).toBe(200);
    expect(result.measuredMax).toBe(400);
    expect(result.fullMax).toBe(500);
    expect(result.isPartial).toBe(true);
    expect(result.excludedLabels).toEqual(["Search Authority"]);
  });

  it("uses the full 500 when nothing is missing", () => {
    const result = computeMeasuredTotals(FULL);
    expect(result.measuredMax).toBe(500);
    expect(result.isPartial).toBe(false);
    expect(result.excludedLabels).toEqual([]);
  });

  it("returns all-excluded, zero totals for null categories", () => {
    const result = computeMeasuredTotals(null);
    expect(result.score).toBe(0);
    expect(result.measuredMax).toBe(0);
    expect(result.fullMax).toBe(500);
    expect(result.isPartial).toBe(true);
  });
});

describe("measuredScoreLabel", () => {
  it("shows the measured denominator when a category is missing", () => {
    // 200/400 measured = 50% → 250 on the 500-point scale.
    expect(measuredScoreLabel(200, computeMeasuredTotals(PARTIAL))).toBe("250 / 500 measured");
  });

  it("shows the native total when every category is measured", () => {
    expect(measuredScoreLabel(332.5, computeMeasuredTotals(FULL))).toBe("333 / 500");
  });
});

describe("measuredExcludedNote", () => {
  it("names the excluded category and disclaims it as not a zero", () => {
    const totals = computeMeasuredTotals({
      performance: { score: 35, provenance: "api" },
      seoAuthority: { score: 0, provenance: "missing" },
    });
    expect(measuredExcludedNote(totals)).toContain("Search Authority");
    expect(measuredExcludedNote(totals)).toContain("not counted as a zero");
  });

  it("returns null when nothing is excluded", () => {
    expect(measuredExcludedNote(computeMeasuredTotals(FULL))).toBeNull();
  });
});

describe("categoryScoreCell", () => {
  it("renders 'Not measured' instead of a 0/max cell for a missing category", () => {
    // Command Center cards and Executive Report tables must never show a
    // missing category as an earned "0 / 100".
    expect(categoryScoreCell({ score: 0, provenance: "missing" }, "seoAuthority")).toBe("Not measured");
  });

  it("treats an absent category entry the same as an explicit 'missing' provenance", () => {
    expect(categoryScoreCell(undefined, "seoAuthority")).toBe("Not measured");
  });

  it("renders a measured category as a percentage of its potential", () => {
    // 93.5 / 125 = 74.8% → 75%.
    expect(categoryScoreCell({ score: 93.5, provenance: "api" }, "reputation")).toBe("75%");
  });
});

describe("pickHighestLeverageCategory", () => {
  it("never recommends a missing category as the highest-leverage focus", () => {
    const categories = {
      performance: { score: 35, provenance: "api" }, // 70%
      social: { score: 7.5, provenance: "self_reported" }, // 10%
      seoAuthority: { score: 0, provenance: "missing" },
      thoughtLeadership: { score: 66, provenance: "ai_classified" }, // 44%
      reputation: { score: 84, provenance: "api" }, // 67%
    };
    expect(pickHighestLeverageCategory(categories)).toBe("social");
  });

  it("returns null when every category is missing", () => {
    const categories = {
      performance: { score: 0, provenance: "missing" },
      social: { score: 0, provenance: "missing" },
      seoAuthority: { score: 0, provenance: "missing" },
      thoughtLeadership: { score: 0, provenance: "missing" },
      reputation: { score: 0, provenance: "missing" },
    };
    expect(pickHighestLeverageCategory(categories)).toBeNull();
  });

  it("picks the lowest-scoring-by-percentage category when all are measured", () => {
    const categories = {
      performance: { score: 45, provenance: "api" }, // 90%
      social: { score: 75, provenance: "self_reported" }, // 100%
      seoAuthority: { score: 20, provenance: "api" }, // 20%
      thoughtLeadership: { score: 150, provenance: "ai_classified" }, // 100%
      reputation: { score: 125, provenance: "api" }, // 100%
    };
    expect(pickHighestLeverageCategory(categories)).toBe("seoAuthority");
  });
});

describe("500-point scale", () => {
  it("a fully measured current total is already on the scale", () => {
    expect(toScale500(370, 500)).toBe(370);
    expect(toScale500(0, 500)).toBe(0);
  });

  it("converts a pre-v3 total out of 200", () => {
    expect(toScale500(148, 200)).toBe(370);
  });

  it("rescales partial totals against the measured max, keeping the measured qualifier", () => {
    const totals = computeMeasuredTotals(PARTIAL);
    expect(toScale500(200, totals.measuredMax)).toBe(250);
    expect(scale500Suffix(totals)).toBe("/ 500 measured");
  });

  it("guards a zero max rather than dividing by it", () => {
    expect(toScale500(10, 0)).toBe(0);
  });
});

describe("historyScore500 — current-methodology snapshots", () => {
  it("leaves a fully measured v3 snapshot as scored", () => {
    expect(historyScore500(300, FULL_PROVENANCE, 3)).toBe(300);
  });

  it("scales a partial v3 snapshot against what it measured", () => {
    expect(measuredMaxFromProvenance({ ...FULL_PROVENANCE, seoAuthority: "missing" }, 3)).toBe(400);
    expect(historyScore500(200, { ...FULL_PROVENANCE, seoAuthority: "missing" }, 3)).toBe(250);
  });
});

describe("historyScore500 — pre-v3 (200-point) snapshots", () => {
  it("scales a fully measured snapshot against the full 200", () => {
    expect(historyScore500(120, FULL_PROVENANCE)).toBe(300);
  });

  it("scales a partial snapshot against what IT measured, not a flat 200", () => {
    // SEO & Authority (max 60) missing at that snapshot → measured max 140.
    // 70/140 = 50% → 250; a flat-200 conversion would under-read it as 175
    // and contradict the score ring's measured-denominator contract.
    expect(historyScore500(70, { ...FULL_PROVENANCE, seoAuthority: "missing" })).toBe(250);
    expect(measuredMaxFromProvenance({ ...FULL_PROVENANCE, seoAuthority: "missing" })).toBe(140);
  });

  it("treats snapshots recorded before provenance existed as fully measured", () => {
    expect(historyScore500(120, null)).toBe(300);
    expect(historyScore500(120, undefined)).toBe(300);
  });

  it("endpoint deltas match what the chart shows (rounding parity)", () => {
    // raw 77 → 193, raw 78 → 195: the displayed delta is +2. Scaling the
    // raw +1 difference instead (toScale500(1, 200) = 3) would contradict
    // the two points the user can see on the chart.
    expect(toScale500(1, 200)).toBe(3);
    expect(historyScore500(78, null) - historyScore500(77, null)).toBe(2);
  });

  it("a raw-score rise across a denominator change is NOT a personal best", () => {
    // Contract for Command Center's ScoreBurst: the celebration compares
    // the scaled series, so a displayed decline (250 → 200) cannot fire a
    // "new personal best" even though the raw scores rose (70 → 80).
    const prior = historyScore500(70, { ...FULL_PROVENANCE, seoAuthority: "missing" });
    const latest = historyScore500(80, FULL_PROVENANCE);
    expect([prior, latest]).toEqual([250, 200]);
    expect(80 > 70).toBe(true); // raw comparison would have fired the burst
    expect(latest > prior).toBe(false);
  });
});
