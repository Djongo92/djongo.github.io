export interface ScoreHistoryRow {
  audited_domain: string;
  market: string;
  total_score: number;
  recorded_at: string;
}

export interface ScorePrimary {
  audited_domain: string;
  market: string;
}

/**
 * Change in total score from the first recorded audit to the latest, for
 * this firm/market. Mirrors CommandCenter's own `trend`/`scoreDelta` calc
 * exactly, extracted here so the sidebar's score badge and the dashboard's
 * "+N since first audit" line can't drift into showing two different
 * deltas for the same underlying history.
 */
export function computeScoreDelta(history: ScoreHistoryRow[], primary: ScorePrimary | null): number {
  if (!primary) return 0;
  const trend = history
    .filter((h) => h.audited_domain === primary.audited_domain && h.market === primary.market)
    .map((h) => Math.round(h.total_score));
  return trend.length > 1 ? trend[trend.length - 1] - trend[0] : 0;
}
