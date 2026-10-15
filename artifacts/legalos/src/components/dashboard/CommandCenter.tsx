import { useMemo, useState, type JSX } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { motionReveal } from "@/lib/motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import {
  ArrowRight, ShieldCheck, TrendingUp, TrendingDown, Sparkles, Hammer, AlertTriangle, CheckCircle2,
  Gauge, BookOpen, FileText, Share2, BarChart3, SlidersHorizontal, X, Copy, Check,
} from "lucide-react";
import {
  SwipeIcon, CopywriterIcon, RewriteIcon, AutopsyIcon, AuditIcon,
  HeadlinesIcon, TeardownIcon, PitchDeckIcon, BioIcon, CalendarIcon,
} from "@/components/workshop/icons";
import { NetworkInsights } from "./NetworkInsights";
import { useCommandCenterInsights, type InsightAction } from "@/hooks/useCommandCenterInsights";
import { useWorkshopHistory } from "@/hooks/useWorkshopHistory";
import { useBattlePlanCache } from "@/hooks/useBattlePlanCache";
import { useStrategyBrief } from "@/hooks/useStrategyBrief";
import { useScoreGoals } from "@/hooks/useScoreGoals";
import { PEER_GROUPS } from "@/lib/marketVisibilityConfig";
import { CATEGORY_META, CATEGORY_ORDER, CATEGORY_COLOR_CLASSES, type CategoryKey } from "@/lib/visibilityCategories";
import { CategoryExplainer, ProvenanceBadge } from "@/components/visibility/Explainers";
import ScoreRing from "@/components/visibility/ScoreRing";
import Sparkline from "@/components/visibility/Sparkline";
import ScoreBurst from "@/components/visibility/ScoreBurst";
import MilestoneCelebration from "@/components/visibility/MilestoneCelebration";
import { useMilestoneCelebration } from "@/hooks/useMilestoneCelebration";
import MondayBrief from "@/components/dashboard/MondayBrief";
import ClientWinLog from "@/components/dashboard/ClientWinLog";
import Campaigns from "@/components/dashboard/Campaigns";
import PeerPositionBar from "@/components/visibility/PeerPositionBar";
import PeerScatterMap from "@/components/visibility/PeerScatterMap";
import MarketVisibilityScore from "@/components/MarketVisibilityScore";
import ExecutiveReport from "@/components/ExecutiveReport";
import WhatIfSimulator from "@/components/visibility/WhatIfSimulator";
import type { WorkshopToolId } from "@/lib/handoff";
import { historyScore500 } from "@/lib/measuredScore";
import { scoredAgoLabel, isStale, AUDIT_STALE_AFTER_DAYS } from "@/lib/scoreFreshness";
import { computeMeasuredTotals, measuredScoreLabel, categoryScoreCell, toScale500 } from "@/lib/measuredScore";
import { computeWeekRange, formatWeekRangeLabel } from "@/lib/mondayBriefWeek";
import { computeCategoryDeltas } from "@/lib/categoryDeltas";
import { useAuth } from "@/hooks/useAuth";
import { useFirmTeam } from "@/hooks/useFirmTeam";
import { can } from "@/lib/roles";
import { enableDemoMode } from "@/lib/demoMode";
import { downloadScoreCard, buildScoreCardUrl } from "@/lib/visibilityScoreCard";
import type { PeerStats } from "../../../supabase/functions/_shared/percentileFormula";

const CATEGORY_LABELS = CATEGORY_META;

const HISTORY_FIELD_FOR: Record<CategoryKey, keyof HistoryRow> = {
  performance: "performance_score",
  social: "social_score",
  seoAuthority: "seo_authority_score",
  thoughtLeadership: "thought_leadership_score",
  reputation: "reputation_score",
};

const TONE_STYLES: Record<string, { border: string; text: string; icon: typeof TrendingUp }> = {
  warning: { border: "border-amber-500/30", text: "text-amber-500", icon: AlertTriangle },
  opportunity: { border: "border-primary/30", text: "text-primary", icon: Sparkles },
  positive: { border: "border-emerald-500/30", text: "text-emerald-500", icon: CheckCircle2 },
};

const QUICK_ACTIONS: { toolId: WorkshopToolId; label: string; icon: (p: { size?: number; className?: string }) => JSX.Element }[] = [
  { toolId: "swipe", label: "Browse swipe file", icon: SwipeIcon },
  { toolId: "copywriter", label: "Draft copy", icon: CopywriterIcon },
  { toolId: "rewrite", label: "Rewrite existing copy", icon: RewriteIcon },
  { toolId: "autopsy", label: "Autopsy your copy", icon: AutopsyIcon },
  { toolId: "audit", label: "Audit a page", icon: AuditIcon },
  { toolId: "headlines", label: "Test headlines", icon: HeadlinesIcon },
  { toolId: "teardown", label: "Teardown a rival", icon: TeardownIcon },
  { toolId: "deck", label: "Build a pitch deck", icon: PitchDeckIcon },
  { toolId: "bio", label: "Rewrite a bio", icon: BioIcon },
  { toolId: "calendar", label: "Plan the calendar", icon: CalendarIcon },
];

export interface ThoughtLeadershipItem {
  title: string;
  date: string;
  type: "blog" | "news" | "other";
  hasNamedByline: boolean;
}

