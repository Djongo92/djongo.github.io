import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { BarChart3, CheckCircle2, XCircle, Newspaper, FileText as FileTextIcon, Download, Gauge, TrendingUp, ArrowRight } from "lucide-react";
import type {
  AuditRow, HistoryRow, ThoughtLeadershipItem,
  PerformanceRaw, SocialRaw, ThoughtLeadershipRaw, ReputationRaw,
} from "@/components/dashboard/CommandCenter";
import { CATEGORY_META, CATEGORY_ORDER, CATEGORY_COLOR_CLASSES, type CategoryKey } from "@/lib/visibilityCategories";
import { findWeakestCategoryTool } from "@/lib/categoryToolMap";
import { CategoryExplainer, ProvenanceBadge } from "@/components/visibility/Explainers";
import DisputeMetric, { type CorrectableMetric } from "@/components/visibility/DisputeMetric";
import ScoreRing from "@/components/visibility/ScoreRing";
import { useScoreGoals } from "@/hooks/useScoreGoals";
import { useAuth } from "@/hooks/useAuth";
import { useFirmTeam } from "@/hooks/useFirmTeam";
import { can } from "@/lib/roles";
import { exportCategoryPdf } from "@/lib/categoryPdf";
import { practiceAreaLabel } from "@/lib/practiceAreas";
import { DMV_MARKETS } from "@/lib/marketVisibilityConfig";
import { isDemoMode } from "@/lib/demoMode";
import type { PeerStats } from "../../../supabase/functions/_shared/percentileFormula";

interface AnalyticsProps {
  audits: AuditRow[];
  history: HistoryRow[];
  onOpenDashboard?: () => void;
  onCorrected?: () => void;
}

const HISTORY_KEY_FOR: Record<CategoryKey, keyof HistoryRow> = {
  performance: "performance_score",
  social: "social_score",
  seoAuthority: "seo_authority_score",
  thoughtLeadership: "thought_leadership_score",
  reputation: "reputation_score",
};

const SCORE_FIELD_FOR: Record<CategoryKey, keyof AuditRow> = {
  performance: "performance_score",
  social: "social_score",
  seoAuthority: "seo_authority_score",
  thoughtLeadership: "thought_leadership_score",
  reputation: "reputation_score",
};

const formatPct = (n: number) => `${Math.round(n * 100)}%`;

