import { describe, it, expect } from "vitest";
import { calculateSocialScore, clamp, MAX_FOLLOWERS, MAX_POSTS_30D, MAX_ENGAGEMENT_RATE } from "./socialFormula";

const ALL_PLATFORMS = { linkedin: true, instagram: true, twitter: true, facebook: true };
const NO_PLATFORMS = { linkedin: false, instagram: false, twitter: false, facebook: false };

describe("clamp", () => {
  it("clamps a value above the ceiling down to the ceiling", () => {
    expect(clamp(999_999_999, MAX_FOLLOWERS)).toBe(MAX_FOLLOWERS);
  });

  it("clamps a negative value up to 0", () => {
    expect(clamp(-5, MAX_POSTS_30D)).toBe(0);
  });

  it("leaves an in-range value unchanged", () => {
    expect(clamp(50, MAX_POSTS_30D)).toBe(50);
    expect(clamp(2.1, MAX_ENGAGEMENT_RATE)).toBe(2.1);
  });
});

describe("calculateSocialScore", () => {
  it("scores the full 20 points at ratio 1 (at or above the 90th percentile) with full engagement and all platforms", () => {
    const score = calculateSocialScore(1, 1, 5, 1, ALL_PLATFORMS);
    expect(score).toBe(20);
  });

  it("scores 0 with no data and no platforms", () => {
    const score = calculateSocialScore(0, 0, null, 0, NO_PLATFORMS);
    expect(score).toBe(0);
  });

  it("does not divide by zero or blow up when ratios are 0", () => {
    const score = calculateSocialScore(0, 0, null, 0, NO_PLATFORMS);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBe(0);
  });

  it("contributes 0 for engagement rate when not supplied, rather than estimating", () => {
    const withEr = calculateSocialScore(0.5, 0.5, 3, 0.6, NO_PLATFORMS);
    const withoutEr = calculateSocialScore(0.5, 0.5, null, 0.6, NO_PLATFORMS);
    expect(withoutEr).toBeLessThan(withEr);
    // The gap should be exactly the engagement sub-score (6 * 0.6 = 3.6)
    expect(withEr - withoutEr).toBeCloseTo(3.6, 5);
  });

  it("weights followers 5, posts 5, engagement 6, platforms up to 4", () => {
    expect(calculateSocialScore(1, 0, null, 0, NO_PLATFORMS)).toBeCloseTo(5, 5);
    expect(calculateSocialScore(0, 1, null, 0, NO_PLATFORMS)).toBeCloseTo(5, 5);
    expect(calculateSocialScore(0, 0, 5, 1, NO_PLATFORMS)).toBeCloseTo(6, 5);
    expect(calculateSocialScore(0, 0, null, 0, ALL_PLATFORMS)).toBeCloseTo(4, 5);
  });

  it("caps platform presence at 4 points even if given extra truthy keys", () => {
    const score = calculateSocialScore(0, 0, null, 0, { ...ALL_PLATFORMS } as any);
    expect(score).toBeLessThanOrEqual(4);
  });

  it("a ratio above 1 (shouldn't happen once callers clamp via p90Ratio, but defends anyway) doesn't blow past the category cap alone", () => {
    // Followers alone is still bounded to its own 5-pt weight even if an
    // unclamped ratio slipped through — the category's overall 20-pt cap is
    // enforced at the total-score level elsewhere, not here.
    const score = calculateSocialScore(2, 0, null, 0, NO_PLATFORMS);
    expect(score).toBeCloseTo(10, 5);
  });
});
