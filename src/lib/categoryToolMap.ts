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
  categoryKey: string;
  categoryLabel: string;
  toolId: WorkshopToolId;
  score: number;
  max: number;
  /** max - score — the actual number of points on the table, not a percentage. This is what "highest-leverage" is ranked on. */
  pointsRecoverable: number;
}

/** Below this, a category counts as "weak enough to recommend fixing" at all. */
const WEAK_THRESHOLD_PCT = 50;

/**
 * The single highest-leverage category to work on — highest-leverage means
 * the most absolute points still on the table (max - score), NOT the lowest
 * percentage. A category at 22/45 (23 points recoverable) is a bigger
 * opportunity than one at 9.5/20 (10.5 points recoverable) even though the
 * second one's percentage looks worse — points are what actually move the
 * 200-point total, percentages don't. Both useCommandCenterInsights (Key
 * Insights) and the sidebar/Monday Brief "this week's move" call this same
 * function so they can never recommend two different categories.
 */
export function findWeakestCategoryTool(
  categories: Record<string, { score: number; provenance: string }> | null | undefined,
): WeakestCategoryTool | null {
  if (!categories) return null;
  let worst: WeakestCategoryTool | null = null;
  for (const [key, cat] of Object.entries(categories)) {
    if (cat.provenance === "missing") continue;
    const meta = CATEGORY_TOOL_MAP[key];
    if (!meta) continue;
    const pct = meta.max > 0 ? (cat.score / meta.max) * 100 : 0;
    if (pct >= WEAK_THRESHOLD_PCT) continue;
    const pointsRecoverable = meta.max - cat.score;
    if (!worst || pointsRecoverable > worst.pointsRecoverable) {
      worst = { categoryKey: key, categoryLabel: meta.label, toolId: meta.toolId, score: cat.score, max: meta.max, pointsRecoverable };
    }
  }
  return worst;
}
