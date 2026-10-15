// Short "raw observable metric" headline per category for a score-history
// point — ported from the web app's visibilityInputFormatters.ts
// (CATEGORY_TREND_METRIC) so mobile shows the exact same evidence strings
// as the web chart's tooltip. Each fn takes ONE category's frozen raw
// sub-object (raw_metrics[key]) and returns null when that category's
// inputs weren't recorded on the snapshot (older rows, or a category that
// scored "missing" at that point) — a missing value must never render as
// a fabricated 0.

export type TrendCategoryKey = 'performance' | 'social' | 'seoAuthority' | 'thoughtLeadership' | 'reputation';

// deno-lint-ignore no-explicit-any
export function performanceTrendMetric(raw: any): string | null {
  if (raw?.desktop?.performance == null || raw?.mobile?.performance == null) return null;
  const avg = raw.perfAvg ?? Math.round((raw.desktop.performance + raw.mobile.performance) / 2);
  return `${avg} PageSpeed avg`;
}

// deno-lint-ignore no-explicit-any
export function socialTrendMetric(raw: any): string | null {
  if (raw?.followers == null) return null;
  return `${Number(raw.followers).toLocaleString()} followers`;
}

// deno-lint-ignore no-explicit-any
export function seoTrendMetric(_raw: any): string | null {
  return null; // Not configured in this build — no raw metric to show.
}

// deno-lint-ignore no-explicit-any
export function thoughtLeadershipTrendMetric(raw: any): string | null {
  if (raw?.postsCount == null) return null;
  return `${raw.postsCount} post${raw.postsCount === 1 ? '' : 's'}`;
}

// deno-lint-ignore no-explicit-any
export function reputationTrendMetric(raw: any): string | null {
  if (!raw) return null;
  if (raw.gbpRating != null) return `★ ${raw.gbpRating} GBP`;
  const tableCount = (raw.chambers?.count ?? 0) + (raw.legal500?.count ?? 0) + (raw.iflr1000?.count ?? 0);
  if (tableCount > 0) return `${tableCount} ranked table${tableCount === 1 ? '' : 's'}`;
  if (raw.gbpListed != null) return raw.gbpListed ? 'GBP listed' : null;
  return null;
}

/** Keyed the same way the web's CATEGORY_TREND_METRIC is — each fn takes
 *  just that one category's raw sub-object, not the whole raw_metrics. */
export const CATEGORY_TREND_METRIC: Record<TrendCategoryKey, (raw: any) => string | null> = {
  performance: performanceTrendMetric,
  social: socialTrendMetric,
  seoAuthority: seoTrendMetric,
  thoughtLeadership: thoughtLeadershipTrendMetric,
  reputation: reputationTrendMetric,
};

/**
 * Joins every measured category's raw metric into one compact evidence line
 * for a history point (the audit log row). A category whose frozen
 * provenance is "missing" (or absent — older rows) is omitted entirely:
 * an unmeasured category must never show a fabricated raw value, the same
 * gate as the web score-history chart (`wasMeasured` in Analytics.tsx).
 * Returns null when nothing was recorded on the snapshot.
 */
export function historyEvidenceLine(
  // deno-lint-ignore no-explicit-any
  rawMetrics: Record<string, any> | null | undefined,
  provenance: Partial<Record<TrendCategoryKey, string>> | null | undefined,
): string | null {
  if (!rawMetrics) return null;
  const parts: string[] = [];
  for (const key of Object.keys(CATEGORY_TREND_METRIC) as TrendCategoryKey[]) {
    if ((provenance?.[key] ?? 'missing') === 'missing') continue;
    const metric = CATEGORY_TREND_METRIC[key](rawMetrics[key]);
    if (metric) parts.push(metric);
  }
  return parts.length ? parts.join(' · ') : null;
}

/** Minimal shape of the history point an audit log row renders — structurally
 *  compatible with DataContext's AuditHistoryEntry without importing it
 *  (keeps this lib free of context dependencies). */
export interface HistoryPointDisplay {
  // deno-lint-ignore no-explicit-any
  rawMetrics: Record<string, any> | null;
  provenance: Partial<Record<TrendCategoryKey, string>> | null;
  confidenceScore: number | null;
  sampleSize: number | null;
}

/**
 * "X% confidence · smallest sample N firms" — rendered whenever the
 * snapshot recorded a confidence value, thin-sampled or not (mirrors the
 * web chart's tooltip, which shows the line for every point that has one).
 * Returns null only when confidence wasn't recorded.
 */
export function historyConfidenceLine(point: { confidenceScore: number | null; sampleSize: number | null }): string | null {
  if (point.confidenceScore == null) return null;
  return `${Math.round(point.confidenceScore * 100)}% confidence${point.sampleSize != null ? ` · smallest sample ${point.sampleSize} firms` : ''}`;
}

/** Whether a point was recorded on a thin peer sample — drives the amber
 *  dot/badge styling. Confidence 1 (or unrecorded) is not thin. */
export function isThinSampledPoint(point: { confidenceScore: number | null }): boolean {
  return point.confidenceScore != null && point.confidenceScore < 1;
}

/**
 * Everything an audit log row displays for one history point, so the
 * row-rendering rules (evidence gating, confidence shown whenever known,
 * thin flag) are unit-tested rather than buried in JSX — the same
 * extract-and-test idiom as peerLeaderboard/buildLeaderboard.
 */
export function historyRowDisplay(point: HistoryPointDisplay): {
  evidence: string | null;
  confidence: string | null;
  thin: boolean;
} {
  return {
    evidence: historyEvidenceLine(point.rawMetrics, point.provenance),
    confidence: historyConfidenceLine(point),
    thin: isThinSampledPoint(point),
  };
}
