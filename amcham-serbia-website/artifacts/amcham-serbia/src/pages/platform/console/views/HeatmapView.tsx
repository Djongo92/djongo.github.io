import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData, Company } from '@/data/platform';
import { cn } from '@/lib/utils';
import { Filter, X, ChevronRight, BarChart2, Activity, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkline } from '@/components/ui/sparkline';

export function HeatmapView({ navigateTo, roleParam }: any) {
  const { t } = useI18n();
  const [segment, setSegment] = useState('sector');
  const [window, setWindow] = useState('q2');
  const [activeSegment, setActiveSegment] = useState<{name: string, comps: Company[]} | null>(null);

  const members = platformData.allMembers;
  
  const grouped = members.reduce((acc, m) => {
    const key = m[segment as keyof typeof m] as string;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, typeof members>);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/20';
    return 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 font-sans relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-4xl font-serif mb-3 text-foreground tracking-tight">{t('console_v2.heatmap_title', 'Relationship Heatmap')}</h2>
          <p className="text-base text-muted-foreground max-w-xl">{t('console_v2.heatmap_desc', 'Visualize account health across dimensions. Spot concentration risk and isolate underperforming segments before they churn.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-2xl border border-border/50 shadow-inner">
            <select value={window} onChange={e => setWindow(e.target.value)} className="bg-transparent border-none rounded-xl px-4 py-2 text-sm font-bold outline-none cursor-pointer text-foreground appearance-none hover:bg-background transition-colors">
              <option value="q2">Q2 2026 Trend Window</option>
              <option value="q1">Q1 2026 Trend Window</option>
              <option value="ytd">Year to Date (2026)</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-muted p-1 rounded-2xl border border-border/50 shadow-inner">
            <Filter className="w-4 h-4 ml-3 text-muted-foreground" />
            <select value={segment} onChange={e => setSegment(e.target.value)} className="bg-transparent border-none rounded-xl px-4 py-2 pr-8 text-sm font-bold outline-none cursor-pointer text-foreground appearance-none hover:bg-background transition-colors">
              <option value="sector">Segment by Sector</option>
              <option value="tier">Segment by Tier</option>
              <option value="lifecycle">Segment by Lifecycle</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 shadow-sm"></div> Healthy (80+)</span>
          <span className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-amber-500/20 border border-amber-500/40 shadow-sm"></div> Monitor (60-79)</span>
          <span className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-destructive/20 border border-destructive/40 shadow-sm"></div> At Risk (&lt;60)</span>
        </div>
        <div className="flex items-center gap-2">
           <Activity className="w-4 h-4" /> Axis: Cells = Accounts | Groups = {segment}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).sort((a,b) => b[1].length - a[1].length).map(([groupName, comps]) => (
          <div key={groupName} className="bg-card border border-border rounded-[32px] p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-wrap items-end justify-between gap-y-3 mb-6 relative z-10">
              <h3 className="text-xl font-bold capitalize text-foreground flex items-center gap-3">
                {groupName}
                <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-muted rounded-full">{comps.length}</span>
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Avg Score: <span className="font-bold text-foreground text-lg">{Math.round(comps.reduce((a,c)=>a+c.score,0)/comps.length)}</span>
                </div>
                <button onClick={() => setActiveSegment({name: groupName, comps})} className="bg-foreground text-background px-4 py-2 rounded-full text-xs font-bold hover:bg-foreground/90 transition-transform active:scale-95 flex items-center gap-1 shadow-md">
                   Analyze <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 relative z-10">
              {comps.sort((a,b) => b.score - a.score).map(c => (
                <button 
                  key={c.id}
                  onClick={() => navigateTo('heatmap', c.id)}
                  className={cn("text-left p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:-translate-y-1 relative group/btn overflow-hidden", getScoreColor(c.score))}
                  title={`View Dossier for ${c.name}`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                  <div className="text-xs font-bold truncate mb-3 text-foreground tracking-tight">{c.name}</div>
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-serif font-medium leading-none tracking-tighter tabular-nums">{c.score}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/40 shadow-sm tabular-nums">{c.scoreTrend > 0 ? `+${c.scoreTrend}` : c.scoreTrend}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeSegment && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" 
              onClick={() => setActiveSegment(null)} 
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20 shrink-0">
                <div>
                  <h3 className="text-2xl font-serif font-light capitalize">{activeSegment.name} Segment</h3>
                  <p className="text-sm text-muted-foreground font-medium">{activeSegment.comps.length} Accounts in this view</p>
                </div>
                <button onClick={() => setActiveSegment(null)} className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                 {activeSegment.comps.sort((a,b) => b.score - a.score).map((c, i) => (
                    <motion.div 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: i * 0.05 }}
                       key={c.id} 
                       className="p-5 rounded-3xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                    >
                       <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-colors", getScoreBarColor(c.score))}></div>
                       <div className="pl-2">
                         <div className="flex justify-between items-start mb-4">
                           <div>
                             <div className="font-bold text-foreground text-lg">{c.name}</div>
                             <div className="text-xs font-medium text-muted-foreground flex items-center gap-2 mt-1">
                               <Target className="w-3 h-3" /> {c.tier} · {c.manager}
                             </div>
                           </div>
                           <div className="text-right">
                             <div className="text-3xl font-serif leading-none tabular-nums">{c.score}</div>
                             <div className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", c.scoreTrend > 0 ? "text-emerald-500" : "text-destructive")}>{c.scoreTrend > 0 ? `+${c.scoreTrend}` : c.scoreTrend}</div>
                           </div>
                         </div>

                         <div className="mb-4">
                           <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                             <span>{c.history.length}-Month Trend</span>
                             <span className="tabular-nums">{c.history[0].score} → {c.score}</span>
                           </div>
                           <Sparkline
                             data={c.history.map(h => h.score)}
                             className={cn('w-full h-8', c.scoreTrend > 0 ? 'text-emerald-500' : c.scoreTrend < 0 ? 'text-destructive' : 'text-muted-foreground')}
                           />
                         </div>

                         <div className="space-y-3">
                           <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                               <span>Events & Committees</span>
                               <span>{Math.min(c.score + 10, 100)}%</span>
                             </div>
                             <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                               <div className="h-full bg-foreground rounded-full" style={{ width: `${Math.min(c.score + 10, 100)}%` }}></div>
                             </div>
                           </div>
                           <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                               <span>Portal Activity</span>
                               <span>{Math.max(c.score - 20, 10)}%</span>
                             </div>
                             <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                               <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(c.score - 20, 10)}%` }}></div>
                             </div>
                           </div>
                         </div>
                         
                         <div className="mt-5 pt-4 border-t border-border flex justify-end">
                           <button onClick={() => navigateTo('heatmap', c.id)} className="text-xs font-bold text-foreground bg-muted px-4 py-2 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm">
                             View Full Dossier
                           </button>
                         </div>
                       </div>
                    </motion.div>
                 ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
