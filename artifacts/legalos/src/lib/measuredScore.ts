import { CATEGORY_META, CATEGORY_ORDER, type CategoryKey } from "@/lib/visibilityCategories";
import { TOTAL_MAX, categoryMaxForVersion, totalMaxForVersion } from "../../supabase/functions/_shared/methodology";

/** Per-category score + provenance, keyed by category key — the shape every surface builds before calling computeMeasuredTotals. */
export type CategoryTotals = Record<string, { score: number; provenance: string }>;

export interface MeasuredTotals {
  /** Sum of scores across categories that actually have data. */
  score: number;
  /** Sum of max points across measured categories only — the fair denominator for a percentage. */
  measuredMax: number;
  /** The full 500-point scale, for reference/labeling only. */
  fullMax: number;
  /** True if at least one category has provenance "missing". */
  isPartial: boolean;
  /** Labels of the categories excluded from measuredMax (e.g. ["SEO & Authority"]). */
  excludedLabels: string[];
}

/**
 * A "missing" category (e.g. Search Authority when the provider couldn't
 * measure a domain) shouldn't drag down a firm's displayed percentage just
 * because it's an unmeasured 0 rather than a real, earned 0 — 200 of 400
 * measured points (50%) reads very differently than 200/500 (40%).
 */
export function computeMeasuredTotals(
  categories: CategoryTotals | null | undefined,
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

/** The score scale. Native since methodology v3 — no display rescale. */
export const DISPLAY_SCALE_MAX = TOTAL_MAX;

/**
 * Expresses a score against a max on the 500-point scale. For a fully
 * measured current audit this is the identity; for a partially measured
 * one it rescales against the measured max (the measured-only honesty
 * rule); for a stored pre-v3 snapshot it converts the old 200-point total.
 */
export function toScale500(score: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((score / max) * DISPLAY_SCALE_MAX);
}

/**
 * The denominator for a frozen history snapshot: the sum of category maxima
 * that snapshot actually measured, from its frozen provenance, under the
 * methodology version that scored it — never today's categories and never
 * a flat total when the snapshot was partial. Snapshots recorded before
 * provenance existed (undefined) get their version's full scale.
 */
export function measuredMaxFromProvenance(
  provenance: Partial<Record<string, string>> | null | undefined,
  methodologyVersion?: number | null,
): number {
  const fullMax = totalMaxForVersion(methodologyVersion);
  if (!provenance) return fullMax;
  const maxes = categoryMaxForVersion(methodologyVersion);
  let max = 0;
  for (const key of Object.keys(CATEGORY_META) as CategoryKey[]) {
    if (provenance[key] === "missing") continue;
    max += maxes[key];
  }
  return max > 0 ? max : fullMax;
}

/**
 * A history point on the 500-point scale, expressed against what THAT
 * snapshot measured under the methodology that scored it — so a point from
 * a partial audit reads consistently with the score ring, and deltas
 * computed by subtracting two of these match what the chart shows.
 */
export function historyScore500(
  totalScore: number,
  provenance: Partial<Record<string, string>> | null | undefined,
  methodologyVersion?: number | null,
): number {
  return toScale500(totalScore, measuredMaxFromProvenance(provenance, methodologyVersion));
}

/**
 * The denominator suffix every split number+suffix surface (PDF covers,
 * the share-card canvas, the score ring) renders instead of hardcoding a
 * denominator — partial audits read "/ 500 measured".
 */
export function scale500Suffix(totals: MeasuredTotals): string {
  return totals.isPartial ? "/ 500 measured" : "/ 500";
}

/**
 * The headline "N / 500" string for a total score — every surface that
 * prints a total (Command Center, Executive Report, Battle Plan PDF, the
 * shareable score card, What-If, Competitor Tracking) should render this
 * instead of hardcoding a denominator, so a firm with an unmeasured
 * category never reads as scoring lower than it actually did on what was
 * measured.
 */
export function measuredScoreLabel(totalScore: number, totals: MeasuredTotals): string {
  const max = totals.isPartial ? totals.measuredMax : totals.fullMax;
  return `${toScale500(totalScore, max)} ${scale500Suffix(totals)}`;
}

/**
 * The explanatory line to pair with measuredScoreLabel whenever it's
 * partial — makes explicit that the excluded categories were left out of
 * the denominator, not scored as a zero. Returns null when there's
 * nothing to explain (full coverage).
 */
export function measuredExcludedNote(totals: MeasuredTotals): string | null {
  if (!totals.isPartial) return null;
  return `${totals.excludedLabels.join(", ")} not yet scored — excluded above, not counted as a zero.`;
}

/**
 * The per-category "N / max" cell every category table/card renders
 * (Command Center cards, Executive Report PDF/DOCX/PPTX tables). A
 * "missing" category must never render as "0 / max" — that's an earned
 * zero, not an unmeasured one — so this is the single place that decides
 * between a real score and the "Not measured" label.
 */
export function categoryScoreCell(cat: { score: number; provenance: string } | undefined, key: CategoryKey): string {
  const provenance = cat?.provenance ?? "missing";
  if (provenance === "missing") return "Not measured";
  // Percentages, not point fractions: "35 / 50" next to a "/ 500" total
  // reads ambiguously; "70%" reads the same everywhere.
  return `${Math.round(((cat?.score ?? 0) / CATEGORY_META[key].max) * 100)}%`;
}

/**
 * The category to recommend as "highest-leverage focus" (Executive Report,
 * Command Center insights) — excludes categories with provenance
 * "missing", since an unmeasured category isn't an actionable weak spot,
 * it's a data gap, and can't be the recommendation. Returns null only
 * when every category is unmeasured.
 */
export function pickHighestLeverageCategory(categories: CategoryTotals | null | undefined): CategoryKey | null {
  const measuredKeys = CATEGORY_ORDER.filter((key) => {
    const cat = categories?.[key];
    return !!cat && cat.provenance !== "missing";
  });
  if (measuredKeys.length === 0) return null;
  return [...measuredKeys].sort((a, b) => {
    const aPct = categories![a].score / CATEGORY_META[a].max;
    const bPct = categories![b].score / CATEGORY_META[b].max;
    return aPct - bPct;
  })[0];
}
