// Pure Google Business Profile sub-score math (10 pts max).
// No Deno globals, no network — kept separate so it's importable from
// Vitest without pulling in any Deno-specific dependencies.
//
// Point breakdown:
//   2 pts — listing found and marked OPERATIONAL
//   3 pts — star rating quality (scaled)
//   3 pts — review volume (log-scaled)
//   2 pts — listing completeness (website, phone, hours, photos; 0.5 pt each)

export interface GbpDetails {
  /** Google place_id for the matched listing. */
  placeId?: string | null;
  /** "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY" | undefined */
  businessStatus?: string | null;
  /** 1–5 star average rating. */
  rating?: number | null;
  /** Total number of user ratings. */
  reviewCount?: number | null;
  /** Whether the listing has a website URL. */
  hasWebsite?: boolean;
  /** Whether the listing has a phone number. */
  hasPhone?: boolean;
  /** Whether the listing has opening hours set. */
  hasHours?: boolean;
  /** Whether the listing has at least one photo. */
  hasPhotos?: boolean;
}

export interface GbpScoreResult {
  score: number;
  /** True when no listing was found at all (not the same as a low-scoring one). */
  noListing: boolean;
  breakdown: {
    operationalPts: number;
    ratingPts: number;
    reviewPts: number;
    completenessPts: number;
  };
}

/** Converts a raw GbpDetails object to a 0–10 score. */
export function calculateGbpScore(details: GbpDetails | null): GbpScoreResult {
  if (!details?.placeId) {
    return {
      score: 0,
      noListing: true,
      breakdown: { operationalPts: 0, ratingPts: 0, reviewPts: 0, completenessPts: 0 },
    };
  }

  // 2 pts: listing exists and is actively operational.
  const operationalPts = details.businessStatus === "OPERATIONAL" ? 2 : 0;

  // 3 pts: rating quality (no reviews → 0, regardless of displayed rating).
  const reviewCount = details.reviewCount ?? 0;
  let ratingPts = 0;
  if (reviewCount >= 1 && details.rating != null) {
    if (details.rating >= 4.8) ratingPts = 3;
    else if (details.rating >= 4.5) ratingPts = 2.5;
    else if (details.rating >= 4.0) ratingPts = 2;
    else if (details.rating >= 3.5) ratingPts = 1;
    else ratingPts = 0;
  }

  // 3 pts: review volume (log-scaled thresholds).
  let reviewPts = 0;
  if (reviewCount >= 50) reviewPts = 3;
  else if (reviewCount >= 25) reviewPts = 2.5;
  else if (reviewCount >= 10) reviewPts = 2;
  else if (reviewCount >= 5) reviewPts = 1;
  else if (reviewCount >= 1) reviewPts = 0.5;

  // 2 pts: completeness (0.5 pt each for website, phone, hours, photos).
  const completenessPts =
    (details.hasWebsite ? 0.5 : 0) +
    (details.hasPhone ? 0.5 : 0) +
    (details.hasHours ? 0.5 : 0) +
    (details.hasPhotos ? 0.5 : 0);

  const score = Math.round((operationalPts + ratingPts + reviewPts + completenessPts) * 100) / 100;

  return {
    score: Math.min(10, score),
    noListing: false,
    breakdown: { operationalPts, ratingPts, reviewPts, completenessPts },
  };
}