const Analytics = ({ audits, history, onOpenDashboard, onCorrected }: AnalyticsProps) => {
  const primary = audits[0];
  const { goals } = useScoreGoals();
  const { user } = useAuth();
  const { team } = useFirmTeam();
  const myRole = team?.members.find((m) => m.user_id === user?.id)?.role;
  // No firm yet (solo account) → the audit is unambiguously theirs, no role
  // nuance applies. In a firm, mirrors canEditFirmProfile — a read-only
  // executive or partner contributor can see the evidence but not dispute it.
  const canDispute = !!user && !isDemoMode() && (!team || can(myRole, "canEditFirmProfile"));

  const categories = useMemo(() => {
    if (!primary) return null;
    const out = {} as Record<CategoryKey, { score: number; provenance: string }>;
    for (const key of CATEGORY_ORDER) {
      out[key] = {
        score: Number(primary[SCORE_FIELD_FOR[key]] ?? 0),
        provenance: primary.provenance?.[key] ?? "missing",
      };
    }
    return out;
  }, [primary]);

  // Same findWeakestCategoryTool() the Key Insights feed and the sidebar's
  // "this week's move" use — ranked by absolute points recoverable, not
  // percentage (see categoryToolMap.ts), so this detail view can never
  // default-select a different category than what the rest of the app
  // calls the highest-leverage one.
  const weakestKey = useMemo(() => {
    const weakest = findWeakestCategoryTool(categories);
    return (weakest?.categoryKey as CategoryKey) ?? CATEGORY_ORDER[0];
  }, [categories]);

  const [selected, setSelected] = useState<CategoryKey>(weakestKey);

  const domainHistory = useMemo(
    () => (primary ? history.filter((h) => h.audited_domain === primary.audited_domain && h.market === primary.market) : []),
    [history, primary],
  );

  const categoryTrend = useMemo(() => {
    const field = HISTORY_KEY_FOR[selected];
    return domainHistory
      .filter((h) => h[field] !== undefined && h[field] !== null)
      .map((h) => ({
        date: new Date(h.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: Math.round(Number(h[field]) * 10) / 10,
      }));
  }, [domainHistory, selected]);

  if (!primary || !categories) {
    return (
      <div className="min-h-screen bg-background">
        <header className="max-w-4xl mx-auto px-6 pt-12 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">Analytics</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight mb-2">
            Nothing to drill into yet
          </h1>
          <p className="text-sm text-muted-foreground font-body max-w-md">
            Run your Market Visibility audit from the Dashboard first — Analytics unpacks every category's raw
            inputs, trend, and peer comparison once there's a score to work from.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 max-w-2xl">
            {[
              { n: 1, label: "Run the audit from the Dashboard", icon: Gauge },
              { n: 2, label: "Come back here once it's scored", icon: BarChart3 },
              { n: 3, label: "Drill into any category's raw inputs and trend", icon: TrendingUp },
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

          {onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className="inline-flex items-center gap-1.5 mt-8 text-sm text-primary hover:text-gold-light font-body"
            >
              Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </header>
      </div>
    );
  }

  const meta = CATEGORY_META[selected];
  const cat = categories[selected];
  const raw = primary.raw_metrics ?? {};

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">Analytics</span>
        </div>
        <h1 className="font-display text-4xl font-semibold text-foreground tracking-tight mb-2">
          {primary.display_name || primary.audited_domain}
        </h1>
        <p className="text-sm text-muted-foreground font-body max-w-lg">
          Every category, broken down to its raw inputs — not just the headline number.
        </p>
        {primary.confidence_score != null && (
          <p className="text-[11px] text-muted-foreground font-body mt-2">
            Methodology v{primary.methodology_version ?? 1} · {Math.round(primary.confidence_score * 100)}% of peer-normalized
            metrics met the minimum sample size{primary.sample_size != null ? ` (smallest sample: ${primary.sample_size} firms)` : ""}.
          </p>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-6">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_ORDER.map((key) => {
            const isActive = key === selected;
            const m = CATEGORY_META[key];
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`px-4 py-2 rounded-sm text-sm font-body border transition-colors ${
                  isActive
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Header card — the ring gives the selected category's score
                real hero weight; the right-column list below uses bars
                since those are for comparing all five at a glance. */}
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-foreground">{meta.label}</h2>
                  <CategoryExplainer categoryKey={selected} rawMetrics={raw as Record<string, unknown>} />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <ProvenanceBadge provenance={cat.provenance} />
                  <button
                    onClick={() => exportCategoryPdf({
                      firmName: primary.display_name || primary.audited_domain,
                      categoryKey: selected,
                      meta,
                      score: cat.score,
                      provenance: cat.provenance,
                      raw,
                    })}
                    className="inline-flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Download className="w-3 h-3" /> Export
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-5 mb-4">
                <ScoreRing
                  score={cat.score}
                  max={meta.max}
                  size={96}
                  strokeWidth={7}
                  colorClass={cat.provenance === "missing" ? "stroke-muted-foreground/30" : CATEGORY_COLOR_CLASSES[meta.color].stroke}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-secondary-foreground/80 font-body mb-1">{meta.what}</p>
                  {goals[selected] !== undefined && (
                    <p className="text-xs text-primary font-body">Target: {goals[selected]} / {meta.max}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-body">{meta.why}</p>
            </div>

            {/* Per-category trend */}
            {categoryTrend.length > 1 && (
              <div className="bg-card border border-border/50 rounded-sm p-5">
                <p className="text-xs text-muted-foreground font-body mb-3">{meta.label} over time</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={categoryTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, meta.max]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={30} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="score" stroke="rgb(16 185 129)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Category-specific raw breakdown */}
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <p className="text-xs text-muted-foreground font-body mb-4 uppercase tracking-wide">Raw inputs</p>

              {selected === "performance" && (
                <PerformanceBreakdown raw={raw.performance} auditId={canDispute ? primary.id : undefined} onCorrected={onCorrected} />
              )}
              {selected === "social" && (
                <SocialBreakdown raw={raw.social} auditId={canDispute ? primary.id : undefined} onCorrected={onCorrected} />
              )}
              {selected === "seoAuthority" && (
                <SeoBreakdown />
              )}
              {selected === "thoughtLeadership" && (
                <ThoughtLeadershipBreakdown raw={raw.thoughtLeadership} auditId={canDispute ? primary.id : undefined} onCorrected={onCorrected} />
              )}
              {selected === "reputation" && (
                <ReputationBreakdown raw={raw.reputation} market={primary.market} auditId={canDispute ? primary.id : undefined} onCorrected={onCorrected} />
              )}
            </div>
          </div>

          {/* Right column — quick category snapshot list */}
          <div className="space-y-3">
            {CATEGORY_ORDER.map((key) => {
              const c = categories[key];
              const m = CATEGORY_META[key];
              const pct = c.score / m.max;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`w-full text-left bg-card border rounded-sm p-4 transition-colors ${
                    key === selected ? "border-primary/40" : "border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-body text-foreground">{m.label}</span>
                    <span className="text-xs font-body text-muted-foreground">{formatPct(pct)}</span>
                  </div>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.provenance === "missing" ? "bg-muted-foreground/30" : CATEGORY_COLOR_CLASSES[m.color].bg}`}
                      style={{ width: `${Math.min(100, pct * 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between text-sm font-body py-1.5 border-b border-border/30 last:border-0">
    <span className="text-secondary-foreground/70">{label}</span>
    <span className="text-foreground">{value}</span>
  </div>
);

/**
 * The six values CLAUDE.md §2 requires for every peer-normalized metric —
 * this firm's raw value, the peer median, the 90th-percentile threshold
 * (full marks at or above this), the highest observed, the sample size, and
 * the comparison date — plus a low-confidence flag. This is the difference
 * between a number a managing partner argues with and one they can audit.
 */
const PeerStatsPanel = ({ label, stats }: { label: string; stats: PeerStats }) => (
  <div className="mt-2 mb-3 bg-secondary/30 rounded-sm px-3 py-2">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-body">{label} · peer comparison</span>
      {stats.lowConfidence && (
        <span className="text-[9px] tracking-[0.1em] uppercase text-amber-500 font-body">Low confidence — small sample</span>
      )}
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-body">
      <span className="text-secondary-foreground/70">Your value</span><span className="text-foreground text-right">{Math.round(stats.value * 100) / 100}</span>
      <span className="text-secondary-foreground/70">Peer median</span><span className="text-foreground text-right">{stats.peerMedian}</span>
      <span className="text-secondary-foreground/70">90th percentile</span><span className="text-foreground text-right">{stats.p90Threshold}</span>
      <span className="text-secondary-foreground/70">Highest observed</span><span className="text-foreground text-right">{stats.highestObserved}</span>
      <span className="text-secondary-foreground/70">Sample size</span><span className="text-foreground text-right">{stats.sampleSize}{stats.widened ? " (widened)" : ""}</span>
      <span className="text-secondary-foreground/70">Compared on</span><span className="text-foreground text-right">{new Date(stats.comparisonDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
    </div>
  </div>
);

const PerformanceBreakdown = ({ raw, auditId, onCorrected }: { raw?: PerformanceRaw; auditId?: string; onCorrected?: () => void }) => {
  if (!raw || !raw.desktop) {
    return <p className="text-sm text-muted-foreground font-body">Not scored yet — needs a PageSpeed Insights API key configured.</p>;
  }
  const metrics: CorrectableMetric[] = raw.mobile ? [
    { path: "performance.desktop.performance", label: "Desktop page speed", kind: "number", current: raw.desktop.performance },
    { path: "performance.desktop.accessibility", label: "Desktop accessibility", kind: "number", current: raw.desktop.accessibility },
    { path: "performance.desktop.seo", label: "Desktop technical SEO", kind: "number", current: raw.desktop.seo },
    { path: "performance.mobile.performance", label: "Mobile page speed", kind: "number", current: raw.mobile.performance },
    { path: "performance.mobile.accessibility", label: "Mobile accessibility", kind: "number", current: raw.mobile.accessibility },
    { path: "performance.mobile.seo", label: "Mobile technical SEO", kind: "number", current: raw.mobile.seo },
  ] : [];
  return (
    <div>
      <p className="text-xs text-muted-foreground font-body mb-2">Desktop</p>
      <Row label="Page speed" value={`${raw.desktop.performance}/100`} />
      <Row label="Accessibility" value={`${raw.desktop.accessibility}/100`} />
      <Row label="Technical SEO" value={`${raw.desktop.seo}/100`} />
      <p className="text-xs text-muted-foreground font-body mt-4 mb-2">Mobile</p>
      <Row label="Page speed" value={`${raw.mobile?.performance ?? "—"}/100`} />
      <Row label="Accessibility" value={`${raw.mobile?.accessibility ?? "—"}/100`} />
      <Row label="Technical SEO" value={`${raw.mobile?.seo ?? "—"}/100`} />
      {auditId && (
        <DisputeMetric category="performance" auditId={auditId} metrics={metrics} onSubmitted={() => onCorrected?.()} />
      )}
    </div>
  );
};

const SocialBreakdown = ({ raw, auditId, onCorrected }: { raw?: SocialRaw; auditId?: string; onCorrected?: () => void }) => {
  if (!raw || raw.followers === undefined) {
    return <p className="text-sm text-muted-foreground font-body">No social self-report submitted yet.</p>;
  }
  const platforms = raw.platforms ?? { linkedin: false, instagram: false, twitter: false, facebook: false };
  const metrics: CorrectableMetric[] = [
    { path: "social.followers", label: "LinkedIn followers", kind: "number", current: raw.followers ?? 0 },
    { path: "social.posts30d", label: "Posts (last 30 days)", kind: "number", current: raw.posts30d ?? 0 },
    ...(raw.engagementRate != null ? [{ path: "social.engagementRate", label: "Engagement rate", kind: "percent" as const, current: raw.engagementRate }] : []),
    { path: "social.platforms.linkedin", label: "LinkedIn presence", kind: "boolean", current: platforms.linkedin },
    { path: "social.platforms.instagram", label: "Instagram presence", kind: "boolean", current: platforms.instagram },
    { path: "social.platforms.twitter", label: "Twitter/X presence", kind: "boolean", current: platforms.twitter },
    { path: "social.platforms.facebook", label: "Facebook presence", kind: "boolean", current: platforms.facebook },
  ];
  return (
    <div>
      <Row label="LinkedIn followers" value={raw.followers ?? 0} />
      {raw.followersStats && <PeerStatsPanel label="Followers" stats={raw.followersStats} />}
      <Row label="Posts (last 30 days)" value={raw.posts30d ?? 0} />
      {raw.postsStats && <PeerStatsPanel label="Posts" stats={raw.postsStats} />}
      <Row label="Engagement rate" value={raw.engagementRate != null ? `${raw.engagementRate}%` : "Not supplied"} />
      {raw.erStats && <PeerStatsPanel label="Engagement rate" stats={raw.erStats} />}
      <p className="text-xs text-muted-foreground font-body mt-4 mb-2">Platform presence</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(platforms).map(([platform, present]) => (
          <div key={platform} className="flex items-center gap-2 text-sm font-body capitalize">
            {present ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className={present ? "text-foreground" : "text-muted-foreground"}>{platform}</span>
          </div>
        ))}
      </div>
      {auditId && (
        <DisputeMetric category="social" auditId={auditId} metrics={metrics} onSubmitted={() => onCorrected?.()} />
      )}
    </div>
  );
};

const SeoBreakdown = () => (
  <p className="text-sm text-muted-foreground font-body">
    Not configured — this category needs an Ahrefs or Moz API key, which is a paid subscription this build
    deliberately hasn't wired up sight-unseen. Performance, Reputation, and Thought Leadership score in full
    regardless.
  </p>
);

const ThoughtLeadershipBreakdown = ({ raw, auditId, onCorrected }: { raw?: ThoughtLeadershipRaw; auditId?: string; onCorrected?: () => void }) => {
  if (!raw || !raw.items) {
    return <p className="text-sm text-muted-foreground font-body">Not scored yet — needs ANTHROPIC_API_KEY configured.</p>;
  }
  const metrics: CorrectableMetric[] = [
    { path: "thoughtLeadership.postsCount", label: "Original posts (in window)", kind: "number", current: raw.postsCount ?? 0 },
    { path: "thoughtLeadership.newsCount", label: "News mentions (in window)", kind: "number", current: raw.newsCount ?? 0 },
    { path: "thoughtLeadership.bylinePct", label: "Byline rate", kind: "percent", current: Math.round((raw.bylinePct ?? 0) * 100) },
  ];
  return (
    <div>
      <Row label="Original posts (in window)" value={raw.postsCount ?? 0} />
      {raw.postsStats && <PeerStatsPanel label="Posts" stats={raw.postsStats} />}
      <Row label="News mentions (in window)" value={raw.newsCount ?? 0} />
      {raw.newsStats && <PeerStatsPanel label="News mentions" stats={raw.newsStats} />}
      <Row label="Byline rate" value={`${Math.round((raw.bylinePct ?? 0) * 100)}%`} />
      {raw.items.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground font-body mt-4 mb-2">Detected content</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {[...raw.items]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((item: ThoughtLeadershipItem, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm font-body py-1.5 border-b border-border/30 last:border-0">
                  {item.type === "news" ? (
                    <Newspaper className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <FileTextIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.date}{item.type === "blog" ? (item.hasNamedByline ? " · named byline" : " · no byline") : " · press mention"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
      {auditId && (
        <DisputeMetric category="thoughtLeadership" auditId={auditId} metrics={metrics} onSubmitted={() => onCorrected?.()} />
      )}
    </div>
  );
};

const ReputationBreakdown = ({ raw, market, auditId, onCorrected }: { raw?: ReputationRaw; market?: string; auditId?: string; onCorrected?: () => void }) => {
  if (!raw) return <p className="text-sm text-muted-foreground font-body">Not scored yet.</p>;

  const practiceAreaCodes = Array.from(new Set([
    ...Object.keys(raw.chambersRankedTables ?? {}),
    ...Object.keys(raw.legal500RankedTables ?? {}),
    ...Object.keys(raw.iflr1000RankedTables ?? {}),
  ])).sort();

  const marketConfig = market ? DMV_MARKETS[market] : undefined;
  const metrics: CorrectableMetric[] = [
    { path: "reputation.gbpListed", label: "Google Business Profile listed", kind: "boolean", current: raw.gbpListed ?? false },
    ...practiceAreaCodes.flatMap((code): CorrectableMetric[] => {
      const rows: CorrectableMetric[] = [];
      if (raw.chambersRankedTables?.[code] !== undefined) {
        rows.push({ path: `reputation.chambersRankedTables.${code}`, label: `Chambers ${practiceAreaLabel(code)} band`, kind: "rank", current: raw.chambersRankedTables[code], max: marketConfig?.chambers.deepestBand ?? 4 });
      }
      if (raw.legal500RankedTables?.[code] !== undefined) {
        rows.push({ path: `reputation.legal500RankedTables.${code}`, label: `Legal 500 ${practiceAreaLabel(code)} tier`, kind: "rank", current: raw.legal500RankedTables[code], max: marketConfig?.legal500.deepestTier ?? 4 });
      }
      if (raw.iflr1000RankedTables?.[code] !== undefined) {
        rows.push({ path: `reputation.iflr1000RankedTables.${code}`, label: `IFLR1000 ${practiceAreaLabel(code)} tier`, kind: "rank", current: raw.iflr1000RankedTables[code], max: marketConfig?.iflr1000.deepestTier ?? 3 });
      }
      return rows;
    }),
  ];

  return (
    <div>
      <Row label="Google Business Profile" value={raw.gbpListed ? "Listed" : "Not listed"} />
      {raw.matchedFirmName ? (
        <>
          <Row label="Matched directory entry" value={raw.matchedFirmName} />
          <p className="text-xs text-muted-foreground font-body mt-4 mb-2">Directory standing</p>
          {raw.chambers && <Row label="Chambers" value={`${Math.round(raw.chambers.points * 10) / 10} pts · ${raw.chambers.count} ranked tables`} />}
          {raw.chambers?.qualityStats && <PeerStatsPanel label="Chambers ranking depth" stats={raw.chambers.qualityStats} />}
          {raw.legal500 && <Row label="Legal 500" value={`${Math.round(raw.legal500.points * 10) / 10} pts · ${raw.legal500.count} ranked tables`} />}
          {raw.legal500?.qualityStats && <PeerStatsPanel label="Legal 500 ranking depth" stats={raw.legal500.qualityStats} />}
          {raw.iflr1000 && <Row label="IFLR1000" value={`${Math.round(raw.iflr1000.points * 10) / 10} pts · ${raw.iflr1000.count} ranked tables`} />}
          {raw.iflr1000?.qualityStats && <PeerStatsPanel label="IFLR1000 ranking depth" stats={raw.iflr1000.qualityStats} />}

          {practiceAreaCodes.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground font-body mt-4 mb-2">By practice area</p>
              <div className="space-y-1.5">
                {practiceAreaCodes.map((code) => (
                  <div key={code} className="flex items-center justify-between text-sm font-body py-1 border-b border-border/20 last:border-0">
                    <span className="text-secondary-foreground/70">{practiceAreaLabel(code)}</span>
                    <span className="text-foreground text-xs">
                      {raw.chambersRankedTables?.[code] && `Chambers Band ${raw.chambersRankedTables[code]}`}
                      {raw.chambersRankedTables?.[code] && raw.legal500RankedTables?.[code] && " · "}
                      {raw.legal500RankedTables?.[code] && `Legal 500 Tier ${raw.legal500RankedTables[code]}`}
                      {(raw.chambersRankedTables?.[code] || raw.legal500RankedTables?.[code]) && raw.iflr1000RankedTables?.[code] && " · "}
                      {raw.iflr1000RankedTables?.[code] && `IFLR1000 Tier ${raw.iflr1000RankedTables[code]}`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground font-body mt-2">
          No directory match found yet — your firm's been queued for a manual lookup pass.
        </p>
      )}
      {auditId && (
        <DisputeMetric category="reputation" auditId={auditId} metrics={metrics} onSubmitted={() => onCorrected?.()} />
      )}
    </div>
  );
};

export default Analytics;
