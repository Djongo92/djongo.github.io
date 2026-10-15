// The Uvid Visibility Score methodology — the one place every point value
// lives. Pure (no Deno globals, no network) so the web app, the mobile app's
// parity tests, and every edge function read the exact same weights.
//
// Native 500-point scale. Each category is built from 0–1 signals (a peer
// ratio from percentileFormula.ts's p90Ratio, a share, or a criterion
// score) multiplied by the weights below — so a signal's weight is visible
// here as a plain number, not buried inside a formula.
//
// Weighting rationale, in order of share:
//   Thought Leadership 150 (30%) — the most controllable category and the
//     one we most want firms to invest in, so it carries the most weight;
//     inside it, the firm's OWN writing on its OWN site outweighs third-party
//     coverage 4:1 (120 vs 30).
//   Recognition 125 (25%) — the standing the market already assigns a firm
//     (Chambers, Legal 500, IFLR1000, Google reviews).
//   Search Authority 100 (20%) — whether the firm is findable at all.
//   Social Presence 75 (15%).
//   Website Experience 50 (10%) — table stakes; a fast site is necessary,
//     never sufficient.
export const METHODOLOGY_VERSION = 3;

export const TOTAL_MAX = 500;

export type CategoryKey = "performance" | "social" | "seoAuthority" | "thoughtLeadership" | "reputation";

export const CATEGORY_MAX: Record<CategoryKey, number> = {
  performance: 50,
  social: 75,
  seoAuthority: 100,
  thoughtLeadership: 150,
  reputation: 125,
};

/** Website Experience (50): Google PageSpeed Insights, desktop + mobile averaged. */
export const PERFORMANCE_WEIGHTS = {
  speed: 25,
  accessibility: 15,
  technicalSeo: 10,
} as const;

/** Social Presence (75): LinkedIn signals peer-normalized; other platforms criterion-scored. */
export const SOCIAL_WEIGHTS = {
  followers: 20,
  posting: 20,
  engagement: 20,
  /** Spread evenly across the four tracked platforms. */
  platforms: 15,
} as const;
export const SOCIAL_PLATFORM_COUNT = 4;

/** Search Authority (100): average of whichever authority metrics the provider returned. */
export const SEO_WEIGHTS = { authority: 100 } as const;

/**
 * Thought Leadership (150), tilted toward the firm's own writing:
 *   articles     — own analysis/insight pieces published on the firm's site
 *   authorship   — share of own pieces carrying a named lawyer's byline
 *   ownNews      — own announcements (deals, hires, awards) on the firm's site
 *   consistency  — how many months of the content window had any own output
 *   press        — independent third-party coverage (own domain excluded)
 */
export const THOUGHT_LEADERSHIP_WEIGHTS = {
  articles: 60,
  authorship: 20,
  ownNews: 20,
  consistency: 20,
  press: 30,
} as const;
/** Months the consistency signal splits the content window into. */
export const CONSISTENCY_BUCKET_DAYS = 30;

/**
 * Recognition (125): each directory is breadth (share of the market's
 * tracked practice tables the firm is ranked in) + depth (peer-normalized
 * average band/tier). IFLR1000 weighs less — it tracks far fewer tables.
 */
export const REPUTATION_WEIGHTS = {
  chambers: { breadth: 25, depth: 15 },
  legal500: { breadth: 25, depth: 15 },
  iflr1000: { breadth: 12, depth: 8 },
  googleBusinessProfile: 25,
} as const;

/** Directory-only ceiling: Recognition minus the Google Business Profile share. */
export const DIRECTORY_MAX =
  REPUTATION_WEIGHTS.chambers.breadth + REPUTATION_WEIGHTS.chambers.depth
  + REPUTATION_WEIGHTS.legal500.breadth + REPUTATION_WEIGHTS.legal500.depth
  + REPUTATION_WEIGHTS.iflr1000.breadth + REPUTATION_WEIGHTS.iflr1000.depth;

/** Raw Google Business Profile sub-score ceiling (gbpScoreFormula.ts). */
export const GBP_RAW_MAX = 10;

export type DirectoryKey = "chambers" | "legal500" | "iflr1000";

/** Points a 0–10 Google Business Profile sub-score is worth inside Recognition. */
export function gbpPoints(gbpScore: number): number {
  const share = Number.isFinite(gbpScore) ? Math.min(1, Math.max(0, gbpScore / GBP_RAW_MAX)) : 0;
  return REPUTATION_WEIGHTS.googleBusinessProfile * share;
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Clamp a 0–1 signal. */
export const unit = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Category maxima under methodologies v1–v2 (200-point scale). */
export const LEGACY_CATEGORY_MAX: Record<CategoryKey, number> = {
  performance: 20,
  social: 20,
  seoAuthority: 60,
  thoughtLeadership: 45,
  reputation: 55,
};

/** Category maxima for the methodology version that produced a stored score. */
export function categoryMaxForVersion(version: number | null | undefined): Record<CategoryKey, number> {
  return version != null && version >= 3 ? CATEGORY_MAX : LEGACY_CATEGORY_MAX;
}

/** Total maximum for the methodology version that produced a stored score. */
export function totalMaxForVersion(version: number | null | undefined): number {
  return version != null && version >= 3 ? TOTAL_MAX : 200;
}

/**
 * Re-expresses a stored category score from an older methodology as its
 * share of the current category maximum — used only where an old value is
 * carried forward because no fresher measurement exists.
 */
export function carryForwardCategoryScore(score: number, key: CategoryKey, fromVersion: number | null | undefined): number {
  const fromMax = categoryMaxForVersion(fromVersion)[key];
  if (!(fromMax > 0) || !Number.isFinite(score)) return 0;
  return round2(Math.min(1, Math.max(0, score / fromMax)) * CATEGORY_MAX[key]);
}
