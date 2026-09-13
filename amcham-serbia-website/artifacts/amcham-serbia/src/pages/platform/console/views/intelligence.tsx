import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, Check, Globe, MessageSquare, FileText, Mail, XCircle, ChevronDown, ChevronUp, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function IntelligenceView({ navigateTo }: { navigateTo: (v:string, c?:string) => void }) {
  const { t } = useI18n();
  const data = (platformData.console as any).intelligence;
  const [activeSpec, setActiveSpec] = useState<string | null>(null);
  const [feed, setFeed] = useState(data.feed);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  if (!data) return <div>No data</div>;

  const handleAction = (id: string, action: string) => {
    if (action === 'suppress') {
      setFeed((prev: any[]) => prev.filter((f:any) => f.id !== id));
    } else {
      setFeed((prev: any[]) => prev.map((f:any) => f.id === id ? { ...f, state: 'confirmed', confirmedAt: 'Just now' } : f));
    }
  };

  const categories = [
    { key: 'web', title: t('platform.console.intel_web_signals', 'Web Signals'), icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { key: 'engagement', title: t('platform.console.intel_engagement', 'Engagement'), icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { key: 'feedback', title: t('platform.console.intel_feedback', 'Feedback'), icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { key: 'staff', title: t('platform.console.intel_staff', 'Staff Notes'), icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { key: 'email', title: t('platform.console.intel_email', 'Email Connect'), icon: Mail, color: 'text-primary', bg: 'bg-primary/10' }
  ];

  const visibleCategories = categoryFilter ? categories.filter(c => c.key === categoryFilter) : categories;

  return (
    <div className="space-y-10 font-sans pb-20 max-w-7xl mx-auto">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">Intelligence Engine</h2>
          <p className="text-sm font-medium text-muted-foreground">{t('platform.console.intelligence_purpose', 'Pipeline health, extraction states, and manual override.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategoryFilter(null)} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-colors shadow-sm", categoryFilter === null ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:bg-muted")}>All Streams</button>
          {categories.map(c => {
             const count = feed.filter((f:any) => f.source === c.key).length;
             return (
              <button key={c.key} onClick={() => setCategoryFilter(c.key)} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-colors shadow-sm flex items-center gap-2", categoryFilter === c.key ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:bg-muted")}>
                <c.icon className="w-3 h-3" /> {c.title} <span className="opacity-50">{count}</span>
              </button>
             );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-[32px] p-8 border border-border shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl transition-all group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 flex items-center gap-2"><BarChart2 className="w-3 h-3"/> {t('platform.console.intel_total_signals', 'Total Signals')}</div>
            <div className="text-5xl font-serif font-light tabular-nums">{data.pipeline.total}</div>
          </div>
        </div>
        <div className="bg-card rounded-[32px] p-8 border border-border shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl transition-all group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 flex items-center gap-2"><Users className="w-3 h-3"/> {t('platform.console.intel_companies_fresh', 'Companies Fresh')}</div>
            <div className="text-5xl font-serif font-light tabular-nums">{data.pipeline.companiesFresh}</div>
          </div>
        </div>
        <div className="bg-card rounded-[32px] p-8 border border-border shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl transition-all group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 flex items-center gap-2"><Activity className="w-3 h-3"/> {t('platform.console.intel_pipeline', 'Pipeline Health')}</div>
            <div className="text-5xl font-serif font-light tabular-nums text-emerald-500">{data.pipeline.health}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {visibleCategories.map(source => {
            const sData = data.sources[source.key];
            const sourceFeed = feed.filter((f:any) => f.source === source.key);
            const Icon = source.icon;
            
            return (
              <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={source.key} className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-border bg-muted/20 relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border border-white/10", source.bg, source.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm border", sData.status === 'Online' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20')}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", sData.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-destructive')}></div>
                      {sData.status}
                    </div>
                  </div>
                  <h3 className="text-2xl font-serif font-light mb-4">{source.title}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-background p-4 rounded-2xl border border-border/50">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Sync</div>
                      <div className="font-medium text-foreground">{sData.lastSync}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Vol</div>
                      <div className="font-medium text-foreground">{sData.ingested}</div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-background border-b border-border text-center">
                   <button onClick={() => setActiveSpec(activeSpec === source.key ? null : source.key)} className="text-[10px] uppercase font-bold tracking-widest text-primary hover:text-foreground transition-colors flex items-center justify-center gap-1 mx-auto">
                     {t('platform.console.spec_how_it_works', 'Technical Specification')} {activeSpec === source.key ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                   </button>
                   <AnimatePresence>
                     {activeSpec === source.key && (
                       <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4 pt-4 border-t border-border space-y-3 text-left">
                         <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('platform.console.spec_refresh', 'Refresh Mode')}</span> <span className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded-md">{sData.auto}</span></div>
                          <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">As Of</span> <span className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded-md">{sData.asOf}</span></div>
                          <div className="flex justify-between items-start gap-4 flex-col mt-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Failure mode</span> <span className="text-xs font-medium text-foreground bg-muted p-2 rounded-lg w-full">{sData.failureMode}</span></div>
                          <div className="flex justify-between items-start gap-4 flex-col mt-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data class & GDPR</span> <span className="text-xs font-medium text-foreground bg-muted p-2 rounded-lg w-full">{sData.dataClassification} • {sData.gdprErasure}</span></div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
                <div className="p-6 flex-1 space-y-4 bg-muted/10">
                  <AnimatePresence>
                    {sourceFeed.length > 0 ? sourceFeed.map((item:any) => {
                      const company = platformData.allMembers.find(c => c.id === item.companyId);
                      const isExpanded = expandedSignalId === item.id;
                      const isNeg = item.sentiment === 'negative';
                      const isPos = item.sentiment === 'positive';
                      
                      return (
                        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={item.id} className={cn("text-sm border p-4 rounded-2xl bg-background transition-all group relative overflow-hidden", isExpanded ? "border-primary/40 shadow-md" : "border-border shadow-sm hover:border-primary/30")}>
                          <div className={cn("absolute top-0 left-0 w-1.5 h-full transition-colors", isNeg ? "bg-destructive" : isPos ? "bg-emerald-500" : "bg-border group-hover:bg-primary/50")}></div>
                          
                          <div className="flex justify-between items-start mb-3 pl-2">
                            <button onClick={() => navigateTo('ritual', item.companyId)} className="font-bold text-foreground hover:text-primary transition-colors text-base text-left">{company?.name}</button>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-md">{item.date}</span>
                          </div>
                          
                          <p className="text-muted-foreground font-medium mb-4 pl-2 text-sm">{item.text}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-4 pl-2 text-[10px] font-bold uppercase tracking-widest">
                            <span className={cn("px-2 py-1 rounded-md border", item.state === 'confirmed' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : item.state === 'extracted' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-muted text-muted-foreground border-border")}>{item.state}</span>
                            {item.scoreImpact !== '0' && <span className={cn("px-2 py-1 rounded-md border", isPos ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20')}>{item.scoreImpact}</span>}
                            <span className="px-2 py-1 rounded-md bg-muted text-foreground border border-border shadow-sm" title="Confidence">{item.confidence}</span>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-2 mb-4">
                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
                                  <div className="flex items-start gap-2">
                                     <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                     <div>
                                        <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Suggested Action</div>
                                        <div className="text-sm font-medium text-foreground">{isNeg ? `Queue high-priority check-in call with ${company?.manager}.` : `Log interaction and monitor for further growth signals.`}</div>
                                     </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground border-t border-border/50 pt-3">
                                    Provenance: <span className="font-bold">{item.provenance}</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex gap-2 pl-2 border-t border-border/50 pt-3">
                            <button onClick={() => setExpandedSignalId(isExpanded ? null : item.id)} className="p-2 bg-muted text-muted-foreground hover:bg-background hover:text-foreground rounded-xl transition-colors border border-transparent hover:border-border shadow-sm">
                              {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                            </button>
                            {item.state !== 'confirmed' && (
                              <button onClick={() => handleAction(item.id, 'confirm')} className="flex-1 py-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-bold shadow-sm"><Check className="w-4 h-4"/> Confirm</button>
                            )}
                            <button onClick={() => handleAction(item.id, 'suppress')} className="flex-1 py-2 bg-background border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 rounded-xl transition-colors flex items-center justify-center gap-2 font-bold shadow-sm"><XCircle className="w-4 h-4"/> Suppress</button>
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground font-medium text-center py-16 bg-card border-2 border-dashed border-border rounded-3xl">Pipeline clear for {source.title}.</motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
