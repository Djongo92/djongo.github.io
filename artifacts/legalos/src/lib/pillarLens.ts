// Pillar lens: re-reads the visibility list through only the pillars a
// visitor cares about. It never re-weights anything — each chosen pillar
// counts exactly as much as it does in the official score; the lens just
// leaves the unchosen ones out of both the earned points and the
// denominator. A firm with none of the chosen pillars measured has no lens
// score at all (excluded, never shown as an earned zero).
import { CATEGORY_ORDER, type CategoryKey } from "./visibilityCategories";
import type { CombinedVisibilityRow } from "./mergeVisibilityRows";

export interface PillarPreset {
  id: string;
  label: string;
  blurb: string;
  pillars: CategoryKey[];
}

export const FIXED_PRESETS: PillarPreset[] = [
  { id: "seen", label: "Get Seen", blurb: "Website + Search", pillars: ["performance", "seoAuthority"] },
  { id: "expert", label: "Be the Expert", blurb: "Thought Leadership + Social", pillars: ["thoughtLeadership", "social"] },
  { id: "prestige", label: "Prestige", blurb: "Recognition + Search", pillars: ["reputation", "seoAuthority"] },
];

/** Keeps only known pillar keys, deduplicated, in canonical order. */
export function normalizePillars(input: readonly string[]): CategoryKey[] {
  const set = new Set(input);
  return CATEGORY_ORDER.filter((k) => set.has(k));
}

export function parsePillarParam(param: string | null): CategoryKey[] {
  return param ? normalizePillars(param.split(",")) : [];
}

/** Lens percent for one row, or null when none of the chosen pillars is
 *  measured for it. An empty or all-five selection is the official view. */
export function lensPercent(row: CombinedVisibilityRow, pillars: readonly CategoryKey[]): number | null {
  if (pillars.length === 0 || pillars.length === CATEGORY_ORDER.length) return row.visibilityPercent;
  const chosen = new Set(pillars);
  let score = 0;
  let max = 0;
  if (row.categoryBreakdown) {
    for (const c of row.categoryBreakdown) {
      if (!chosen.has(c.key) || !c.measured || c.max <= 0) continue;
      score += Math.min(c.score, c.max);
      max += c.max;
    }
  } else if (!row.hasFullAudit && chosen.has("reputation")) {
    // Directory-only firm: its single measured input is Recognition.
    score = row.measuredScore;
    max = row.measuredMax;
  }
  if (max <= 0) return null;
  return Math.round((score / max) * 100);
}

export interface LensedRow extends CombinedVisibilityRow {
  overallPercent: number;
}

/** Applies the lens: rows get their lens percent in visibilityPercent (so
 *  existing tiering/rival code works unchanged) and keep the official
 *  figure in overallPercent. Rows the lens can't score are returned apart. */
export function applyLens(
  rows: readonly CombinedVisibilityRow[],
  pillars: readonly CategoryKey[],
): { scored: LensedRow[]; unscored: CombinedVisibilityRow[] } {
  const scored: LensedRow[] = [];
  const unscored: CombinedVisibilityRow[] = [];
  for (const r of rows) {
    const p = lensPercent(r, pillars);
    if (p === null) unscored.push(r);
    else scored.push({ ...r, overallPercent: r.visibilityPercent, visibilityPercent: p });
  }
  return { scored, unscored };
}
