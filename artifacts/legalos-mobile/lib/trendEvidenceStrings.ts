/**
 * Canonical trend-metric evidence strings — the single source of truth both
 * the mobile app and the web app must produce for a score-history point's
 * one-line evidence. This file lives in the mobile artifact; the web side
 * does NOT import it (no cross-artifact TS imports). Instead, a web parity
 * test reads this file over the filesystem and asserts the web builders
 * (visibilityInputFormatters.ts CATEGORY_TREND_METRIC / historyEvidenceLine)
 * produce byte-identical strings, and a mobile test asserts the mobile
 * builders (trendMetrics.ts) do too. If either port drifts — the way the web
 * full formatter once said "LinkedIn followers" while the trend line said
 * "followers", or "Desktop X / Mobile Y (avg Z)" vs "Z PageSpeed avg" — one
 * of the two tests fails immediately.
 *
 * Each fixture pins BOTH a representative raw sub-object AND the exact string
 * the trend formatter must emit for it, per category, plus the null/
 * provenance gates that must never fabricate a value. Kept dependency-free
 * (no imports) so both a Node web test and a Node mobile test can read it.
 */

export interface TrendEvidenceCase {
  /** The single category's raw sub-object (raw_metrics[key]). */
  raw: any;
  /** The exact string the trend formatter must return, or null when the
   *  inputs weren't recorded / the category isn't configured in this build. */
  expected: string | null;
}

/** One pinned case per category — the happy path both ports must match. */
export const TREND_EVIDENCE_CASES: Record<
  'performance' | 'social' | 'seoAuthority' | 'thoughtLeadership' | 'reputation',
  TrendEvidenceCase
> = {
  // Full formatter says "Desktop 70 / Mobile 60 (avg 65)"; the trend headline
  // is deliberately the compact "65 PageSpeed avg" — pinned so neither side
  // adopts the other's phrasing by accident.
  performance: {
    raw: { desktop: { performance: 70 }, mobile: { performance: 60 }, perfAvg: 65 },
    expected: '65 PageSpeed avg',
  },
  // Full formatter says "1,850 LinkedIn followers"; the trend headline is the
  // platform-agnostic "1,850 followers".
  social: {
    raw: { followers: 1850 },
    expected: '1,850 followers',
  },
  // SEO trend metric is not configured in this build — must always be null,
  // never a fabricated value.
  seoAuthority: {
    raw: { domainAuthority: { value: 32 } },
    expected: null,
  },
  thoughtLeadership: {
    raw: { postsCount: 2 },
    expected: '2 posts',
  },
  reputation: {
    raw: { gbpRating: 4.6 },
    expected: '★ 4.6 GBP',
  },
};

/** The compact multi-category evidence line both ports must join identically. */
export const FULL_EVIDENCE_RAW = {
  performance: { desktop: { performance: 70 }, mobile: { performance: 60 }, perfAvg: 65 },
  social: { followers: 1850 },
  seoAuthority: { domainAuthority: { value: 32 } },
  thoughtLeadership: { postsCount: 2 },
  reputation: { gbpRating: 4.6 },
};

export const FULL_EVIDENCE_PROVENANCE = {
  performance: 'api', social: 'api', seoAuthority: 'api', thoughtLeadership: 'api', reputation: 'api',
};

/** seoAuthority is unconfigured (null), so it drops out even when measured. */
export const FULL_EVIDENCE_LINE = '65 PageSpeed avg · 1,850 followers · 2 posts · ★ 4.6 GBP';

/**
 * Gates that must never render a fabricated value. Each pins a raw sub-object
 * a formatter is handed and the null both ports must return for it.
 */
export const TREND_NULL_GATES: Record<string, TrendEvidenceCase> = {
  // Performance without both desktop AND mobile can't be averaged honestly.
  performancePartial: { raw: { desktop: { performance: 70 } }, expected: null },
  performanceNull: { raw: null, expected: null },
  // Social without a followers count.
  socialNoFollowers: { raw: { posts30d: 4 }, expected: null },
  // Thought leadership without a posts count.
  thoughtLeadershipNoPosts: { raw: {}, expected: null },
  // Reputation with only a false "listed" flag is null, not "GBP listed".
  reputationNotListed: { raw: { gbpListed: false }, expected: null },
  reputationNull: { raw: null, expected: null },
};

/**
 * Provenance gate: a category whose frozen provenance is "missing" (or absent
 * for older rows) is omitted from the evidence line entirely — an unmeasured
 * category must never show a fabricated raw value. Pinned so both ports keep
 * the same gate.
 */
export const PROVENANCE_GATE = {
  raw: FULL_EVIDENCE_RAW,
  // social forced "missing" → its "1,850 followers" segment must not appear.
  provenance: { performance: 'api', social: 'missing', seoAuthority: 'api', thoughtLeadership: 'api', reputation: 'api' },
  expected: '65 PageSpeed avg · 2 posts · ★ 4.6 GBP',
  // Null provenance (older rows) → nothing is assumed measured.
  nullProvenanceExpected: null,
};
