// Demo/sample data for "Load demo data" — lets a first-time visitor see the
// fully populated Command Center (insights, ongoing endeavors, trend line,
// workshop history) without needing weeks of real usage first. Every value
// here is clearly synthetic (a fictional firm, invented copy) — never real
// customer or firm data.
import type { AuditRow, HistoryRow } from "@/components/dashboard/CommandCenter";
import type { WorkshopRun } from "@/hooks/useWorkshopHistory";
import type {
  RoastCache, CompetitorCache, RoadmapCache, MaturityCache, HeadlineWinnerCache, BioCache, VisibilityScoreCache,
} from "@/hooks/useBattlePlanCache";
import type { FirmContext } from "@/hooks/useFirmContext";
import type { AuditSnapshot } from "@/hooks/useAuditSnapshots";
import type { WorkflowComment, WorkflowItem } from "@/hooks/useWorkflowItems";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

export const DEMO_DOMAIN = "petrovicpartners.rs";
export const DEMO_DISPLAY_NAME = "Petrović & Partners";

export const DEMO_AUDIT: AuditRow = {
  id: "demo-audit",
  audited_domain: DEMO_DOMAIN,
  display_name: DEMO_DISPLAY_NAME,
  market: "serbia",
  peer_group: "regional",
  performance_score: 14.8,
  social_score: 9.5,
  seo_authority_score: 18.56,
  thought_leadership_score: 22,
  reputation_score: 34,
  // Total = the exact category sum (measured-totals honesty — no padding).
  total_score: 98.86,
  provenance: {
    performance: "api",
    social: "self_reported",
    seoAuthority: "api",
    thoughtLeadership: "ai_classified",
    reputation: "api",
  },
  raw_metrics: {
    siteHealth: {
      hasContactForm: true,
      copyrightYear: 2023,
      copyrightStale: true,
      brokenLinks: ["https://petrovicpartners.rs/team/old-partner"],
      checkedLinks: 6,
    },
    performance: {
      desktop: { performance: 72, accessibility: 88, seo: 91 },
      mobile: { performance: 58, accessibility: 85, seo: 89 },
      perfAvg: 65,
      accessAvg: 86.5,
      seoAvg: 90,
    },
    social: {
      followers: 1850,
      posts30d: 3,
      engagementRate: 1.2,
      platforms: { linkedin: true, instagram: false, twitter: false, facebook: true },
      platformCount: 2,
      // Full six-value peer stats this score was actually normalized
      // against — reverse-engineered so p90Ratio(value, p90Threshold)
      // reproduces social_score exactly (2.5 + 2.5 + 2.5 + platform 2 =
      // 9.5), so the what-if simulator's live recompute starts from the
      // same number the Dashboard already shows.
      followersStats: { value: 1850, peerMedian: 1200, p90Threshold: 3700, highestObserved: 4200, sampleSize: 12, comparisonDate: "2026-07-19T00:00:00.000Z", lowConfidence: false, widened: false },
      postsStats: { value: 3, peerMedian: 4, p90Threshold: 6, highestObserved: 9, sampleSize: 12, comparisonDate: "2026-07-19T00:00:00.000Z", lowConfidence: false, widened: false },
      erStats: { value: 1.2, peerMedian: 1.8, p90Threshold: 2.88, highestObserved: 3.5, sampleSize: 12, comparisonDate: "2026-07-19T00:00:00.000Z", lowConfidence: false, widened: false },
    },
    seoAuthority: {
      provider: "dataforseo",
      metricsTotal: 6,
      metricsAvailable: 5,
      pageAuthority: null,
      // Real Serbia-pool peer stats (2026-08-14 sweep); values chosen so
      // p90Ratio(value, p90Threshold) reproduces seo_authority_score 18.56
      // (avg ratio 0.3093 × 60) — same reverse-engineered convention as
      // social's stats above.
      backlinks: { value: 520, peerMedian: 427.5, p90Threshold: 39624.6, highestObserved: 115331, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
      organicTraffic: { value: 210, peerMedian: 42.05, p90Threshold: 569.64, highestObserved: 691.08, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
      domainAuthority: { value: 21.4, peerMedian: 18.55, p90Threshold: 30.26, highestObserved: 32.5, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
      organicKeywords: { value: 6, peerMedian: 9, p90Threshold: 31.5, highestObserved: 45, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
      referringDomains: { value: 380, peerMedian: 231, p90Threshold: 1421.9, highestObserved: 2026, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
    },
    thoughtLeadership: {
      postsCount: 2,
      newsCount: 1,
      // Fraction (0-1), matching the real formula's convention — 1 of 2
      // posts carries a named byline.
      bylinePct: 0.5,
      // Full six-value peer stats (see social's comment above for why these
      // are persisted) — p90Threshold 11/1 reproduce thought_leadership_score
      // to within 0.05 (25*2/11 + 15*1/1 + 5*0.5 = 22.05 vs the authored 22
      // below; the gap is demo-data noise, not a formula bug).
      postsStats: { value: 2, peerMedian: 5, p90Threshold: 11, highestObserved: 14, sampleSize: 12, comparisonDate: "2026-07-19T00:00:00.000Z", lowConfidence: false, widened: false },
      newsStats: { value: 1, peerMedian: 1, p90Threshold: 1, highestObserved: 3, sampleSize: 12, comparisonDate: "2026-07-19T00:00:00.000Z", lowConfidence: false, widened: false },
      items: [
        { title: "Cross-Border M&A Trends in Southeast Europe", date: "2026-06-02", type: "blog", hasNamedByline: true },
        { title: "Regulatory Shifts Affecting Manufacturing M&A", date: "2026-05-18", type: "blog", hasNamedByline: false },
        { title: "Petrović & Partners advises on Meridian Capital transaction", date: "2026-05-10", type: "news", hasNamedByline: false },
      ],
      // Real third-party coverage, independently found via Google News RSS
      // (the firm's own domain is excluded from these results) — not the
      // "news"-tagged item above, which is the firm's own announcement of
      // the same deal and isn't counted toward newsCount for that reason.
      pressMentions: [
        { title: "Petrović & Partners advises Meridian Capital on manufacturing acquisition", source: "ceelegalmatters.com", link: "https://ceelegalmatters.com/serbia/petrovic-partners-meridian-capital", date: "2026-05-12T00:00:00.000Z" },
      ],
    },
    reputation: {
      gbpListed: true,
      gbpScore: 7,
      gbpSource: "google_places_api" as const,
      gbpRating: 4.6,
      gbpReviewCount: 28,
      gbpOperational: true,
      gbpScoreBreakdown: { operationalPts: 2, ratingPts: 2.5, reviewPts: 2, completenessPts: 0.5 },
      matchedFirmName: "Petrović & Partners",
      matchedFirmDomain: DEMO_DOMAIN,
      chambers: { points: 13, count: 3, avgRank: 2.7, qualityStats: { value: 2.3, peerMedian: 1.8, p90Threshold: 3, highestObserved: 3.5, sampleSize: 17, comparisonDate: "2026-07-19T00:00:00.000Z", lowConfidence: false, widened: false } },
      legal500: { points: 11, count: 3, avgRank: 3.2, qualityStats: { value: 1.8, peerMedian: 1.6, p90Threshold: 2.5, highestObserved: 3, sampleSize: 17, comparisonDate: "2026-07-19T00:00:00.000Z", lowConfidence: false, widened: false } },
      iflr1000: { points: 0, count: 0, avgRank: null, qualityStats: null },
      chambersRankedTables: { CC: 2, DR: 3, EM: 3 },
      legal500RankedTables: { CC: 2, DR: 3, EM: 4 },
      iflr1000RankedTables: null,
    },
  },
  updated_at: new Date(now).toISOString(),
  percentile: 61,
  peer_count: 18,
  methodology_version: 2,
  data_window_start: new Date(now - 60 * DAY).toISOString(),
  data_window_end: new Date(now).toISOString(),
  sample_size: 12,
  confidence_score: 1,
  review_status: "unreviewed",
};

// One PeerStats object per (row, metric) — same six-value shape
// runVisibilityAudit.ts freezes into raw_metrics at scoring time (see
// percentileFormula.ts). sampleSize/p90Threshold deliberately GROW across
// rows, same as the real peer group would as more firms get audited over
// time — this is what makes the demo actually show "peer-group drift"
// instead of just a bigger number for this one firm.
const peerStats = (
  value: number, peerMedian: number, p90Threshold: number, highestObserved: number,
  sampleSize: number, daysAgo: number,
) => ({
  value, peerMedian, p90Threshold, highestObserved, sampleSize,
  comparisonDate: new Date(now - daysAgo * DAY).toISOString(),
  lowConfidence: sampleSize < 5,
  widened: false,
});

export const DEMO_HISTORY: HistoryRow[] = [
  // ~5 months of movement, oldest first. Category values in every row sum to
  // that row's total_score, and the last row matches DEMO_AUDIT exactly —
  // Analytics' per-category trend charts and the sidebar delta both read
  // straight from these rows, so any drift here reads as a bug in the demo.
  //
  // raw_metrics/provenance/confidence_score/sample_size are populated on
  // every row (not just the current audit) so the score-history chart has
  // something real to show for task #39's raw-metric-alongside-the-point
  // and per-snapshot-confidence requirements — a real backend audit would
  // freeze these the same way (see runVisibilityAudit.ts + visibility-audit-
  // get/index.ts). The early rows are deliberately thin-sampled
  // (sampleSize < 5) so the "Some points thin-sampled" badge and the hollow
  // amber dot actually have something to flag in the demo, not just the
  // happy path.
  {
    audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 49.1, performance_score: 8.4, social_score: 3.2, seo_authority_score: 0, thought_leadership_score: 8.5, reputation_score: 29.0,
    recorded_at: new Date(now - 150 * DAY).toISOString(),
    provenance: { performance: "api", social: "self_reported", seoAuthority: "missing", thoughtLeadership: "ai_classified", reputation: "api" },
    confidence_score: 0.33, sample_size: 4,
    raw_metrics: {
      performance: { desktop: { performance: 38, accessibility: 78, seo: 82 }, mobile: { performance: 24, accessibility: 74, seo: 79 }, perfAvg: 31, accessAvg: 76, seoAvg: 80.5 },
      social: { followers: 420, posts30d: 1, engagementRate: null, platforms: { linkedin: true, instagram: false, twitter: false, facebook: false }, platformCount: 1, followersStats: peerStats(420, 500, 1400, 1600, 4, 150), postsStats: peerStats(1, 3, 5, 7, 4, 150), erStats: null },
      thoughtLeadership: { postsCount: 0, newsCount: 0, bylinePct: 0, items: [], pressMentions: [], postsStats: peerStats(0, 2, 4, 6, 4, 150), newsStats: peerStats(0, 0, 1, 2, 4, 150) },
      reputation: { gbpListed: true, gbpScore: 5, gbpSource: "google_places_api" as const, gbpRating: 4.2, gbpReviewCount: 9, gbpOperational: true },
    },
  },
  {
    audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 51.8, performance_score: 9.0, social_score: 4.0, seo_authority_score: 0, thought_leadership_score: 9.8, reputation_score: 29.0,
    recorded_at: new Date(now - 120 * DAY).toISOString(),
    provenance: { performance: "api", social: "self_reported", seoAuthority: "missing", thoughtLeadership: "ai_classified", reputation: "api" },
    confidence_score: 0.33, sample_size: 4,
    raw_metrics: {
      performance: { desktop: { performance: 44, accessibility: 80, seo: 84 }, mobile: { performance: 30, accessibility: 76, seo: 81 }, perfAvg: 37, accessAvg: 78, seoAvg: 82.5 },
      social: { followers: 610, posts30d: 1, engagementRate: null, platforms: { linkedin: true, instagram: false, twitter: false, facebook: false }, platformCount: 1, followersStats: peerStats(610, 620, 1650, 1850, 4, 120), postsStats: peerStats(1, 3, 5, 7, 4, 120), erStats: null },
      thoughtLeadership: { postsCount: 0, newsCount: 0, bylinePct: 0, items: [], pressMentions: [], postsStats: peerStats(0, 2, 4, 6, 4, 120), newsStats: peerStats(0, 0, 1, 2, 4, 120) },
      reputation: { gbpListed: true, gbpScore: 5, gbpSource: "google_places_api" as const, gbpRating: 4.2, gbpReviewCount: 12, gbpOperational: true },
    },
  },
  {
    audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 54.7, performance_score: 9.6, social_score: 4.5, seo_authority_score: 0, thought_leadership_score: 10.6, reputation_score: 30.0,
    recorded_at: new Date(now - 90 * DAY).toISOString(),
    provenance: { performance: "api", social: "self_reported", seoAuthority: "missing", thoughtLeadership: "ai_classified", reputation: "api" },
    confidence_score: 0.5, sample_size: 5,
    raw_metrics: {
      performance: { desktop: { performance: 50, accessibility: 82, seo: 86 }, mobile: { performance: 36, accessibility: 78, seo: 83 }, perfAvg: 43, accessAvg: 80, seoAvg: 84.5 },
      social: { followers: 830, posts30d: 2, engagementRate: 0.7, platforms: { linkedin: true, instagram: false, twitter: false, facebook: true }, platformCount: 2, followersStats: peerStats(830, 800, 2000, 2300, 5, 90), postsStats: peerStats(2, 3, 5, 8, 5, 90), erStats: peerStats(0.7, 1.4, 2.2, 2.9, 5, 90) },
      thoughtLeadership: { postsCount: 1, newsCount: 0, bylinePct: 0, items: [], pressMentions: [], postsStats: peerStats(1, 3, 6, 9, 5, 90), newsStats: peerStats(0, 0, 1, 2, 5, 90) },
      reputation: { gbpListed: true, gbpScore: 6, gbpSource: "google_places_api" as const, gbpRating: 4.3, gbpReviewCount: 15, gbpOperational: true },
    },
  },
  {
    audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 58.2, performance_score: 10.2, social_score: 5.0, seo_authority_score: 0, thought_leadership_score: 12.0, reputation_score: 31.0,
    recorded_at: new Date(now - 60 * DAY).toISOString(),
    provenance: { performance: "api", social: "self_reported", seoAuthority: "missing", thoughtLeadership: "ai_classified", reputation: "api" },
    confidence_score: 0.67, sample_size: 6,
    raw_metrics: {
      performance: { desktop: { performance: 56, accessibility: 83, seo: 87 }, mobile: { performance: 42, accessibility: 80, seo: 85 }, perfAvg: 49, accessAvg: 81.5, seoAvg: 86 },
      social: { followers: 1080, posts30d: 2, engagementRate: 0.9, platforms: { linkedin: true, instagram: false, twitter: false, facebook: true }, platformCount: 2, followersStats: peerStats(1080, 950, 2400, 2700, 6, 60), postsStats: peerStats(2, 3, 5, 8, 6, 60), erStats: peerStats(0.9, 1.5, 2.4, 3.0, 6, 60) },
      thoughtLeadership: { postsCount: 1, newsCount: 0, bylinePct: 1, items: [], pressMentions: [], postsStats: peerStats(1, 3, 7, 10, 6, 60), newsStats: peerStats(0, 1, 1, 2, 6, 60) },
      reputation: { gbpListed: true, gbpScore: 6, gbpSource: "google_places_api" as const, gbpRating: 4.4, gbpReviewCount: 18, gbpOperational: true },
    },
  },
  {
    audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 63.5, performance_score: 11.5, social_score: 6.0, seo_authority_score: 0, thought_leadership_score: 15.0, reputation_score: 31.0,
    recorded_at: new Date(now - 45 * DAY).toISOString(),
    provenance: { performance: "api", social: "self_reported", seoAuthority: "missing", thoughtLeadership: "ai_classified", reputation: "api" },
    confidence_score: 0.83, sample_size: 8,
    raw_metrics: {
      performance: { desktop: { performance: 62, accessibility: 85, seo: 89 }, mobile: { performance: 48, accessibility: 82, seo: 86 }, perfAvg: 55, accessAvg: 83.5, seoAvg: 87.5 },
      social: { followers: 1320, posts30d: 3, engagementRate: 1.0, platforms: { linkedin: true, instagram: false, twitter: false, facebook: true }, platformCount: 2, followersStats: peerStats(1320, 1080, 2900, 3300, 8, 45), postsStats: peerStats(3, 4, 5, 8, 8, 45), erStats: peerStats(1.0, 1.6, 2.6, 3.2, 8, 45) },
      thoughtLeadership: { postsCount: 1, newsCount: 1, bylinePct: 1, items: [], pressMentions: [], postsStats: peerStats(1, 4, 8, 11, 8, 45), newsStats: peerStats(1, 1, 1, 2, 8, 45) },
      reputation: { gbpListed: true, gbpScore: 6, gbpSource: "google_places_api" as const, gbpRating: 4.4, gbpReviewCount: 21, gbpOperational: true },
    },
  },
  {
    audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 68.1, performance_score: 12.5, social_score: 7.0, seo_authority_score: 0, thought_leadership_score: 17.6, reputation_score: 31.0,
    recorded_at: new Date(now - 30 * DAY).toISOString(),
    provenance: { performance: "api", social: "self_reported", seoAuthority: "missing", thoughtLeadership: "ai_classified", reputation: "api" },
    confidence_score: 1, sample_size: 9,
    raw_metrics: {
      performance: { desktop: { performance: 66, accessibility: 86, seo: 90 }, mobile: { performance: 52, accessibility: 83, seo: 87 }, perfAvg: 59, accessAvg: 84.5, seoAvg: 88.5 },
      social: { followers: 1520, posts30d: 3, engagementRate: 1.1, platforms: { linkedin: true, instagram: false, twitter: false, facebook: true }, platformCount: 2, followersStats: peerStats(1520, 1150, 3300, 3800, 9, 30), postsStats: peerStats(3, 4, 6, 9, 9, 30), erStats: peerStats(1.1, 1.7, 2.7, 3.3, 9, 30) },
      thoughtLeadership: { postsCount: 2, newsCount: 1, bylinePct: 0.5, items: [], pressMentions: [], postsStats: peerStats(2, 4, 9, 12, 9, 30), newsStats: peerStats(1, 1, 1, 3, 9, 30) },
      reputation: { gbpListed: true, gbpScore: 7, gbpSource: "google_places_api" as const, gbpRating: 4.5, gbpReviewCount: 23, gbpOperational: true },
    },
  },
  {
    audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 71.4, performance_score: 13.0, social_score: 8.0, seo_authority_score: 0, thought_leadership_score: 19.4, reputation_score: 31.0,
    recorded_at: new Date(now - 18 * DAY).toISOString(),
    provenance: { performance: "api", social: "self_reported", seoAuthority: "missing", thoughtLeadership: "ai_classified", reputation: "api" },
    confidence_score: 1, sample_size: 10,
    raw_metrics: {
      performance: { desktop: { performance: 68, accessibility: 87, seo: 90 }, mobile: { performance: 54, accessibility: 84, seo: 88 }, perfAvg: 61, accessAvg: 85.5, seoAvg: 89 },
      social: { followers: 1660, posts30d: 3, engagementRate: 1.15, platforms: { linkedin: true, instagram: false, twitter: false, facebook: true }, platformCount: 2, followersStats: peerStats(1660, 1180, 3500, 4000, 10, 18), postsStats: peerStats(3, 4, 6, 9, 10, 18), erStats: peerStats(1.15, 1.75, 2.8, 3.4, 10, 18) },
      thoughtLeadership: { postsCount: 2, newsCount: 1, bylinePct: 0.5, items: [], pressMentions: [], postsStats: peerStats(2, 4, 10, 13, 10, 18), newsStats: peerStats(1, 1, 1, 3, 10, 18) },
      reputation: { gbpListed: true, gbpScore: 7, gbpSource: "google_places_api" as const, gbpRating: 4.5, gbpReviewCount: 25, gbpOperational: true },
    },
  },
  {
    audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 75.9, performance_score: 13.8, social_score: 8.8, seo_authority_score: 0, thought_leadership_score: 20.3, reputation_score: 33.0,
    recorded_at: new Date(now - 7 * DAY).toISOString(),
    provenance: { performance: "api", social: "self_reported", seoAuthority: "missing", thoughtLeadership: "ai_classified", reputation: "api" },
    confidence_score: 1, sample_size: 11,
    raw_metrics: {
      performance: { desktop: { performance: 70, accessibility: 88, seo: 91 }, mobile: { performance: 56, accessibility: 84, seo: 88 }, perfAvg: 63, accessAvg: 86, seoAvg: 89.5 },
      social: { followers: 1760, posts30d: 3, engagementRate: 1.18, platforms: { linkedin: true, instagram: false, twitter: false, facebook: true }, platformCount: 2, followersStats: peerStats(1760, 1200, 3600, 4100, 11, 7), postsStats: peerStats(3, 4, 6, 9, 11, 7), erStats: peerStats(1.18, 1.78, 2.85, 3.45, 11, 7) },
      thoughtLeadership: { postsCount: 2, newsCount: 1, bylinePct: 0.5, items: [], pressMentions: [], postsStats: peerStats(2, 5, 10, 13, 11, 7), newsStats: peerStats(1, 1, 1, 3, 11, 7) },
      reputation: { gbpListed: true, gbpScore: 7, gbpSource: "google_places_api" as const, gbpRating: 4.6, gbpReviewCount: 27, gbpOperational: true },
    },
  },
  {
    audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 98.86, performance_score: 14.8, social_score: 9.5, seo_authority_score: 18.56, thought_leadership_score: 22.0, reputation_score: 34.0,
    recorded_at: new Date(now).toISOString(),
    // Matches DEMO_AUDIT.provenance/raw_metrics.{performance,social,seoAuthority,thoughtLeadership,reputation}/confidence_score/sample_size exactly — this row IS the current audit's own history entry.
    provenance: { performance: "api", social: "self_reported", seoAuthority: "api", thoughtLeadership: "ai_classified", reputation: "api" },
    confidence_score: 1, sample_size: 12,
    raw_metrics: {
      performance: { desktop: { performance: 72, accessibility: 88, seo: 91 }, mobile: { performance: 58, accessibility: 85, seo: 89 }, perfAvg: 65, accessAvg: 86.5, seoAvg: 90 },
      social: { followers: 1850, posts30d: 3, engagementRate: 1.2, platforms: { linkedin: true, instagram: false, twitter: false, facebook: true }, platformCount: 2, followersStats: peerStats(1850, 1200, 3700, 4200, 12, 0), postsStats: peerStats(3, 4, 6, 9, 12, 0), erStats: peerStats(1.2, 1.8, 2.88, 3.5, 12, 0) },
      seoAuthority: {
        provider: "dataforseo",
        metricsTotal: 6,
        metricsAvailable: 5,
        pageAuthority: null,
        backlinks: { value: 520, peerMedian: 427.5, p90Threshold: 39624.6, highestObserved: 115331, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
        organicTraffic: { value: 210, peerMedian: 42.05, p90Threshold: 569.64, highestObserved: 691.08, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
        domainAuthority: { value: 21.4, peerMedian: 18.55, p90Threshold: 30.26, highestObserved: 32.5, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
        organicKeywords: { value: 6, peerMedian: 9, p90Threshold: 31.5, highestObserved: 45, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
        referringDomains: { value: 380, peerMedian: 231, p90Threshold: 1421.9, highestObserved: 2026, sampleSize: 12, comparisonDate: "2026-08-14T00:00:00.000Z", lowConfidence: false, widened: false },
      },
      thoughtLeadership: { postsCount: 2, newsCount: 1, bylinePct: 0.5, items: [], pressMentions: [], postsStats: peerStats(2, 5, 11, 14, 12, 0), newsStats: peerStats(1, 1, 1, 3, 12, 0) },
      reputation: { gbpListed: true, gbpScore: 7, gbpSource: "google_places_api" as const, gbpRating: 4.6, gbpReviewCount: 28, gbpOperational: true, matchedFirmName: "Petrović & Partners", matchedFirmDomain: DEMO_DOMAIN, chambers: { points: 13, count: 3, avgRank: 2.7, qualityStats: peerStats(2.3, 1.8, 3, 3.5, 17, 0) }, legal500: { points: 11, count: 3, avgRank: 3.2, qualityStats: peerStats(1.8, 1.6, 2.5, 3, 17, 0) }, iflr1000: { points: 0, count: 0, avgRank: null, qualityStats: null } },
    },
  },
];

// Named before/after snapshots for Analytics' Before / After comparison —
// each one is a bookmark of a DEMO_HISTORY row (same totals, same category
// splits), so the comparison and the trend line tell one consistent story.
export const DEMO_SNAPSHOTS: AuditSnapshot[] = [
  {
    id: "demo-snapshot-1",
    audit_id: null,
    label: "Before engagement",
    market: "serbia",
    audited_domain: DEMO_DOMAIN,
    display_name: DEMO_DISPLAY_NAME,
    total_score: 54.7,
    categories: { performance: 9.6, social: 4.5, seoAuthority: 0, thoughtLeadership: 10.6, reputation: 30.0 },
    created_at: new Date(now - 90 * DAY).toISOString(),
  },
  {
    id: "demo-snapshot-2",
    audit_id: null,
    label: "End of Q2",
    market: "serbia",
    audited_domain: DEMO_DOMAIN,
    display_name: DEMO_DISPLAY_NAME,
    total_score: 68.1,
    categories: { performance: 12.5, social: 7.0, seoAuthority: 0, thoughtLeadership: 17.6, reputation: 31.0 },
    created_at: new Date(now - 30 * DAY).toISOString(),
  },
];

export const DEMO_FIRM_CONTEXT: FirmContext = {
  practiceArea: "Corporate / M&A",
  firmSize: "11-50 attorneys",
  primaryGoal: "Win more mid-market M&A mandates",
  market: "Poland",
};

export const DEMO_READ_CHAPTER_IDS = [
  "website-checklist",
  "practice-area-pages",
  "thought-leadership",
  "google-search-console",
  "messaging-positioning",
];

// A couple of quick-win action items already checked off — enough to show
// this is a firm actively working the plan, not one where 7/7 analyses
// ran but zero follow-through happened. Deliberately leaves the two
// items the Roast/Roadmap explicitly call out as still-open (rewriting
// the practice page, fixing the stale copyright) unchecked — marking
// those done would contradict the rest of the Battle Plan's own narrative.
export const DEMO_IMPLEMENTATION: Record<string, Record<number, boolean>> = {
  "website-checklist": { 0: true },
  "google-search-console": { 0: true },
};

export const DEMO_WORKSHOP_RUNS: WorkshopRun[] = [
  {
    id: "demo-run-1",
    toolId: "headlines",
    toolLabel: "Headline Lab",
    title: "M&A practice page headline test",
    preview: "Winner: \"Cross-border deals close faster with counsel who's done 40 of them.\"",
    createdAt: now - 2 * DAY,
  },
  {
    id: "demo-run-2",
    toolId: "audit",
    toolLabel: "Practice Page Audit",
    title: "Corporate/M&A practice page — Grade C+",
    preview: "Positioning Clarity 4/10 — page reads like a generic capability list, no named deal experience.",
    createdAt: now - 5 * DAY,
  },
  {
    id: "demo-run-3",
    toolId: "copywriter",
    toolLabel: "AI Copywriter",
    title: "LinkedIn post — Q3 deal announcement",
    preview: "3 variations drafted for the Meridian Capital transaction announcement.",
    createdAt: now - 9 * DAY,
  },
  {
    id: "demo-run-4",
    toolId: "teardown",
    toolLabel: "Competitor Teardown",
    title: "Teardown: BDK Advokati",
    preview: "Gap found: they don't publish deal tombstones — we could own that.",
    createdAt: now - 14 * DAY,
  },
  {
    id: "demo-run-5",
    toolId: "calendar",
    toolLabel: "12-Month Calendar",
    title: "FY26 marketing calendar",
    preview: "Q1 theme: cross-border M&A outlook. Push hard in Jan, quiet in Aug.",
    createdAt: now - 21 * DAY,
  },
];

// Dimension scores are on the same 1-5 scale FirmMaturityScore.tsx's own
// survey uses (1 "Not at all" .. 5 "Best in class") — the PDF table
// renders them as "score / 5", so anything outside that range (an
// earlier version of this data used a 0-100 scale here) shows up as
// obvious nonsense like "55 / 5".
// Labels match FirmMaturityScore.tsx's 12 real survey dimensions exactly —
// the PDF's "Self-assessed across 12 marketing dimensions" caption only
// makes sense if the demo table actually has 12 rows, not a shortened
// subset. Scores are 1-5 (see FirmMaturityScore.tsx's SCORE_LABELS), sum
// to 36 so the 60% overall (score: 60 below) is arithmetically exact.
export const DEMO_MATURITY: Omit<MaturityCache, "capturedAt"> = {
  score: 60,
  dimensions: [
    { label: "Website & digital home", score: 3 },
    { label: "Brand identity & positioning", score: 2 },
    { label: "Content & thought leadership", score: 3 },
    { label: "SEO & organic visibility", score: 2 },
    { label: "Event marketing", score: 2 },
    { label: "Social media presence", score: 3 },
    { label: "PR & media relations", score: 3 },
    { label: "Email & newsletter", score: 3 },
    { label: "Client experience", score: 4 },
    { label: "Data & analytics", score: 2 },
    { label: "Reputation management", score: 5 },
    { label: "Internal marketing culture", score: 4 },
  ],
  plan: "## Your 30-Day Plan\n\n**Week 1-2:** Rewrite the Corporate/M&A practice page — lead with named deal experience, not generic capability language.\n\n**Week 3:** Publish one bylined article on cross-border deal structuring under a partner's name.\n\n**Week 4:** Claim and complete your Google Business Profile; audit for broken links and stale copyright.",
};

export const DEMO_ROAST: Omit<RoastCache, "capturedAt"> = {
  url: "https://petrovicpartners.rs",
  grade: "C+",
  verdict: "Competent but forgettable — reads like every other regional corporate firm's homepage.",
  burn: "\"Trusted advisors delivering results-driven solutions\" — congratulations, you've said nothing.",
  topThreeFixes: [
    "Replace the generic hero with a specific, named outcome (e.g. a deal size or count)",
    "Add a real social-proof block — logos or a tombstone wall, not adjectives",
    "Cut \"trusted advisor\" and \"results-driven\" entirely",
  ],
  annotations: [
    { element: "Hero headline", whatYouSaid: "Trusted Legal Partners for Your Business", whatItSounds: "generic template copy with the firm name swapped in", rewrite: "Cross-border deals close faster with counsel who's done 40 of them." },
  ],
  pageTitle: "Petrović & Partners — Home",
};

export const DEMO_HEADLINE: Omit<HeadlineWinnerCache, "capturedAt"> = {
  text: "Cross-border deals close faster with counsel who's done 40 of them.",
  angle: "Stat-led",
  why: "Specific, credible number beats any adjective — it's the single highest-scoring angle for this audience.",
  brief: "M&A practice page hero headline",
};

export const DEMO_BIO: Omit<BioCache, "capturedAt"> = {
  name: "Marko Petrović",
  role: "Managing Partner",
  emphases: ["deals", "industry"],
  rewrite: "## Short Version\n\nMarko Petrović has closed over 40 cross-border M&A transactions across CEE, with a focus on manufacturing and logistics targets.\n\n## Long Version\n\nMarko leads the firm's Corporate/M&A practice...",
};

export const DEMO_ROADMAP: Omit<RoadmapCache, "capturedAt"> = {
  summary: "A 3-phase plan moving from foundational fixes to sustained thought leadership.",
  phases: [
    {
      label: "Phase 1 — Foundations (Weeks 1-2)",
      focus: "Fix the practice area page and site health basics",
      actions: [
        { title: "Rewrite Corporate/M&A practice page", why: "Currently scores 4/10 on positioning clarity", chapterRef: "practice-area-pages" },
        { title: "Fix the stale 2023 copyright year and 1 broken team-page link", why: "A prospective client notices unmaintained details right before they decide you're not actively managing your public presence", chapterRef: "website-checklist" },
      ],
    },
    {
      label: "Phase 2 — Momentum (Weeks 3-6)",
      focus: "Convert real deal experience and Chambers standing into visible proof",
      actions: [
        { title: "Publish a tombstone wall of your last 10 closed deals", why: "Chambers Band 2 and Legal 500 Tier 2 standing isn't doing any work if a prospective client can't verify it on the site", chapterRef: "building-credibility" },
        { title: "Publish one bylined article on cross-border deal structuring", why: "Thought Leadership is scoring under half its points — this is the most controllable category in the whole audit", chapterRef: "thought-leadership" },
        { title: "Claim and complete your Google Business Profile", why: "A free, 10-point line item that's currently unclaimed", chapterRef: "google-search-console" },
      ],
    },
    {
      label: "Phase 3 — Compounding (Weeks 7-12)",
      focus: "Turn one-off wins into a cadence competitors can't easily match",
      actions: [
        { title: "Commit to a monthly bylined-content and deal-announcement cadence", why: "BDK Advokati's publishing rhythm is inconsistent enough to out-publish with a real schedule, not a burst", chapterRef: "marketing-as-strategy" },
        { title: "Rework homepage and practice-page copy around named outcomes", why: "\"Trusted advisors delivering results-driven solutions\" reads like every other regional firm's homepage", chapterRef: "messaging-positioning" },
      ],
    },
  ],
};

// BDK Advokati is a real firm from the verified Serbia seed data (see
// CLAUDE.md) — using it here (rather than an invented competitor) means
// the demo Battle Plan's Competitive Position section stays consistent
// with what the Visibility/Recognition Index pages would actually show
// for this market.
export const DEMO_COMPETITOR: Omit<CompetitorCache, "capturedAt"> = {
  yourUrl: "https://petrovicpartners.rs",
  competitorUrls: ["https://bdkadvokati.com"],
  executiveSummary:
    "Petrović & Partners and BDK Advokati sit close on paper — both ranked for Corporate/M&A in Chambers and Legal 500 — but BDK is winning the visibility fight: a maintained deal page, a steadier press cadence, and named partner bylines. Petrović & Partners has comparable deal experience and isn't saying so anywhere on the site.",
  yourPositioning: {
    summary: "A credible mid-market M&A practice that reads as generic online — the website doesn't back up what the Chambers ranking already confirms about you.",
    strengths: [
      "Real Chambers Band 2 and Legal 500 Tier 2 standing in Corporate/M&A",
      "Genuine cross-border deal experience across CEE, concentrated in manufacturing and logistics",
    ],
    weaknesses: [
      "No deal tombstones or case studies published anywhere on the site",
      "Homepage copy is generic — could belong to any regional firm",
      "No bylined content in the last 90 days",
    ],
  },
  competitors: [
    {
      url: "https://bdkadvokati.com",
      positioning: "Positions as the go-to for cross-border corporate work, backed by a visible, regularly updated deal page.",
      doingBetter: [
        "Publishes a tombstone wall of named, dated deals",
        "Partners quoted in regional press roughly monthly",
        "Practice-area copy is specific rather than generic",
      ],
      doingWorse: [
        "Slower page load on mobile",
        "No visible client-facing content calendar",
      ],
    },
  ],
  gaps: [
    { gap: "No public deal record", why: "A prospective client can't verify deal experience Chambers already confirms is real — the ranking isn't doing any work on the website." },
    { gap: "Zero bylined thought leadership in the last quarter", why: "BDK's partners are quoted in the regional press; yours aren't, which cedes the \"who do I call about cross-border M&A\" question by default." },
  ],
  opportunities: [
    "Own the \"named deal experience\" angle BDK hasn't claimed — publish a tombstone wall with real, dated deals",
    "Pitch one bylined article per month on cross-border deal structuring — BDK's cadence is inconsistent enough to out-publish with a real schedule",
  ],
  recommendedMoves: [
    { move: "Publish a tombstone wall of your last 10 closed deals", impact: "high", effort: "low" },
    { move: "Get one partner bylined article placed this quarter", impact: "high", effort: "medium" },
    { move: "Rewrite the Corporate/M&A practice page around named outcomes", impact: "medium", effort: "low" },
  ],
};

// Mirrors DEMO_AUDIT exactly — the Battle Plan's Visibility Score section
// and the Dashboard's own hero card should always agree on the number,
// since in a real account both read from the same audit row.
export const DEMO_VISIBILITY_SCORE: Omit<VisibilityScoreCache, "capturedAt"> = {
  auditedDomain: DEMO_DOMAIN,
  displayName: DEMO_DISPLAY_NAME,
  market: "serbia",
  peerGroup: "regional",
  totalScore: DEMO_AUDIT.total_score,
  categories: {
    performance: { score: DEMO_AUDIT.performance_score, provenance: DEMO_AUDIT.provenance.performance },
    social: { score: DEMO_AUDIT.social_score, provenance: DEMO_AUDIT.provenance.social },
    seoAuthority: { score: DEMO_AUDIT.seo_authority_score, provenance: DEMO_AUDIT.provenance.seoAuthority },
    thoughtLeadership: { score: DEMO_AUDIT.thought_leadership_score, provenance: DEMO_AUDIT.provenance.thoughtLeadership },
    reputation: { score: DEMO_AUDIT.reputation_score, provenance: DEMO_AUDIT.provenance.reputation },
  },
  percentile: DEMO_AUDIT.percentile ?? null,
  peerCount: DEMO_AUDIT.peer_count ?? 0,
  rawMetrics: DEMO_AUDIT.raw_metrics as Record<string, unknown>,
};

// Demo-only leaderboard for the public Visibility Index page — the real
// index is cold-start empty until real firms actually publish an audit, so
// a first-time demo visitor would otherwise see nothing there at all. Uses
// entirely fictional firm names (never a real Serbia firm — those carry
// real, independently-verifiable Chambers/Legal 500 standing and it would
// be misleading to attach a fabricated audit score to one) and is clearly
// labeled as sample data wherever it's rendered. 18 entries total, 11
// scoring below Petrović & Partners and 6 above, to exactly match the
// "Better than 61% of 18 peers" stat already shown elsewhere in the demo.
export const DEMO_RANKINGS: { displayName: string; domain: string; score: number }[] = [
  { displayName: "Vasić Cross-Border Advocates", domain: "vasic-advocates.example", score: 142.0 },
  { displayName: "Nikolić & Delić Partners", domain: "nikolic-delic.example", score: 128.5 },
  { displayName: "Regional Corporate Law Group", domain: "regionalcorplaw.example", score: 115.2 },
  { displayName: "Stevanović Legal Alliance", domain: "stevanovic-legal.example", score: 103.8 },
  { displayName: "Belgrade Commercial Partners", domain: "belgradecommercial.example", score: 95.4 },
  { displayName: "Đurić & Associates", domain: "duric-associates.example", score: 84.1 },
  { displayName: DEMO_DISPLAY_NAME, domain: DEMO_DOMAIN, score: DEMO_AUDIT.total_score },
  { displayName: "Antić Law Office", domain: "antic-law.example", score: 76.5 },
  { displayName: "Southeast Legal Partners", domain: "southeastlegal.example", score: 71.2 },
  { displayName: "Kostić & Ranković", domain: "kostic-rankovic.example", score: 68.9 },
  { displayName: "Danube Advisory Partners", domain: "danubeadvisory.example", score: 63.4 },
  { displayName: "Ilić Corporate Counsel", domain: "ilic-counsel.example", score: 58.7 },
  { displayName: "Marinković Law Group", domain: "marinkovic-law.example", score: 52.1 },
  { displayName: "Popadić & Co.", domain: "popadic-co.example", score: 47.6 },
  { displayName: "Regional Business Law", domain: "regionalbusinesslaw.example", score: 41.3 },
  { displayName: "Todorović Partners", domain: "todorovic-partners.example", score: 35.8 },
  { displayName: "Savić Legal Services", domain: "savic-legal.example", score: 28.4 },
  { displayName: "Cross-Adriatic Law", domain: "crossadriatic.example", score: 21.0 },
].sort((a, b) => b.score - a.score);

export const DEMO_STRATEGY_BRIEF = {
  headline: "Your reputation is carrying a firm that isn't talking.",
  narrative:
    "Petrović & Partners has real standing — the Chambers and Legal 500 bands back it up, and that's the hardest thing to fake. But Thought Leadership is scoring under half its points, and Social sits even lower, which means that credibility isn't being converted into visible momentum. A firm with your reputation should be the one setting the narrative on cross-border M&A in this market, not a quiet name in a directory. The stale copyright year on your homepage doesn't help either — it's a small thing, but it's the kind of detail a prospective client notices right before they decide you're not actively maintaining your public presence.",
};

// The §8 workflow board's demo fixtures, built at seed time so the dates
// always read as current. One item per status — a visitor should see every
// column the real board has, including the approval gate and the
// re-measure loop closing it.
export function buildDemoWorkflowBoard(): { items: WorkflowItem[]; comments: WorkflowComment[] } {
  const t = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const iso = (ms: number) => new Date(ms).toISOString();
  const items: WorkflowItem[] = [
    {
      id: "demo-wf-1",
      title: "Rewrite Corporate/M&A practice page",
      description: "Currently scores 4/10 on positioning clarity",
      source: "roadmap_action",
      source_ref: { phaseLabel: "Phase 1 — Foundations (Weeks 1-2)", chapterRef: "practice-area-pages" },
      status: "in_progress",
      assigned_to_user_id: null,
      assigned_to_label: "M. Petrović",
      due_date: iso(t + 6 * day),
      created_at: iso(t - 5 * day),
      updated_at: iso(t - 1 * day),
    },
    {
      id: "demo-wf-2",
      title: "Fix the stale 2023 copyright year and broken team-page link",
      description: "Small details a prospective client notices right before judging whether the firm is maintained",
      source: "roadmap_action",
      source_ref: { phaseLabel: "Phase 1 — Foundations (Weeks 1-2)", chapterRef: "website-checklist" },
      status: "todo",
      assigned_to_user_id: null,
      assigned_to_label: null,
      due_date: iso(t + 10 * day),
      created_at: iso(t - 5 * day),
      updated_at: iso(t - 5 * day),
    },
    {
      id: "demo-wf-3",
      title: "Publish a tombstone wall of the last 10 closed deals",
      description: "Chambers Band 2 standing does no work if a prospective client can't verify it on the site",
      source: "roadmap_action",
      source_ref: { phaseLabel: "Phase 2 — Momentum (Weeks 3-6)", chapterRef: "building-credibility" },
      status: "in_review",
      assigned_to_user_id: null,
      assigned_to_label: "J. Jovanović",
      due_date: iso(t + 3 * day),
      created_at: iso(t - 12 * day),
      updated_at: iso(t - 0.5 * day),
    },
    {
      id: "demo-wf-4",
      title: "Claim and complete the Google Business Profile",
      description: "A free, 10-point line item that was unclaimed",
      source: "roadmap_action",
      source_ref: { phaseLabel: "Phase 2 — Momentum (Weeks 3-6)", chapterRef: "google-search-console" },
      status: "approved",
      assigned_to_user_id: null,
      assigned_to_label: "M. Petrović",
      due_date: null,
      created_at: iso(t - 16 * day),
      updated_at: iso(t - 2 * day),
    },
    {
      id: "demo-wf-5",
      title: "Re-run the visibility audit after Phase 1 ships",
      description: "Close the loop — measure what the fixes actually moved",
      source: "custom",
      source_ref: null,
      status: "done",
      assigned_to_user_id: null,
      assigned_to_label: null,
      due_date: null,
      created_at: iso(t - 20 * day),
      updated_at: iso(t - 8 * day),
    },
  ];
  const comments: WorkflowComment[] = [
    {
      id: "demo-wfc-1",
      item_id: "demo-wf-1",
      author_label: "Milica Petrović · Managing Partner",
      body: "Draft v2 is much sharper on positioning. Tighten the opening paragraph before this goes live.",
      voice_note_data_url: null,
      evidence_url: null,
      visibility: "client",
      created_at: iso(t - 1 * day),
    },
    {
      id: "demo-wfc-2",
      item_id: "demo-wf-1",
      author_label: "Your consultant",
      body: "Hold publication until the new hero copy is signed off — flagged for tomorrow's call.",
      voice_note_data_url: null,
      evidence_url: null,
      visibility: "internal",
      created_at: iso(t - 0.8 * day),
    },
    {
      id: "demo-wfc-3",
      item_id: "demo-wf-3",
      author_label: "J. Jovanović",
      body: "Deal list compiled — 9 of 10 cleared with clients for publication. Ready for a partner to review.",
      voice_note_data_url: null,
      evidence_url: null,
      visibility: "client",
      created_at: iso(t - 0.5 * day),
    },
  ];
  return { items, comments };
}

export function seedDemoData() {
  localStorage.setItem("guidebook_firm_context", JSON.stringify(DEMO_FIRM_CONTEXT));
  localStorage.setItem("guidebook_reading_progress", JSON.stringify(DEMO_READ_CHAPTER_IDS));
  localStorage.setItem("guidebook_last_read", DEMO_READ_CHAPTER_IDS[DEMO_READ_CHAPTER_IDS.length - 1]);
  localStorage.setItem("workshop_run_history", JSON.stringify(DEMO_WORKSHOP_RUNS));
  localStorage.setItem("guidebook_implementation", JSON.stringify(DEMO_IMPLEMENTATION));
  localStorage.setItem("guidebook_battleplan_maturity", JSON.stringify({ ...DEMO_MATURITY, capturedAt: now }));
  localStorage.setItem("guidebook_battleplan_roast", JSON.stringify({ ...DEMO_ROAST, capturedAt: now }));
  localStorage.setItem("guidebook_battleplan_headline", JSON.stringify({ ...DEMO_HEADLINE, capturedAt: now }));
  localStorage.setItem("guidebook_battleplan_bio", JSON.stringify({ ...DEMO_BIO, capturedAt: now }));
  localStorage.setItem("guidebook_battleplan_roadmap", JSON.stringify({ ...DEMO_ROADMAP, capturedAt: now }));
  localStorage.setItem("guidebook_battleplan_competitor", JSON.stringify({ ...DEMO_COMPETITOR, capturedAt: now }));
  localStorage.setItem("guidebook_battleplan_visibility", JSON.stringify({ ...DEMO_VISIBILITY_SCORE, capturedAt: now }));
  localStorage.setItem("demo_workflow_board", JSON.stringify(buildDemoWorkflowBoard()));
}

const SEEDED_KEYS = [
  "demo_workflow_board",
  "guidebook_firm_context",
  "guidebook_reading_progress",
  "guidebook_last_read",
  "workshop_run_history",
  "guidebook_implementation",
  "guidebook_battleplan_maturity",
  "guidebook_battleplan_roast",
  "guidebook_battleplan_headline",
  "guidebook_battleplan_bio",
  "guidebook_battleplan_roadmap",
  "guidebook_battleplan_competitor",
  "guidebook_battleplan_visibility",
];

export function clearDemoData() {
  SEEDED_KEYS.forEach((k) => localStorage.removeItem(k));
}
