// Insight usefulness ratings (task #127): firms rate Network Insights cards
// useful / not-useful so weak templates can be tuned or retired as the
// dataset grows. Pure helpers — the UI keeps a Record<insightKey, rating>
// and swaps entries immutably so optimistic updates and rollbacks share one
// code path.

export type InsightRating = "useful" | "not_useful";

/** Clicking the active rating clears it; clicking the other one switches. */
export function nextInsightRating(current: InsightRating | undefined, clicked: InsightRating): InsightRating | null {
  return current === clicked ? null : clicked;
}

/** Returns a NEW ratings record with the entry set (or removed when null). */
export function applyRating(
  ratings: Record<string, InsightRating>,
  key: string,
  next: InsightRating | null,
): Record<string, InsightRating> {
  const out = { ...ratings };
  if (next) out[key] = next;
  else delete out[key];
  return out;
}
