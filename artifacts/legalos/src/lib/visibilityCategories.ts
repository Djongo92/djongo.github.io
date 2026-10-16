// Shared plain-English metadata for the five Market Visibility Score
// categories — one source of truth for the Command Center's category grid,
// the Analytics drill-down, and every explainer tooltip between them.
// Copy is written for a law firm marketer, not a data scientist: what it
// measures, why it's worth their attention, and (briefly) how the number
// is actually built — point values come from supabase/functions/_shared/methodology.ts.
import {
  CATEGORY_MAX,
  PERFORMANCE_WEIGHTS,
  REPUTATION_WEIGHTS,
  SOCIAL_WEIGHTS,
  THOUGHT_LEADERSHIP_WEIGHTS,
  type CategoryKey,
} from "../../supabase/functions/_shared/methodology";

export type { CategoryKey };

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

const TL = THOUGHT_LEADERSHIP_WEIGHTS;
const REP = REPUTATION_WEIGHTS;

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  performance: {
    label: "Website Experience",
    max: CATEGORY_MAX.performance,
    what: "How fast, accessible, and technically sound your website is, per Google's own PageSpeed Insights (desktop and mobile).",
    why: "A slow or broken site loses prospective clients before they ever read your bio — this is the plumbing everything else depends on.",
    how: `${PERFORMANCE_WEIGHTS.speed} pts page speed, ${PERFORMANCE_WEIGHTS.accessibility} pts accessibility, ${PERFORMANCE_WEIGHTS.technicalSeo} pts technical search basics — desktop and mobile averaged.`,
    color: "sky",
  },
  social: {
    label: "Social Presence",
    max: CATEGORY_MAX.social,
    what: "Your firm's LinkedIn following, posting frequency, and engagement, compared with similar firms in your market.",
    why: "Referral sources and in-house counsel increasingly check LinkedIn before a first call — silence here reads as inactivity.",
    how: `${SOCIAL_WEIGHTS.followers} pts followers + ${SOCIAL_WEIGHTS.posting} pts posts in the last 30 days + ${SOCIAL_WEIGHTS.engagement} pts engagement rate, each against the strongest similar firms in your market, plus ${SOCIAL_WEIGHTS.platforms} pts for which platforms you maintain.`,
    color: "rose",
  },
  seoAuthority: {
    label: "Search Authority",
    max: CATEGORY_MAX.seoAuthority,
    what: "Domain authority, referring domains, backlinks, organic traffic, ranking keywords, and homepage authority.",
    why: "This determines whether you show up when someone searches for a lawyer in your practice area, independent of your reputation offline.",
    how: "Each available metric carries an equal share, measured against the strongest similar firms in your market. Metrics we couldn't measure are left out of the calculation, never counted as zero.",
    color: "emerald",
  },
  thoughtLeadership: {
    label: "Thought Leadership",
    max: CATEGORY_MAX.thoughtLeadership,
    what: "How much original analysis you publish on your own site, whether named lawyers sign it, how steadily you publish, and how often independent outlets cover you.",
    why: "This is the most controllable category — and the one weighted most heavily. Writing your own analysis on your own site moves it more than anything else.",
    how: `${TL.articles} pts articles and analysis on your own site + ${TL.authorship} pts share signed by a named lawyer + ${TL.ownNews} pts firm news on your own site + ${TL.consistency} pts publishing month after month + ${TL.press} pts independent press coverage (your own site is excluded from that search), over a rolling 90-day window.`,
    color: "amber",
  },
  reputation: {
    label: "Recognition",
    max: CATEGORY_MAX.reputation,
    what: "Your standing in Chambers, Legal 500, and IFLR1000, plus your Google Business Profile — checked live against Google Places when available.",
    why: "This is the credibility your market already assigns you — the other categories are about whether that credibility is visible online.",
    how: `Chambers and Legal 500: up to ${REP.chambers.breadth + REP.chambers.depth} pts each — ${REP.chambers.breadth} for breadth (how many of the market's tracked practice tables you appear in) + ${REP.chambers.depth} for depth (average band/tier). IFLR1000: up to ${REP.iflr1000.breadth + REP.iflr1000.depth} pts on the same split. Google Business Profile: up to ${REP.googleBusinessProfile} pts across operating status, star rating, review volume, and profile completeness.`,
    color: "violet",
  },
};

/** Per-category cap on the 500-point scale — identical to the methodology's
 *  native category maxima (kept as its own name for existing call sites). */
export const CATEGORY_MAX_500: Record<CategoryKey, number> = { ...CATEGORY_MAX };

/** Category score as a whole number of points, clamped to its cap. */
export function categoryScore500(score: number, key: CategoryKey): number {
  return Math.min(CATEGORY_MAX_500[key], Math.max(0, Math.round(score)));
}

/** "X / Y" label for a category. */
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
