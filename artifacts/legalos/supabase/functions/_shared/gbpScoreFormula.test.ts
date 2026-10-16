import { describe, it, expect } from "vitest";
import { calculateGbpScore } from "./gbpScoreFormula";

const OPERATIONAL = "OPERATIONAL";
const CLOSED = "CLOSED_TEMPORARILY";

describe("calculateGbpScore", () => {
  it("returns 0 and noListing=true when details is null", () => {
    const result = calculateGbpScore(null);
    expect(result.score).toBe(0);
    expect(result.noListing).toBe(true);
  });

  it("returns 0 and noListing=true when placeId is absent", () => {
    const result = calculateGbpScore({ placeId: null });
    expect(result.score).toBe(0);
    expect(result.noListing).toBe(true);
  });

  it("gives 2 pts for OPERATIONAL status", () => {
    const result = calculateGbpScore({ placeId: "abc", businessStatus: OPERATIONAL });
    expect(result.breakdown.operationalPts).toBe(2);
  });

  it("gives 0 operational pts for non-OPERATIONAL status", () => {
    const result = calculateGbpScore({ placeId: "abc", businessStatus: CLOSED });
    expect(result.breakdown.operationalPts).toBe(0);
  });

  it("gives 0 rating pts when there are no reviews even if a rating is present", () => {
    const result = calculateGbpScore({ placeId: "abc", rating: 5, reviewCount: 0 });
    expect(result.breakdown.ratingPts).toBe(0);
  });

  it("gives full 3 rating pts for rating ≥ 4.8", () => {
    const result = calculateGbpScore({ placeId: "abc", rating: 4.9, reviewCount: 10 });
    expect(result.breakdown.ratingPts).toBe(3);
  });

  it("gives 2.5 rating pts for rating ≥ 4.5 and < 4.8", () => {
    const result = calculateGbpScore({ placeId: "abc", rating: 4.6, reviewCount: 10 });
    expect(result.breakdown.ratingPts).toBe(2.5);
  });

  it("gives 2 rating pts for rating ≥ 4.0 and < 4.5", () => {
    const result = calculateGbpScore({ placeId: "abc", rating: 4.2, reviewCount: 10 });
    expect(result.breakdown.ratingPts).toBe(2);
  });

  it("gives 1 rating pt for rating ≥ 3.5 and < 4.0", () => {
    const result = calculateGbpScore({ placeId: "abc", rating: 3.7, reviewCount: 10 });
    expect(result.breakdown.ratingPts).toBe(1);
  });

  it("gives 0 rating pts for rating below 3.5", () => {
    const result = calculateGbpScore({ placeId: "abc", rating: 3.0, reviewCount: 10 });
    expect(result.breakdown.ratingPts).toBe(0);
  });

  it("gives full 3 review pts for ≥50 reviews", () => {
    const result = calculateGbpScore({ placeId: "abc", reviewCount: 60 });
    expect(result.breakdown.reviewPts).toBe(3);
  });

  it("gives 2.5 review pts for 25–49 reviews", () => {
    const result = calculateGbpScore({ placeId: "abc", reviewCount: 30 });
    expect(result.breakdown.reviewPts).toBe(2.5);
  });

  it("gives 2 review pts for 10–24 reviews", () => {
    const result = calculateGbpScore({ placeId: "abc", reviewCount: 15 });
    expect(result.breakdown.reviewPts).toBe(2);
  });

  it("gives 1 review pt for 5–9 reviews", () => {
    const result = calculateGbpScore({ placeId: "abc", reviewCount: 7 });
    expect(result.breakdown.reviewPts).toBe(1);
  });

  it("gives 0.5 review pts for 1–4 reviews", () => {
    const result = calculateGbpScore({ placeId: "abc", reviewCount: 2 });
    expect(result.breakdown.reviewPts).toBe(0.5);
  });

  it("gives 0 review pts for 0 reviews", () => {
    const result = calculateGbpScore({ placeId: "abc", reviewCount: 0 });
    expect(result.breakdown.reviewPts).toBe(0);
  });

  it("gives 0.5 pt per completeness signal present", () => {
    const full = calculateGbpScore({ placeId: "abc", hasWebsite: true, hasPhone: true, hasHours: true, hasPhotos: true });
    expect(full.breakdown.completenessPts).toBe(2);

    const none = calculateGbpScore({ placeId: "abc" });
    expect(none.breakdown.completenessPts).toBe(0);

    const partial = calculateGbpScore({ placeId: "abc", hasWebsite: true, hasPhone: true });
    expect(partial.breakdown.completenessPts).toBe(1);
  });

  it("scores a perfect listing at 10 pts", () => {
    const result = calculateGbpScore({
      placeId: "abc",
      businessStatus: OPERATIONAL,
      rating: 4.9,
      reviewCount: 60,
      hasWebsite: true,
      hasPhone: true,
      hasHours: true,
      hasPhotos: true,
    });
    expect(result.score).toBe(10);
    expect(result.noListing).toBe(false);
  });

  it("never exceeds 10 pts", () => {
    const result = calculateGbpScore({
      placeId: "abc",
      businessStatus: OPERATIONAL,
      rating: 5,
      reviewCount: 999,
      hasWebsite: true,
      hasPhone: true,
      hasHours: true,
      hasPhotos: true,
    });
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it("noListing is false when a placeId is present even if score is low", () => {
    const result = calculateGbpScore({ placeId: "abc", businessStatus: CLOSED, reviewCount: 0 });
    expect(result.noListing).toBe(false);
    expect(result.score).toBeLessThan(10);
  });
});
