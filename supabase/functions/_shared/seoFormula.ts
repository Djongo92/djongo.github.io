// Pure SEO & Authority category math (60 pts): no Deno globals, no network,
// no Supabase client — mirrors socialFormula.ts's split from its impure
// orchestrator, purely for testability.
//
// Six metrics (see seoProviders/types.ts), each worth up to 10 pts via
// p90Ratio() from percentileFormula.ts (1.0 at or above the peer group's
// 90th percentile) — same normalization every other peer-relative metric in
// this app uses, NOT value/peer-max.
//
// A configured provider doesn't have to expose all six (Moz has no organic
// traffic/keywords; Open PageRank has exactly one field) — rather than
// treating an unavailable metric as an earned zero, the category rescales
// to whatever subset actually came back: 60 × (average of the available
// ratios). A firm scored on 1 available metric at its peer group's 90th
// percentile still reads as a full 60, not an artificially crushed 10 —
// the same "no fabricated total from a missing input" principle CLAUDE.md
// states for whole categories, applied one level down within this one.
export const SEO_MAX = 60;
export const SEO_METRIC_COUNT = 6;

export interface SeoScoreResult {
  score: number;
  metricsAvailable: number;
  metricsTotal: number;
}

/**
 * `ratios` should have exactly SEO_METRIC_COUNT entries, one per metric in
 * seoProviders/types.ts's NormalizedSeoMetrics, in any consistent order —
 * `null` for any metric the configured provider doesn't expose or that
 * failed to fetch.
 */
export function calculateSeoScore(ratios: (number | null)[]): SeoScoreResult {
  const metricsTotal = ratios.length;
  const available = ratios.filter((r): r is number => r !== null);
  const metricsAvailable = available.length;

  if (metricsAvailable === 0) {
    return { score: 0, metricsAvailable: 0, metricsTotal };
  }

  const avgRatio = available.reduce((a, b) => a + b, 0) / metricsAvailable;
  const score = Math.round(SEO_MAX * avgRatio * 100) / 100;
  return { score, metricsAvailable, metricsTotal };
}
