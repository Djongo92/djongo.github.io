// §6 — Evidence and corrections: the whitelist of metric paths a user is
// allowed to dispute, plus the patch logic for each. Deliberately NOT
// arbitrary jsonb-path writes — every path here is enumerated (or, for the
// three directory-table paths, pattern-matched against a bounded practice-
// area code list) and type/range-checked before it's ever written back to
// raw_metrics, so a correction can only ever replace one known, well-formed
// leaf value, never inject arbitrary structure.
import { DMV_MARKETS } from "./marketVisibilityConfig.ts";
import { recomputeDirectorySubScore } from "./recomputeFromRawMetrics.ts";
import type { PeerStats } from "./percentileFormula.ts";

const PRACTICE_AREA_CODES = new Set([
  "BF", "CO", "CC", "DR", "EM", "IP", "PR", "PE", "RE",
]);

const LIGHTHOUSE_LEAVES = new Set(["performance", "accessibility", "seo"]);
const SOCIAL_PLATFORMS = new Set(["linkedin", "instagram", "twitter", "facebook"]);
const REPUTATION_TABLE_KEYS: Record<string, "chambersRankedTables" | "legal500RankedTables" | "iflr1000RankedTables"> = {
  chambersRankedTables: "chambersRankedTables",
  legal500RankedTables: "legal500RankedTables",
  iflr1000RankedTables: "iflr1000RankedTables",
};
const REPUTATION_SUBSCORE_KEY: Record<string, "chambers" | "legal500" | "iflr1000"> = {
  chambersRankedTables: "chambers",
  legal500RankedTables: "legal500",
  iflr1000RankedTables: "iflr1000",
};

export interface CorrectionOutcome {
  previousValue: unknown;
  // deno-lint-ignore no-explicit-any
  patchedRawMetrics: Record<string, any>;
}