export interface DirectorySubScore {
  points: number;
  count: number;
  avgRank: number | null;
  qualityStats?: PeerStats | null;
}

export interface SiteHealthRaw {
  hasContactForm: boolean;
  copyrightYear: number | null;
  copyrightStale: boolean;
  brokenLinks: string[];
  checkedLinks: number;
}

export interface PerformanceRaw {
  desktop?: { performance: number; accessibility: number; seo: number };
  mobile?: { performance: number; accessibility: number; seo: number };
  perfAvg?: number;
  accessAvg?: number;
  seoAvg?: number;
}

export interface SocialRaw {
  followers?: number;
  posts30d?: number;
  engagementRate?: number | null;
  platforms?: { linkedin: boolean; instagram: boolean; twitter: boolean; facebook: boolean };
  platformCount?: number;
  /** Full six-value peer comparison (raw value, peer median, 90th-percentile
   *  threshold, highest observed, sample size, comparison date) this score
   *  was benchmarked against — persisted so a client can re-run the formula
   *  (e.g. a what-if simulator) without a live query, and so it's auditable. */
  followersStats?: PeerStats;
  postsStats?: PeerStats;
  erStats?: PeerStats | null;
}

export interface PressMention {
  title: string;
  source: string;
  link: string;
  date: string;
}

export interface ThoughtLeadershipRaw {
  postsCount?: number;
  newsCount?: number;
  /** Fraction 0-1, not a percentage — matches thoughtLeadershipFormula.ts's `5 * bylinePct`. */
  bylinePct?: number;
  items?: ThoughtLeadershipItem[];
  pressMentions?: PressMention[];
  /** Full six-value peer comparison — see SocialRaw's comment. */
  postsStats?: PeerStats;
  newsStats?: PeerStats;
}

export interface ReputationRaw {
  gbpListed?: boolean;
  /** 0–10 sub-score from Google Business Profile (Places API or self-reported fallback). */
  gbpScore?: number;
  /** "google_places_api" when scored from live Places data; "self_reported" when
   *  falling back to the intake boolean. Drives the Verified / Self-reported badge. */
  gbpSource?: "google_places_api" | "self_reported";
  /** Populated when gbpSource is "google_places_api". */
  gbpRating?: number | null;
  gbpReviewCount?: number | null;
  gbpOperational?: boolean | null;
  gbpScoreBreakdown?: {
    operationalPts: number;
    ratingPts: number;
    reviewPts: number;
    completenessPts: number;
  } | null;
  matchedFirmName?: string;
  matchedFirmDomain?: string | null;
  /** market_directory_data.last_verified_at for the matched row — reviewed
   *  quarterly, not refreshed automatically. Present only when a directory
   *  match was found (undefined while directory match is still pending). */
  directoryLastVerifiedAt?: string | null;
  chambers?: DirectorySubScore;
  legal500?: DirectorySubScore;
  iflr1000?: DirectorySubScore;
  chambersRankedTables?: Record<string, number> | null;
  legal500RankedTables?: Record<string, number> | null;
  iflr1000RankedTables?: Record<string, number> | null;
}

export interface AuditRow {
  id: string;
  audited_domain: string;
  display_name: string | null;
  market: string;
  peer_group: string;
  performance_score: number;
  social_score: number;
  seo_authority_score: number;
  thought_leadership_score: number;
  reputation_score: number;
  total_score: number;
  provenance: Record<string, string>;
  raw_metrics?: {
    siteHealth?: SiteHealthRaw | null;
    performance?: PerformanceRaw;
    social?: SocialRaw;
    seoAuthority?: Record<string, unknown>;
    thoughtLeadership?: ThoughtLeadershipRaw;
    reputation?: ReputationRaw;
  };
  updated_at: string;
  percentile?: number | null;
  peer_count?: number;
  /** Data-integrity metadata (CLAUDE.md §3) — which formula version scored
   *  this, what data window it drew from, and how much to trust the number. */
  methodology_version?: number;
  data_window_start?: string | null;
  data_window_end?: string | null;
  sample_size?: number | null;
  confidence_score?: number | null;
  review_status?: "unreviewed" | "reviewed" | "flagged";
  reviewed_by?: string | null;
  manual_override?: boolean;
  manual_override_reason?: string | null;
  /** §7 — optional peer-group refinement, self-reported at intake. Only
   *  firm_size narrows the live Social/Thought Leadership peer comparison
   *  today; the rest are captured for future use. */
  firm_size?: string | null;
  office_count?: string | null;
  service_model?: string | null;
  specialization?: string | null;
  market_tier?: string | null;
  /** The signed-in score uses the published census row when it has equal or
   * greater category coverage than the account's private row. */
  dashboard_source?: "private" | "public_census";
  private_audit_id?: string;
  public_audit_id?: string | null;
  public_audit_available?: boolean;
}

