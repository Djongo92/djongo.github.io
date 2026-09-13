import React, { useState } from 'react';
import { usePortalState } from '../portal-state';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Clock, Activity, TrendingUp, Users, Calendar } from 'lucide-react';
import { platformData } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomeView({ t, navigateTo, roleConfig, showToast }: any) {
  const { inbox, setInbox } = usePortalState();
  const [tab, setTab] = useState<'active' | 'snoozed' | 'done'>('active');
  const [expandedInboxId, setExpandedInboxId] = useState<string | null>(null);
  const [receiptExpanded, setReceiptExpanded] = useState(false);

  const handleInboxAction = (id: string, action: 'active' | 'done' | 'snoozed' | 'dismissed') => {
    setInbox(inbox.map((i: any) => i.id === id ? { ...i, status: action } : i));
    if (expandedInboxId === id) setExpandedInboxId(null);
    showToast(`Task ${action}`);
  };

  const getTimeGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return t('portal_time_morning', 'Good morning');
    if (hr < 18) return t('portal_time_afternoon', 'Good afternoon');
    return t('portal_time_evening', 'Good evening');
  };

  const filteredInbox = inbox.filter((i: any) => {
    if (tab === 'active') return i.status === 'active';
    if (tab === 'snoozed') return i.status === 'snoozed';
    return i.status === 'done' || i.status === 'dismissed';
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-primary/5 border border-primary/10 rounded-[40px] p-8 md:p-12 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-2">{t('portal_since_visit', 'Since your last visit')}</div>
           <h2 className="text-3xl md:text-5xl font-serif font-light text-foreground">{getTimeGreeting()}, {roleConfig.name}</h2>
        </div>
        <div className="flex gap-4 items-center bg-background/50 rounded-full p-2 pr-6 border border-primary/10">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
             <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Engagement Trend</div>
             <div className="text-sm font-bold text-foreground">Top 15% of Cohort <span className="text-green-600 ml-1">↑</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         {/* Action Inbox */}
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-[40px] border border-border shadow-sm flex flex-col overflow-hidden h-[600px]">
               <div className="p-6 md:p-8 border-b border-border flex justify-between items-center bg-muted/20 shrink-0">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4"/> {t('portal_home_inbox', 'Action Inbox')}
                  </div>
                  <div className="flex gap-2 bg-background border border-border rounded-full p-1">
                    <button onClick={() => setTab('active')} className={cn("text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest transition-colors", tab === 'active' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}>Active</button>
                    <button onClick={() => setTab('snoozed')} className={cn("text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest transition-colors", tab === 'snoozed' ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted")}>Snoozed</button>
                    <button onClick={() => setTab('done')} className={cn("text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest transition-colors", tab === 'done' ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted")}>Done</button>
                  </div>
               </div>
               
               <div className="p-0 flex-1 overflow-y-auto bg-background/50">
                 {filteredInbox.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-4 p-8">
                     <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 opacity-40" />
                     </div>
                     <div>
                       <div className="text-sm font-bold text-foreground">{t('portal_home_inbox_empty', "You're all caught up")}</div>
                       <div className="text-xs mt-1">No active items requiring your attention.</div>
                     </div>
                   </div>
                 ) : (
                   <div className="divide-y divide-border">
                     {filteredInbox.map((item: any) => {
                       const isExpanded = expandedInboxId === item.id;
                       return (
                         <div key={item.id} className={cn("group transition-colors", isExpanded ? "bg-muted/30" : "hover:bg-muted/10")}>
                           <div 
                             className="p-6 cursor-pointer flex gap-4 items-start"
                             onClick={() => setExpandedInboxId(isExpanded ? null : item.id)}
                           >
                             <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-sm", item.status === 'done' ? 'bg-green-500' : item.urgency === 'high' ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
                             <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-start mb-2">
                                 <span className={cn("text-[10px] uppercase font-bold tracking-widest", item.status === 'done' ? "text-green-600" : item.urgency === 'high' ? "text-primary" : "text-muted-foreground")}>
                                   {item.status === 'snoozed' ? 'Snoozed' : item.status === 'done' ? 'Completed' : item.urgency === 'high' ? 'High Priority' : 'Normal'}
                                 </span>
                                 <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-4">{item.date}</span>
                               </div>
                               <p className={cn("text-sm font-medium text-foreground leading-relaxed pr-8", item.status === 'done' && 'line-through opacity-50')}>{item.text}</p>
                             </div>
                             <div className="shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity">
                               {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                             </div>
                           </div>
                           
                           <AnimatePresence>
                             {isExpanded && (
                               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                 <div className="px-6 pb-6 pt-0 ml-6 flex flex-col gap-4">
                                    <div className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-4">
                                      {item.type === 'intro' ? 'We found a potential match based on your sector interests. This connection could help accelerate your supply chain goals.' : 'There are still 10 spots left. We recommend bringing someone from your regulatory team.'}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      {item.status === 'active' && (
                                        <>
                                          <button onClick={(e) => { e.stopPropagation(); if(item.route) navigateTo(item.route); }} className="px-5 py-2.5 bg-foreground text-background text-xs font-bold rounded-full shadow-sm hover:scale-95 transition-transform flex items-center gap-2">
                                            {item.action} <ArrowRight className="w-3 h-3" />
                                          </button>
                                          <button onClick={(e) => { e.stopPropagation(); handleInboxAction(item.id, 'done'); }} className="px-5 py-2.5 bg-muted text-foreground text-xs font-bold rounded-full hover:bg-muted/80 transition-colors border border-border flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3"/> Mark Done
                                          </button>
                                          <button onClick={(e) => { e.stopPropagation(); handleInboxAction(item.id, 'snoozed'); }} className="px-5 py-2.5 bg-muted text-muted-foreground text-xs font-bold rounded-full hover:bg-muted/80 transition-colors border border-border flex items-center gap-2">
                                            <Clock className="w-3 h-3"/> Snooze
                                          </button>
                                        </>
                                      )}
                                      {item.status === 'snoozed' && (
                                        <button onClick={(e) => { e.stopPropagation(); handleInboxAction(item.id, 'active'); }} className="px-5 py-2.5 bg-foreground text-background text-xs font-bold rounded-full shadow-sm hover:scale-95 transition-transform">Un-snooze</button>
                                      )}
                                    </div>
                                 </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                       );
                     })}
                   </div>
                 )}
               </div>
            </div>
         </div>

         {/* Value Receipt */}
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-foreground text-background rounded-[40px] shadow-xl relative overflow-hidden flex flex-col group h-[600px] transition-all">
               <div className="absolute inset-0 bg-gradient-to-b from-[#40D9F1]/5 to-transparent pointer-events-none" />
               
               <div className="p-8 md:p-10 flex-1 flex flex-col">
                 <div className="flex justify-between items-start mb-8 relative z-10">
                   <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest flex items-center gap-2">
                     <Activity className="w-4 h-4"/> {t('portal_value_receipt', 'Your membership this quarter')}
                   </div>
                   <button onClick={() => navigateTo('score')} className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors">
                     <ArrowRight className="w-5 h-5 text-[#40D9F1]" />
                   </button>
                 </div>
                 
                 <div className="relative z-10">
                    <h3 className="text-3xl lg:text-4xl font-serif font-light mb-8 leading-tight">Your team participated in 12 events and progressed 3 introductions.</h3>
                    
                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-background/20">
                      <div>
                        <div className="text-4xl font-serif font-light tabular-nums mb-1 text-[#40D9F1]">3</div>
                        <div className="text-[10px] font-bold text-background/60 uppercase tracking-widest">Intros Brokered</div>
                      </div>
                      <div>
                        <div className="text-4xl font-serif font-light tabular-nums mb-1 text-[#40D9F1]">12</div>
                        <div className="text-[10px] font-bold text-background/60 uppercase tracking-widest">Events Attended</div>
                      </div>
                    </div>
                 </div>
               </div>

               <div className="bg-background text-foreground mt-auto rounded-t-[40px] border-t border-border overflow-hidden transition-all duration-500">
                  <div className="p-6 md:p-8 cursor-pointer flex justify-between items-center bg-muted/20" onClick={() => setReceiptExpanded(!receiptExpanded)}>
                    <div className="text-sm font-bold flex items-center gap-2">
                      Quarterly Breakdown
                    </div>
                    {receiptExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                  
                  <AnimatePresence>
                    {receiptExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <div className="p-6 md:p-8 space-y-6">
                           <div>
                             <div className="flex justify-between text-xs font-bold mb-2 text-muted-foreground">
                               <span>Q1 Attended</span>
                               <span>5</span>
                             </div>
                             <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                               <div className="h-full bg-primary" style={{ width: '40%' }} />
                             </div>
                           </div>
                           <div>
                             <div className="flex justify-between text-xs font-bold mb-2 text-muted-foreground">
                               <span>Q2 Attended</span>
                               <span>7</span>
                             </div>
                             <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                               <div className="h-full bg-primary" style={{ width: '60%' }} />
                             </div>
                           </div>
                           <button onClick={() => navigateTo('score')} className="w-full py-3 rounded-full border border-border text-xs font-bold hover:bg-muted transition-colors">
                             View Full Scorecard
                           </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
