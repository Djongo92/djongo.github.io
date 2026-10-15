import { describe, it, expect } from "vitest";
import { computeMeasuredTotals, measuredScoreLabel, measuredExcludedNote, categoryScoreCell, pickHighestLeverageCategory, toScale500, scale500Suffix, historyScore500, measuredMaxFromProvenance } from "./measuredScore";

const FULL_PROVENANCE = {
  performance: "measured",
  social: "measured",
  seoAuthority: "measured",
  thoughtLeadership: "measured",
  reputation: "measured",
};

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

describe("measuredScoreLabel", () => {
  it("shows the measured denominator, not 200, when a category is missing", () => {
    const totals = computeMeasuredTotals({
      performance: { score: 14, provenance: "api" },
      social: { score: 9, provenance: "self_reported" },
      seoAuthority: { score: 0, provenance: "missing" },
      thoughtLeadership: { score: 20, provenance: "ai_classified" },
      reputation: { score: 37, provenance: "api" },
    });
    // 80/140 measured = 57.1% → 286 on the public 500-point scale.
    expect(measuredScoreLabel(80, totals)).toBe("286 / 500 measured");
  });

  it("shows the full 200 when every category is measured", () => {
    const totals = computeMeasuredTotals({
      performance: { score: 18, provenance: "api" },
      social: { score: 15, provenance: "self_reported" },
      seoAuthority: { score: 45, provenance: "api" },
      thoughtLeadership: { score: 30, provenance: "ai_classified" },
      reputation: { score: 40, provenance: "api" },
    });
    expect(measuredScoreLabel(148, totals)).toBe("370 / 500");
  });
});

describe("measuredExcludedNote", () => {
  it("names the excluded category and disclaims it as not a zero", () => {
    const totals = computeMeasuredTotals({
      performance: { score: 14, provenance: "api" },
      seoAuthority: { score: 0, provenance: "missing" },
    });
    expect(measuredExcludedNote(totals)).toContain("SEO & Authority");
    expect(measuredExcludedNote(totals)).toContain("not counted as a zero");
  });

  it("returns null when nothing is excluded", () => {
    const totals = computeMeasuredTotals({
      performance: { score: 18, provenance: "api" },
      social: { score: 15, provenance: "self_reported" },
      seoAuthority: { score: 45, provenance: "api" },
      thoughtLeadership: { score: 30, provenance: "ai_classified" },
      reputation: { score: 40, provenance: "api" },
    });
    expect(measuredExcludedNote(totals)).toBeNull();
  });
});

describe("categoryScoreCell", () => {
  it("renders 'Not measured' instead of a 0/max cell for a missing category", () => {
    // This is the exact regression covered by task #38's rejection: Command
    // Center cards and Executive Report tables must never show a missing
    // category as an earned "0 / 60".
    expect(categoryScoreCell({ score: 0, provenance: "missing" }, "seoAuthority")).toBe("Not measured");
  });

  it("treats an absent category entry the same as an explicit 'missing' provenance", () => {
    expect(categoryScoreCell(undefined, "seoAuthority")).toBe("Not measured");
  });

  it("renders a measured category as a percentage of its potential", () => {
    // 37.4 / 55 = 68% — percentages, not raw point fractions, so the cell
    // can't be confused with the public 500-point total scale.
    expect(categoryScoreCell({ score: 37.4, provenance: "api" }, "reputation")).toBe("68%");
  });
});

describe("pickHighestLeverageCategory", () => {
  it("never recommends a missing category as the highest-leverage focus", () => {
    // SEO & Authority (max 60) is unmeasured — 0% would make it look like
    // the biggest gap of all, but it must lose to a real, measured low
    // performer (Social at 10%) because a data gap isn't actionable.
    const categories = {
      performance: { score: 14, provenance: "api" }, // 14/20 = 70%
      social: { score: 2, provenance: "self_reported" }, // 2/20 = 10%
      seoAuthority: { score: 0, provenance: "missing" },
      thoughtLeadership: { score: 20, provenance: "ai_classified" }, // 20/45 = 44%
      reputation: { score: 37, provenance: "api" }, // 37/55 = 67%
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
      performance: { score: 18, provenance: "api" }, // 90%
      social: { score: 20, provenance: "self_reported" }, // 100%
      seoAuthority: { score: 12, provenance: "api" }, // 20%
      thoughtLeadership: { score: 45, provenance: "ai_classified" }, // 100%
      reputation: { score: 55, provenance: "api" }, // 100%
    };
    expect(pickHighestLeverageCategory(categories)).toBe("seoAuthority");
  });
});

describe("500-point display scale", () => {
  it("rescales full-coverage totals against the internal 200", () => {
    expect(toScale500(148, 200)).toBe(370);
    expect(toScale500(0, 200)).toBe(0);
  });

  it("rescales partial totals against the measured max, keeping the measured qualifier", () => {
    const totals = computeMeasuredTotals({
      performance: { score: 14, provenance: "api" },
      social: { score: 9, provenance: "self_reported" },
      seoAuthority: { score: 0, provenance: "missing" },
      thoughtLeadership: { score: 20, provenance: "ai_classified" },
      reputation: { score: 37, provenance: "api" },
    });
    expect(toScale500(80, totals.measuredMax)).toBe(286);
    expect(scale500Suffix(totals)).toBe("/ 500 measured");
    expect(measuredScoreLabel(80, totals)).toBe("286 / 500 measured");
  });

  it("guards a zero max rather than dividing by it", () => {
    expect(toScale500(10, 0)).toBe(0);
  });
});

describe("historyScore500 — frozen-snapshot scaling", () => {
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
