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
  /** The full 500-point scale, for reference/labeling only. */
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
 * Scores are native on the 500-point scale since methodology v3 — kept in
 * parity with the web app's measuredScore.ts and the shared methodology
 * (artifacts/legalos/supabase/functions/_shared/methodology.ts).
 */
export const DISPLAY_SCALE_MAX = 500;

/** Category maxima — current methodology (v3), and v1–v2 for stored history. */
const CATEGORY_MAX: Record<string, number> = {
  performance: 50,
  social: 75,
  seoAuthority: 100,
  thoughtLeadership: 150,
  reputation: 125,
};
const LEGACY_CATEGORY_MAX: Record<string, number> = {
  performance: 20,
  social: 20,
  seoAuthority: 60,
  thoughtLeadership: 45,
  reputation: 55,
};

const isCurrent = (version: number | null | undefined) => version != null && version >= 3;

/**
 * The denominator for a frozen history snapshot: the sum of category maxima
 * that snapshot actually measured, under the methodology version that scored
 * it. Snapshots without provenance get their version's full scale.
 * (Parity port of the web app's measuredMaxFromProvenance.)
 */
export function measuredMaxFromProvenance(
  provenance: Partial<Record<string, string>> | null | undefined,
  methodologyVersion?: number | null,
): number {
  const maxes = isCurrent(methodologyVersion) ? CATEGORY_MAX : LEGACY_CATEGORY_MAX;
  const fullMax = isCurrent(methodologyVersion) ? 500 : 200;
  if (!provenance) return fullMax;
  let max = 0;
  for (const key of Object.keys(maxes)) {
    if (provenance[key] === 'missing') continue;
    max += maxes[key];
  }
  return max > 0 ? max : fullMax;
}

/**
 * A history point on the 500-point scale, expressed against what THAT
 * snapshot measured under the methodology that scored it.
 * (Parity port of the web's historyScore500.)
 */
export function historyScore500(
  totalScore: number,
  provenance: Partial<Record<string, string>> | null | undefined,
  methodologyVersion?: number | null,
): number {
  return toScale500(totalScore, measuredMaxFromProvenance(provenance, methodologyVersion));
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
