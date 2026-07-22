// Formats a category's real, measured raw_metrics into a short human-
// readable line — the actual evidence behind a score, not just the number.
// Shared by the Battle Plan PDF's "how this was calculated" appendix and
// the live Dashboard's category explainer popover, so both surfaces show
// the exact same evidence rather than two independently-written summaries
// that could drift apart.
import type { CategoryKey } from "./visibilityCategories";

export function formatPerformanceInputs(raw: any): string | null {
  const p = raw?.performance;
  if (!p) return null;
  const parts: string[] = [];
  if (p.desktop?.performance != null && p.mobile?.performance != null) {
    const avg = p.perfAvg ?? Math.round((p.desktop.performance + p.mobile.performance) / 2);
    parts.push(`Desktop ${p.desktop.performance} / Mobile ${p.mobile.performance} (avg ${avg})`);
  }
  if (p.accessAvg != null) parts.push(`Accessibility avg ${p.accessAvg}`);
  if (p.seoAvg != null) parts.push(`SEO avg ${p.seoAvg}`);
  return parts.length ? parts.join(" · ") : null;
}

export function formatSocialInputs(raw: any): string | null {
  const s = raw?.social;
  if (!s) return null;
  const parts: string[] = [];
  if (s.followers != null) parts.push(`${Number(s.followers).toLocaleString()} LinkedIn followers`);
  if (s.posts30d != null) parts.push(`${s.posts30d} posts in the last 30 days`);
  if (s.engagementRate != null) parts.push(`${s.engagementRate}% engagement`);
  if (s.platformCount != null) parts.push(`${s.platformCount} of 4 platforms claimed`);
  return parts.length ? parts.join(" · ") : null;
}

export function formatThoughtLeadershipInputs(raw: any): string | null {
  const t = raw?.thoughtLeadership;
  if (!t) return null;
  const parts: string[] = [];
  if (t.postsCount != null) parts.push(`${t.postsCount} blog post${t.postsCount === 1 ? "" : "s"}`);
  if (t.bylinePct != null) parts.push(`${t.bylinePct}% carry a named byline`);

  const mentions: { title: string; source: string }[] = Array.isArray(t.pressMentions) ? t.pressMentions : [];
  if (mentions.length > 0) {
    const cited = mentions.slice(0, 2).map((m) => `"${m.title}" (${m.source})`).join("; ");
    parts.push(`${mentions.length} press mention${mentions.length === 1 ? "" : "s"} independently verified via Google News — ${cited}${mentions.length > 2 ? "; …" : ""}`);
  } else if (t.newsCount != null) {
    parts.push(`${t.newsCount} press mention${t.newsCount === 1 ? "" : "s"} found via Google News`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export function formatReputationInputs(raw: any): string | null {
  const r = raw?.reputation;
  if (!r) return null;
  const parts: string[] = [r.gbpListed ? "Google Business Profile claimed" : "Google Business Profile not claimed"];
  if (r.chambers?.count) parts.push(`Chambers: ${r.chambers.count} ranked table${r.chambers.count > 1 ? "s" : ""}, avg band ${r.chambers.avgRank}`);
  if (r.legal500?.count) parts.push(`Legal 500: ${r.legal500.count} ranked table${r.legal500.count > 1 ? "s" : ""}, avg tier ${r.legal500.avgRank}`);
  if (r.iflr1000?.count) parts.push(`IFLR1000: ${r.iflr1000.count} ranked table${r.iflr1000.count > 1 ? "s" : ""}, avg tier ${r.iflr1000.avgRank}`);
  return parts.join(" · ");
}

export const CATEGORY_INPUT_FORMATTERS: Record<CategoryKey, (raw: any) => string | null> = {
  performance: formatPerformanceInputs,
  social: formatSocialInputs,
  seoAuthority: () => null,
  thoughtLeadership: formatThoughtLeadershipInputs,
  reputation: formatReputationInputs,
};