export type CorrectionApplyResult = CorrectionOutcome | { error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function applyMetricCorrection(
  category: string,
  metricPath: string,
  correctedValueRaw: unknown,
  // deno-lint-ignore no-explicit-any
  rawMetrics: Record<string, any>,
  market: string,
): CorrectionApplyResult {
  const marketConfig = DMV_MARKETS[market];
  const next = structuredClone(rawMetrics ?? {});
  const parts = metricPath.split(".");

  // performance.<desktop|mobile>.<performance|accessibility|seo>
  if (category === "performance" && parts.length === 3 && parts[0] === "performance"
    && (parts[1] === "desktop" || parts[1] === "mobile") && LIGHTHOUSE_LEAVES.has(parts[2])) {
    const value = Number(correctedValueRaw);
    if (!Number.isFinite(value) || value < 0 || value > 100) return { error: "Value must be between 0 and 100" };
    next.performance ??= {};
    next.performance[parts[1]] ??= {};
    const previousValue = next.performance[parts[1]][parts[2]] ?? null;
    next.performance[parts[1]][parts[2]] = Math.round(value);
    return { previousValue, patchedRawMetrics: next };
  }

  // social.followers / social.posts30d / social.engagementRate
  if (category === "social" && metricPath === "social.followers") {
    const value = Number(correctedValueRaw);
    if (!Number.isFinite(value) || value < 0) return { error: "Followers must be a non-negative number" };
    next.social ??= {};
    const previousValue = next.social.followers ?? null;
    next.social.followers = Math.floor(value);
    if (next.social.followersStats) next.social.followersStats = { ...next.social.followersStats, value: Math.floor(value) } as PeerStats;
    return { previousValue, patchedRawMetrics: next };
  }
  if (category === "social" && metricPath === "social.posts30d") {
    const value = Number(correctedValueRaw);
    if (!Number.isFinite(value) || value < 0) return { error: "Posts must be a non-negative number" };
    next.social ??= {};
    const previousValue = next.social.posts30d ?? null;
    next.social.posts30d = Math.floor(value);
    if (next.social.postsStats) next.social.postsStats = { ...next.social.postsStats, value: Math.floor(value) } as PeerStats;
    return { previousValue, patchedRawMetrics: next };
  }
  if (category === "social" && metricPath === "social.engagementRate") {
    const value = Number(correctedValueRaw);
    if (!Number.isFinite(value) || value < 0 || value > 100) return { error: "Engagement rate must be between 0 and 100" };
    next.social ??= {};
    const previousValue = next.social.engagementRate ?? null;
    next.social.engagementRate = value;
    if (next.social.erStats) next.social.erStats = { ...next.social.erStats, value } as PeerStats;
    return { previousValue, patchedRawMetrics: next };
  }
  if (category === "social" && parts.length === 3 && parts[0] === "social" && parts[1] === "platforms" && SOCIAL_PLATFORMS.has(parts[2])) {
    if (typeof correctedValueRaw !== "boolean") return { error: "Platform presence must be true or false" };
    next.social ??= {};
    next.social.platforms ??= { linkedin: false, instagram: false, twitter: false, facebook: false };
    const previousValue = next.social.platforms[parts[2]] ?? false;
    next.social.platforms[parts[2]] = correctedValueRaw;
    return { previousValue, patchedRawMetrics: next };
  }

  // thoughtLeadership.postsCount / newsCount / bylinePct
  if (category === "thoughtLeadership" && metricPath === "thoughtLeadership.postsCount") {
    const value = Number(correctedValueRaw);
    if (!Number.isFinite(value) || value < 0) return { error: "Posts count must be a non-negative number" };
    next.thoughtLeadership ??= {};
    const previousValue = next.thoughtLeadership.postsCount ?? null;
    next.thoughtLeadership.postsCount = Math.floor(value);
    if (next.thoughtLeadership.postsStats) next.thoughtLeadership.postsStats = { ...next.thoughtLeadership.postsStats, value: Math.floor(value) } as PeerStats;
    return { previousValue, patchedRawMetrics: next };
  }
  if (category === "thoughtLeadership" && metricPath === "thoughtLeadership.newsCount") {
    const value = Number(correctedValueRaw);
    if (!Number.isFinite(value) || value < 0) return { error: "News count must be a non-negative number" };
    next.thoughtLeadership ??= {};
    const previousValue = next.thoughtLeadership.newsCount ?? null;
    next.thoughtLeadership.newsCount = Math.floor(value);
    if (next.thoughtLeadership.newsStats) next.thoughtLeadership.newsStats = { ...next.thoughtLeadership.newsStats, value: Math.floor(value) } as PeerStats;
    return { previousValue, patchedRawMetrics: next };
  }
  if (category === "thoughtLeadership" && metricPath === "thoughtLeadership.bylinePct") {
    // UI collects a 0-100 percentage; stored form is a 0-1 fraction (matches aggregateContentItems()).
    const pct = Number(correctedValueRaw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { error: "Byline rate must be between 0 and 100" };
    next.thoughtLeadership ??= {};
    const previousValue = (next.thoughtLeadership.bylinePct ?? 0) * 100;
    next.thoughtLeadership.bylinePct = pct / 100;
    return { previousValue, patchedRawMetrics: next };
  }

  // reputation.gbpListed
  if (category === "reputation" && metricPath === "reputation.gbpListed") {
    if (typeof correctedValueRaw !== "boolean") return { error: "GBP listing must be true or false" };
    next.reputation ??= {};
    const previousValue = next.reputation.gbpListed ?? false;
    next.reputation.gbpListed = correctedValueRaw;
    return { previousValue, patchedRawMetrics: next };
  }

  // reputation.<chambersRankedTables|legal500RankedTables|iflr1000RankedTables>.<CODE>
  if (category === "reputation" && parts.length === 3 && parts[0] === "reputation"
    && REPUTATION_TABLE_KEYS[parts[1]] && PRACTICE_AREA_CODES.has(parts[2])) {
    if (!marketConfig) return { error: "Unknown market — can't validate a rank without its configured depth" };
    const tableKey = REPUTATION_TABLE_KEYS[parts[1]];
    const subKey = REPUTATION_SUBSCORE_KEY[parts[1]];
    const deepest = tableKey === "chambersRankedTables" ? marketConfig.chambers.deepestBand
      : tableKey === "legal500RankedTables" ? marketConfig.legal500.deepestTier
      : marketConfig.iflr1000.deepestTier;

    const rank = Number(correctedValueRaw);
    if (!Number.isInteger(rank) || rank < 1 || rank > deepest) return { error: `Rank must be an integer between 1 and ${deepest}` };

    next.reputation ??= {};
    const rankedTables = { ...(next.reputation[tableKey] ?? {}) };
    const previousValue = rankedTables[parts[2]] ?? null;
    rankedTables[parts[2]] = rank;
    next.reputation[tableKey] = rankedTables;

    const previousSub = isRecord(next.reputation[subKey]) ? next.reputation[subKey] as Record<string, unknown> : undefined;
    const previousQualityStats = (previousSub?.qualityStats as PeerStats | null | undefined) ?? null;
    const recomputedSub = recomputeDirectorySubScore(rankedTables, deepest, previousQualityStats);
    next.reputation[subKey] = { ...previousSub, count: recomputedSub.count, avgRank: recomputedSub.avgRank, qualityStats: recomputedSub.qualityStats };

    return { previousValue, patchedRawMetrics: next };
  }

  return { error: "This metric can't be disputed — it isn't on the supported list" };
}
