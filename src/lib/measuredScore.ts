import { CATEGORY_META, type CategoryKey } from "@/lib/visibilityCategories";

export interface MeasuredTotals {
  /** Sum of scores across categories that actually have data. */
  score: number;
  /** Sum of max points across measured categories only — the fair denominator for a percentage. */
  measuredMax: number;
  /** The full 200-point scale, for reference/labeling only. */
  fullMax: number;
  /** True if at least one category has provenance "missing". */
  isPartial: boolean;
  /** Labels of the categories excluded from measuredMax (e.g. ["SEO & Authority"]). */
  excludedLabels: string[];
}

/**
 * A "missing" category (not yet configured, e.g. SEO & Authority without an
 * Ahrefs/Moz key) shouldn't drag down a firm's displayed percentage just
 * because it's an unmeasured 0 rather than a real, earned 0 — an 80-point
 * firm out of 140 measured points (57%) reads very differently than 80/200
 * (40%). Mirrors the transparency the Recognition Index page already
 * applies by capping its own denominator at what it actually measures.
 */
export function computeMeasuredTotals(
  categories: Record<string, { score: number; provenance: string }> | null | undefined,
): MeasuredTotals {
  let score = 0;
  let measuredMax = 0;
  let fullMax = 0;
  const excludedLabels: string[] = [];
  for (const key of Object.keys(CATEGORY_META) as CategoryKey[]) {
    const meta = CATEGORY_META[key];
    fullMax += meta.max;
    const cat = categories?.[key];
    if (!cat || cat.provenance === "missing") {
      excludedLabels.push(meta.label);
      continue;
    }
    score += cat.score;
    measuredMax += meta.max;
  }
  return { score, measuredMax, fullMax, isPartial: excludedLabels.length > 0, excludedLabels };
}
