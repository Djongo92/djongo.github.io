import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import {
  ArrowRight, ShieldCheck, TrendingUp, TrendingDown, Sparkles, Hammer, AlertTriangle, CheckCircle2,
  Gauge, BookOpen, FileText,
} from "lucide-react";
import {
  SwipeIcon, CopywriterIcon, RewriteIcon, AutopsyIcon, AuditIcon,
  HeadlinesIcon, TeardownIcon, PitchDeckIcon, BioIcon, CalendarIcon,
} from "@/components/workshop/icons";
import { useCommandCenterInsights, type InsightAction } from "@/hooks/useCommandCenterInsights";
import { useWorkshopHistory } from "@/hooks/useWorkshopHistory";
import { useBattlePlanCache } from "@/hooks/useBattlePlanCache";
import { PEER_GROUPS } from "@/lib/marketVisibilityConfig";
import MarketVisibilityScore from "@/components/MarketVisibilityScore";
import type { WorkshopToolId } from "@/lib/handoff";
import { enableDemoMode } from "@/lib/demoMode";

const CATEGORY_LABELS: Record<string, { label: string; max: number }> = {
  performance: { label: "Performance", max: 20 },
  social: { label: "Social Media", max: 20 },
  seoAuthority: { label: "SEO & Authority", max: 60 },
  thoughtLeadership: { label: "Thought Leadership", max: 45 },
  reputation: { label: "Reputation", max: 55 },
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
    siteHealth?: {
      hasContactForm: boolean;
      copyrightYear: number | null;
      copyrightStale: boolean;
      brokenLinks: string[];
      checkedLinks: number;
    } | null;
  };
  updated_at: string;
}

export interface HistoryRow {
  audited_domain: string;
  market: string;
  total_score: number;
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
  onOpenWorkshop, onOpenWorkshopTool, onOpenGuidebook, onOpenMaturity,
}: CommandCenterProps) => {
  const [rerunOpen, setRerunOpen] = useState(false);
  const primary = audits[0];
  const { runs } = useWorkshopHistory();
  const { maturity, roast, headline, bio, roadmap, competitor, visibilityScore } = useBattlePlanCache();

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

  const insights = useCommandCenterInsights({
    categories, siteHealthIssues, maturity, implementationScore, readChaptersCount, totalChapters,
  });

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
              The Workshop's ten AI tools don't need an audit to be useful — draft copy, audit a page, generate a
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
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body">Command Center</span>
        </div>
        <h1 className="font-display text-4xl font-semibold text-foreground tracking-tight mb-2">
          {primary.display_name || primary.audited_domain}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-body">
          <span>
            <span className="text-foreground font-medium">{Math.round(primary.total_score)}</span> / 200 visibility score
          </span>
          {scoreDelta !== 0 && (
            <span className={`inline-flex items-center gap-1 ${scoreDelta > 0 ? "text-emerald-500" : "text-destructive"}`}>
              {scoreDelta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {scoreDelta > 0 ? "+" : ""}{scoreDelta} since first audit
            </span>
          )}
          <span>{peerGroupLabel} · {primary.market[0].toUpperCase() + primary.market.slice(1)}</span>
        </div>
      </header>

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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(categories).map(([key, cat], i) => {
              const meta = CATEGORY_LABELS[key];
              const pct = meta ? Math.min(100, (cat.score / meta.max) * 100) : 0;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-card border border-border/50 rounded-sm p-5"
                >
                  <p className="text-xs font-body text-foreground mb-2">{meta?.label ?? key}</p>
                  <div className="font-display text-2xl text-foreground font-semibold mb-2">
                    {Math.round(cat.score * 10) / 10}
                    <span className="text-sm text-muted-foreground"> / {meta?.max ?? "—"}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.provenance === "missing" ? "bg-muted-foreground/30" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Key Insights */}
          <div>
            <h2 className="font-display text-lg text-foreground mb-3">Key Insights</h2>
            <div className="space-y-3">
              {insights.map((insight) => {
                const style = TONE_STYLES[insight.tone];
                const Icon = style.icon;
                const action = resolveAction(insight.action);
                return (
                  <div key={insight.id} className={`bg-card border ${style.border} rounded-sm p-5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${style.text}`} />
                      <h3 className="font-display text-base text-foreground">{insight.title}</h3>
                    </div>
                    <p className="text-sm text-secondary-foreground/80 font-body mb-3">{insight.body}</p>
                    {action && (
                      <button onClick={action} className={`inline-flex items-center gap-1.5 text-sm font-body ${style.text} hover:opacity-80`}>
                        {insight.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
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
              {QUICK_ACTIONS.map(({ toolId, label, icon: Icon }) => (
                <button
                  key={toolId}
                  onClick={() => onOpenWorkshopTool(toolId)}
                  className="flex items-center gap-2.5 p-4 bg-card border border-border/40 rounded-sm hover:border-primary/40 transition-colors text-left"
                >
                  <Icon size={16} className="text-primary shrink-0" />
                  <span className="text-sm font-body text-foreground">{label}</span>
                </button>
              ))}
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

        {/* Right column — Ongoing Endeavors */}
        <div className="space-y-6">
          <div className="bg-card border border-border/50 rounded-sm p-5">
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

          <div className="bg-card border border-border/50 rounded-sm p-5">
            <h2 className="font-display text-base text-foreground mb-4">Recent Workshop Activity</h2>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body">
                Nothing run yet — the Workshop's ten tools are one click away.
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
