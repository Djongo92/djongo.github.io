import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import {
  ArrowRight, ShieldCheck, TrendingUp, TrendingDown, Sparkles, Hammer, AlertTriangle, CheckCircle2,
  Gauge, BookOpen, FileText, Share2,
} from "lucide-react";
import {
  SwipeIcon, CopywriterIcon, RewriteIcon, AutopsyIcon, AuditIcon,
  HeadlinesIcon, TeardownIcon, PitchDeckIcon, BioIcon, CalendarIcon,
} from "@/components/workshop/icons";
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
import PeerPositionBar from "@/components/visibility/PeerPositionBar";
import MarketVisibilityScore from "@/components/MarketVisibilityScore";
import type { WorkshopToolId } from "@/lib/handoff";
import { enableDemoMode } from "@/lib/demoMode";
import { downloadScoreCard } from "@/lib/visibilityScoreCard";

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

const QUICK_ACTIONS: { toolId: WorkshopToolId; label: string; icon: (p: { size?: number }) => JSX.Element }[] = [
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
  bylinePct?: number;
  items?: ThoughtLeadershipItem[];
  pressMentions?: PressMention[];
}

export interface ReputationRaw {
  gbpListed?: boolean;
  matchedFirmName?: string;
  matchedFirmDomain?: string | null;
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
  const primary = audits[0];
  const { runs } = useWorkshopHistory();
  const { maturity, roast, headline, bio, roadmap, competitor, visibilityScore } = useBattlePlanCache();
  const { goals } = useScoreGoals();

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
        { ...cat, max: CATEGORY_LABELS[key]?.max ?? 0 },
      ]),
    );
  }, [categories]);

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
      }));
  }, [history, primary]);

  const scoreDelta = trend.length > 1 ? trend[trend.length - 1].score - trend[0].score : 0;

  // A new personal best (strictly higher than every prior recorded score,
  // never just a plateau) gets a one-shot celebration on the ring — not on
  // every visit, only the first render after it actually happened.
  const isPersonalBest = useMemo(() => {
    if (trend.length < 2) return false;
    const priorMax = Math.max(...trend.slice(0, -1).map((t) => t.score));
    return trend[trend.length - 1].score > priorMax;
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

  const categoryDeltas = useMemo(() => {
    if (!primary) return null;
    const ownHistory = history
      .filter((h) => h.audited_domain === primary.audited_domain && h.market === primary.market)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    if (ownHistory.length < 2) return null;
    const previous = ownHistory[ownHistory.length - 2];
    const latest = ownHistory[ownHistory.length - 1];
    const deltas = CATEGORY_ORDER.map((key) => {
      const field = HISTORY_FIELD_FOR[key];
      const prevScore = Number(previous[field] ?? 0);
      const latestScore = Number(latest[field] ?? 0);
      return { key, delta: Math.round((latestScore - prevScore) * 10) / 10 };
    }).filter((d) => Math.abs(d.delta) >= 0.1);
    return { deltas, recordedAt: latest.recorded_at };
  }, [history, primary]);

  const insights = useCommandCenterInsights({
    categories, siteHealthIssues, maturity, implementationScore, readChaptersCount, totalChapters,
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
    if (action.kind === "workshop") return () => onOpenWorkshopTool(action.toolId);
    if (action.kind === "guidebook") return onOpenGuidebook;
    if (action.kind === "maturity") return onOpenMaturity;
    return undefined;
  };

  const battlePlanSlots = [roast, competitor, roadmap, maturity, headline, bio, visibilityScore];
  const battlePlanFilled = battlePlanSlots.filter(Boolean).length;

  if (!primary || !categories) {
    return (
      <div className="min-h-screen bg-background">
        <header className="max-w-4xl mx-auto px-6 pt-12 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body">Market Visibility</span>
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
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">In the meantime</span>
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
              <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body">Command Center</span>
            </div>
            <h1 className="font-display text-4xl font-semibold text-foreground tracking-tight mb-2">
              {primary.display_name || primary.audited_domain}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-body">
              {scoreDelta !== 0 && (
                <span className={`inline-flex items-center gap-1 ${scoreDelta > 0 ? "text-emerald-500" : "text-destructive"}`}>
                  {scoreDelta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {scoreDelta > 0 ? "+" : ""}{scoreDelta} since first audit
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
              <ScoreRing score={primary.total_score} max={200} size={132} sublabel="Visibility Score" />
              {isPersonalBest && <ScoreBurst />}
            </div>
            <button
              onClick={() => downloadScoreCard(primary)}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary font-body tap-scale"
            >
              <Share2 className="w-3 h-3" /> Share score card
            </button>
          </div>
        </div>
      </header>

      {brief && (
        <div className="max-w-5xl mx-auto px-6 mb-6">
          <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">Strategy Brief</span>
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
              <p className="text-xs text-muted-foreground font-body mb-3">Score over time</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 200]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={30} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="score" stroke="rgb(16 185 129)" strokeWidth={2} dot={{ r: 3 }} />
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORY_ORDER.map((key, i) => {
              const cat = categories[key];
              const meta = CATEGORY_LABELS[key];
              const pct = meta ? Math.min(100, (cat.score / meta.max) * 100) : 0;
              const colors = CATEGORY_COLOR_CLASSES[meta.color];
              const series = categoryTrend?.[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-card border border-border/50 rounded-sm p-5"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-body text-foreground">{meta?.label ?? key}</p>
                    <CategoryExplainer categoryKey={key} />
                  </div>
                  <div className="flex items-end justify-between gap-2 mb-2">
                    <div className="font-display text-2xl text-foreground font-semibold">
                      {Math.round(cat.score * 10) / 10}
                      <span className="text-sm text-muted-foreground"> / {meta?.max ?? "—"}</span>
                    </div>
                    {series && series.length > 1 && (
                      <Sparkline values={series} colorClass={colors.stroke} />
                    )}
                  </div>
                  <div className="relative w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${cat.provenance === "missing" ? "bg-muted-foreground/30" : colors.bg}`}
                      style={{ width: `${pct}%` }}
                    />
                    {goals[key] !== undefined && meta && (
                      <div className="absolute top-0 h-full w-0.5 bg-primary" style={{ left: `${Math.min(100, (goals[key]! / meta.max) * 100)}%` }} />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <ProvenanceBadge provenance={cat.provenance} />
                    {goals[key] !== undefined && (
                      <span className="text-[10px] text-primary font-body">Target {goals[key]}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            onClick={onOpenAnalytics}
            className="text-xs text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1.5 -mt-2"
          >
            Explore the full breakdown in Analytics <ArrowRight className="w-3 h-3" />
          </button>

          {/* Key Insights */}
          <div>
            <h2 className="font-display text-lg text-foreground mb-3">Key Insights</h2>
            <div className="space-y-2">
              {insights.map((insight) => {
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

          {/* Quick Actions */}
          <div>
            <h2 className="font-display text-lg text-foreground mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map(({ toolId, label, icon: Icon }) => {
                const recommended = recommendedToolIds.has(toolId);
                return (
                  <button
                    key={toolId}
                    onClick={() => onOpenWorkshopTool(toolId)}
                    className={`relative flex items-center gap-2.5 p-4 bg-card border rounded-sm transition-colors text-left ${
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

          <div>
            <button
              onClick={() => setRerunOpen(true)}
              className="text-xs text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1.5"
            >
              Re-run my audit for a fresh score →
            </button>
            {rerunOpen && (
              <div className="mt-4">
                <MarketVisibilityScore />
              </div>
            )}
          </div>
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
                <span className="text-[10px] tracking-[0.2em] uppercase text-amber-500 font-body">Site health</span>
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
    </div>
  );
};

export default CommandCenter;
