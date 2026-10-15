// §6 — Evidence and corrections: recompute the five category scores from an
// audit's already-persisted raw_metrics, with NO live fetch — PSI,
// Ahrefs/Moz, Claude, Google News, and the live peer_group query are never
// re-hit. Every peer-normalized ratio only needs {value, p90Threshold}, and
// both are already stored per metric (see socialScore.ts/
// thoughtLeadershipScore.ts/reputationScore.ts's PeerStats persistence
// comments) — so a correction only swaps this firm's own value against the
// peer threshold already computed at run time. Deliberately NOT re-querying
// peers: one firm's dispute shouldn't reshuffle everyone else's benchmark.
import { p90Ratio, type PeerStats } from "./percentileFormula.ts";
import { calculatePerformanceScore, type LighthouseCategories } from "./performanceFormula.ts";
import { calculateSocialScore, type SocialPlatforms } from "./socialFormula.ts";
import { aggregateContentItems, calculateThoughtLeadershipScore, type ContentItem } from "./thoughtLeadershipFormula.ts";
import { calculateSeoScore } from "./seoFormula.ts";
import { DMV_MARKETS } from "./marketVisibilityConfig.ts";
import { gbpPoints, REPUTATION_WEIGHTS, round2, type CategoryKey, type DirectoryKey } from "./methodology.ts";

interface DirectorySubScore {
  points: number;
  count: number;
  avgRank: number | null;
  qualityStats: PeerStats | null;
}

export interface RecomputedScores {
  performance_score: number;
  social_score: number;
  seo_authority_score: number;
  thought_leadership_score: number;
  reputation_score: number;
  total_score: number;
}

export const SEO_METRIC_KEYS = [
  "domainAuthority",
  "referringDomains",
  "backlinks",
  "organicTraffic",
  "organicKeywords",
  "pageAuthority",
] as const;

function directoryPoints(sub: DirectorySubScore | undefined, n: number, directory: DirectoryKey): number {
  if (!sub) return 0;
  const w = REPUTATION_WEIGHTS[directory];
  const countScore = w.breadth * Math.min(1, sub.count / n);
  const qualityScore = sub.qualityStats ? w.depth * p90Ratio(sub.qualityStats) : 0;
  return countScore + qualityScore;
}

const isStats = (v: unknown): v is PeerStats =>
  !!v && typeof v === "object" && typeof (v as PeerStats).p90Threshold === "number";

/**
 * Thought Leadership from stored inputs. Current audits persist separate
 * articles/ownNews peer stats; audits scored before that split only carry
 * one blended own-output comparison (postsStats) — for those, all own output
 * reads as articles and the ownNews signal stays 0 until the audit is
 * re-scored, rather than inventing a split the stored data doesn't contain.
 */
// deno-lint-ignore no-explicit-any
export function thoughtLeadershipFromRaw(tl: Record<string, any>, windowDays: number): number {
  const items = Array.isArray(tl.items) ? (tl.items as ContentItem[]) : [];
  const agg = aggregateContentItems(items, windowDays, tl.measuredAt ? Date.parse(tl.measuredAt) : Date.now());
  const activeMonths = typeof tl.activeMonths === "number" ? tl.activeMonths : agg.activeMonths;
  const windowMonths = typeof tl.windowMonths === "number" && tl.windowMonths > 0 ? tl.windowMonths : agg.windowMonths;
  const articlesRatio = isStats(tl.articlesStats)
    ? p90Ratio(tl.articlesStats)
    : isStats(tl.postsStats) ? p90Ratio(tl.postsStats) : 0;
  const ownNewsRatio = isStats(tl.ownNewsStats) ? p90Ratio(tl.ownNewsStats) : 0;
  return calculateThoughtLeadershipScore({
    articlesRatio,
    bylinePct: tl.bylinePct ?? 0,
    ownNewsRatio,
    consistency: activeMonths / windowMonths,
    pressRatio: isStats(tl.newsStats) ? p90Ratio(tl.newsStats) : 0,
  });
}

/** Search Authority from the per-metric peer stats seoScore.ts persists. Null when none were stored. */
// deno-lint-ignore no-explicit-any
export function seoFromRaw(seo: Record<string, any> | undefined): number | null {
  if (!seo) return null;
  const ratios = SEO_METRIC_KEYS.map((k) => (isStats(seo[k]) ? p90Ratio(seo[k]) : null));
  const result = calculateSeoScore(ratios);
  return result.metricsAvailable > 0 ? result.score : null;
}

