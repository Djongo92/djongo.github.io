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
  it("scores the full 20 points at peer-max with full engagement and all platforms", () => {
    const score = calculateSocialScore(1000, 10, 5, ALL_PLATFORMS, 1000, 10, 5);
    expect(score).toBe(20);
  });

  it("scores 0 with no data and no platforms", () => {
    const score = calculateSocialScore(0, 0, null, NO_PLATFORMS, 1000, 10, 5);
    expect(score).toBe(0);
  });

  it("does not divide by zero when a peer-max is 0", () => {
    const score = calculateSocialScore(0, 0, null, NO_PLATFORMS, 0, 0, 0);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBe(0);
  });

  it("contributes 0 for engagement rate when not supplied, rather than estimating", () => {
    const withEr = calculateSocialScore(500, 5, 3, NO_PLATFORMS, 1000, 10, 5);
    const withoutEr = calculateSocialScore(500, 5, null, NO_PLATFORMS, 1000, 10, 5);
    expect(withoutEr).toBeLessThan(withEr);
    // The gap should be exactly the engagement sub-score (6 * 3/5 = 3.6)
    expect(withEr - withoutEr).toBeCloseTo(3.6, 5);
  });

  it("weights followers 5, posts 5, engagement 6, platforms up to 4", () => {
    expect(calculateSocialScore(1000, 0, null, NO_PLATFORMS, 1000, 10, 5)).toBeCloseTo(5, 5);
    expect(calculateSocialScore(0, 10, null, NO_PLATFORMS, 1000, 10, 5)).toBeCloseTo(5, 5);
    expect(calculateSocialScore(0, 0, 5, NO_PLATFORMS, 1000, 10, 5)).toBeCloseTo(6, 5);
    expect(calculateSocialScore(0, 0, null, ALL_PLATFORMS, 1000, 10, 5)).toBeCloseTo(4, 5);
  });

  it("caps platform presence at 4 points even if given extra truthy keys", () => {
    const score = calculateSocialScore(0, 0, null, { ...ALL_PLATFORMS } as any, 1000, 10, 5);
    expect(score).toBeLessThanOrEqual(4);
  });
});
