import { describe, expect, it } from "vitest";
import { applyLens, lensPercent, normalizePillars, parsePillarParam } from "./pillarLens";
import type { CombinedVisibilityRow } from "./mergeVisibilityRows";

const base: CombinedVisibilityRow = {
  firmName: "A",
  firmDomain: "a.rs",
  peerGroup: "local",
  hasFullAudit: true,
  verified: false,
  measuredScore: 0,
  measuredMax: 0,
  visibilityPercent: 40,
  measuredCategoryCount: 5,
  weakestCategoryLabel: null,
  isStale: false,
  isLowConfidence: false,
  peerGroupSampleSize: 10,
};

const audited: CombinedVisibilityRow = {
  ...base,
  categoryBreakdown: [
    { key: "performance", label: "Website", score: 40, max: 50, measured: true },
    { key: "social", label: "Social", score: 0, max: 75, measured: false },
    { key: "seoAuthority", label: "Search", score: 20, max: 100, measured: true },
    { key: "thoughtLeadership", label: "TL", score: 150, max: 150, measured: true },
    { key: "reputation", label: "Recognition", score: 25, max: 125, measured: true },
  ],
};

describe("pillarLens", () => {
  it("normalizes pillar lists", () => {
    expect(normalizePillars(["reputation", "bogus", "performance", "reputation"])).toEqual(["performance", "reputation"]);
    expect(parsePillarParam("social,thoughtLeadership")).toEqual(["social", "thoughtLeadership"]);
    expect(parsePillarParam(null)).toEqual([]);
  });

  it("sums only chosen, measured pillars without re-weighting", () => {
    // Website 40/50 + Search 20/100 = 60/150
    expect(lensPercent(audited, ["performance", "seoAuthority"])).toBe(40);
    // Social unmeasured is excluded, not a zero: TL alone = 100%
    expect(lensPercent(audited, ["social", "thoughtLeadership"])).toBe(100);
  });

  it("returns null when nothing chosen is measured", () => {
    expect(lensPercent(audited, ["social"])).toBeNull();
  });

  it("treats empty or full selection as the official view", () => {
    expect(lensPercent(audited, [])).toBe(40);
  });

  it("scores directory-only firms on Recognition only", () => {
    const dir = { ...base, hasFullAudit: false, measuredScore: 30, measuredMax: 40 };
    expect(lensPercent(dir, ["reputation", "seoAuthority"])).toBe(75);
    expect(lensPercent(dir, ["social"])).toBeNull();
  });

  it("keeps the official percent alongside the lens percent", () => {
    const { scored, unscored } = applyLens([audited, { ...audited, categoryBreakdown: [] }], ["thoughtLeadership"]);
    expect(scored).toHaveLength(1);
    expect(scored[0].visibilityPercent).toBe(100);
    expect(scored[0].overallPercent).toBe(40);
    expect(unscored).toHaveLength(1);
  });
});
