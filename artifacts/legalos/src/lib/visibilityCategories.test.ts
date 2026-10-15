import { describe, it, expect } from "vitest";
import {
  CATEGORY_MAX_500,
  CATEGORY_META,
  CATEGORY_ORDER,
  categoryScoreLabel500,
} from "./visibilityCategories";

describe("CATEGORY_MAX_500", () => {
  it("public caps sum to exactly 500 — the category rows must reconcile with the total", () => {
    const sum = CATEGORY_ORDER.reduce((acc, key) => acc + CATEGORY_MAX_500[key], 0);
    expect(sum).toBe(500);
  });

  it("every raw category max has a public cap within rounding of ×2.5", () => {
    for (const key of CATEGORY_ORDER) {
      const scaled = CATEGORY_META[key].max * 2.5;
      expect(Math.abs(CATEGORY_MAX_500[key] - scaled)).toBeLessThanOrEqual(0.5);
    }
  });
});

describe("categoryScoreLabel500", () => {
  it("scales score and denominator to the public scale — 4/20 reads 10 / 50", () => {
    expect(categoryScoreLabel500(4, "social")).toBe("10 / 50");
  });

  it("a maxed category never shows a numerator above its cap (45 TL = 112.5 → 112 / 112)", () => {
    expect(categoryScoreLabel500(45, "thoughtLeadership")).toBe("112 / 112");
    expect(categoryScoreLabel500(55, "reputation")).toBe("138 / 138");
    expect(categoryScoreLabel500(20, "performance")).toBe("50 / 50");
  });

  it("rounds mid-range scores like toScale500 does", () => {
    expect(categoryScoreLabel500(13.3, "social")).toBe("33 / 50");
    expect(categoryScoreLabel500(0, "seoAuthority")).toBe("0 / 150");
  });
});
