import { describe, it, expect } from "vitest";
import { findWeakestCategoryTool } from "./categoryToolMap";

describe("findWeakestCategoryTool", () => {
  it("picks the category with the most absolute points recoverable, not the lowest percentage (defect 1.1)", () => {
    // Exact scores from the reported defect: Social 9.5/20 (47.5%, 10.5 pts
    // recoverable) vs Thought Leadership 22/45 (48.9%, 23 pts recoverable).
    // Social's percentage looks worse, but Thought Leadership has more than
    // double the real points on the table — it must win.
    const categories = {
      performance: { score: 14.8, provenance: "api" },
      social: { score: 9.5, provenance: "self_reported" },
      seoAuthority: { score: 0, provenance: "missing" },
      thoughtLeadership: { score: 22, provenance: "ai_classified" },
      reputation: { score: 34, provenance: "api" },
    };

    const result = findWeakestCategoryTool(categories);
    expect(result).not.toBeNull();
    expect(result!.categoryKey).toBe("thoughtLeadership");
    expect(result!.pointsRecoverable).toBeCloseTo(23);
  });

  it("returns exactly one result even when multiple categories are below the weak threshold", () => {
    const categories = {
      social: { score: 9.5, provenance: "self_reported" },
      thoughtLeadership: { score: 22, provenance: "ai_classified" },
      reputation: { score: 10, provenance: "api" },
    };
    const result = findWeakestCategoryTool(categories);
    expect(result).not.toBeNull();
    // Only one winner: reputation has the most points recoverable (55-10=45).
    expect(result!.categoryKey).toBe("reputation");
  });

  it("ignores categories with missing provenance", () => {
    const categories = {
      seoAuthority: { score: 0, provenance: "missing" },
      reputation: { score: 34, provenance: "api" },
    };
    const result = findWeakestCategoryTool(categories);
    // reputation is at 34/55 = 61.8%, above the weak threshold, so nothing qualifies.
    expect(result).toBeNull();
  });

  it("returns null when nothing is below the weak threshold", () => {
    const categories = {
      performance: { score: 19, provenance: "api" },
      reputation: { score: 50, provenance: "api" },
    };
    expect(findWeakestCategoryTool(categories)).toBeNull();
  });
});
