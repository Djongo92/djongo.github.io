import { describe, it, expect } from "vitest";
import { findWeakestCategoryTool } from "./categoryToolMap";

describe("findWeakestCategoryTool", () => {
  it("picks the category with the most absolute points recoverable, not the lowest percentage (defect 1.1)", () => {
    // Social 30/75 (40%, 45 pts recoverable) vs Thought Leadership 70/150
    // (46.7%, 80 pts recoverable). Social's percentage looks worse, but
    // Thought Leadership has far more real points on the table — it must win.
    const categories = {
      performance: { score: 38, provenance: "api" },
      social: { score: 30, provenance: "self_reported" },
      seoAuthority: { score: 0, provenance: "missing" },
      thoughtLeadership: { score: 70, provenance: "ai_classified" },
      reputation: { score: 85, provenance: "api" },
    };

    const result = findWeakestCategoryTool(categories);
    expect(result).not.toBeNull();
    expect(result!.categoryKey).toBe("thoughtLeadership");
    expect(result!.pointsRecoverable).toBeCloseTo(80);
  });

  it("returns exactly one result even when multiple categories are below the weak threshold", () => {
    const categories = {
      social: { score: 30, provenance: "self_reported" },
      thoughtLeadership: { score: 70, provenance: "ai_classified" },
      reputation: { score: 20, provenance: "api" },
    };
    const result = findWeakestCategoryTool(categories);
    expect(result).not.toBeNull();
    // Only one winner: reputation has the most points recoverable (125-20=105).
    expect(result!.categoryKey).toBe("reputation");
  });

  it("ignores categories with missing provenance", () => {
    const categories = {
      seoAuthority: { score: 0, provenance: "missing" },
      reputation: { score: 80, provenance: "api" },
    };
    const result = findWeakestCategoryTool(categories);
    // reputation is at 80/125 = 64%, above the weak threshold, so nothing qualifies.
    expect(result).toBeNull();
  });

  it("returns null when nothing is below the weak threshold", () => {
    const categories = {
      performance: { score: 45, provenance: "api" },
      reputation: { score: 110, provenance: "api" },
    };
    expect(findWeakestCategoryTool(categories)).toBeNull();
  });
});
