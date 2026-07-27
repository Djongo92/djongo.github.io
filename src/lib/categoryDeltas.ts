import { CATEGORY_ORDER, type CategoryKey } from "@/lib/visibilityCategories";

export interface CategoryHistoryRow {
  audited_domain: string;
  market: string;
  recorded_at: string;
  performance_score?: number;
  social_score?: number;
  seo_authority_score?: number;
  thought_leadership_score?: number;
  reputation_score?: number;
}

const HISTORY_FIELD_FOR: Record<CategoryKey, keyof CategoryHistoryRow> = {
  performance: "performance_score",
  social: "social_score",
  seoAuthority: "seo_authority_score",
  thoughtLeadership: "thought_leadership_score",
  reputation: "reputation_score",
};

export interface CategoryDeltas {
  deltas: { key: CategoryKey; delta: number }[];
  /** The PREVIOUS audit's date — the baseline this comparison is "since" — not the latest one. */
  recordedAt: string;
}

/**
 * Per-category score change between a firm's two most recent recorded
 * audits. `recordedAt` must be the earlier (previous) row's date: the
 * dashboard's "What changed since {date}" label is naming the baseline
 * being compared FROM, not the run that just happened.
 */
export function computeCategoryDeltas(
  history: CategoryHistoryRow[],
  primary: { audited_domain: string; market: string } | null,
): CategoryDeltas | null {
  if (!primary) return null;
  const ownHistory = history
    .filter((h) => h.audited_domain === primary.audited_domain && h.market === primary.market)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  if (ownHistory.length < 2) return null;
  const previous = ownHistory[ownHistory.length - 2];
  const latest = ownHistory[ownHistory.length - 1];
  const deltas = CATEGORY_ORDER.map((key) => {
    const field = HISTORY_FIELD_FOR[key];
    const prevScore = Number(previous[field] ?? 0);
    const latestScore = Number(latest[field] ?? 0);
    return { key, delta: Math.round((latestScore - prevScore) * 10) / 10 };
  }).filter((d) => Math.abs(d.delta) >= 0.1);
  return { deltas, recordedAt: previous.recorded_at };
}
