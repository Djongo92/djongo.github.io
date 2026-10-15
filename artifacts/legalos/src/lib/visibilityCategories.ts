// Shared plain-English metadata for the five Market Visibility Score
// categories — one source of truth for the Command Center's category grid,
// the Analytics drill-down, and every explainer tooltip between them.
// Copy is written for a law firm marketer, not a data scientist: what it
// measures, why it's worth their attention, and (briefly) how the number
// is actually built — see CLAUDE.md's scoring reference for the exact formulas.
export type CategoryKey = "performance" | "social" | "seoAuthority" | "thoughtLeadership" | "reputation";

export interface CategoryMeta {
  label: string;
  max: number;
  what: string;
  why: string;
  how: string;
  /** Tailwind color family used to tell the five categories apart at a
   *  glance in the score grid/sparklines — distinct from `emerald`, which
   *  stays reserved for generic "this delta is positive" signals elsewhere. */
  color: "sky" | "rose" | "emerald" | "amber" | "violet";
}

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  performance: {
    label: "Performance",
    max: 20,
    what: "How fast, accessible, and technically sound your website is, per Google's own PageSpeed Insights (desktop and mobile).",
    why: "A slow or broken site loses prospective clients before they ever read your bio — this is the plumbing everything else depends on.",
    how: "10 pts from average page-speed score, 5 pts from accessibility, 5 pts from technical SEO — desktop and mobile averaged.",
    color: "sky",
  },
  social: {
    label: "Social Media",
    max: 20,
    what: "Your firm's LinkedIn following, posting frequency, and engagement, compared to your peer group.",
    why: "Referral sources and in-house counsel increasingly check LinkedIn before a first call — silence here reads as inactivity.",
    how: "5 pts followers + 5 pts posts in the last 30 days + 6 pts engagement rate, each relative to your peer group's current best, plus 4 pts for which platforms you maintain.",
    color: "rose",
  },
  seoAuthority: {
    label: "SEO & Authority",
    max: 60,
    what: "Six authority metrics — domain authority, referring domains, backlinks, organic traffic, organic keywords, and homepage-level authority — from Ahrefs, Moz, DataForSEO, or Open PageRank.",
    why: "This determines whether you show up when someone searches for a lawyer in your practice area, independent of your reputation offline.",
    how: "Each available metric scored up to 10 pts, peer-normalized against your peer group's 90th percentile. This category expands automatically as additional data integrations go live — metrics not yet connected show as 0 and will fill in without any action on your part.",
    color: "emerald",
  },
  thoughtLeadership: {
    label: "Thought Leadership",
    max: 45,
    what: "How often you publish original analysis, whether it's attributed to a named partner, and how often the market writes about you.",
    why: "This is the most controllable category — it's pure output, not reputation you inherited or infrastructure you paid for.",
    how: "25 pts posts (relative to peer max) + 5 pts byline rate + 15 pts press mentions (relative to peer max), over a rolling content window. Press mentions are independently verified via Google News — your own site is excluded from the results, so this can't be inflated by self-published announcements.",
    color: "amber",
  },
  reputation: {
    label: "Reputation",
    max: 55,
    what: "Your standing in Chambers, Legal 500, and IFLR1000, plus your Google Business Profile score — checked live against Google Places when available.",
    why: "This is the credibility your market already assigns you — the other categories are about whether that credibility is visible online.",
    how: "GBP: up to 10 pts broken down as 2 pts operational + 3 pts star rating + 3 pts review volume + 2 pts profile completeness (sourced from Google Places API when available; falls back to self-reported claim). Directories: up to 15 pts each for Chambers, Legal 500, and IFLR1000 — 10 pts for breadth (how many of the market's tracked tables you appear in) + 5 pts for depth (peer-normalized average band/tier).",
    color: "violet",
  },
};

/** Public 0–500-scale cap per category. Raw weights (20/20/60/45/55) scale
 *  ×2.5 to 50/50/150/112.5/137.5; the two fractional caps are rounded as a
 *  down/up pair so the public caps still sum to exactly 500. Data stays raw
 *  everywhere — this is presentation only, mirroring toScale500 for totals. */
export const CATEGORY_MAX_500: Record<CategoryKey, number> = {
  performance: 50,
  social: 50,
  seoAuthority: 150,
  thoughtLeadership: 112,
  reputation: 138,
};

/** Numeric category score on the public 0–500 scale: raw ×2.5, rounded like
 *  toScale500, clamped to the cap so a maxed Thought Leadership (45 × 2.5 =
 *  112.5) is 112, never 113 against a cap of 112. */
export function categoryScore500(score: number, key: CategoryKey): number {
  return Math.min(CATEGORY_MAX_500[key], Math.round(score * 2.5));
}

/** "X / Y" label for a category on the public 0–500 scale. */
export function categoryScoreLabel500(score: number, key: CategoryKey): string {
  return `${categoryScore500(score, key)} / ${CATEGORY_MAX_500[key]}`;
}

/** Literal Tailwind class lookups — Tailwind's JIT only picks up classes it
 *  can see as complete strings in source, so `bg-${color}-500` at runtime
 *  would silently produce nothing. */
export const CATEGORY_COLOR_CLASSES: Record<CategoryMeta["color"], { text: string; bg: string; border: string; stroke: string }> = {
  sky: { text: "text-sky-500", bg: "bg-sky-500", border: "border-sky-500/30", stroke: "stroke-sky-500" },
  rose: { text: "text-rose-500", bg: "bg-rose-500", border: "border-rose-500/30", stroke: "stroke-rose-500" },
  emerald: { text: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-500/30", stroke: "stroke-emerald-500" },
  amber: { text: "text-amber-500", bg: "bg-amber-500", border: "border-amber-500/30", stroke: "stroke-amber-500" },
  violet: { text: "text-violet-500", bg: "bg-violet-500", border: "border-violet-500/30", stroke: "stroke-violet-500" },
};

export const CATEGORY_ORDER: CategoryKey[] = ["performance", "social", "seoAuthority", "thoughtLeadership", "reputation"];

export type Provenance = "api" | "self_reported" | "ai_classified" | "detected" | "directory" | "historical" | "missing";

export const PROVENANCE_META: Record<Provenance, { label: string; description: string }> = {
  api: {
    label: "Verified",
    description: "Pulled directly from an external API — not self-reported, not estimated.",
  },
  self_reported: {
    label: "Self-reported",
    description: "Entered by your team at intake — accurate only as far as what was submitted.",
  },
  ai_classified: {
    label: "AI-read",
    description: "An AI model read your site's content and classified it — a good approximation, not a hand audit.",
  },
  detected: {
    label: "Auto-detected",
    description: "Found automatically from your website — presence only; follower and activity numbers still need intake.",
  },
  directory: {
    label: "Verified research",
    description: "Collected from the firm's public LinkedIn page by our research team — real numbers, not self-reported.",
  },
  historical: {
    label: "Historical",
    description: "Carried forward from the firm's most recent successful measurement while the live provider is unavailable.",
  },
  missing: {
    label: "Not available",
    description: "Not scored yet — either the data source isn't configured, or none could be found for your firm.",
  },
};
