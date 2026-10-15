import { useMemo } from "react";

export interface CategoryScore {
  score: number;
  provenance: string;
}

export interface NextBestAction {
  category: string;
  label: string;
  scorePct: number; // this category's score as % of its own max, 0-100
  action: string;
  ctaLabel: string;
}

interface CategoryMeta {
  label: string;
  max: number;
  action: string;
  ctaLabel: string;
}

// "missing" (SEO & Authority right now — AHREFS_API_KEY/MOZ_API_KEY aren't
// configured, per CLAUDE.md's hard stop) is excluded from consideration
// below — recommending a fix for a category that was never measured would
// be a false signal, not a real gap.
const CATEGORY_META: Record<string, CategoryMeta> = {
  performance: {
    label: "Performance",
    max: 20,
    action: "Your site's technical performance (load speed, accessibility, on-page SEO basics) is the weak spot. Get your developer to run a Lighthouse audit and fix the worst offenders.",
    ctaLabel: "Re-run your audit after fixes",
  },
  social: {
    label: "Social Media",
    max: 20,
    action: "Your social presence is thin relative to what a peer-group firm typically shows. A steady LinkedIn posting cadence is the fastest way to move this.",
    ctaLabel: "Draft social copy in the Workshop",
  },
  thoughtLeadership: {
    label: "Thought Leadership",
    max: 45,
    action: "You're not publishing enough named, dated content. One article a month under a partner's byline moves this category the most.",
    ctaLabel: "Draft an article in the Workshop",
  },
  reputation: {
    label: "Reputation",
    max: 55,
    action: "Your directory standing (Chambers/Legal 500) and Google Business Profile presence are pulling this down. Confirm your GBP is claimed and active, and check your directory submission status.",
    ctaLabel: "Review the Reputation chapter",
  },
  seoAuthority: {
    label: "SEO & Authority",
    max: 60,
    action: "SEO & Authority scoring isn't configured for this build yet.",
    ctaLabel: "—",
  },
};

/**
 * Picks the single largest real gap across the five categories — the
 * category scoring lowest as a % of its own max, among categories that
 * actually have data. Never returns more than one recommendation; resist
 * the urge to show a ranked list.
 */
export function useNextBestAction(
  categories: Record<string, CategoryScore> | null | undefined,
): NextBestAction | null {
  return useMemo(() => {
    if (!categories) return null;

    let worstKey: string | null = null;
    let worstPct = Infinity;

    for (const [key, cat] of Object.entries(categories)) {
      if (cat.provenance === "missing") continue;
      const meta = CATEGORY_META[key];
      if (!meta) continue;
      const pct = meta.max > 0 ? (cat.score / meta.max) * 100 : 0;
      if (pct < worstPct) {
        worstPct = pct;
        worstKey = key;
      }
    }

    if (!worstKey) return null;
    const meta = CATEGORY_META[worstKey];
    return {
      category: worstKey,
      label: meta.label,
      scorePct: Math.round(worstPct),
      action: meta.action,
      ctaLabel: meta.ctaLabel,
    };
  }, [categories]);
}
