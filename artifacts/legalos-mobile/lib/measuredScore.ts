/**
 * Denominator-honest score totals — mirrors
 * artifacts/legalos/src/lib/measuredScore.ts so the mobile app and the web
 * app agree on what "missing" means. A category with provenance "missing"
 * (audit couldn't measure it — e.g. no GBP match, no paid SEO data source)
 * must never render as an earned zero: it's excluded from the denominator
 * instead of silently dragging the percentage down.
 */

export interface MeasuredCategory {
  label: string;
  score: number;
  max: number;
  provenance: string;
}

export interface MeasuredTotals {
  /** Sum of scores across categories that actually have data. */
  score: number;
  /** Sum of max points across measured categories only — the fair denominator. */
  measuredMax: number;
  /** The full 200-point scale, for reference/labeling only. */
  fullMax: number;
  /** True if at least one category has provenance "missing". */
  isPartial: boolean;
  /** Labels of the categories excluded from measuredMax. */
  excludedLabels: string[];
}

export function computeMeasuredTotals(categories: MeasuredCategory[]): MeasuredTotals {
  let score = 0;
  let measuredMax = 0;
  let fullMax = 0;
  const excludedLabels: string[] = [];
  for (const cat of categories) {
    fullMax += cat.max;
    if (cat.provenance === 'missing') {
      excludedLabels.push(cat.label);
      continue;
    }
    score += cat.score;
    measuredMax += cat.max;
  }
  return { score, measuredMax, fullMax, isPartial: excludedLabels.length > 0, excludedLabels };
}

/**
 * Display scale: internal scoring stays on the 200-point category rules,
 * but every user-facing total renders on the 500-point scale — a pure
 * presentation rescale, so ranks, percentiles, and stored audits are
 * untouched. Kept in parity with the web app's measuredScore.ts.
 */
export const DISPLAY_SCALE_MAX = 500;

/** Raw maxima per category — mirrors the web app's CATEGORY_META
 *  (artifacts/legalos/src/lib/visibilityCategories.ts; 20/20/60/45/55 = 200).
 *  Needed to rescale frozen history snapshots against what THEY measured. */
const CATEGORY_MAX: Record<string, number> = {
  performance: 20,
  social: 20,
  seoAuthority: 60,
  thoughtLeadership: 45,
  reputation: 55,
};

/**
 * The denominator for a frozen history snapshot: the sum of category maxima
 * that snapshot actually measured, from its frozen provenance — never
 * today's categories and never a flat 200 when the snapshot was partial.
 * Snapshots without provenance get the full 200-point scale.
 * (Parity port of the web app's measuredMaxFromProvenance.)
 */
export function measuredMaxFromProvenance(
  provenance: Partial<Record<string, string>> | null | undefined,
): number {
  if (!provenance) return 200;
  let max = 0;
  for (const key of Object.keys(CATEGORY_MAX)) {
    if (provenance[key] === 'missing') continue;
    max += CATEGORY_MAX[key];
  }
  return max > 0 ? max : 200;
}

/**
 * A history point on the 500 display scale, rescaled against what THAT
 * snapshot measured — so a point from a partial audit reads consistently
 * with the score ring, and deltas computed by subtracting two of these
 * match what the chart shows. (Parity port of the web's historyScore500.)
 */
export function historyScore500(
  totalScore: number,
  provenance: Partial<Record<string, string>> | null | undefined,
): number {
  return toScale500(Math.round(totalScore), measuredMaxFromProvenance(provenance));
}

/** Converts a raw score against a raw max to the public 500-point scale. */
export function toScale500(score: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((score / max) * DISPLAY_SCALE_MAX);
}

export function scale500Suffix(totals: MeasuredTotals): string {
  return totals.isPartial ? '/ 500 measured' : '/ 500';
}

/** The headline "N / 500" string for a total score. */
export function measuredScoreLabel(totalScore: number, totals: MeasuredTotals): string {
  const max = totals.isPartial ? totals.measuredMax : totals.fullMax;
  return `${toScale500(totalScore, max)} ${scale500Suffix(totals)}`;
}

/** The explanatory line to pair with measuredScoreLabel whenever it's partial. */
export function measuredExcludedNote(totals: MeasuredTotals): string | null {
  if (!totals.isPartial) return null;
  return `${totals.excludedLabels.join(', ')} not yet scored — excluded above, not counted as a zero.`;
}
