import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ArrowRight, UserSquare2, ListChecks, ArrowLeft, Zap, BellRing, Target, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CoverView({ showToast }: { showToast: (m:string) => void }) {
  const { t } = useI18n();
  const [activeCover, setActiveCover] = useState<any | null>(null);
  const team = (platformData.console as any).team.filter((m:any) => m.id !== 'staff-1'); // Assume we are 'staff-1'
  
  // Fake state for checklist interaction
  const [checklist, setChecklist] = useState([
    { id: 1, title: "Review 4 overdue accounts in Outreach", type: "Urgent", action: "Go to Outreach", done: false },
    { id: 2, title: "Approve 2 pending Matchmaking requests", type: "Urgent", action: "Go to Approvals", done: false },
    { id: 3, title: "Call S-Leasing regarding renewal", type: "Standard", action: "View Dossier", done: false }
  ]);

  const toggleChecklistItem = (id: number) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
    showToast(`Task marked as ${!checklist.find(i => i.id === id)?.done ? 'done' : 'pending'}`);
  };

  if (activeCover) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 font-sans pb-20 max-w-5xl mx-auto">
        <div className="bg-primary text-primary-foreground rounded-[40px] p-10 md:p-14 flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>
          
          <div className="flex items-center gap-8 relative z-10 mb-8 md:mb-0">
            <div className="w-24 h-24 rounded-full bg-background/20 flex items-center justify-center text-4xl font-bold shadow-inner border border-white/20 shrink-0">{activeCover.avatar}</div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest mb-2 flex items-center gap-2 bg-background/20 inline-flex px-3 py-1 rounded-full text-background"><ShieldAlert className="w-3 h-3"/> Active Continuity Mode</div>
              <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight">{t('platform.console.cover_covering_for', 'Covering for {name}').replace('{name}', activeCover.name)}</h2>
            </div>
          </div>
          
          <button onClick={() => { setActiveCover(null); showToast('Takeover ended'); }} className="px-8 py-4 bg-background text-foreground font-bold text-sm rounded-full shadow-md hover:shadow-lg transition-transform active:scale-95 relative z-10 flex items-center gap-3">
            <ArrowLeft className="w-4 h-4" /> End Session
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-card p-10 rounded-[32px] border border-border shadow-sm">
             <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-8 flex items-center gap-2"><UserSquare2 className="w-4 h-4"/> Delegation Scope</div>
             <div className="space-y-5 text-sm font-medium">
                <div className="flex justify-between border-b border-border pb-4">
                   <span className="text-muted-foreground">Start Date</span>
                   <span className="font-bold">Oct 10, 2026 09:00</span>
                </div>
                <div className="flex justify-between border-b border-border pb-4">
                   <span className="text-muted-foreground">End Date</span>
                   <span className="font-bold">Oct 15, 2026 17:00</span>
                </div>
                <div className="flex justify-between border-b border-border pb-4">
                   <span className="text-muted-foreground">Reason</span>
                   <span className="bg-muted px-3 py-1 rounded-full text-xs uppercase tracking-widest font-bold">Vacation</span>
                </div>
                <div className="flex justify-between pt-2">
                   <span className="text-muted-foreground">Excluded Areas</span>
                   <span className="text-primary font-bold text-right max-w-[150px]">HR/Performance Reviews, Exec Approvals</span>
                </div>
             </div>
           </div>

           <div className="bg-card p-10 rounded-[32px] border border-border shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full pointer-events-none"></div>
             <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Handoff Notes</div>
             <p className="text-base font-medium text-foreground/80 leading-relaxed italic border-l-4 border-muted pl-4">
               "Please ensure you follow up with S-Leasing on Thursday about their Q4 sponsorship. I've already sent the initial email, they just need a nudge. Don't worry about the FMCG sector flags, the Director will handle those while I'm out."
             </p>
           </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6 ml-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><ListChecks className="w-4 h-4"/> {t('platform.console.cover_checklist', 'Execution Checklist')}</h3>
            <div className="text-xs font-bold text-muted-foreground">{checklist.filter(c => c.done).length} / {checklist.length} Completed</div>
          </div>
          
          <div className="space-y-4">
             {checklist.map((item) => (
               <div key={item.id} className={cn("bg-card p-6 rounded-[32px] border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group cursor-pointer", item.done ? "border-transparent opacity-60 bg-muted/30" : "border-border shadow-sm hover:border-primary/50")} onClick={() => toggleChecklistItem(item.id)}>
                 <div className="flex items-center gap-5">
                   <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0 border transition-colors", item.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30 text-transparent group-hover:border-primary/50")}>
                     <Check className="w-4 h-4"/>
                   </div>
                   <div>
                     <div className="flex items-center gap-3 mb-1">
                       <div className={cn("w-2 h-2 rounded-full", item.type === 'Urgent' ? 'bg-primary' : 'bg-emerald-500')}></div>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.type}</span>
                     </div>
                     <div className={cn("text-lg font-medium transition-colors", item.done ? "text-muted-foreground line-through" : "text-foreground")}>{item.title}</div>
                   </div>
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); showToast(`Navigating to ${item.action}`); }} className="text-xs font-bold px-6 py-3 bg-muted text-muted-foreground rounded-full hover:bg-foreground hover:text-background transition-colors flex items-center gap-2 shrink-0 md:ml-auto">
                   {item.action} <ArrowRight className="w-3 h-3" />
                 </button>
               </div>
             ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-12 font-sans pb-20 max-w-5xl mx-auto">
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Zap className="w-8 h-8 text-foreground" />
        </div>
        <h2 className="text-5xl font-serif font-light tracking-tight text-foreground mb-4">{t('platform.console.cover', 'Continuity & Cover')}</h2>
        <p className="text-base font-medium text-muted-foreground">{t('platform.console.cover_purpose', 'Enter bounded continuity mode to safely take over workflows, approvals, and communication channels for absent team members.')}</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><AlertTriangle className="w-5 h-5"/></div>
           <div>
             <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Unassigned Flags</div>
             <div className="text-3xl font-serif font-light tabular-nums">4</div>
           </div>
        </div>
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><BellRing className="w-5 h-5"/></div>
           <div>
             <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Overdue Outreach</div>
             <div className="text-3xl font-serif font-light tabular-nums">12</div>
           </div>
        </div>
        <div className="bg-foreground text-background rounded-[32px] border border-border p-6 shadow-lg flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-background/20 flex items-center justify-center text-background shrink-0"><Target className="w-5 h-5"/></div>
           <div>
             <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Team SLA Health</div>
             <div className="text-3xl font-serif font-light tabular-nums">94<span className="text-xl text-accent">%</span></div>
           </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-8 ml-2">{t('platform.console.cover_select', 'Available for Takeover')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {team.map((member:any) => (
            <div key={member.id} className="bg-card p-10 rounded-[40px] border border-border shadow-sm flex flex-col hover:shadow-md transition-all group hover:border-primary/30">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold shrink-0 text-foreground">{member.avatar}</div>
                <div>
                  <h3 className="text-3xl font-serif font-light text-foreground mb-1">{member.name}</h3>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 inline-block px-3 py-1 rounded-full">{member.role}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-muted/30 p-4 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Book Size</div>
                  <div className="text-2xl font-serif tabular-nums">{member.bookSize}</div>
                </div>
                <div className="bg-muted/30 p-4 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Flags/Risk</div>
                  <div className="text-2xl font-serif tabular-nums text-primary">{member.atRisk}</div>
                </div>
              </div>

              <div className="mt-auto">
                <button 
                  onClick={() => { setActiveCover(member); showToast(`Continuity Mode active for ${member.name}`); }}
                  className="w-full py-4 rounded-full bg-foreground text-background font-bold text-sm shadow-sm hover:bg-primary transition-colors active:scale-95 flex justify-center items-center gap-2 group-hover:shadow-md"
                >
                  {t('platform.console.cover_takeover', 'Initiate Takeover')} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
