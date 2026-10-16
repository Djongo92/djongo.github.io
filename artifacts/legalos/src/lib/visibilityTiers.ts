// Pure tier-banding for the unified Visibility Index — deliberately not a
// numbered ranking ("#1, #2, #3..."). The list is meant to answer "how
// visible is this firm, and what would move that" for the firm reading it,
// not "who's winning" — an ordinal position does the opposite of that: it
// turns every firm below the top spot into a loser by construction, even
// when the actual gap between #4 and #5 might be a single point. Tiers
// group firms by how visible they are without implying a precise, brittle
// order within a tier.
export type VisibilityTier = "highly_visible" | "visible" | "emerging" | "not_yet_visible";

export const VISIBILITY_TIER_ORDER: VisibilityTier[] = ["highly_visible", "visible", "emerging", "not_yet_visible"];

export const VISIBILITY_TIER_META: Record<VisibilityTier, { label: string; blurb: string }> = {
  highly_visible: {
    label: "Highly Visible",
    blurb: "Performing well across most of what's measured.",
  },
  visible: {
    label: "Visible",
    blurb: "A solid, real presence with clear room to grow.",
  },
  emerging: {
    label: "Emerging",
    blurb: "Some real signal, but visibility is still thin.",
  },
  not_yet_visible: {
    label: "Not Yet Visible",
    blurb: "Little to no measured presence yet — the most room to move.",
  },
};

/** Percentage thresholds are intentionally round and approximate — this is
 *  a qualitative band, not a precision instrument. */
export function visibilityTierFor(visibilityPercent: number): VisibilityTier {
  if (visibilityPercent >= 70) return "highly_visible";
  if (visibilityPercent >= 40) return "visible";
  if (visibilityPercent >= 15) return "emerging";
  return "not_yet_visible";
}
