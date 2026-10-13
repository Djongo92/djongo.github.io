import React, { useMemo, useState } from 'react';
import { platformData, Company } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Users, AlertTriangle, Activity, Layers, ArrowRight, X } from 'lucide-react';
import { cn, parseEuro, fmtEuro } from '@/lib/utils';
import { commonMonthlyTrend, segmentBreakdown, cohortsByJoinYear, groupMonthlyAverage } from '@/lib/analytics';
import { TrendChart } from '@/components/ui/trend-chart';
import { SplitTrendChart } from '@/components/ui/split-trend-chart';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { DataFreshness } from '@/components/ui/data-freshness';

const SEGMENTS = [
  { key: 'sector', label: 'Sector' },
  { key: 'tier', label: 'Tier' },
  { key: 'lifecycle', label: 'Lifecycle' },
] as const;

const LIFECYCLE_COLOR: Record<string, string> = {
  active: 'bg-emerald-500',
  renewing: 'bg-amber-500',
  'at-risk': 'bg-destructive',
  onboarding: 'bg-accent',
};

export function AnalyticsView({ navigateTo }: { navigateTo: (v: string, c?: string) => void }) {
  const [tab, setTab] = useState<'overview' | 'cohorts'>('overview');
  const [segmentBy, setSegmentBy] = useState<'sector' | 'tier' | 'lifecycle'>('sector');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  const members: Company[] = platformData.allMembers;

  const trend = useMemo(() => commonMonthlyTrend(members), [members]);
  const segments = useMemo(() => segmentBreakdown(members, segmentBy), [members, segmentBy]);
  const cohorts = useMemo(() => cohortsByJoinYear(members), [members]);

  const latest = trend[trend.length - 1];
  const yearAgoIdx = trend.length - 13;
  const yearAgo = yearAgoIdx >= 0 ? trend[yearAgoIdx] : trend[0];
  const scoreDelta = Math.round(latest.avgScore - yearAgo.avgScore);

  const atRiskCompanies = members.filter(c => c.lifecycle === 'at-risk');
  const atRiskValue = atRiskCompanies.reduce((sum, c) => sum + parseEuro(c.fee), 0);

  // The flat book average is the headline problem, not the headline: it hides
  // engaged accounts rising while at-risk accounts fall. Show both under it.
  const split = useMemo(() => {
    const months = trend.map(t => t.month);
    const engagedCompanies = members.filter(c => c.lifecycle === 'active');
    const engaged = groupMonthlyAverage(engagedCompanies, months);
    const atRisk = groupMonthlyAverage(members.filter(c => c.lifecycle === 'at-risk'), months);
    const crossIdx = engaged.findIndex((v, i) => i > 0 && v >= atRisk[i] && engaged[i - 1] < atRisk[i - 1]);
    const last = months.length - 1;
    return {
      months,
      engaged,
      atRisk,
      book: trend.map(t => t.avgScore),
      crossIdx,
      engagedCount: engagedCompanies.length,
      engagedDelta: Math.round(engaged[last] - engaged[0]),
      atRiskDelta: Math.round(atRisk[last] - atRisk[0]),
      atRiskStartedAhead: atRisk[0] > engaged[0],
      gap: Math.round(engaged[last] - atRisk[last]),
    };
  }, [members, trend]);

  const maxSegmentCount = Math.max(...segments.map(s => s.count));
  const drillDown = (selectedSegment ? members.filter(c => String(c[segmentBy]) === selectedSegment) : members)
    .slice()
    .sort((a, b) => b.score - a.score);

  const maxCohortCount = Math.max(...cohorts.map(c => c.count));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2 flex items-center gap-3"><BarChart3 className="w-8 h-8 text-primary" /> Analytics</h2>
          <p className="text-sm font-medium text-muted-foreground max-w-2xl mb-3">Membership health trends and drill-down across the full book — {members.length} companies, {trend.length} months of comparable history.</p>
          <DataFreshness />
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-2xl border border-border/50 shadow-inner">
          {(['overview', 'cohorts'] as const).map(id => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn("px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors", tab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {id === 'overview' ? 'Overview' : 'Cohorts & Engagement'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Members</div>
            <div className="text-4xl font-serif font-light tabular-nums"><AnimatedCounter value={members.length} /></div>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><Users className="w-5 h-5" /></div>
        </div>
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Book Avg Score</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-serif font-light tabular-nums"><AnimatedCounter value={Math.round(latest.avgScore)} /></div>
              <span className={cn("text-xs font-bold flex items-center gap-0.5", scoreDelta > 0 ? "text-emerald-600" : scoreDelta < 0 ? "text-destructive" : "text-muted-foreground")}>
                {scoreDelta > 0 ? <TrendingUp className="w-3 h-3" /> : scoreDelta < 0 ? <TrendingDown className="w-3 h-3" /> : null}{scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta < 0 ? scoreDelta : 'flat YoY'}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><TrendingUp className="w-5 h-5" /></div>
        </div>
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">At-Risk Exposure</div>
            <div className="text-4xl font-serif font-light tabular-nums text-destructive"><AnimatedCounter value={fmtEuro(atRiskValue)} /></div>
            <div className="text-[11px] font-bold text-muted-foreground mt-0.5">{atRiskCompanies.length} accounts</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0"><AlertTriangle className="w-5 h-5" /></div>
        </div>
        <div className="ink bg-foreground text-background rounded-[32px] border border-border p-6 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-accent uppercase tracking-widest mb-1">Avg Engagement</div>
            <div className="text-4xl font-serif font-light tabular-nums"><AnimatedCounter value={Math.round(latest.avgEngagement)} />%</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0"><Activity className="w-5 h-5" /></div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' ? (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">
            <div className="bg-card rounded-[32px] border border-border p-6 md:p-8 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                <div className="max-w-2xl">
                  <div className="text-[11px] font-bold text-primary uppercase tracking-widest mb-2">Score over time · {trend[0].month} → {latest.month}</div>
                  <h3 className="text-2xl md:text-3xl font-serif text-foreground mb-2 text-balance">The average hides a split</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The membership average barely moved ({Math.round(split.book[0])} → {Math.round(latest.avgScore)}). Underneath it, the {split.engagedCount} engaged accounts gained {split.engagedDelta} points
                    while the {atRiskCompanies.length} at-risk accounts lost {Math.abs(split.atRiskDelta)}
                    {split.atRiskStartedAhead ? <> — and in {trend[0].month} they were the strongest group in the membership.</> : '.'}
                  </p>
                </div>
                <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-right">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-destructive">Gap today</div>
                  <div className="text-3xl font-serif tabular-nums text-foreground">{split.gap} pts</div>
                </div>
              </div>
              <SplitTrendChart
                labels={split.months}
                series={[
                  { key: 'engaged', label: 'Engaged', values: split.engaged, color: 'var(--chart-engaged)' },
                  { key: 'at-risk', label: 'At-risk', values: split.atRisk, color: 'var(--chart-at-risk)' },
                  { key: 'book', label: 'Book avg', values: split.book, color: '', reference: true },
                ]}
                marker={split.crossIdx > 0 ? { index: split.crossIdx, text: `Lines cross · ${split.months[split.crossIdx]}` } : undefined}
              />
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-2"><span className="w-4 h-0.5 rounded-full" style={{ background: 'var(--chart-engaged)' }} />Engaged accounts ({split.engagedCount})</span>
                <span className="flex items-center gap-2"><span className="w-4 h-0.5 rounded-full" style={{ background: 'var(--chart-at-risk)' }} />At-risk accounts ({atRiskCompanies.length})</span>
                <span className="flex items-center gap-2"><span className="w-4 border-t border-dashed border-muted-foreground" />Book average — what a spreadsheet shows</span>
              </div>
            </div>

            <div className="bg-card rounded-[32px] border border-border p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Layers className="w-4 h-4 text-muted-foreground" /> Segment Breakdown</h3>
                <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border/50">
                  {SEGMENTS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => { setSegmentBy(s.key); setSelectedSegment(null); }}
                      className={cn("px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors", segmentBy === s.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2.5">
                {segments.map(seg => (
                  <button
                    key={seg.key}
                    onClick={() => setSelectedSegment(prev => prev === seg.key ? null : seg.key)}
                    aria-label={`Filter by ${seg.key}`}
                    aria-pressed={selectedSegment === seg.key}
                    className={cn(
                      "w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left",
                      selectedSegment === seg.key ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    <span className="w-32 shrink-0 text-sm font-bold text-foreground truncate">{seg.key}</span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(seg.count / maxSegmentCount) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-muted-foreground">{seg.count}</span>
                    <span className="w-12 shrink-0 text-right text-sm font-serif tabular-nums">{seg.avgScore}</span>
                    {seg.atRisk > 0 && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{seg.atRisk} at-risk</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-8 mt-4 pt-4 border-t border-border/50 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Bar = share of members</span>
                <span>Right column = avg score</span>
              </div>
            </div>

            <div className="bg-card rounded-[32px] border border-border p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">
                  {selectedSegment ? <>Companies in <span className="text-primary">{selectedSegment}</span></> : 'All Companies'}
                  <span className="ml-2 text-xs font-bold text-muted-foreground">({drillDown.length})</span>
                </h3>
                {selectedSegment && (
                  <button onClick={() => setSelectedSegment(null)} className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3 h-3" /> Clear filter
                  </button>
                )}
              </div>
              <div className="max-h-[420px] overflow-y-auto space-y-1 -mx-2 px-2">
                {drillDown.map(c => (
                  <button key={c.id} onClick={() => navigateTo('analytics', c.id)} aria-label={`Open dossier for ${c.name}`} className="w-full flex items-center gap-4 py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors text-left group">
                    <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex-1 truncate">{c.name}</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-24 shrink-0 hidden sm:block">{c.sector}</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-20 shrink-0 hidden md:block">{c.tier}</span>
                    <span className="text-xs font-bold text-muted-foreground w-28 shrink-0 hidden lg:block truncate">{c.manager}</span>
                    <span className="font-serif text-lg tabular-nums w-10 shrink-0 text-right">{c.score}</span>
                    <span className={cn("text-[11px] font-bold w-10 shrink-0 text-right", c.scoreTrend > 0 ? "text-emerald-600" : c.scoreTrend < 0 ? "text-destructive" : "text-muted-foreground")}>{c.scoreTrend > 0 ? `+${c.scoreTrend}` : c.scoreTrend}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="cohorts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">
            <div className="bg-card rounded-[32px] border border-border p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Average Engagement Over Time</h3>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{trend[0].month} → {latest.month}</span>
              </div>
              <TrendChart data={trend.map(t => ({ label: t.month, value: t.avgEngagement }))} className="text-accent" formatValue={(v) => `${Math.round(v)}%`} />
            </div>

            <div className="bg-card rounded-[32px] border border-border p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Membership Cohorts by Join Year</h3>
                <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Active</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Renewing</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" />At-Risk</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" />Onboarding</span>
                </div>
              </div>
              <div className="space-y-3">
                {cohorts.map(c => (
                  <div key={c.year} className="flex items-center gap-4">
                    <span className="w-14 shrink-0 font-serif text-lg tabular-nums text-foreground">{c.year}</span>
                    <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden flex" style={{ opacity: c.count / maxCohortCount * 0.6 + 0.4 }}>
                      {(['active', 'renewing', 'at-risk', 'onboarding'] as const).map(lc => {
                        const n = (c as any)[lc === 'at-risk' ? 'atRisk' : lc];
                        return n > 0 ? <div key={lc} className={LIFECYCLE_COLOR[lc]} style={{ width: `${(n / c.count) * 100}%` }} /> : null;
                      })}
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-muted-foreground">{c.count}</span>
                    <span className="w-12 shrink-0 text-right text-sm font-serif tabular-nums">{c.avgScore}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/80 mt-6 pt-4 border-t border-border/50">Bar opacity scales with cohort size ({Math.min(...cohorts.map(c => c.count))}–{maxCohortCount} members); segments show each cohort's current lifecycle mix.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
