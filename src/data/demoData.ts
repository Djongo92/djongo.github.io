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
  seo_authority_score: 0,
  thought_leadership_score: 22,
  reputation_score: 34,
  total_score: 80.3,
  provenance: {
    performance: "api",
    social: "self_reported",
    seoAuthority: "missing",
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
    },
    thoughtLeadership: {
      postsCount: 2,
      newsCount: 1,
      bylinePct: 50,
      items: [
        { title: "Cross-Border M&A Trends in Southeast Europe", date: "2026-06-02", type: "blog", hasNamedByline: true },
        { title: "Regulatory Shifts Affecting Manufacturing M&A", date: "2026-05-18", type: "blog", hasNamedByline: false },
        { title: "Petrović & Partners advises on Meridian Capital transaction", date: "2026-05-10", type: "news", hasNamedByline: false },
      ],
    },
    reputation: {
      gbpListed: true,
      matchedFirmName: "Petrović & Partners",
      matchedFirmDomain: DEMO_DOMAIN,
      chambers: { points: 13, count: 3, avgRank: 2.7 },
      legal500: { points: 11, count: 3, avgRank: 3.2 },
      iflr1000: { points: 0, count: 0, avgRank: null },
      chambersRankedTables: { CC: 2, DR: 3, EM: 3 },
      legal500RankedTables: { CC: 2, DR: 3, EM: 4 },
      iflr1000RankedTables: null,
    },
  },
  updated_at: new Date(now).toISOString(),
  percentile: 61,
  peer_count: 18,
};

export const DEMO_HISTORY: HistoryRow[] = [
  { audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 58.2, performance_score: 10.2, social_score: 5.0, seo_authority_score: 0, thought_leadership_score: 12.0, reputation_score: 31.0, recorded_at: new Date(now - 60 * DAY).toISOString() },
  { audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 63.5, performance_score: 11.5, social_score: 6.0, seo_authority_score: 0, thought_leadership_score: 15.0, reputation_score: 31.0, recorded_at: new Date(now - 45 * DAY).toISOString() },
  { audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 68.1, performance_score: 12.5, social_score: 7.0, seo_authority_score: 0, thought_leadership_score: 17.6, reputation_score: 31.0, recorded_at: new Date(now - 30 * DAY).toISOString() },
  { audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 71.4, performance_score: 13.0, social_score: 8.0, seo_authority_score: 0, thought_leadership_score: 19.4, reputation_score: 31.0, recorded_at: new Date(now - 18 * DAY).toISOString() },
  { audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 75.9, performance_score: 13.8, social_score: 8.8, seo_authority_score: 0, thought_leadership_score: 20.3, reputation_score: 33.0, recorded_at: new Date(now - 7 * DAY).toISOString() },
  { audited_domain: DEMO_DOMAIN, market: "serbia", total_score: 80.3, performance_score: 14.8, social_score: 9.5, seo_authority_score: 0, thought_leadership_score: 22.0, reputation_score: 34.0, recorded_at: new Date(now).toISOString() },
];

export const DEMO_FIRM_CONTEXT: FirmContext = {
  practiceArea: "Corporate / M&A",
  firmSize: "11-50 attorneys",
  primaryGoal: "Win more mid-market M&A mandates",
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
export const DEMO_MATURITY: Omit<MaturityCache, "capturedAt"> = {
  score: 60,
  dimensions: [
    { label: "Website & Digital Presence", score: 3 },
    { label: "Content & Thought Leadership", score: 3 },
    { label: "Brand & Positioning", score: 2 },
    { label: "Client Experience", score: 4 },
    { label: "Marketing Operations", score: 3 },
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
    { element: "Hero headline", whatYouSaid: "Trusted Legal Partners for Your Business", whatItSounds: "generic template copy with the firm name swapped in" },
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
};

export const DEMO_STRATEGY_BRIEF = {
  headline: "Your reputation is carrying a firm that isn't talking.",
  narrative:
    "Petrović & Partners has real standing — the Chambers and Legal 500 bands back it up, and that's the hardest thing to fake. But Thought Leadership is scoring under half its points, and Social sits even lower, which means that credibility isn't being converted into visible momentum. A firm with your reputation should be the one setting the narrative on cross-border M&A in this market, not a quiet name in a directory. The stale copyright year on your homepage doesn't help either — it's a small thing, but it's the kind of detail a prospective client notices right before they decide you're not actively maintaining your public presence.",
};

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
}

const SEEDED_KEYS = [
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
