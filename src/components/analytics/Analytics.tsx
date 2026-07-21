import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { BarChart3, CheckCircle2, XCircle, Newspaper, FileText as FileTextIcon, Download } from "lucide-react";
import type {
  AuditRow, HistoryRow, ThoughtLeadershipItem,
  PerformanceRaw, SocialRaw, ThoughtLeadershipRaw, ReputationRaw,
} from "@/components/dashboard/CommandCenter";
import { CATEGORY_META, CATEGORY_ORDER, type CategoryKey } from "@/lib/visibilityCategories";
import { CategoryExplainer, ProvenanceBadge } from "@/components/visibility/Explainers";
import ScoreRing from "@/components/visibility/ScoreRing";
import { useScoreGoals } from "@/hooks/useScoreGoals";
import { exportCategoryPdf } from "@/lib/categoryPdf";
import { practiceAreaLabel } from "@/lib/practiceAreas";

interface AnalyticsProps {
  audits: AuditRow[];
  history: HistoryRow[];
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

const Analytics = ({ audits, history }: AnalyticsProps) => {
  const primary = audits[0];
  const { goals } = useScoreGoals();

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

  const weakestKey = useMemo(() => {
    if (!categories) return CATEGORY_ORDER[0];
    let weakest: CategoryKey = CATEGORY_ORDER[0];
    let weakestPct = Infinity;
    for (const key of CATEGORY_ORDER) {
      const cat = categories[key];
      if (cat.provenance === "missing") continue;
      const pct = cat.score / CATEGORY_META[key].max;
      if (pct < weakestPct) {
        weakestPct = pct;
        weakest = key;
      }
    }
    return weakest;
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
                  <CategoryExplainer categoryKey={selected} />
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
                  colorClass={cat.provenance === "missing" ? "stroke-muted-foreground/30" : "stroke-emerald-500"}
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
                <PerformanceBreakdown raw={raw.performance} />
              )}
              {selected === "social" && (
                <SocialBreakdown raw={raw.social} />
              )}
              {selected === "seoAuthority" && (
                <SeoBreakdown />
              )}
              {selected === "thoughtLeadership" && (
                <ThoughtLeadershipBreakdown raw={raw.thoughtLeadership} />
              )}
              {selected === "reputation" && (
                <ReputationBreakdown raw={raw.reputation} />
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
                      className={`h-full rounded-full ${c.provenance === "missing" ? "bg-muted-foreground/30" : "bg-emerald-500"}`}
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

const PerformanceBreakdown = ({ raw }: { raw?: PerformanceRaw }) => {
  if (!raw || !raw.desktop) {
    return <p className="text-sm text-muted-foreground font-body">Not scored yet — needs a PageSpeed Insights API key configured.</p>;
  }
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
    </div>
  );
};

const SocialBreakdown = ({ raw }: { raw?: SocialRaw }) => {
  if (!raw || raw.followers === undefined) {
    return <p className="text-sm text-muted-foreground font-body">No social self-report submitted yet.</p>;
  }
  const platforms = raw.platforms ?? { linkedin: false, instagram: false, twitter: false, facebook: false };
  return (
    <div>
      <Row label="LinkedIn followers" value={raw.followers ?? 0} />
      <Row label="Posts (last 30 days)" value={raw.posts30d ?? 0} />
      <Row label="Engagement rate" value={raw.engagementRate != null ? `${raw.engagementRate}%` : "Not supplied"} />
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

const ThoughtLeadershipBreakdown = ({ raw }: { raw?: ThoughtLeadershipRaw }) => {
  if (!raw || !raw.items) {
    return <p className="text-sm text-muted-foreground font-body">Not scored yet — needs ANTHROPIC_API_KEY configured.</p>;
  }
  return (
    <div>
      <Row label="Original posts (in window)" value={raw.postsCount ?? 0} />
      <Row label="News mentions (in window)" value={raw.newsCount ?? 0} />
      <Row label="Byline rate" value={`${Math.round(raw.bylinePct ?? 0)}%`} />
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
    </div>
  );
};

const ReputationBreakdown = ({ raw }: { raw?: ReputationRaw }) => {
  if (!raw) return <p className="text-sm text-muted-foreground font-body">Not scored yet.</p>;

  const practiceAreaCodes = Array.from(new Set([
    ...Object.keys(raw.chambersRankedTables ?? {}),
    ...Object.keys(raw.legal500RankedTables ?? {}),
    ...Object.keys(raw.iflr1000RankedTables ?? {}),
  ])).sort();

  return (
    <div>
      <Row label="Google Business Profile" value={raw.gbpListed ? "Listed" : "Not listed"} />
      {raw.matchedFirmName ? (
        <>
          <Row label="Matched directory entry" value={raw.matchedFirmName} />
          <p className="text-xs text-muted-foreground font-body mt-4 mb-2">Directory standing</p>
          {raw.chambers && <Row label="Chambers" value={`${Math.round(raw.chambers.points * 10) / 10} pts · ${raw.chambers.count} ranked tables`} />}
          {raw.legal500 && <Row label="Legal 500" value={`${Math.round(raw.legal500.points * 10) / 10} pts · ${raw.legal500.count} ranked tables`} />}
          {raw.iflr1000 && <Row label="IFLR1000" value={`${Math.round(raw.iflr1000.points * 10) / 10} pts · ${raw.iflr1000.count} ranked tables`} />}

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
    </div>
  );
};

export default Analytics;
