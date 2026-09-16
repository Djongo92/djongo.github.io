import React, { useState } from 'react';
import { platformData } from '@/data/platform';
import { AlertTriangle, TrendingUp, ShieldCheck, CheckCircle2, Target, ChevronDown, ChevronUp, Clock, Activity, Flag, History } from 'lucide-react';
import { cn, parseEuro, fmtEuro } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function RetentionView({ navigateTo }: any) {
  const [items, setItems] = useState(platformData.console.retention);
  const [savePlays, setSavePlays] = useState<any[]>((platformData.console as any).savePlays);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const moveStage = (id: string, newStage: string) => {
    setItems(items.map(i => i.id === id ? { ...i, stage: newStage } : i));
  };

  const resolve = (id: string, outcome: 'saved' | 'lost') => {
    const item = items.find(i => i.id === id);
    if (item) {
      setSavePlays(prev => [{
        id: `sp-${item.id}-${Date.now()}`,
        companyId: item.companyId,
        owner: item.owner,
        intervention: item.intervention,
        outcome,
        value: item.impact,
        resolvedDate: 'Just now',
        note: outcome === 'saved' ? item.measurableOutcome : 'Case closed without recovery.'
      }, ...prev]);
    }
    setItems(items.filter(i => i.id !== id));
  };

  const stages = ['Investigation', 'Planning', 'Action Required', 'Intervention', 'Monitoring'];

  const highRiskCount = items.filter(i => i.risk === 'High').length;
  const medRiskCount = items.filter(i => i.risk === 'Medium').length;
  const lowRiskCount = items.filter(i => i.risk === 'Low').length;
  const totalCases = items.length;
  const activeAtRiskValue = items.reduce((sum, i) => sum + parseEuro(i.impact), 0);
  const savedValue = savePlays.filter(p => p.outcome === 'saved').reduce((sum, p) => sum + parseEuro(p.value), 0);
  const lostValue = savePlays.filter(p => p.outcome === 'lost').reduce((sum, p) => sum + parseEuro(p.value), 0);
  const resolvedTotal = savedValue + lostValue;
  const savedCount = savePlays.filter(p => p.outcome === 'saved').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-4xl font-serif text-foreground tracking-tight mb-2">Retention Control</h2>
          <p className="text-muted-foreground">Manage at-risk accounts through targeted intervention pipelines.</p>
        </div>
        <div className="px-5 py-3 rounded-[24px] bg-destructive/10 text-destructive border border-destructive/20 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-bold uppercase tracking-widest mb-1">Value At Risk</span>
            <span className="text-2xl font-serif tabular-nums tracking-tight">{fmtEuro(activeAtRiskValue)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Target className="w-4 h-4"/> Active Cases ({items.length})</h3>
            {totalCases > 0 && (
              <div className="flex items-center gap-4 text-xs font-bold">
                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive"></div> High ({highRiskCount})</div>
                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Med ({medRiskCount})</div>
                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Low ({lowRiskCount})</div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {items.map(item => {
                const company = platformData.allMembers.find(m => m.id === item.companyId);
                const isExpanded = expandedId === item.id;
                
                return (
                  <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={item.id} className={cn("p-6 rounded-[32px] border transition-all relative overflow-hidden group shadow-sm", isExpanded ? "border-primary/50 bg-card shadow-md" : "border-border bg-card hover:shadow-md")}>
                    <div className={cn("absolute left-0 top-0 bottom-0 w-2 transition-colors", item.risk === 'High' ? "bg-destructive" : item.risk === 'Medium' ? "bg-amber-500" : "bg-emerald-500")}></div>
                    <div className="pl-2">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center font-bold text-lg border border-border shadow-inner text-muted-foreground">{company?.avatar}</div>
                          <div>
                            <h4 className="font-bold text-foreground text-xl cursor-pointer hover:text-primary transition-colors flex items-center gap-2" onClick={(e) => { e.stopPropagation(); navigateTo('heatmap', item.companyId); }}>
                              {company?.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn("text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md border", item.risk === 'High' ? "bg-destructive/10 text-destructive border-destructive/20" : item.risk === 'Medium' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20")}>{item.risk} Risk</span>
                              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> Deadline: <span className={cn("font-bold", item.risk === 'High' ? "text-destructive" : "text-foreground")}>{item.deadline}</span></span>
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-serif font-medium bg-muted px-4 py-2 rounded-xl tabular-nums border border-border/50">{item.impact}</div>
                      </div>
                      
                      <p className="text-sm text-foreground mb-4 bg-muted/40 p-4 rounded-2xl border border-border/50 flex items-start gap-3">
                        <Flag className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span><span className="font-bold text-muted-foreground mr-1">Trigger:</span> {item.reason}</span>
                      </p>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-2 pb-4 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-background border border-border rounded-2xl p-4">
                                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-3 h-3" /> Account Health</div>
                                  <div className="flex justify-between items-end mb-2">
                                    <div className="text-2xl font-serif tabular-nums">{company?.score} <span className="text-sm text-muted-foreground">/ 100</span></div>
                                    <div className={cn("text-xs font-bold", (company?.scoreTrend ?? 0) < 0 ? "text-destructive" : "text-emerald-500")}>{(company?.scoreTrend ?? 0) > 0 ? '+' : ''}{company?.scoreTrend} pts</div>
                                  </div>
                                  <div className="text-xs font-medium text-muted-foreground">Renewal: {company?.renewalDate}</div>
                                </div>
                                <div className="bg-background border border-border rounded-2xl p-4">
                                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2"><Target className="w-3 h-3" /> Evidence Context</div>
                                  <div className="text-sm font-medium leading-relaxed">{item.evidence}</div>
                                </div>
                              </div>
                              <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
                                <div className="relative z-10">
                                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Intervention Plan</div>
                                  <div className="text-base font-medium text-foreground mb-3">{item.intervention}</div>
                                  <div className="text-xs font-bold text-primary/80 bg-background/50 px-3 py-2 rounded-lg inline-block shadow-sm">Target: {item.measurableOutcome}</div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/50 mt-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pipeline Stage</span>
                          <div className="bg-muted p-1 rounded-xl border border-border/50 shadow-inner">
                            <select value={item.stage} onChange={(e) => moveStage(item.id, e.target.value)} className="bg-transparent border-none text-sm font-bold px-3 py-1.5 outline-none cursor-pointer text-foreground hover:bg-background rounded-lg transition-colors appearance-none pr-8">
                              {stages.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground mr-2">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          <button onClick={() => resolve(item.id, 'lost')} className="px-5 py-2.5 rounded-full text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/20 shadow-sm">Mark Lost</button>
                          <button onClick={() => resolve(item.id, 'saved')} className="px-5 py-2.5 rounded-full text-sm font-bold bg-foreground text-background shadow-md hover:bg-foreground/90 transition-transform active:scale-95 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Mark Saved</button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {items.length === 0 && <div className="py-24 text-center border-2 border-dashed border-border rounded-[40px] text-muted-foreground font-medium bg-card/50 shadow-sm">No active retention cases.</div>}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Pipeline ROI</h3>
          <div className="bg-card border border-border p-8 rounded-[32px] shadow-sm sticky top-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="mb-8 relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Portfolio Risk Distribution</div>
              <div className="h-4 w-full rounded-full flex overflow-hidden shadow-inner border border-border/50">
                <div className="bg-destructive transition-all" style={{ width: `${(highRiskCount/totalCases)*100}%` }}></div>
                <div className="bg-amber-500 transition-all" style={{ width: `${(medRiskCount/totalCases)*100}%` }}></div>
                <div className="bg-emerald-500 transition-all" style={{ width: `${(lowRiskCount/totalCases)*100}%` }}></div>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><ShieldCheck className="w-4 h-4 text-emerald-500"/> Saved (YTD)</div>
                  <span className="text-3xl font-serif text-emerald-500 tracking-tight tabular-nums">{fmtEuro(savedValue)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner"><div className="bg-emerald-500 h-full rounded-full relative" style={{ width: `${resolvedTotal > 0 ? (savedValue / resolvedTotal) * 100 : 0}%` }}><div className="absolute inset-0 bg-white/20 w-1/2 rounded-full blur-sm"></div></div></div>
              </div>
              <div className="pt-6 border-t border-border/50">
                <div className="flex justify-between items-end mb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><AlertTriangle className="w-4 h-4 text-destructive"/> Lost (YTD)</div>
                  <span className="text-3xl font-serif text-destructive tracking-tight tabular-nums">{fmtEuro(lostValue)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner"><div className="bg-destructive h-full rounded-full relative" style={{ width: `${resolvedTotal > 0 ? (lostValue / resolvedTotal) * 100 : 0}%` }}><div className="absolute inset-0 bg-white/20 w-1/2 rounded-full blur-sm"></div></div></div>
              </div>
            </div>

            <div className="mt-8 bg-muted p-5 rounded-3xl border border-border/50 relative z-10 shadow-sm">
              <div className="text-xs font-bold text-foreground mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Save-Play Result</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{savedCount} of {savePlays.length} resolved cases saved this year, protecting {fmtEuro(savedValue)} in dues.</p>
            </div>

            {savePlays.length > 0 && (
              <div className="mt-8 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2"><History className="w-4 h-4"/> Recent Save Plays</div>
                <div className="space-y-3">
                  {savePlays.slice(0, 4).map((p, i) => {
                    const company = platformData.allMembers.find(m => m.id === p.companyId);
                    return (
                      <div key={p.id ?? i} className="bg-background border border-border/50 rounded-2xl p-4 text-sm">
                        <div className="flex justify-between items-start gap-3 mb-1.5">
                          <span className="font-bold text-foreground">{company?.name}</span>
                          <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0", p.outcome === 'saved' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20")}>{p.outcome} · {p.value}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{p.intervention} — <span className="font-medium text-foreground/80">{p.owner}</span>, {p.resolvedDate}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
