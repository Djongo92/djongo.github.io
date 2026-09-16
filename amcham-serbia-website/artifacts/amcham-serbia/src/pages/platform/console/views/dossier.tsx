import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Plus, Globe, Activity, MessageSquare, FileText, Mail, FileBadge, Calendar, Target, ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScoreExplanation } from '@/components/ui/score-explanation';
import { PresenceIndicator } from '@/components/ui/presence-indicator';

export function DossierView({ companyId, close, navigateTo, showToast }: { companyId: string, close: () => void, navigateTo: (v:string, c?:string) => void, showToast: (m:string) => void }) {
  const { t } = useI18n();
  const c = platformData.allMembers.find(x => x.id === companyId);
  const data = platformData.console as any;
  const scoreData = data.intelligence?.scoreFactors?.[companyId];
  const intelFeed = data.intelligence?.feed?.filter((f:any) => f.companyId === companyId) || [];
  const matchmakingPairs = data.matchmaking?.pairs?.filter((p:any) => p.from === companyId || p.to === companyId) || [];
  
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'opportunities' | 'risks'>('overview');

  if (!c) return null;

  return (
    <>
      <div className="p-6 md:p-8 flex justify-between items-center shrink-0 border-b border-border bg-card gap-3">
        <h3 className="font-bold text-foreground uppercase tracking-widest text-xs flex items-center gap-2"><FileBadge className="w-4 h-4"/> Role-Scoped Dossier</h3>
        <div className="flex items-center gap-3">
          <PresenceIndicator companyId={c.id} className="hidden sm:inline-flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border/50" />
          <button onClick={close} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-border transition-colors shrink-0"><X className="w-5 h-5" /></button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="p-6 md:p-10 pb-0">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-5xl md:text-6xl font-serif font-light tracking-tight text-foreground mb-4">{c.name}</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-4 py-1.5 bg-muted text-foreground rounded-full text-[10px] font-bold uppercase tracking-widest">{c.sector}</span>
                <span className="px-4 py-1.5 bg-muted text-foreground rounded-full text-[10px] font-bold uppercase tracking-widest">{c.tier}</span>
                <span className="px-4 py-1.5 bg-muted text-foreground rounded-full text-[10px] font-bold uppercase tracking-widest">{t('platform.console.member_since', 'Since')} {c.since}</span>
                <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest", c.lifecycle === 'at-risk' ? "bg-primary/10 text-primary" : c.lifecycle === 'renewing' ? "bg-orange-500/10 text-orange-600" : "bg-emerald-500/10 text-emerald-600")}>{c.lifecycle} priority</span>
              </div>
            </div>
            <div className="w-24 h-24 rounded-[32px] bg-card shadow-sm border border-border flex items-center justify-center font-bold text-4xl text-muted-foreground shrink-0 shadow-inner">{c.avatar}</div>
          </div>
          
          <p className="text-foreground/70 font-medium leading-relaxed text-lg max-w-3xl mb-8">{c.description}</p>
          
          {/* Tabs */}
          <div className="flex gap-6 border-b border-border">
            {(['overview', 'timeline', 'opportunities', 'risks'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={cn("pb-4 text-[10px] font-bold uppercase tracking-widest transition-colors relative", activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground/80")}
              >
                {tab}
                {activeTab === tab && <motion.div layoutId="dossier-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-foreground rounded-t-full" />}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-10 space-y-12">
          <AnimatePresence mode="wait">
            
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card rounded-[32px] p-8 border border-border shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Health Score</div>
                      {scoreData && (
                        <div className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">{scoreData.confidence} Confidence</div>
                      )}
                    </div>
                    <div className="text-6xl font-serif font-light tabular-nums text-foreground flex items-baseline gap-3 mb-8">
                      <ScoreExplanation companyId={c.id}>{c.score}</ScoreExplanation> <span className={cn("text-xl font-bold font-sans", c.scoreTrend < 0 ? "text-primary" : "text-emerald-500")}>{c.scoreTrend > 0 ? '+' : ''}{c.scoreTrend}</span>
                    </div>

                    {/* CSS Metric Visualization for Score Factors */}
                    {scoreData && (
                      <div className="space-y-4 border-t border-border pt-6">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Score Factors</div>
                        <div className="space-y-3">
                          {scoreData.factors.map((f:any, i:number) => (
                            <div key={i}>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span>{f.name}</span>
                                <span className="tabular-nums text-muted-foreground">{f.value}/{f.max}</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={cn("h-full", i===0?'bg-primary':i===1?'bg-blue-500':i===2?'bg-emerald-500':'bg-orange-500')} style={{ width: `${(f.value/f.max)*100}%` }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-6 flex flex-col">
                    <div className="bg-card rounded-[32px] p-8 border border-border shadow-sm flex-1">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Commercial Terms</div>
                      <div className="space-y-6">
                        <div>
                          <div className="text-xs font-bold text-muted-foreground mb-1">Annual Value</div>
                          <div className="text-3xl font-serif font-light tabular-nums text-foreground">{c.fee}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-muted-foreground mb-1">Renewal Date</div>
                          <div className="text-2xl font-serif font-light tabular-nums text-foreground">{c.renewalDate}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-muted-foreground mb-1">Account Manager</div>
                          <div className="text-lg font-medium text-foreground flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{c.manager.charAt(0)}</div>
                            {c.manager}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 flex-none">
                      <button onClick={() => navigateTo('brief', c.id)} className="bg-foreground hover:bg-primary text-background hover:text-primary-foreground font-bold py-4 px-6 rounded-3xl flex flex-col items-center justify-center text-center transition-all shadow-md active:scale-95 gap-2">
                        <FileText className="w-6 h-6" />
                        <span className="text-xs uppercase tracking-widest">Generate Brief</span>
                      </button>
                      <button onClick={() => showToast(`Added ${c.name} to Outreach`)} className="bg-card hover:bg-muted text-foreground font-bold py-4 px-6 rounded-3xl border border-border transition-all shadow-sm active:scale-95 flex flex-col items-center justify-center text-center gap-2">
                        <Mail className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs uppercase tracking-widest">Add to Outreach</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'timeline' && (
              <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                   <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Activity Feed</h4>
                   <button className="text-[10px] font-bold text-primary px-4 py-2 bg-primary/10 rounded-full flex items-center gap-1 hover:bg-primary/20 transition-colors"><Plus className="w-3 h-3"/> Add Manual Log</button>
                </div>
                
                {intelFeed.length > 0 ? (
                  <div className="space-y-8 pl-4 border-l-2 border-muted relative">
                    {intelFeed.map((item:any, i:number) => (
                      <div key={item.id} className="relative group">
                        <div className={cn("absolute -left-[29px] top-0 w-14 h-14 rounded-full text-background border-4 border-background flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110", item.source === 'web' ? 'bg-blue-500' : item.source === 'engagement' ? 'bg-emerald-500' : item.source === 'feedback' ? 'bg-purple-500' : item.source === 'staff' ? 'bg-orange-500' : 'bg-primary')}>
                          {item.source === 'web' && <Globe className="w-5 h-5" />}
                          {item.source === 'engagement' && <Activity className="w-5 h-5" />}
                          {item.source === 'feedback' && <MessageSquare className="w-5 h-5" />}
                          {item.source === 'staff' && <FileText className="w-5 h-5" />}
                          {item.source === 'email' && <Mail className="w-5 h-5" />}
                        </div>
                        <div className="ml-12 bg-card border border-border p-6 rounded-[32px] group-hover:shadow-md transition-all group-hover:border-border/80">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground capitalize">{item.source} Signal</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.date} · Status: {item.state}</span>
                            </div>
                            {item.scoreImpact !== '0' && (
                              <div className={cn("text-[10px] font-bold px-3 py-1.5 rounded-full", item.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-600' : item.sentiment === 'negative' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                                {item.scoreImpact}
                              </div>
                            )}
                          </div>
                          <div className="text-base font-medium text-foreground/80 leading-relaxed bg-muted/30 p-4 rounded-2xl">{item.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic bg-card p-12 rounded-[32px] text-center border border-border shadow-sm">No timeline activity found for this account.</div>
                )}
              </motion.div>
            )}

            {activeTab === 'opportunities' && (
              <motion.div key="opportunities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Matchmaking & Intro Opportunities</div>
                {matchmakingPairs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {matchmakingPairs.map((pair:any, i:number) => {
                      const otherId = pair.from === companyId ? pair.to : pair.from;
                      const otherComp = platformData.allMembers.find(x => x.id === otherId);
                      return (
                        <div key={i} className="bg-card border border-border p-6 rounded-[32px] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">{c.avatar}</div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{otherComp?.avatar || '?'}</div>
                              <span className="text-sm font-bold ml-2">Intro to {otherComp?.name}</span>
                            </div>
                            <p className="text-sm font-medium text-foreground/80 mb-4">{pair.rationale}</p>
                            <div className="bg-muted/50 p-3 rounded-xl text-xs font-medium text-muted-foreground mb-4">Evidence: {pair.overlapEvidence}</div>
                          </div>
                          <div className="flex justify-between items-center border-t border-border pt-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-muted px-3 py-1 rounded-full">{pair.outcomeState}</span>
                            <button onClick={() => showToast(`Initiated intro logic for ${otherComp?.name}`)} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">Broker Intro</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-card border border-dashed border-border rounded-[32px] p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                    <Target className="w-10 h-10 opacity-50" />
                    <span className="text-sm font-medium">No active matchmaking opportunities. Check back later or manually scout.</span>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'risks' && (
              <motion.div key="risks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Account Risk Factors</div>
                <div className="bg-primary/5 border border-primary/20 rounded-[32px] p-8">
                  {c.lifecycle === 'at-risk' ? (
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5"/></div>
                        <div>
                          <h4 className="text-xl font-serif text-primary mb-2">Elevated Churn Risk</h4>
                          <p className="text-sm font-medium text-foreground/80 leading-relaxed max-w-2xl">This account is exhibiting signals consistent with high churn probability. Immediate executive intervention is recommended before the {c.renewalDate} renewal window closes.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                         <div className="bg-background border border-primary/10 p-5 rounded-2xl shadow-sm">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Primary Factor</div>
                           <div className="text-sm font-medium">Declining engagement score (-{Math.abs(c.scoreTrend)} over 30 days).</div>
                         </div>
                         <div className="bg-background border border-primary/10 p-5 rounded-2xl shadow-sm">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Secondary Factor</div>
                           <div className="text-sm font-medium">Contact freshness is marked as '{c.contactFreshness}'. Last interaction {c.lastInteraction}.</div>
                         </div>
                      </div>
                      
                      <div className="pt-6 border-t border-primary/10 flex justify-end">
                        <button onClick={() => navigateTo('brief', c.id)} className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-full text-sm shadow-md hover:bg-primary/90 transition-colors">Plan Intervention</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                       <ShieldAlert className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
                       <h4 className="text-lg font-bold text-foreground mb-2">Account is Healthy</h4>
                       <p className="text-sm font-medium text-muted-foreground max-w-md">No significant risk factors detected based on current engagement heuristics and staff notes.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
