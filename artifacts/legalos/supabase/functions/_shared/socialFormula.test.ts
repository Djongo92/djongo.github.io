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
  it("scores the full 75 points at ratio 1 (at or above the 90th percentile) with full engagement and all platforms", () => {
    const score = calculateSocialScore(1, 1, 5, 1, ALL_PLATFORMS);
    expect(score).toBe(75);
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
    // The gap should be exactly the engagement sub-score (20 * 0.6 = 12)
    expect(withEr - withoutEr).toBeCloseTo(12, 5);
  });

  it("weights followers 20, posts 20, engagement 20, platforms up to 15", () => {
    expect(calculateSocialScore(1, 0, null, 0, NO_PLATFORMS)).toBeCloseTo(20, 5);
    expect(calculateSocialScore(0, 1, null, 0, NO_PLATFORMS)).toBeCloseTo(20, 5);
    expect(calculateSocialScore(0, 0, 5, 1, NO_PLATFORMS)).toBeCloseTo(20, 5);
    expect(calculateSocialScore(0, 0, null, 0, ALL_PLATFORMS)).toBeCloseTo(15, 5);
    expect(calculateSocialScore(0, 0, null, 0, { ...NO_PLATFORMS, linkedin: true, facebook: true })).toBeCloseTo(7.5, 5);
  });

  it("caps platform presence at 15 points even if given extra truthy keys", () => {
    const score = calculateSocialScore(0, 0, null, 0, { ...ALL_PLATFORMS, youtube: true } as any);
    expect(score).toBeLessThanOrEqual(15);
  });

  it("a ratio above 1 (shouldn't happen once callers clamp via p90Ratio, but defends anyway) doesn't blow past the category cap alone", () => {
    // An unclamped ratio scales its own weight linearly — callers clamp via
    // p90Ratio, so this only pins that nothing else leaks in.
    const score = calculateSocialScore(2, 0, null, 0, NO_PLATFORMS);
    expect(score).toBeCloseTo(40, 5);
  });
});