/**
 * Pure, in-process recompute of the five category scores + total from a
 * (possibly corrected) raw_metrics object. Never fabricates a score for a
 * category with no stored inputs — mirrors runVisibilityAudit.ts's "missing
 * stays zero, never a silent guess" rule. Search Authority audits that were
 * carried forward from history (no per-metric stats stored) keep the
 * caller's current score via `fallback`.
 */
export function recomputeFromRawMetrics(
  market: string,
  // deno-lint-ignore no-explicit-any
  rawMetrics: Record<string, any>,
  fallback: Partial<Record<CategoryKey, number>> = {},
): RecomputedScores {
  const marketConfig = DMV_MARKETS[market];

  // Website Experience
  const perf = rawMetrics.performance ?? {};
  const performance_score = perf.desktop && perf.mobile
    ? calculatePerformanceScore(perf.desktop as LighthouseCategories, perf.mobile as LighthouseCategories).score
    : 0;

  // Social Presence
  const soc = rawMetrics.social ?? {};
  const hasSocial = soc.followersStats || soc.postsStats || soc.platforms;
  const social_score = hasSocial
    ? calculateSocialScore(
      soc.followersStats ? p90Ratio(soc.followersStats as PeerStats) : 0,
      soc.postsStats ? p90Ratio(soc.postsStats as PeerStats) : 0,
      soc.engagementRate ?? null,
      soc.erStats ? p90Ratio(soc.erStats as PeerStats) : 0,
      (soc.platforms as SocialPlatforms) ?? { linkedin: false, instagram: false, twitter: false, facebook: false },
    )
    : 0;

  // Search Authority
  const seo_authority_score = seoFromRaw(rawMetrics.seoAuthority) ?? fallback.seoAuthority ?? 0;

  // Thought Leadership
  const tl = rawMetrics.thoughtLeadership ?? {};
  const hasTl = tl.postsStats || tl.articlesStats || tl.newsStats;
  const thought_leadership_score = hasTl
    ? thoughtLeadershipFromRaw(tl, marketConfig?.contentWindowDays ?? 90)
    : 0;

  // Recognition
  const rep = rawMetrics.reputation ?? {};
  // Prefer the persisted 0–10 gbpScore from the live Places API run over
  // re-deriving from the self-reported boolean (which can only produce 10 or
  // 0). Legacy audits that predate the Places integration fall back to the
  // boolean so old records still score.
  const gbpScore = typeof rep.gbpScore === "number" && Number.isFinite(rep.gbpScore)
    ? rep.gbpScore
    : (rep.gbpListed ? 10 : 0);
  const reputation_score = marketConfig
    ? round2(
      gbpPoints(gbpScore)
        + directoryPoints(rep.chambers, marketConfig.chambers.n, "chambers")
        + directoryPoints(rep.legal500, marketConfig.legal500.n, "legal500")
        + directoryPoints(rep.iflr1000, marketConfig.iflr1000.n, "iflr1000"),
    )
    : round2(gbpPoints(gbpScore));

  const total_score = round2(
    performance_score + social_score + seo_authority_score + thought_leadership_score + reputation_score,
  );

  return {
    performance_score: round2(performance_score),
    social_score: round2(social_score),
    seo_authority_score: round2(seo_authority_score),
    thought_leadership_score: round2(thought_leadership_score),
    reputation_score,
    total_score,
  };
}

/** Recomputes a directory sub-score's own derived fields (count, avgRank,
 *  qualityStats.value) after a corrected ranked-tables object — still no
 *  peer requery: qualityStats keeps its existing p90Threshold/peerMedian/
 *  sampleSize/comparisonDate, only `value` (this firm's own inverted
 *  average) and `count`/`avgRank` change. */
export function recomputeDirectorySubScore(
  rankedTables: Record<string, number> | null | undefined,
  deepest: number,
  previousQualityStats: PeerStats | null | undefined,
): DirectorySubScore {
  const entries = Object.entries(rankedTables ?? {});
  const count = entries.length;
  if (count === 0) return { points: 0, count: 0, avgRank: null, qualityStats: null };

  const avgRank = entries.reduce((sum, [, rank]) => sum + rank, 0) / entries.length;
  const invertedAvg = deepest + 1 - avgRank;
  const qualityStats: PeerStats | null = previousQualityStats
    ? { ...previousQualityStats, value: invertedAvg }
    : null;

  return { points: 0, count, avgRank, qualityStats };
}