export interface HistoryRow {
  audited_domain: string;
  market: string;
  total_score: number;
  performance_score?: number;
  social_score?: number;
  seo_authority_score?: number;
  thought_leadership_score?: number;
  reputation_score?: number;
  recorded_at: string;
  /** Frozen at scoring time — never recomputed against today's peer group
   *  when this snapshot is redisplayed later (see percentileFormula.ts's
   *  PeerStats and runVisibilityAudit.ts). Same shape as AuditRow's
   *  raw_metrics/provenance, since both tables are written from the same
   *  scoring run. Optional because rows recorded before this metadata
   *  existed have neither. */
  raw_metrics?: AuditRow["raw_metrics"];
  provenance?: AuditRow["provenance"];
  /** Rolled-up per-audit confidence for THIS historical snapshot, not the
   *  current audit's — lets the history chart flag a thin-peer-group point
   *  without recomputing anything live. */
  confidence_score?: number | null;
  sample_size?: number | null;
}

interface CommandCenterProps {
  audits: AuditRow[];
  history: HistoryRow[];
  readChaptersCount: number;
  totalChapters: number;
  implementationScore: number;
  onOpenWorkshop: () => void;
  onOpenWorkshopTool: (toolId: WorkshopToolId) => void;
  onOpenGuidebook: () => void;
  onOpenMaturity: () => void;
  onOpenAnalytics: () => void;
}

/** Custom recharts tooltip for the headline "Score over time" chart — adds
 *  that snapshot's rolled-up confidence so a dip can be read as "your own
 *  score changed" vs. "this point came from a thin peer sample" without
 *  leaving the dashboard. Mirrors Analytics.tsx's CategoryTrendTooltip. */
const TotalTrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as { score500: number; confidenceScore: number | null; sampleSize: number | null } | undefined;
  if (!point) return null;
  const lowConfidence = point.confidenceScore != null && point.confidenceScore < 1;
  return (
    <div
      className="text-xs font-body rounded-sm px-3 py-2"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-foreground font-medium">{point.score500} / 500</p>
      {point.confidenceScore != null && (
        <p className={`mt-0.5 ${lowConfidence ? "text-amber-500" : "text-muted-foreground"}`}>
          {Math.round(point.confidenceScore * 100)}% confidence
          {point.sampleSize != null ? ` · smallest sample ${point.sampleSize} firms` : ""}
        </p>
      )}
    </div>
  );
};

/** Hollow amber ring flags a point recorded when that audit's peer-normalized
 *  metrics were thin-sampled (confidenceScore < 1) — same treatment as
 *  Analytics.tsx's CategoryTrendDot. */
const TotalTrendDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const lowConfidence = payload?.confidenceScore != null && payload.confidenceScore < 1;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill={lowConfidence ? "hsl(var(--card))" : "rgb(16 185 129)"}
      stroke={lowConfidence ? "rgb(245 158 11)" : "rgb(16 185 129)"}
      strokeWidth={lowConfidence ? 2 : 1}
    />
  );
};

