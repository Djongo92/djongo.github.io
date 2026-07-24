import type { WorkshopToolId } from "@/lib/handoff";

/**
 * Maps a Market Visibility Score category to the single Workshop tool most
 * likely to move it, plus its point ceiling (for computing "% of max").
 * Shared by useCommandCenterInsights (the Key Insights feed) and the
 * sidebar's "Work on your weakest category" shortcut, so the two surfaces
 * never recommend two different tools for the same weak category.
 *
 * seoAuthority is excluded — "missing" (not configured) isn't a real gap
 * to send someone to fix in the Workshop.
 */
export const CATEGORY_TOOL_MAP: Record<string, { label: string; max: number; toolId: WorkshopToolId }> = {
  performance: { label: "Performance", max: 20, toolId: "audit" },
  social: { label: "Social Media", max: 20, toolId: "copywriter" },
  thoughtLeadership: { label: "Thought Leadership", max: 45, toolId: "copywriter" },
  reputation: { label: "Reputation", max: 55, toolId: "teardown" },
};

export interface WeakestCategoryTool {
  categoryLabel: string;
  toolId: WorkshopToolId;
}

/** Below this, a category counts as "weak enough to recommend fixing" (matches useCommandCenterInsights). */
const WEAK_THRESHOLD_PCT = 50;

/** The single lowest-scoring tracked category below the weak threshold, or null if none qualifies. */
export function findWeakestCategoryTool(
  categories: Record<string, { score: number; provenance: string }> | null | undefined,
): WeakestCategoryTool | null {
  if (!categories) return null;
  let worst: { pct: number; categoryLabel: string; toolId: WorkshopToolId } | null = null;
  for (const [key, cat] of Object.entries(categories)) {
    if (cat.provenance === "missing") continue;
    const meta = CATEGORY_TOOL_MAP[key];
    if (!meta) continue;
    const pct = meta.max > 0 ? (cat.score / meta.max) * 100 : 0;
    if (pct < WEAK_THRESHOLD_PCT && (!worst || pct < worst.pct)) {
      worst = { pct, categoryLabel: meta.label, toolId: meta.toolId };
    }
  }
  return worst ? { categoryLabel: worst.categoryLabel, toolId: worst.toolId } : null;
}
