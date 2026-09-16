import React, { useMemo, useState } from 'react';
import { platformData, Company } from '@/data/platform';
import { FileBarChart2, Users, TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';
import { cn, parseEuro, fmtEuro } from '@/lib/utils';
import { commonMonthlyTrend } from '@/lib/analytics';
import { TrendChart } from '@/components/ui/trend-chart';
import { DataFreshness } from '@/components/ui/data-freshness';

type Dimension = 'all' | 'sector' | 'tier' | 'lifecycle' | 'manager';

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'all', label: 'All Members' },
  { key: 'sector', label: 'By Sector' },
  { key: 'tier', label: 'By Tier' },
  { key: 'lifecycle', label: 'By Lifecycle' },
  { key: 'manager', label: 'By Manager' },
];

const PERIODS = [
  { key: 3, label: 'Last 3 Months' },
  { key: 6, label: 'Last 6 Months' },
  { key: 12, label: 'Last 12 Months' },
  { key: 0, label: 'Full History' },
];

export function ReportsView() {
  const members: Company[] = platformData.allMembers;

  const [dimension, setDimension] = useState<Dimension>('all');
  const [value, setValue] = useState<string>('');
  const [periodMonths, setPeriodMonths] = useState<number>(12);

  const values = useMemo(() => {
    if (dimension === 'all') return [];
    return Array.from(new Set(members.map(c => String(c[dimension])))).sort();
  }, [dimension, members]);

  const effectiveValue = dimension === 'all' ? null : (value || values[0] || null);

  const scoped = dimension === 'all' || !effectiveValue
    ? members
    : members.filter(c => String(c[dimension]) === effectiveValue);

  const scopedTrend = useMemo(() => commonMonthlyTrend(scoped.length ? scoped : members), [scoped, members]);
  const scopedPeriod = periodMonths === 0 ? scopedTrend : scopedTrend.slice(-periodMonths);

  const avgScore = Math.round(scoped.reduce((s, c) => s + c.score, 0) / (scoped.length || 1));
  const scoreChange = scopedPeriod.length > 1 ? Math.round(scopedPeriod[scopedPeriod.length - 1].avgScore - scopedPeriod[0].avgScore) : 0;
  const atRisk = scoped.filter(c => c.lifecycle === 'at-risk');
  const atRiskValue = atRisk.reduce((s, c) => s + parseEuro(c.fee), 0);
  const avgEngagement = Math.round(scoped.reduce((s, c) => s + (c.history[c.history.length - 1]?.engagement || 0), 0) / (scoped.length || 1));

  const scopeLabel = dimension === 'all' ? 'All Members' : `${DIMENSIONS.find(d => d.key === dimension)?.label.replace('By ', '')}: ${effectiveValue}`;
  const periodLabel = PERIODS.find(p => p.key === periodMonths)?.label || '';

  return (
    <div className="max-w-6xl mx-auto font-sans pb-20">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2 flex items-center gap-3"><FileBarChart2 className="w-8 h-8 text-primary" /> Reports</h2>
          <p className="text-sm font-medium text-muted-foreground max-w-2xl mb-3">Generate a scoped membership report for any segment and time window, ready to print or share.</p>
          <DataFreshness />
        </div>
        <button onClick={() => window.print()} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 shrink-0">
          <FileBarChart2 className="w-4 h-4" /> Print Report
        </button>
      </div>

      <div className="mb-8 print:hidden flex flex-wrap gap-4 items-center bg-card border border-border rounded-[28px] p-4 shadow-sm">
        <div className="flex items-center gap-2 bg-muted p-1 rounded-2xl border border-border/50 shadow-inner">
          {DIMENSIONS.map(d => (
            <button
              key={d.key}
              onClick={() => { setDimension(d.key); setValue(''); }}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap", dimension === d.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {d.label}
            </button>
          ))}
        </div>
        {dimension !== 'all' && (
          <select value={effectiveValue || ''} onChange={e => setValue(e.target.value)} className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-bold outline-none cursor-pointer">
            {values.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-2xl border border-border/50 shadow-inner ml-auto">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodMonths(p.key)}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap", periodMonths === p.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block border-b-4 border-black pb-4 mb-8">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">AmCham Serbia · Membership Report</div>
        <h1 className="text-4xl font-serif font-light text-black">{scopeLabel}</h1>
        <div className="text-sm text-gray-600 mt-1">{periodLabel} · Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 print:grid print:grid-cols-4 print:gap-4">
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between print:border print:border-black print:rounded-none print:shadow-none">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 print:text-gray-600">Members</div>
            <div className="text-4xl font-serif font-light tabular-nums print:text-black">{scoped.length}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 print:hidden"><Users className="w-5 h-5" /></div>
        </div>
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between print:border print:border-black print:rounded-none print:shadow-none">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 print:text-gray-600">Avg Score</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-serif font-light tabular-nums print:text-black">{avgScore}</div>
              <span className={cn("text-xs font-bold flex items-center gap-0.5 print:text-gray-600", scoreChange >= 0 ? "text-emerald-600" : "text-destructive")}>
                {scoreChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{scoreChange >= 0 ? `+${scoreChange}` : scoreChange}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 print:hidden"><TrendingUp className="w-5 h-5" /></div>
        </div>
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between print:border print:border-black print:rounded-none print:shadow-none">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 print:text-gray-600">At-Risk</div>
            <div className="text-4xl font-serif font-light tabular-nums text-destructive print:text-black">{fmtEuro(atRiskValue)}</div>
            <div className="text-[10px] font-bold text-muted-foreground mt-0.5 print:text-gray-600">{atRisk.length} accounts</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0 print:hidden"><AlertTriangle className="w-5 h-5" /></div>
        </div>
        <div className="bg-foreground text-background rounded-[32px] border border-border p-6 shadow-lg flex items-center justify-between print:border print:border-black print:rounded-none print:shadow-none print:bg-white print:text-black">
          <div>
            <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1 print:text-gray-600">Avg Engagement</div>
            <div className="text-4xl font-serif font-light tabular-nums">{avgEngagement}%</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0 print:hidden"><Activity className="w-5 h-5" /></div>
        </div>
      </div>

      {scopedPeriod.length > 1 && (
        <div className="bg-card rounded-[32px] border border-border p-8 shadow-sm mb-8 print:border print:border-black print:rounded-none print:shadow-none print:break-inside-avoid">
          <h3 className="text-lg font-bold text-foreground mb-6 print:text-black">Score Trend — {periodLabel}</h3>
          <TrendChart data={scopedPeriod.map(t => ({ label: t.month, value: t.avgScore }))} className="text-primary print:text-black" />
        </div>
      )}

      <div className="bg-card rounded-[32px] border border-border p-8 shadow-sm print:border print:border-black print:rounded-none print:shadow-none print:break-inside-avoid">
        <h3 className="text-lg font-bold text-foreground mb-6 print:text-black">Member Detail ({scoped.length})</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border print:text-gray-600 print:border-black">
              <th className="text-left py-2 pr-2">Company</th>
              <th className="text-left py-2 pr-2 hidden sm:table-cell">Sector</th>
              <th className="text-left py-2 pr-2 hidden md:table-cell">Tier</th>
              <th className="text-left py-2 pr-2">Lifecycle</th>
              <th className="text-left py-2 pr-2 hidden lg:table-cell">Manager</th>
              <th className="text-right py-2 pr-2">Score</th>
              <th className="text-right py-2">Trend</th>
            </tr>
          </thead>
          <tbody>
            {scoped.slice().sort((a, b) => b.score - a.score).map(c => (
              <tr key={c.id} className="border-b border-border/50 print:border-gray-300">
                <td className="py-2 pr-2 font-bold text-foreground print:text-black">{c.name}</td>
                <td className="py-2 pr-2 text-muted-foreground hidden sm:table-cell print:text-gray-700 print:table-cell">{c.sector}</td>
                <td className="py-2 pr-2 text-muted-foreground hidden md:table-cell print:text-gray-700 print:table-cell">{c.tier}</td>
                <td className="py-2 pr-2 text-muted-foreground capitalize print:text-gray-700">{c.lifecycle}</td>
                <td className="py-2 pr-2 text-muted-foreground hidden lg:table-cell print:text-gray-700 print:table-cell">{c.manager}</td>
                <td className="py-2 pr-2 text-right font-serif tabular-nums print:text-black">{c.score}</td>
                <td className={cn("py-2 text-right font-bold tabular-nums print:text-gray-700", c.scoreTrend > 0 ? "text-emerald-600" : c.scoreTrend < 0 ? "text-destructive" : "text-muted-foreground")}>{c.scoreTrend > 0 ? `+${c.scoreTrend}` : c.scoreTrend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