const timeAgo = (ts: number): string => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const CommandCenter = ({
  audits, history, readChaptersCount, totalChapters, implementationScore,
  onOpenWorkshop, onOpenWorkshopTool, onOpenGuidebook, onOpenMaturity, onOpenAnalytics,
}: CommandCenterProps) => {
  const [rerunOpen, setRerunOpen] = useState(false);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [shareCardUrl, setShareCardUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const primary = audits[0];
  const { runs } = useWorkshopHistory();
  const { maturity, roast, headline, bio, roadmap, competitor, visibilityScore } = useBattlePlanCache();
  const { goals } = useScoreGoals();
  // §4 — a read-only executive sees the same dashboard everyone else does,
  // but can't trigger a re-run, publish, or open a Workshop tool from it.
  const { user } = useAuth();
  const { team } = useFirmTeam();
  const myRole = team?.members.find((m) => m.user_id === user?.id)?.role;
  const isReadOnly = can(myRole, "readOnly");

  const categories = useMemo(() => {
    if (!primary) return null;
    return {
      performance: { score: primary.performance_score, provenance: primary.provenance?.performance ?? "missing" },
      social: { score: primary.social_score, provenance: primary.provenance?.social ?? "missing" },
      seoAuthority: { score: primary.seo_authority_score, provenance: primary.provenance?.seoAuthority ?? "missing" },
      thoughtLeadership: { score: primary.thought_leadership_score, provenance: primary.provenance?.thoughtLeadership ?? "missing" },
      reputation: { score: primary.reputation_score, provenance: primary.provenance?.reputation ?? "missing" },
    };
  }, [primary]);

  const categoriesWithMax = useMemo(() => {
    if (!categories) return null;
    return Object.fromEntries(
      Object.entries(categories).map(([key, cat]) => [
        key,
        { ...cat, max: CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS]?.max ?? 0 },
      ]),
    );
  }, [categories]);

  const measured = useMemo(() => computeMeasuredTotals(categories), [categories]);

  const siteHealthIssues = useMemo(() => {
    const health = primary?.raw_metrics?.siteHealth;
    if (!health) return [];
    const issues: string[] = [];
    if (!health.hasContactForm) issues.push("No contact form detected on your homepage.");
    if (health.copyrightStale && health.copyrightYear) {
      issues.push(`Your footer copyright year (${health.copyrightYear}) looks out of date.`);
    }
    if (health.brokenLinks.length > 0) {
      issues.push(`${health.brokenLinks.length} broken link${health.brokenLinks.length > 1 ? "s" : ""} found on your homepage.`);
    }
    return issues;
  }, [primary]);

  const trend = useMemo(() => {
    if (!primary) return [];
    return history
      .filter((h) => h.audited_domain === primary.audited_domain && h.market === primary.market)
      .map((h) => ({
        date: new Date(h.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: Math.round(h.total_score),
        // 500-point display scale — the value the axis and tooltip actually
        // render, so the chart never contradicts the score ring. Each point
        // is rescaled against what THAT snapshot measured (frozen
        // provenance), so a partial-audit point matches the ring's
        // measured-denominator contract.
        score500: historyScore500(h.total_score, h.provenance ?? null),
        // Rolled-up per-audit confidence for THIS snapshot (frozen at
        // scoring time, see auditMetadata.ts) — lets the headline trend
        // flag a thin-peer-group point without recomputing anything live.
        confidenceScore: h.confidence_score ?? null,
        sampleSize: h.sample_size ?? null,
      }));
  }, [history, primary]);

  // Header delta derived from the SCALED endpoints the chart actually
  // renders — subtracting raw points and then rescaling drifts from the
  // displayed values by rounding (raw +1 can be +2 or +3 on the 500 scale).
  const scoreDelta500 = trend.length >= 2 ? trend[trend.length - 1].score500 - trend[0].score500 : 0;

  // Headline-score freshness — the most-viewed number in the app carries
  // the same data-honesty signal the mobile leaderboard rows do. The label
  // states the age plainly (never implies fresher than known), and past
  // AUDIT_STALE_AFTER_DAYS it turns amber like the mobile STALE DATA flag.
  const scoredLabel = primary ? scoredAgoLabel(primary.updated_at) : null;
  const scoreStale = isStale(primary?.updated_at, AUDIT_STALE_AFTER_DAYS);

  // A new personal best (strictly higher than every prior recorded score,
  // never just a plateau) gets a one-shot celebration on the ring — not on
  // every visit, only the first render after it actually happened.
  const isPersonalBest = useMemo(() => {
    if (trend.length < 2) return false;
    // Compare the SCALED values — a raw-score rise across a provenance
    // denominator change (70/140 → 250, then 80/200 → 200) must NOT fire
    // the celebration while the chart shows a decline.
    const priorMax = Math.max(...trend.slice(0, -1).map((t) => t.score500));
    return trend[trend.length - 1].score500 > priorMax;
  }, [trend]);

  // Per-category trend for the tiny sparkline in each score card — same
  // filtered/sorted history as categoryDeltas below, just kept as a value
  // series instead of a before/after pair.
  const categoryTrend = useMemo(() => {
    if (!primary) return null;
    const ownHistory = history
      .filter((h) => h.audited_domain === primary.audited_domain && h.market === primary.market)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    const result: Partial<Record<CategoryKey, number[]>> = {};
    for (const key of CATEGORY_ORDER) {
      const field = HISTORY_FIELD_FOR[key];
      result[key] = ownHistory
        .map((h) => h[field])
        .filter((v): v is number => typeof v === "number");
    }
    return result;
  }, [history, primary]);

  const categoryDeltas = useMemo(() => computeCategoryDeltas(history, primary), [history, primary]);

  // The immediately-prior recorded total score for this firm — the same
  // "previous vs. latest real run" comparison categoryDeltas makes above —
  // so a milestone only ever fires on a real improvement between two
  // actual audits, never on a firm's very first recorded score.
  const previousTotalScore = useMemo(() => {
    if (!primary) return null;
    const ownHistory = history
      .filter((h) => h.audited_domain === primary.audited_domain && h.market === primary.market)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    if (ownHistory.length < 2) return null;
    return ownHistory[ownHistory.length - 2].total_score;
  }, [history, primary]);

  const { milestone, dismiss: dismissMilestone } = useMilestoneCelebration(
    primary?.audited_domain,
    previousTotalScore,
    primary?.total_score ?? null,
    primary?.percentile,
  );

  const insights = useCommandCenterInsights({
    categories, siteHealthIssues, maturity, implementationScore, readChaptersCount, totalChapters,
    gbpListed: primary?.raw_metrics?.reputation?.gbpListed,
  });

  const briefParams = useMemo(() => {
    if (!primary || !categoriesWithMax) return null;
    return {
      domain: primary.audited_domain,
      market: primary.market,
      peerGroup: primary.peer_group,
      totalScore: primary.total_score,
      categories: categoriesWithMax,
      siteHealthIssues,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary?.audited_domain, primary?.market, primary?.total_score]);

  const { brief } = useStrategyBrief(briefParams);

  const recommendedToolIds = useMemo(() => {
    const ids = new Set<WorkshopToolId>();
    insights.forEach((insight) => {
      if (insight.action.kind === "workshop") ids.add(insight.action.toolId);
    });
    return ids;
  }, [insights]);

  const resolveAction = (action: InsightAction) => {
    // A read-only executive can navigate to read-only surfaces (guidebook,
    // maturity plan) but can't trigger a Workshop tool or a re-run — both
    // mutate state under an identity that isn't supposed to write anything.
    if (action.kind === "workshop") return isReadOnly ? undefined : () => onOpenWorkshopTool(action.toolId);
    if (action.kind === "guidebook") return onOpenGuidebook;
    if (action.kind === "maturity") return onOpenMaturity;
    if (action.kind === "rerun") return isReadOnly ? undefined : () => setRerunOpen(true);
    return undefined;
  };

  const mondayBrief = useMemo(() => {
    if (!primary) return null;
    const now = new Date();
    const { monday } = computeWeekRange(now);

    const ownHistory = history
      .filter((h) => h.audited_domain === primary.audited_domain && h.market === primary.market)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    // No history yet — still show a first-session greeting rather than hiding the component.
    if (ownHistory.length === 0) {
      return {
        weekDelta: 0,
        weekRangeLabel: formatWeekRangeLabel(now),
        topInsight: insights[0] ?? null,
        isFirstSession: true,
      };
    }

    // The most recent row at or before this Monday — if the firm's whole
    // history falls within the current week, fall back to its very first
    // recorded score so "this week" still means something on week one.
    const priorRows = ownHistory.filter((h) => new Date(h.recorded_at).getTime() <= monday.getTime());
    const baseline = priorRows.length > 0 ? priorRows[priorRows.length - 1].total_score : ownHistory[0].total_score;
    const weekDelta = Math.round((primary.total_score - baseline) * 10) / 10;
    const weekRangeLabel = formatWeekRangeLabel(now);

    return { weekDelta, weekRangeLabel, topInsight: insights[0] ?? null, isFirstSession: false };
  }, [primary, history, insights]);

  // Next round milestone above current score — powers the What-If teaser card.
  const nextMilestone = useMemo(() => {
    if (!primary) return 160;
    const score = Math.round(primary.total_score);
    return [80, 100, 120, 140, 160, 180, 200].find((m) => m > score) ?? 200;
  }, [primary]);

  const battlePlanSlots = [roast, competitor, roadmap, maturity, headline, bio, visibilityScore];
  const battlePlanFilled = battlePlanSlots.filter(Boolean).length;

  if (!primary || !categories) {
    return (
      <div className="min-h-screen bg-background">
        <header className="max-w-4xl mx-auto px-6 pt-12 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="eyebrow text-[10px] text-emerald-500">Market Visibility</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight mb-2">
            Let's see where you stand
          </h1>
          <p className="text-sm text-muted-foreground font-body max-w-md">
            Run a real, externally-sourced audit of your firm's digital footprint — PageSpeed, legal-directory
            presence, thought-leadership cadence — benchmarked against your peer group. This becomes your home
            once it's run.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 max-w-2xl">
            {[
              { n: 1, label: "Enter your domain, market, and peer group", icon: FileText },
              { n: 2, label: "Get a real score across five categories", icon: Gauge },
              { n: 3, label: "See where you stand against your peers", icon: TrendingUp },
            ].map(({ n, label, icon: StepIcon }) => (
              <div key={n} className="flex-1 flex items-start gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full border border-primary/40 flex items-center justify-center text-xs font-body text-primary">
                  {n}
                </div>
                <div className="min-w-0">
                  <StepIcon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground font-body leading-snug">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 mb-10">
          <MarketVisibilityScore />
        </div>

        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <Hammer className="w-4 h-4 text-primary" />
              <span className="eyebrow text-[10px] text-primary">In the meantime</span>
            </div>
            <p className="text-sm text-secondary-foreground/80 font-body mb-4">
              The Workshop's eleven AI tools don't need an audit to be useful — draft copy, audit a page, generate a
              marketing calendar, whatever you need right now.
            </p>
            <button
              onClick={onOpenWorkshop}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body"
            >
              Open the Workshop <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 pb-16">
          <button
            onClick={enableDemoMode}
            className="text-xs text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" /> Just want to see it fully populated? Load demo data →
          </button>
        </div>
      </div>
    );
  }

  const peerGroupLabel = PEER_GROUPS.find((p) => p.value === primary.peer_group)?.label ?? primary.peer_group;

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="eyebrow text-[10px] text-emerald-500">Command Center</span>
            </div>
            <h1 className="font-display text-4xl font-semibold text-foreground tracking-tight mb-2">
              {primary.display_name || primary.audited_domain}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-body">
              {scoreDelta500 !== 0 && (
                <span className={`inline-flex items-center gap-1 ${scoreDelta500 > 0 ? "text-emerald-500" : "text-destructive"}`}>
                  {scoreDelta500 > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {scoreDelta500 > 0 ? "+" : ""}{scoreDelta500} since first audit
                </span>
              )}
              <span>{peerGroupLabel} · {primary.market[0].toUpperCase() + primary.market.slice(1)}</span>
            </div>
            {typeof primary.percentile === "number" && primary.peer_count! > 0 && (
              <div className="mt-4 max-w-sm">
                <PeerPositionBar percentile={primary.percentile} peerCount={primary.peer_count!} />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="relative" data-coachmark="dashboard-score">
              <ScoreRing
                score={toScale500(primary.total_score, measured.isPartial ? measured.measuredMax : 200)}
                max={500}
                size={132}
                sublabel="Visibility Score"
              />
              {isPersonalBest && <ScoreBurst />}
            </div>
            {scoredLabel && (
              <p className={`text-[10px] font-body text-center max-w-[200px] ${scoreStale ? "text-amber-500" : "text-muted-foreground"}`}>
                {scoredLabel}
                {scoreStale && " · stale — re-run for a current score"}
              </p>
            )}
            {measured.isPartial && (
              <p className="text-[10px] text-muted-foreground font-body text-center max-w-[160px]">
                {toScale500(primary.total_score, measured.measuredMax)}/500 measured · {measured.excludedLabels.join(", ")} not yet scored
              </p>
            )}
            {primary.dashboard_source === "public_census" && (
              <p className="text-[10px] text-primary/80 font-body text-center max-w-[250px]">
                Matches the public Visibility Index · published census data has the fullest category coverage.
              </p>
            )}
            {primary.dashboard_source === "private" && primary.public_audit_available && (
              <p className="text-[10px] text-muted-foreground font-body text-center max-w-[250px]">
                Showing your private audit because it has fuller category coverage than the published Visibility Index.
              </p>
            )}
            {/* One scale, said once, everywhere it matters: full audit = five
                categories on 500 points, teaser = two of them, directory
                standing = a rank among peers, never another score. */}
            <p className="text-[10px] text-muted-foreground/70 font-body text-center max-w-[210px]">
              Five categories on one 500-point scale; the free teaser measures two. Directory standing is a rank among peers, not a score.
            </p>
            <button
              onClick={() => {
                const url = buildScoreCardUrl(primary);
                if (url) { setShareCardUrl(url); setSharePreviewOpen(true); }
              }}
              className="inline-flex items-center gap-1.5 text-xs bg-card border border-border/50 hover:border-primary/40 px-3 py-1.5 rounded-sm font-body text-muted-foreground hover:text-primary transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share score card
            </button>
          </div>
        </div>
      </header>

      {mondayBrief && (
        <div className="max-w-5xl mx-auto px-6 mb-6">
          <MondayBrief
            weekRangeLabel={mondayBrief.weekRangeLabel}
            weekDelta={mondayBrief.weekDelta}
            topInsight={mondayBrief.topInsight}
            onInsightAction={mondayBrief.topInsight ? resolveAction(mondayBrief.topInsight.action) : undefined}
            firmName={primary.display_name || primary.audited_domain}
            isFirstSession={mondayBrief.isFirstSession}
          />
        </div>
      )}

      {brief && (
        <div className="max-w-5xl mx-auto px-6 mb-6">
          <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="eyebrow text-[10px] text-primary">Strategy Brief</span>
            </div>
            <h2 className="font-display text-xl text-foreground font-semibold mb-2">{brief.headline}</h2>
            <p className="text-sm text-secondary-foreground/80 font-body leading-relaxed">{brief.narrative}</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / main column */}
        <div className="lg:col-span-2 space-y-6">
          {trend.length > 1 && (
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-body">Score over time</p>
                {trend.some((p) => p.confidenceScore != null && p.confidenceScore < 1) && (
                  <span className="eyebrow eyebrow-tight text-[10px] text-amber-500">
                    Some points thin-sampled
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 500]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={36} />
                  <Tooltip content={<TotalTrendTooltip />} />
                  <Line type="monotone" dataKey="score500" stroke="rgb(16 185 129)" strokeWidth={2} dot={<TotalTrendDot />} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {categoryDeltas && categoryDeltas.deltas.length > 0 && (
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <p className="text-xs text-muted-foreground font-body mb-3">
                What changed since {new Date(categoryDeltas.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
              <div className="space-y-2">
                {categoryDeltas.deltas.map(({ key, delta }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm font-body text-foreground">{CATEGORY_LABELS[key].label}</span>
                    <span className={`text-sm font-body font-medium flex items-center gap-1 ${delta > 0 ? "text-emerald-500" : "text-destructive"}`}>
                      {delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {delta > 0 ? "+" : ""}{delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5 category cards + 1 "full breakdown" tile = 6, so this divides evenly at every
              breakpoint below (2-col and 3-col) instead of leaving an orphaned trailing card. */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-coachmark="category-methodology">
            {CATEGORY_ORDER.map((key, i) => {
              const cat = categories[key];
              const meta = CATEGORY_LABELS[key];
              const isMissing = cat.provenance === "missing";
              const pct = meta && !isMissing ? Math.min(100, (cat.score / meta.max) * 100) : 0;
              const colors = CATEGORY_COLOR_CLASSES[meta.color];
              const series = categoryTrend?.[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...motionReveal, delay: i * 0.06 }}
                  className="bg-card border border-border/50 rounded-sm p-5"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-body text-foreground">{meta?.label ?? key}</p>
                    <CategoryExplainer categoryKey={key} rawMetrics={primary?.raw_metrics as Record<string, unknown> | undefined} />
                  </div>
                  <div className="flex items-end justify-between gap-2 mb-2">
                    {isMissing ? (
                      <div className="font-display text-sm text-muted-foreground italic">{categoryScoreCell(cat, key)}</div>
                    ) : (
                      <div className="font-display text-2xl text-foreground font-semibold">
                        {Math.round(pct)}
                        <span className="text-sm text-muted-foreground">% of potential</span>
                      </div>
                    )}
                    {series && series.length > 1 && (
                      <Sparkline values={series} colorClass={colors.stroke} />
                    )}
                  </div>
                  <div className="relative w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${isMissing ? "bg-muted-foreground/30" : colors.bg}`}
                      style={{ width: `${pct}%` }}
                    />
                    {!isMissing && goals[key] !== undefined && meta && (
                      <div className="absolute top-0 h-full w-0.5 bg-primary" style={{ left: `${Math.min(100, (goals[key]! / meta.max) * 100)}%` }} />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <ProvenanceBadge provenance={cat.provenance} />
                    {!isMissing && goals[key] !== undefined && meta && (
                      <span className="text-[10px] text-primary font-body">Target {Math.round((goals[key]! / meta.max) * 100)}%</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionReveal, delay: CATEGORY_ORDER.length * 0.06 }}
              onClick={onOpenAnalytics}
              className="bg-card border border-dashed border-border/60 rounded-sm p-5 flex flex-col items-center justify-center text-center gap-2 hover:border-primary/50 hover:bg-secondary/20 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-body leading-snug">
                Full breakdown <br /> in Analytics
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </motion.button>
          </div>

          <PeerScatterMap
            market={primary.market}
            peerGroup={primary.peer_group}
            currentDomain={primary.audited_domain}
            currentDisplayName={primary.display_name}
            currentReputation={primary.reputation_score}
            currentThoughtLeadership={primary.thought_leadership_score}
          />

          {/* Key Insights — insights[0] is already featured as the week's
              highest-leverage move in the Monday Brief above; listing it here
              too would rank the same action twice and dilute "the one thing
              to do next". */}
          {insights.length > 1 && (
          <div>
            <h2 className="font-display text-lg text-foreground mb-3">Key Insights</h2>
            <div className="space-y-2">
              {insights.slice(1).map((insight) => {
                const style = TONE_STYLES[insight.tone];
                const Icon = style.icon;
                const action = resolveAction(insight.action);
                return (
                  <div key={insight.id} className={`bg-card border ${style.border} rounded-sm px-4 py-3 flex items-start gap-3`}>
                    <Icon className={`w-4 h-4 ${style.text} shrink-0 mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h3 className="font-display text-sm text-foreground">{insight.title}</h3>
                        <p className="text-xs text-secondary-foreground/70 font-body">{insight.body}</p>
                      </div>
                    </div>
                    {action && (
                      <button onClick={action} className={`inline-flex items-center gap-1 text-xs font-body ${style.text} hover:opacity-80 shrink-0 whitespace-nowrap`}>
                        {insight.actionLabel} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* Executive Report — its own artifact, not a shortened dashboard */}
          <div className="mb-8">
            <ExecutiveReport primaryAudit={primary} history={history} />
          </div>

          {/* Network Intelligence — anonymised peer benchmarks (task #122) */}
          <NetworkInsights auditCount={history.length} />

          {/* Quick Actions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg text-foreground">Quick Actions</h2>
              {isReadOnly && (
                <span className="eyebrow text-[10px] text-muted-foreground">Read-only access</span>
              )}
            </div>
            {/* 10 actions: 2-col and 5-col both divide evenly, so no orphaned trailing tile
                at any breakpoint (3-col left a lone tile stranded in its own row). */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {QUICK_ACTIONS.map(({ toolId, label, icon: Icon }) => {
                const recommended = recommendedToolIds.has(toolId);
                return (
                  <button
                    key={toolId}
                    onClick={() => onOpenWorkshopTool(toolId)}
                    disabled={isReadOnly}
                    title={isReadOnly ? "Your role has read-only access" : undefined}
                    className={`relative flex items-center gap-2.5 p-4 bg-card border rounded-sm transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                      recommended ? "border-primary/60 bg-primary/5" : "border-border/40 hover:border-primary/40"
                    }`}
                  >
                    <Icon size={16} className="text-primary shrink-0" />
                    <span className="text-sm font-body text-foreground">{label}</span>
                    {recommended && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* What-If Simulator — front and center as a proper card */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionReveal}
            data-coachmark="what-if-simulator"
            onClick={() => setWhatIfOpen(true)}
            className="w-full text-left bg-card/50 border border-primary/20 rounded-sm p-4 hover:border-primary/50 hover:bg-card transition-colors group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-display text-foreground">
                    What would it take to reach {nextMilestone}?
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {nextMilestone - Math.round(primary.total_score)} points away — drag real inputs and watch your score recompute live
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </div>
          </motion.button>
          {!isReadOnly && (
            <button
              onClick={() => setRerunOpen(true)}
              className="text-xs text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1.5"
            >
              Re-run my audit for a fresh score →
            </button>
          )}
          {rerunOpen && (
            <div className="mt-4">
              <MarketVisibilityScore />
            </div>
          )}
        </div>

        {/* Right column — Ongoing Endeavors. Deliberately quieter than the
            left column's analysis (softer border/background): secondary
            reference info, not the thing you came here to look at. */}
        <div className="space-y-6">
          <div className="bg-card/40 border border-border/30 rounded-sm p-4">
            <h2 className="font-display text-base text-foreground mb-4">Ongoing Endeavors</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm font-body">
                <span className="flex items-center gap-2 text-secondary-foreground/80">
                  <BookOpen className="w-3.5 h-3.5 text-primary" /> Guidebook
                </span>
                <button onClick={onOpenGuidebook} className="text-primary hover:text-gold-light text-xs">
                  {readChaptersCount}/{totalChapters} read
                </button>
              </div>

              <div className="flex items-center justify-between text-sm font-body">
                <span className="flex items-center gap-2 text-secondary-foreground/80">
                  <Gauge className="w-3.5 h-3.5 text-primary" /> Firm Maturity
                </span>
                <button onClick={onOpenMaturity} className="text-primary hover:text-gold-light text-xs">
                  {maturity ? `${maturity.score}% scored` : "Not run yet"}
                </button>
              </div>

              <div className="flex items-center justify-between text-sm font-body">
                <span className="flex items-center gap-2 text-secondary-foreground/80">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Battle Plan
                </span>
                <span className="text-xs text-muted-foreground">{battlePlanFilled}/7 sections ready</span>
              </div>
            </div>
          </div>

          <Campaigns market={primary.market} auditedDomain={primary.audited_domain} history={history} />

          <ClientWinLog market={primary.market} auditedDomain={primary.audited_domain} />

          <div className="bg-card/40 border border-border/30 rounded-sm p-4">
            <h2 className="font-display text-base text-foreground mb-4">Recent Workshop Activity</h2>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body">
                Nothing run yet — the Workshop's eleven tools are one click away.
              </p>
            ) : (
              <div className="space-y-3">
                {runs.slice(0, 5).map((run) => (
                  <button
                    key={run.id}
                    onClick={() => onOpenWorkshopTool(run.toolId)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-body text-muted-foreground">{run.toolLabel}</span>
                      <span className="text-[10px] font-body text-muted-foreground">{timeAgo(run.createdAt)}</span>
                    </div>
                    <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors truncate">
                      {run.title}
                    </p>
                    {run.preview && (
                      <p className="text-xs font-body text-secondary-foreground/60 truncate">{run.preview}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {siteHealthIssues.length > 0 && (
            <div className="bg-card border border-amber-500/30 rounded-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="eyebrow text-[10px] text-amber-500">Site health</span>
              </div>
              <ul className="space-y-1.5">
                {siteHealthIssues.map((issue) => (
                  <li key={issue} className="text-xs text-secondary-foreground/80 font-body">{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Share card preview dialog */}
      {sharePreviewOpen && shareCardUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSharePreviewOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={motionReveal}
            className="bg-card border border-border rounded-sm p-5 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-display text-foreground">Score card preview</span>
              <button onClick={() => setSharePreviewOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={shareCardUrl} alt="Visibility score card" className="w-full rounded-sm mb-5 border border-border/30" />
            <div className="space-y-3">
              {/* Social share row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    const score = Math.round(primary.total_score);
                    const firm = primary.display_name || primary.audited_domain;
                    const url = `${window.location.origin}/app/`;
                    const scoreLine = measured ? measuredScoreLabel(score, measured) : `${toScale500(score, 200)} / 500`;
                    const text = `${firm} scored ${scoreLine} on the Market Visibility Score — real, externally-verified data on legal market presence.`;
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`, "_blank", "width=600,height=500");
                  }}
                  className="flex flex-col items-center justify-center gap-1 bg-[#0A66C2] hover:bg-[#0958A8] text-white py-2.5 text-[11px] font-body rounded-sm transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </button>
                <button
                  onClick={() => {
                    const score = Math.round(primary.total_score);
                    const firm = primary.display_name || primary.audited_domain;
                    const url = `${window.location.origin}/app/`;
                    const scoreLine = measured ? measuredScoreLabel(score, measured) : `${toScale500(score, 200)} / 500`;
                    const text = `${firm} scored ${scoreLine} on the Market Visibility Score — real, externally-verified legal market data.\n\n${url}`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "width=600,height=500");
                  }}
                  className="flex flex-col items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 text-[11px] font-body rounded-sm transition-colors border border-zinc-700"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X / Twitter
                </button>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/app/`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Couldn't copy the link");
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1 bg-card border border-border hover:border-primary/40 py-2.5 text-[11px] font-body rounded-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <Copy className="w-3.5 h-3.5 flex-shrink-0" />}
                  {copiedLink ? "Copied!" : "Copy link"}
                </button>
              </div>
              {/* Download + dismiss */}
              <div className="flex gap-3">
                <button
                  onClick={() => { downloadScoreCard(primary); setSharePreviewOpen(false); }}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 text-sm font-body rounded-sm hover:bg-gold-light transition-colors font-medium"
                >
                  Download PNG
                </button>
                <button
                  onClick={() => setSharePreviewOpen(false)}
                  className="px-4 py-2 text-sm font-body text-muted-foreground hover:text-foreground border border-border rounded-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      <WhatIfSimulator open={whatIfOpen} onClose={() => setWhatIfOpen(false)} audit={primary} />
      <MilestoneCelebration
        open={!!milestone}
        celebrationKey={milestone?.id}
        headline={milestone ? (milestone.kind === "score" ? `${toScale500(milestone.value, 200)} / 500` : `Top ${100 - milestone.value}%`) : ""}
        body={
          milestone
            ? milestone.kind === "score"
              ? `Your Market Visibility Score just crossed ${toScale500(milestone.value, 200)} points — a first for this firm.`
              : `You're now better than ${milestone.value}% of your peer group — a first for this firm.`
            : ""
        }
        onDismiss={dismissMilestone}
      />
    </div>
  );
};

export default CommandCenter;
