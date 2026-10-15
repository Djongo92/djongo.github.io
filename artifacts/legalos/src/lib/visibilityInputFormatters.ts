// Formats a category's real, measured raw_metrics into a short human-
// readable line — the actual evidence behind a score, not just the number.
// Shared by the Battle Plan PDF's "how this was calculated" appendix and
// the live Dashboard's category explainer popover, so both surfaces show
// the exact same evidence rather than two independently-written summaries
// that could drift apart.
import type { CategoryKey } from "./visibilityCategories";
import { gbpPoints, REPUTATION_WEIGHTS } from "../../supabase/functions/_shared/methodology";

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
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (t.articlesCount != null) {
    parts.push(`${plural(t.articlesCount, "article", "articles")} on your own site`);
    if (t.ownNewsCount != null) parts.push(`${plural(t.ownNewsCount, "firm news item", "firm news items")} on your own site`);
  } else if (t.postsCount != null) {
    parts.push(`${plural(t.postsCount, "piece", "pieces")} published on your own site`);
  }
  if (t.bylinePct != null) parts.push(`${Math.round(t.bylinePct * 100)}% carry a named byline`);
  if (t.activeMonths != null && t.windowMonths) parts.push(`published in ${t.activeMonths} of the last ${t.windowMonths} months`);

  const mentions: { title: string; source: string }[] = Array.isArray(t.pressMentions) ? t.pressMentions : [];
  if (mentions.length > 0) {
    const cited = mentions.slice(0, 2).map((m) => `"${m.title}" (${m.source})`).join("; ");
    parts.push(`${mentions.length} press mention${mentions.length === 1 ? "" : "s"} independently verified via Google News — ${cited}${mentions.length > 2 ? "; …" : ""}`);
  } else if (t.newsCount != null) {
    parts.push(`${t.newsCount} press mention${t.newsCount === 1 ? "" : "s"} found via Google News`);
  }
  const ps = t.articlesStats ?? t.postsStats;
  if (ps) {
    parts.push(`publishing benchmarked against the 90th percentile (${Math.round(ps.p90Threshold)}) among ${ps.sampleSize} similar firms${ps.lowConfidence ? " — small sample, low confidence" : ""}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export function formatReputationInputs(raw: any): string | null {
  const r = raw?.reputation;
  if (!r) return null;

  // GBP sub-score line — show points, source badge, and Places detail when available.
  let gbpLine: string;
  if (r.gbpScore != null) {
    const source = r.gbpSource === "google_places_api" ? "Verified · Google Places" : "Self-reported";
    gbpLine = `Google Business Profile ${Math.round(gbpPoints(r.gbpScore) * 10) / 10}/${REPUTATION_WEIGHTS.googleBusinessProfile} pts (${source})`;
    if (r.gbpSource === "google_places_api") {
      if (r.gbpRating != null && r.gbpReviewCount != null) {
        gbpLine += ` · ★ ${r.gbpRating} (${r.gbpReviewCount} reviews)`;
      } else if (r.gbpRating != null) {
        gbpLine += ` · ★ ${r.gbpRating}`;
      }
    }
  } else {
    gbpLine = r.gbpListed ? "Google Business Profile claimed" : "Google Business Profile not claimed";
  }

  const parts: string[] = [gbpLine];
  if (r.chambers?.count) parts.push(`Chambers: ${r.chambers.count} ranked table${r.chambers.count > 1 ? "s" : ""}, avg band ${r.chambers.avgRank}`);
  if (r.legal500?.count) parts.push(`Legal 500: ${r.legal500.count} ranked table${r.legal500.count > 1 ? "s" : ""}, avg tier ${r.legal500.avgRank}`);
  if (r.iflr1000?.count) parts.push(`IFLR1000: ${r.iflr1000.count} ranked table${r.iflr1000.count > 1 ? "s" : ""}, avg tier ${r.iflr1000.avgRank}`);
  const qs = r.chambers?.qualityStats ?? r.legal500?.qualityStats;
  if (qs) {
    parts.push(`ranking depth benchmarked against the 90th percentile among ${qs.sampleSize} similar firms${qs.lowConfidence ? " — small sample, low confidence" : ""}`);
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

// ---------------------------------------------------------------------------
// Short "raw observable metric" headline per category, for a score-history
// chart point (tooltip) rather than the single-audit breakdown above — one
// short phrase, not a full sentence. Unlike CATEGORY_INPUT_FORMATTERS above,
// these take ONE category's raw sub-object directly (e.g. rawMetrics.social),
// matching how a history row's frozen raw_metrics is read per point. Return
// null when that category's inputs weren't recorded on this snapshot (older
// rows, or a category that scored "missing" at that point) — a chart tooltip
// should omit the line rather than print a fabricated 0.
// ---------------------------------------------------------------------------

export function performanceTrendMetric(raw: any): string | null {
  if (raw?.desktop?.performance == null || raw?.mobile?.performance == null) return null;
  const avg = raw.perfAvg ?? Math.round((raw.desktop.performance + raw.mobile.performance) / 2);
  return `${avg} PageSpeed avg`;
}

export function socialTrendMetric(raw: any): string | null {
  if (raw?.followers == null) return null;
  return `${Number(raw.followers).toLocaleString()} followers`;
}

export function seoTrendMetric(_raw: any): string | null {
  return null; // Not configured in this build — no raw metric to show.
}

export function thoughtLeadershipTrendMetric(raw: any): string | null {
  if (raw?.articlesCount != null) return `${raw.articlesCount} article${raw.articlesCount === 1 ? "" : "s"}`;
  if (raw?.postsCount == null) return null;
  return `${raw.postsCount} post${raw.postsCount === 1 ? "" : "s"}`;
}

export function reputationTrendMetric(raw: any): string | null {
  if (!raw) return null;
  if (raw.gbpRating != null) return `★ ${raw.gbpRating} GBP`;
  const tableCount = (raw.chambers?.count ?? 0) + (raw.legal500?.count ?? 0) + (raw.iflr1000?.count ?? 0);
  if (tableCount > 0) return `${tableCount} ranked table${tableCount === 1 ? "" : "s"}`;
  if (raw.gbpListed != null) return raw.gbpListed ? "GBP listed" : null;
  return null;
}

/** Keyed the same way CATEGORY_INPUT_FORMATTERS is, but each fn takes just
 *  that one category's raw sub-object (raw_metrics[key]), not the whole
 *  raw_metrics record. */
export const CATEGORY_TREND_METRIC: Record<CategoryKey, (raw: any) => string | null> = {
  performance: performanceTrendMetric,
  social: socialTrendMetric,
  seoAuthority: seoTrendMetric,
  thoughtLeadership: thoughtLeadershipTrendMetric,
  reputation: reputationTrendMetric,
};

/**
 * Joins every measured category's raw metric into one compact evidence line
 * for a history point ("65 PageSpeed avg · 1,850 followers · ★ 4.6 GBP").
 * A category whose frozen provenance is "missing" (or absent — older rows)
 * is omitted entirely: an unmeasured category must never show a fabricated
 * raw value, the same gate as the score-history chart's `wasMeasured`.
 * Returns null when nothing was recorded on the snapshot. Shared by the
 * Executive Report exports (PDF/CSV history blocks); the mobile app keeps
 * a mirrored port in lib/trendMetrics.ts.
 */
export function historyEvidenceLine(
  rawMetrics: Partial<Record<CategoryKey, any>> | null | undefined,
  provenance: Partial<Record<CategoryKey, string>> | null | undefined,
): string | null {
  if (!rawMetrics) return null;
  const parts: string[] = [];
  for (const key of Object.keys(CATEGORY_TREND_METRIC) as CategoryKey[]) {
    if ((provenance?.[key] ?? "missing") === "missing") continue;
    const metric = CATEGORY_TREND_METRIC[key](rawMetrics[key]);
    if (metric) parts.push(metric);
  }
  return parts.length ? parts.join(" · ") : null;
}
