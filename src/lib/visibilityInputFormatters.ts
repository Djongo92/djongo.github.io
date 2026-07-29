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
  if (s.followersStats) {
    const fs = s.followersStats;
    parts.push(`benchmarked against the 90th percentile (${Math.round(fs.p90Threshold).toLocaleString()}) among ${fs.sampleSize} peer firms${fs.lowConfidence ? " — small sample, low confidence" : ""}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

const SEO_METRIC_LABELS: Record<string, string> = {
  domainAuthority: "domain authority",
  referringDomains: "referring domains",
  backlinks: "backlinks",
  organicTraffic: "organic traffic",
  organicKeywords: "organic keywords",
  pageAuthority: "homepage authority",
};

export function formatSeoInputs(raw: any): string | null {
  const s = raw?.seoAuthority;
  if (!s || !s.provider) return null;
  const parts: string[] = [`Sourced from ${s.provider}`];
  if (s.metricsAvailable != null && s.metricsTotal != null) {
    parts.push(`${s.metricsAvailable} of ${s.metricsTotal} metrics available from this provider`);
  }
  for (const [key, label] of Object.entries(SEO_METRIC_LABELS)) {
    const stats = s[key];
    if (stats?.value != null) {
      parts.push(`${label} ${Math.round(stats.value * 100) / 100} (peer 90th percentile ${Math.round(stats.p90Threshold * 100) / 100}, ${stats.sampleSize} firms${stats.lowConfidence ? ", low confidence" : ""})`);
    }
  }
  return parts.length ? parts.join(" · ") : null;
}

export function formatThoughtLeadershipInputs(raw: any): string | null {
  const t = raw?.thoughtLeadership;
  if (!t) return null;
  const parts: string[] = [];
  if (t.postsCount != null) parts.push(`${t.postsCount} blog post${t.postsCount === 1 ? "" : "s"}`);
  if (t.bylinePct != null) parts.push(`${Math.round(t.bylinePct * 100)}% carry a named byline`);

  const mentions: { title: string; source: string }[] = Array.isArray(t.pressMentions) ? t.pressMentions : [];
  if (mentions.length > 0) {
    const cited = mentions.slice(0, 2).map((m) => `"${m.title}" (${m.source})`).join("; ");
    parts.push(`${mentions.length} press mention${mentions.length === 1 ? "" : "s"} independently verified via Google News — ${cited}${mentions.length > 2 ? "; …" : ""}`);
  } else if (t.newsCount != null) {
    parts.push(`${t.newsCount} press mention${t.newsCount === 1 ? "" : "s"} found via Google News`);
  }
  if (t.postsStats) {
    const ps = t.postsStats;
    parts.push(`posting cadence benchmarked against the 90th percentile (${Math.round(ps.p90Threshold)}) among ${ps.sampleSize} peer firms${ps.lowConfidence ? " — small sample, low confidence" : ""}`);
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
  const qs = r.chambers?.qualityStats ?? r.legal500?.qualityStats;
  if (qs) {
    parts.push(`ranking depth benchmarked against the 90th percentile among ${qs.sampleSize} peer firms${qs.lowConfidence ? " — small sample, low confidence" : ""}`);
  }
  return parts.join(" · ");
}

export const CATEGORY_INPUT_FORMATTERS: Record<CategoryKey, (raw: any) => string | null> = {
  performance: formatPerformanceInputs,
  social: formatSocialInputs,
  seoAuthority: formatSeoInputs,
  thoughtLeadership: formatThoughtLeadershipInputs,
  reputation: formatReputationInputs,
};
