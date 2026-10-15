import { describe, it, expect } from "vitest";
import {
  CATEGORY_MAX_500,
  CATEGORY_META,
  CATEGORY_ORDER,
  categoryScoreLabel500,
} from "./visibilityCategories";
import { CATEGORY_MAX, TOTAL_MAX } from "../../supabase/functions/_shared/methodology";

describe("CATEGORY_MAX_500", () => {
  it("category caps sum to exactly 500 — the category rows must reconcile with the total", () => {
    const sum = CATEGORY_ORDER.reduce((acc, key) => acc + CATEGORY_MAX_500[key], 0);
    expect(sum).toBe(TOTAL_MAX);
    expect(sum).toBe(500);
  });

  it("the display caps are the methodology's native category maxima, no rescale", () => {
    for (const key of CATEGORY_ORDER) {
      expect(CATEGORY_MAX_500[key]).toBe(CATEGORY_MAX[key]);
      expect(CATEGORY_META[key].max).toBe(CATEGORY_MAX[key]);
    }
  });

  it("weights Thought Leadership most heavily", () => {
    const heaviest = [...CATEGORY_ORDER].sort((a, b) => CATEGORY_MAX[b] - CATEGORY_MAX[a])[0];
    expect(heaviest).toBe("thoughtLeadership");
  });
});

describe("categoryScoreLabel500", () => {
  it("renders the native score against its cap", () => {
    expect(categoryScoreLabel500(40, "social")).toBe("40 / 75");
  });

  it("a maxed category never shows a numerator above its cap", () => {
    expect(categoryScoreLabel500(150, "thoughtLeadership")).toBe("150 / 150");
    expect(categoryScoreLabel500(130, "reputation")).toBe("125 / 125");
    expect(categoryScoreLabel500(50, "performance")).toBe("50 / 50");
  });

  it("rounds mid-range scores to whole points", () => {
    expect(categoryScoreLabel500(33.3, "social")).toBe("33 / 75");
    expect(categoryScoreLabel500(0, "seoAuthority")).toBe("0 / 100");
  });
});
