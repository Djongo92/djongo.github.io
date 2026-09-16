import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ShieldAlert, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Users, BarChart3, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIER_SPLIT = { events: [0.5736, 0.3208, 0.1057], intros: [0.4433, 0.5567], marketplace: [0.4167, 0.5833] };

export function BoardSummaryView() {
  const { t } = useI18n();
  const quarters = Object.keys((platformData.console as any).rollup);
  const [quarter, setQuarter] = useState('Q3 2026');
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ wins: true, risks: true });

  const data = (platformData.console as any).rollup[quarter];

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const breakdowns = {
    events: [
      { label: "Patron Tier", value: Math.round(data.kpis.events * TIER_SPLIT.events[0]), color: "bg-primary" },
      { label: "Corporate Tier", value: Math.round(data.kpis.events * TIER_SPLIT.events[1]), color: "bg-blue-500" },
      { label: "Business Tier", value: Math.round(data.kpis.events * TIER_SPLIT.events[2]), color: "bg-orange-400" },
    ],
    intros: [
      { label: "C-Level to C-Level", value: Math.round(data.kpis.intros * TIER_SPLIT.intros[0]), color: "bg-emerald-500" },
      { label: "B2B Ops Match", value: Math.round(data.kpis.intros * TIER_SPLIT.intros[1]), color: "bg-primary" },
    ],
    marketplace: [
      { label: "Real Estate/Assets", value: Math.round(data.kpis.marketplace * TIER_SPLIT.marketplace[0]), color: "bg-orange-500" },
      { label: "Services/Offers", value: Math.round(data.kpis.marketplace * TIER_SPLIT.marketplace[1]), color: "bg-blue-500" },
    ]
  };

  return (
    <div className="max-w-6xl mx-auto font-sans pb-20">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-foreground mb-2">{t('platform.console.nav_board_summary', 'Board Summary')}</h2>
          <p className="text-sm font-medium text-muted-foreground">{t('platform.console.board_summary_purpose', 'Decision-grade leadership view.')}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="bg-muted p-1 rounded-full flex gap-1 shadow-inner overflow-x-auto max-w-full">
            {quarters.map(q => (
              <button key={q} onClick={() => setQuarter(q)} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap", quarter === q ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{q.replace(' (Forecast)', ' (Fcst)')}</button>
            ))}
          </div>
          <button onClick={() => window.print()} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95">
            <FileText className="w-4 h-4" /> {t('platform.console.print_rollup', 'Print Report')}
          </button>
        </div>
      </div>

      {data.isForecast && (
        <div className="mb-8 print:mb-4 px-6 py-4 rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 flex items-center gap-3 text-sm">
          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 text-[10px] font-bold uppercase tracking-widest shrink-0">Forecast</span>
          <span className="text-muted-foreground font-medium print:text-gray-700">{data.methodology} Figures below are projected, not measured.</span>
        </div>
      )}

      {/* Print Header */}
      <div className="hidden print:block border-b-4 border-black pb-4 mb-8">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">AmCham Serbia{data.isForecast ? ' · Forecast — Not Measured Data' : ''}</div>
        <h1 className="text-4xl font-serif font-light text-black">Board Summary — {quarter}</h1>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={quarter}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:space-y-8"
        >
          {/* Top Level KPIs */}
          <div className="bg-card rounded-[40px] border border-border p-10 md:p-14 shadow-sm flex flex-col justify-center print:border-none print:shadow-none print:p-0">
             <div className="flex justify-between items-start mb-8">
               <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest print:text-black">{t('platform.console.health_trend', 'Member Health Trend')}</div>
               <div className="flex items-center gap-1 text-xs font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full"><TrendingUp className="w-3 h-3"/> {data.healthTrend.delta} pts</div>
             </div>
             <div className="text-7xl md:text-9xl font-serif font-light tabular-nums tracking-tight mb-10 text-foreground print:text-black">
               {data.healthTrend.scoreBands.high + data.healthTrend.scoreBands.mid}<span className="text-4xl md:text-6xl text-muted-foreground">%</span>
             </div>
             
             <div className="space-y-2">
               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 <span>High ({data.healthTrend.scoreBands.high}%)</span>
                 <span>Mid ({data.healthTrend.scoreBands.mid}%)</span>
                 <span>Low ({data.healthTrend.scoreBands.low}%)</span>
               </div>
               <div className="flex gap-1 h-4 rounded-full overflow-hidden w-full print:border print:border-black">
                  <div style={{ width: `${data.healthTrend.scoreBands.high}%` }} className="h-full bg-emerald-500 print:bg-gray-300"></div>
                  <div style={{ width: `${data.healthTrend.scoreBands.mid}%` }} className="h-full bg-orange-400 print:bg-gray-400"></div>
                  <div style={{ width: `${data.healthTrend.scoreBands.low}%` }} className="h-full bg-primary print:bg-gray-600"></div>
               </div>
             </div>
          </div>

          <div className="bg-foreground text-background rounded-[40px] p-10 md:p-14 shadow-lg relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:border-t-2 print:border-black print:rounded-none">
            <svg className="absolute bottom-0 right-0 w-80 h-40 opacity-20 pointer-events-none print:hidden" viewBox="0 0 100 50">
              <path d="M0,45 Q15,45 25,30 T50,35 T75,15 T100,20" fill="none" stroke="currentColor" className="text-accent" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div className="text-[10px] uppercase font-bold text-accent tracking-widest mb-10 print:text-black flex justify-between items-center">
              <span>Retention Outlook</span>
              <span className="bg-background/20 px-3 py-1 rounded-full text-background">Coverage: 100%</span>
            </div>
            
            <div className="space-y-8">
              <div>
                <div className="text-xs font-medium text-background/70 uppercase tracking-widest mb-2 print:text-gray-600">{t('platform.console.protected_revenue', 'Protected Revenue')}</div>
                <div className="text-6xl font-serif font-light tabular-nums print:text-black">{data.retention.protected}</div>
              </div>
              <div className="pt-8 border-t border-background/20 print:border-gray-300">
                <div className="text-xs font-medium text-accent uppercase tracking-widest mb-2 print:text-black flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4"/> {t('platform.console.revenue_at_risk', 'Revenue At Risk')}
                </div>
                <div className="text-6xl font-serif font-light tabular-nums text-accent print:text-black">{data.retention.atRisk}</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-card rounded-[40px] border border-border p-10 md:p-14 shadow-sm print:border-none print:shadow-none print:p-0 print:border-t-2 print:border-black print:rounded-none">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-10 print:text-black flex items-center gap-2"><BarChart3 className="w-4 h-4"/> {t('platform.console.engagement_kpis', 'Core Engagement KPIs')}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
               {Object.entries(data.kpis).map(([key, value]) => {
                 const isExpanded = expandedKpi === key;
                 const breakdown = breakdowns[key as keyof typeof breakdowns];
                 
                 return (
                   <div key={key} className={cn("p-6 rounded-3xl transition-all cursor-pointer border border-transparent", isExpanded ? "bg-muted border-border" : "hover:bg-muted/50")} onClick={() => setExpandedKpi(isExpanded ? null : key)}>
                     <div className="flex justify-between items-start mb-3">
                       <div className="text-5xl font-serif font-light tabular-nums print:text-black">{value as React.ReactNode}</div>
                       {breakdown && (
                         <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center border border-border text-muted-foreground">
                           {isExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                         </div>
                       )}
                     </div>
                     <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest print:text-gray-600">{key}</div>
                     
                     <AnimatePresence>
                       {isExpanded && breakdown && (
                         <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-6 pt-6 border-t border-border/50">
                           <div className="space-y-4">
                             {breakdown.map((b, i) => (
                               <div key={i}>
                                 <div className="flex justify-between text-xs font-bold mb-1">
                                   <span>{b.label}</span>
                                   <span className="tabular-nums">{b.value}</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                                   <div className={cn("h-full", b.color)} style={{ width: `${(b.value / (value as number)) * 100}%` }}></div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                 );
               })}
            </div>
          </div>

          <div className="bg-card rounded-[40px] border border-border overflow-hidden shadow-sm print:border-none print:shadow-none print:p-0 flex flex-col">
             <div className="p-8 bg-green-500/10 border-b border-border print:bg-white print:border-b-2 print:border-black flex justify-between items-center cursor-pointer select-none" onClick={() => toggleSection('wins')}>
               <div className="text-[10px] uppercase font-bold text-green-600 tracking-widest print:text-black">{t('platform.console.top_wins', 'Top Wins')}</div>
               <div className="text-green-600 print:hidden">{expandedSections.wins ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</div>
             </div>
             <AnimatePresence>
               {expandedSections.wins && (
                 <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                   <div className="p-8 space-y-8">
                      {data.wins.length > 0 ? data.wins.map((w:any, i:number) => (
                        <div key={i} className="group">
                          <h4 className="text-xl font-serif font-light text-foreground mb-2 print:text-black group-hover:text-green-600 transition-colors">{w.title}</h4>
                          <p className="text-sm font-medium text-muted-foreground print:text-gray-600"><span className="font-bold text-foreground print:text-black">{t('platform.console.action_taken', 'Action Taken')}:</span> {w.action}</p>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground italic print:text-gray-600">{data.isForecast ? "Not yet known — this quarter hasn't happened." : "No wins recorded for this quarter."}</p>
                      )}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          <div className="bg-card rounded-[40px] border border-border overflow-hidden shadow-sm print:border-none print:shadow-none print:p-0 flex flex-col">
             <div className="p-8 bg-primary/10 border-b border-border print:bg-white print:border-b-2 print:border-black flex justify-between items-center cursor-pointer select-none" onClick={() => toggleSection('risks')}>
               <div className="text-[10px] uppercase font-bold text-primary tracking-widest print:text-black flex items-center gap-2">
                 <ShieldAlert className="w-4 h-4"/> {t('platform.console.top_risks', 'Active Risks')}
               </div>
               <div className="text-primary print:hidden">{expandedSections.risks ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</div>
             </div>
             <AnimatePresence>
               {expandedSections.risks && (
                 <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                   <div className="p-8 space-y-8">
                      {data.risks.map((r:any, i:number) => (
                        <div key={i} className="group">
                          <h4 className="text-xl font-serif font-light text-foreground mb-2 print:text-black group-hover:text-primary transition-colors">{r.title}</h4>
                          <p className="text-sm font-medium text-muted-foreground print:text-gray-600"><span className="font-bold text-foreground print:text-black">{t('platform.console.action_taken', 'Action Taken')}:</span> {r.action}</p>
                        </div>
                      ))}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          <div className="lg:col-span-2 pt-8 border-t border-border mt-8 flex flex-col md:flex-row justify-between text-xs font-medium text-muted-foreground print:text-gray-500">
             <div className="mb-4 md:mb-0">
               <div className="font-bold uppercase tracking-widest mb-1">Methodology & Provenance</div>
               <div className="flex items-center gap-2"><Building className="w-3 h-3"/> {data.methodology} Generated by {data.provenance}.</div>
             </div>
             <div className="text-left md:text-right">
               <div className="font-bold uppercase tracking-widest mb-1">Report Owners</div>
               <div className="flex items-center md:justify-end gap-2"><Users className="w-3 h-3"/> {data.owners.join(', ')}</div>
             </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
