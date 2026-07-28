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
import { calculateThoughtLeadershipScore } from "./thoughtLeadershipFormula.ts";
import { DMV_MARKETS } from "./marketVisibilityConfig.ts";

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

const round2 = (n: number) => Math.round(n * 100) / 100;

function directoryPoints(sub: DirectorySubScore | undefined, n: number): number {
  if (!sub) return 0;
  const countScore = Math.min(10, 10 * (sub.count / n));
  const qualityScore = sub.qualityStats ? 5 * p90Ratio(sub.qualityStats) : 0;
  return countScore + qualityScore;
}

/**
 * Pure, in-process recompute of the five category scores + total from a
 * (possibly corrected) raw_metrics object. Never fabricates a score for a
 * category with no stored inputs — mirrors runVisibilityAudit.ts's "missing
 * stays zero, never a silent guess" rule.
 */
export function recomputeFromRawMetrics(
  market: string,
  // deno-lint-ignore no-explicit-any
  rawMetrics: Record<string, any>,
): RecomputedScores {
  const marketConfig = DMV_MARKETS[market];

  // Performance
  const perf = rawMetrics.performance ?? {};
  const performance_score = perf.desktop && perf.mobile
    ? calculatePerformanceScore(perf.desktop as LighthouseCategories, perf.mobile as LighthouseCategories).score
    : 0;

  // Social
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

  // SEO & Authority — not_configured shell, never fabricated.
  const seo_authority_score = 0;

  // Thought Leadership
  const tl = rawMetrics.thoughtLeadership ?? {};
  const hasTl = tl.postsStats || tl.newsStats;
  const thought_leadership_score = hasTl
    ? calculateThoughtLeadershipScore(
      tl.postsStats ? p90Ratio(tl.postsStats as PeerStats) : 0,
      tl.bylinePct ?? 0,
      tl.newsStats ? p90Ratio(tl.newsStats as PeerStats) : 0,
    )
    : 0;

  // Reputation
  const rep = rawMetrics.reputation ?? {};
  const gbpScore = rep.gbpListed ? 10 : 0;
  const reputation_score = marketConfig
    ? round2(
      gbpScore
        + directoryPoints(rep.chambers, marketConfig.chambers.n)
        + directoryPoints(rep.legal500, marketConfig.legal500.n)
        + directoryPoints(rep.iflr1000, marketConfig.iflr1000.n),
    )
    : gbpScore;

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
