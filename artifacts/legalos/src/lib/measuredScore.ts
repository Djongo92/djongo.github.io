import { CATEGORY_META, CATEGORY_ORDER, type CategoryKey } from "@/lib/visibilityCategories";

/** Per-category score + provenance, keyed by category key — the shape every surface builds before calling computeMeasuredTotals. */
export type CategoryTotals = Record<string, { score: number; provenance: string }>;

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

/**
 * Display scale: internal scoring stays on the 200-point category rules
 * (20/20/60/45/55), but every user-facing total renders on the 500-point
 * scale — a pure presentation rescale, so ranks, percentiles, and stored
 * audits are untouched. A partially measured firm is rescaled against its
 * *measured* max, keeping the measured-only honesty rule intact on the
 * new scale.
 */
export const DISPLAY_SCALE_MAX = 500;

/** Converts a raw score against a raw max to the public 500-point scale. */
export function toScale500(score: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((score / max) * DISPLAY_SCALE_MAX);
}

/**
 * The denominator for a frozen history snapshot: the sum of category maxima
 * that snapshot actually measured, from its frozen provenance — never
 * today's categories and never a flat 200 when the snapshot was partial.
 * Snapshots recorded before provenance existed (undefined) get the full
 * 200-point scale.
 */
export function measuredMaxFromProvenance(
  provenance: Partial<Record<string, string>> | null | undefined,
): number {
  if (!provenance) return 200;
  let max = 0;
  for (const key of Object.keys(CATEGORY_META) as CategoryKey[]) {
    if (provenance[key] === "missing") continue;
    max += CATEGORY_META[key].max;
  }
  return max > 0 ? max : 200;
}

/**
 * A history point on the 500 display scale, rescaled against what THAT
 * snapshot measured — so a point from a partial audit reads consistently
 * with the score ring (which uses the measured denominator), and deltas
 * computed by subtracting two of these match what the chart shows.
 */
export function historyScore500(
  totalScore: number,
  provenance: Partial<Record<string, string>> | null | undefined,
): number {
  return toScale500(Math.round(totalScore), measuredMaxFromProvenance(provenance));
}

/**
 * The denominator suffix every split number+suffix surface (PDF covers,
 * the share-card canvas, the score ring) renders instead of hardcoding
 * "/ 200" — partial audits read "/ 500 measured", never a shrunken raw
 * denominator that would leak the internal scale.
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
 * nothing to explain (full 200-point coverage).
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
  // Percentages, not raw point fractions: "14 / 20" invites confusion with
  // the public 500-point total scale; "70%" reads the same everywhere.
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
