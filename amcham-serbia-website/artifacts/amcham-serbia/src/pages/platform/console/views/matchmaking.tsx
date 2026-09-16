import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';
import { Handshake, AlertTriangle, CheckCircle2, Clock, Target, Layers, ChevronDown, ChevronUp, History, XCircle, TrendingUp } from 'lucide-react';
import { cn, parseEuro, fmtEuro } from '@/lib/utils';
import { Confetti } from '@/components/ui/confetti';

export function MatchmakingView({ showToast }: { showToast: (m:string) => void }) {
  const { t } = useI18n();
  const [pairs, setPairs] = useState(() => platformData.console.matchmaking.pairs.map((p: any) => ({ ...p, pairId: `${p.from}-${p.to}` })));
  const [deals, setDeals] = useState<any[]>((platformData.console.matchmaking as any).deals);
  const [dealValue, setDealValue] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const dismissPair = (pairId: string, name?: string) => {
    setPairs(prev => prev.filter(p => p.pairId !== pairId));
    showToast(`Dismissed match for ${name}`);
  };

  const advancePair = (pairId: string) => {
    setPairs(prev => prev.map(p => {
      if (p.pairId !== pairId || p.outcomeState === 'scheduled') return p;
      if (p.toApproved) return { ...p, outcomeState: 'scheduled' };
      return { ...p, toApproved: true };
    }));
  };

  const recordOutcome = (pairId: string, outcome: 'closed' | 'declined') => {
    const pair = pairs.find(p => p.pairId === pairId);
    if (!pair) return;
    setDeals(prev => [{
      id: `md-${pairId}-${Date.now()}`,
      from: pair.from,
      to: pair.to,
      value: outcome === 'closed' ? (dealValue[pairId] || '€0') : '—',
      outcome,
      closedDate: 'Just now',
      note: outcome === 'closed' ? 'Recorded via Mutual-Consent Broker.' : 'Declined after introduction.'
    }, ...prev]);
    setPairs(prev => prev.filter(p => p.pairId !== pairId));
    showToast(outcome === 'closed' ? 'Deal recorded' : 'Match marked as declined');
    if (outcome === 'closed') setConfettiTrigger(n => n + 1);
  };

  const pendingCount = pairs.filter(p => p.outcomeState === 'pending').length;
  const scheduledCount = pairs.filter(p => p.outcomeState === 'scheduled').length;
  const closedTotal = deals.filter(d => d.outcome === 'closed').reduce((sum, d) => sum + parseEuro(d.value), 0);

  return (
    <div className="max-w-5xl mx-auto font-sans pb-20">
      <Confetti trigger={confettiTrigger} />
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-4">Mutual-Consent Broker</h2>
          <p className="text-sm font-medium text-muted-foreground max-w-2xl">{t('platform.console.match_desc', 'Approve overlaps to trigger double-opt-in workflows.')}</p>
        </div>
        <div className="flex items-center gap-4 bg-card p-2 rounded-full border border-border shadow-sm">
           <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold flex items-center gap-2">
             <Clock className="w-4 h-4"/> {pendingCount} Pending Opt-in
           </div>
           <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-2">
             <CheckCircle2 className="w-4 h-4"/> {scheduledCount} Scheduled
           </div>
           <div className="px-4 py-2 bg-foreground text-background rounded-full text-xs font-bold flex items-center gap-2">
             <TrendingUp className="w-4 h-4"/> {fmtEuro(closedTotal)} Closed YTD
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence>
          {pairs.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-24 border-2 border-dashed border-border rounded-[40px] text-muted-foreground font-medium bg-card/50 shadow-sm">
              {t('console_v2.match_empty', 'No pending match suggestions. New overlaps will appear here.')}
            </motion.div>
          )}
          {pairs.map((pair:any, index: number) => {
            const from = platformData.allMembers.find(c => c.id === pair.from);
            const to = platformData.allMembers.find(c => c.id === pair.to);
            const isExpanded = expandedId === pair.pairId;
            
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.1 }}
                key={pair.pairId}
                className={cn("bg-card rounded-[40px] shadow-sm border p-8 md:p-10 flex flex-col transition-all relative overflow-hidden", isExpanded ? "border-primary/40 shadow-lg" : "border-border hover:-translate-y-1 hover:shadow-md")}
              >
                {pair.outcomeState === 'scheduled' && (
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                )}
                
                <div className="flex flex-col md:flex-row items-center gap-8 mb-8 relative z-10">
                  <div className="flex-1 text-center md:text-right">
                    <div className="w-24 h-24 mx-auto md:ml-auto md:mr-0 rounded-3xl bg-background border border-border flex items-center justify-center text-4xl font-serif mb-4 shadow-sm">{from?.avatar}</div>
                    <div className="font-bold text-2xl text-foreground mb-1">{from?.name}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{from?.sector} · {from?.tier}</div>
                      <div className={cn("mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm", pair.fromApproved ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20")}>
                       {pair.fromApproved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {pair.fromApproved ? t('console_v2.match_optin_confirmed', 'Opt-in Confirmed') : t('console_v2.match_optin_pending', 'Opt-in Pending')}
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex flex-col items-center justify-center relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-0.5 bg-border -z-10 md:w-32"></div>
                    <div className="w-14 h-14 rounded-full bg-background border border-border shadow-sm flex items-center justify-center mb-3 relative z-10">
                      <Handshake className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20 shadow-sm">Suggested Match</div>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <div className="w-24 h-24 mx-auto md:mr-auto md:ml-0 rounded-3xl bg-background border border-border flex items-center justify-center text-4xl font-serif mb-4 shadow-sm">{to?.avatar}</div>
                    <div className="font-bold text-2xl text-foreground mb-1">{to?.name}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{to?.sector} · {to?.tier}</div>
                      <div className={cn("mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm", pair.toApproved ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20")}>
                       {pair.toApproved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {pair.toApproved ? 'Opt-in Confirmed' : 'Opt-in Pending'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                   <button onClick={() => setExpandedId(isExpanded ? null : pair.pairId)} className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted px-4 py-2 rounded-full hover:bg-background hover:text-foreground border border-transparent hover:border-border transition-colors shadow-sm">
                      {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>} {isExpanded ? 'Hide Deep Analysis' : 'Show Deep Analysis'}
                   </button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                         <div className="bg-background border border-border p-6 rounded-3xl md:col-span-2 shadow-sm space-y-4">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><Target className="w-3 h-3"/> Overlap Evidence</div>
                              <div className="text-sm font-medium text-foreground leading-relaxed bg-muted/40 p-3 rounded-xl border border-border/50">{pair.overlapEvidence}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                 <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><Layers className="w-3 h-3"/> Shared Committees</div>
                                 <div className="text-sm font-bold text-foreground">Transport & Logistics</div>
                               </div>
                               <div>
                                 <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><History className="w-3 h-3"/> Past Interaction</div>
                                 <div className="text-sm font-medium text-foreground">Met at Q1 Tech Roundtable</div>
                               </div>
                            </div>
                            <div className="pt-4 border-t border-border">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Rationale</div>
                              <div className="text-sm text-foreground">{pair.rationale}</div>
                            </div>
                         </div>
                         <div className={cn("border p-6 rounded-3xl shadow-sm flex flex-col justify-center", pair.conflicts === 'None' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-primary/5 border-primary/20")}>
                            <div className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2 text-foreground">
                              <AlertTriangle className={cn("w-4 h-4", pair.conflicts === 'None' ? 'text-emerald-500' : 'text-primary')} /> Conflicts Check
                            </div>
                            <div className="text-base text-center font-medium text-foreground leading-relaxed">{pair.conflicts}</div>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-border relative z-10">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border border-border/50">
                    <Clock className="w-3 h-3"/> Expires in: {pair.expiry}
                  </div>
                  {pair.outcomeState === 'scheduled' ? (
                    <div className="flex flex-wrap justify-center items-center gap-3">
                      <input
                        type="text"
                        placeholder="Deal value, e.g. €15k"
                        value={dealValue[pair.pairId] || ''}
                        onChange={(e) => setDealValue(p => ({ ...p, [pair.pairId]: e.target.value }))}
                        className="px-4 py-3 bg-background border border-border rounded-full text-sm w-44 focus:outline-none focus:border-primary shadow-sm"
                      />
                      <button onClick={() => recordOutcome(pair.pairId, 'closed')} className="px-6 py-3 rounded-full text-sm font-bold bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4"/> Mark Closed
                      </button>
                      <button onClick={() => recordOutcome(pair.pairId, 'declined')} className="px-6 py-3 rounded-full text-sm font-bold text-destructive bg-background border border-border hover:bg-destructive/10 transition-colors flex items-center gap-2">
                        <XCircle className="w-4 h-4"/> Mark Declined
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-3">
                      <button onClick={() => dismissPair(pair.pairId, from?.name)} className="px-6 py-3 rounded-full text-sm font-bold text-muted-foreground bg-background border border-border hover:bg-muted transition-colors shadow-sm">
                        {t('console_v2.match_dismiss', 'Dismiss')}
                      </button>
                      <button
                        onClick={() => {
                          advancePair(pair.pairId);
                          showToast(pair.toApproved ? `Introduction scheduled for ${from?.name} and ${to?.name}` : `Opt-in request sent to ${to?.name}`);
                        }}
                        className="px-8 py-3 font-bold rounded-full text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90"
                      >
                        {pair.toApproved ? t('console_v2.match_schedule_intro', 'Schedule Introduction') : `${t('console_v2.match_request_optin', 'Request Opt-in from')} ${to?.name}`}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {deals.length > 0 && (
        <div className="mt-16 pt-8 border-t border-border">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2"><History className="w-4 h-4"/> Recent Deal Outcomes</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deals.slice(0, 6).map((d, i) => {
              const from = platformData.allMembers.find(c => c.id === d.from);
              const to = platformData.allMembers.find(c => c.id === d.to);
              return (
                <div key={d.id ?? i} className="bg-card border border-border rounded-2xl p-5 text-sm shadow-sm">
                  <div className="flex justify-between items-start gap-3 mb-1.5">
                    <span className="font-bold text-foreground">{from?.name} × {to?.name}</span>
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0", d.outcome === 'closed' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20")}>{d.outcome}{d.outcome === 'closed' ? ` · ${d.value}` : ''}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{d.note} — {d.closedDate}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
