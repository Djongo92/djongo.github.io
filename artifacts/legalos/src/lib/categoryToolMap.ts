import type { WorkshopToolId } from "@/lib/handoff";
import { CATEGORY_META } from "./visibilityCategories";

/**
 * Maps a Market Visibility Score category to the single Workshop tool most
 * likely to move it, plus its point ceiling (for computing "% of max").
 * Shared by useCommandCenterInsights (the Key Insights feed) and the
 * sidebar's "Work on your weakest category" shortcut, so the two surfaces
 * never recommend two different tools for the same weak category.
 *
 * A "missing" category (not configured) is skipped by
 * findWeakestCategoryTool — that isn't a real gap to send anyone to fix.
 */
export const CATEGORY_TOOL_MAP: Record<string, { label: string; max: number; toolId: WorkshopToolId }> = {
  performance: { label: CATEGORY_META.performance.label, max: CATEGORY_META.performance.max, toolId: "audit" },
  social: { label: CATEGORY_META.social.label, max: CATEGORY_META.social.max, toolId: "linkedin" },
  seoAuthority: { label: CATEGORY_META.seoAuthority.label, max: CATEGORY_META.seoAuthority.max, toolId: "article" },
  thoughtLeadership: { label: CATEGORY_META.thoughtLeadership.label, max: CATEGORY_META.thoughtLeadership.max, toolId: "article" },
  reputation: { label: CATEGORY_META.reputation.label, max: CATEGORY_META.reputation.max, toolId: "submission" },
};

/**
 * Every Workshop tool that can move a category, first = the primary one
 * CATEGORY_TOOL_MAP recommends. Powers the "Improve this" shortcuts on the
 * category cards, so a weak pillar is one click from the tool that fixes it.
 */
export const CATEGORY_FIX_TOOLS: Record<string, { toolId: WorkshopToolId; label: string }[]> = {
  performance: [
    { toolId: "audit", label: "Check a live page" },
    { toolId: "rewrite", label: "Rewrite weak copy" },
  ],
  social: [
    { toolId: "linkedin", label: "Plan a week of LinkedIn posts" },
    { toolId: "copywriter", label: "Write a post" },
  ],
  seoAuthority: [
    { toolId: "article", label: "Publish an insight article" },
    { toolId: "pitch", label: "Earn press links and mentions" },
  ],
  thoughtLeadership: [
    { toolId: "article", label: "Draft an article" },
    { toolId: "pitch", label: "Pitch the press" },
    { toolId: "calendar", label: "Plan a content calendar" },
  ],
  reputation: [
    { toolId: "submission", label: "Prepare a directory submission" },
    { toolId: "casestudy", label: "Write up a matter" },
    { toolId: "teardown", label: "Study a ranked peer" },
  ],
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
 * percentage. A category at 80/150 (70 points recoverable) is a bigger
 * opportunity than one at 20/50 (30 points recoverable) even though the
 * second one's percentage looks worse — points are what actually move the
 * 500-point total, percentages don't. Both useCommandCenterInsights (Key
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
