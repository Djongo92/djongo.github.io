import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { cn } from '@/lib/utils';
import { Download, FileText, CheckCircle2, AlertTriangle, ArrowRight, Check, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BriefView({ companyId, navigateTo }: { companyId: string | null, navigateTo: (v:string) => void }) {
  const { t } = useI18n();
  const [readProgress, setReadProgress] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ talkingPoints: true, context: true });
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState("");

  const c = companyId ? platformData.allMembers.find(x => x.id === companyId) : undefined;
  const brief = companyId ? platformData.console.briefs[companyId as keyof typeof platformData.console.briefs] as any : undefined;

  // Simple reading progress based on scroll within the modal if it's scrollable,
  // or window if it's page-level. We'll attach to window for general case.
  useEffect(() => {
    const handleScroll = () => {
      const scrollPx = document.documentElement.scrollTop || document.body.scrollTop;
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (winHeightPx > 0) {
         setReadProgress((scrollPx / winHeightPx) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSection = (s: string) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));
  const toggleAction = (i: number) => setCompletedActions(p => ({ ...p, [i]: !p[i] }));

  return (
    <div className="max-w-4xl mx-auto bg-card rounded-[40px] text-card-foreground min-h-[800px] p-12 md:p-20 shadow-xl border border-border relative my-10 print:shadow-none print:p-0 print:border-none print:m-0 font-sans overflow-hidden">
      
      {/* Sticky Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50 print:hidden">
        <div className="h-full bg-primary transition-all duration-150 ease-out" style={{ width: `${readProgress}%` }}></div>
      </div>

      <div className="absolute top-8 right-8 flex gap-3 print:hidden">
        <button onClick={() => navigateTo('accounts')} className="px-6 py-3 rounded-full bg-muted text-foreground font-bold text-xs hover:bg-border transition-colors">{t('platform.console.close', 'Close')}</button>
        <button onClick={() => window.print()} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
           <Download className="w-4 h-4" /> {t('platform.console.print_brief', 'Print Brief')}
        </button>
      </div>

      <div className="mb-6 print:hidden">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Target className="w-4 h-4"/> {t('platform.console.brief_purpose', 'Source-linked meeting workspace.')}</p>
      </div>

      <div className="border-b-[4px] border-foreground pb-10 mb-12 mt-6">
        <div className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4 flex justify-between items-center">
          <span>{t('platform.console.amcham_executive_briefing', 'AmCham Executive Briefing')}</span>
          <span className={cn("px-3 py-1 rounded-full", c.lifecycle === 'at-risk' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{c.lifecycle} priority</span>
        </div>
        <h1 className="text-6xl font-serif font-light tracking-tight mb-4">{c.name}</h1>
        <p className="text-xl font-medium text-foreground/60">{c.sector} · {c.manager} · {c.tier}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="bg-background p-8 rounded-[32px] border border-border shadow-sm">
          <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">{t('platform.console.engagement_score', 'Score')}</div>
          <div className="text-4xl font-serif font-light tabular-nums text-foreground">{c.score}/100</div>
          <div className={cn("mt-2 text-sm font-bold font-sans", c.scoreTrend > 0 ? "text-emerald-500" : "text-primary")}>{c.scoreTrend > 0 ? '+' : ''}{c.scoreTrend} 30d trend</div>
        </div>
        <div className="bg-background p-8 rounded-[32px] border border-border shadow-sm">
          <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">{t('platform.console.annual_value', 'Value')}</div>
          <div className="text-4xl font-serif font-light tabular-nums text-foreground">{c.fee}</div>
        </div>
        <div className="bg-background p-8 rounded-[32px] border border-border shadow-sm">
          <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">{t('platform.console.renewal_date', 'Renewal')}</div>
          <div className="text-4xl font-serif font-light tabular-nums text-foreground">{c.renewalDate}</div>
        </div>
      </div>

      <div className="mb-16">
        <h3 className="text-[10px] font-bold text-muted-foreground border-b border-border pb-3 mb-6 uppercase tracking-widest flex items-center gap-2">
           <CheckCircle2 className="w-4 h-4"/> {t('platform.console.the_ask', 'The Ask')} & Desired Outcome
        </h3>
        {brief ? (
          <div>
            <div className="bg-foreground text-background p-10 rounded-[32px] mb-8 shadow-lg relative overflow-hidden">
               <div className="absolute -right-10 -top-10 text-background/10"><Target className="w-64 h-64"/></div>
               <div className="relative z-10">
                 <div className="text-3xl font-serif font-light text-accent mb-6 leading-tight">{brief.ask}</div>
                 <div className="text-sm font-bold text-background/80 uppercase tracking-widest flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-accent"></div> Target: <span className="text-background font-medium normal-case ml-2">{brief.desiredOutcome}</span>
                 </div>
               </div>
            </div>
            
            <p className="text-xl font-medium text-foreground/80 leading-relaxed mb-10 pl-4 border-l-4 border-muted">{brief.rationale}</p>
            
            {brief.signals && brief.signals.length > 0 && (
              <div className="bg-muted/30 rounded-[32px] p-8 border border-border">
                <div className="text-[10px] uppercase font-bold text-foreground tracking-widest mb-6">Supporting Signals</div>
                <div className="flex flex-col gap-3">
                  {brief.signals.map((sig: any, idx: number) => (
                    <div key={idx} className="bg-background border border-border px-5 py-4 rounded-2xl text-sm font-medium text-foreground flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-2 h-2 rounded-full", sig.type === 'web' ? 'bg-blue-500' : sig.type === 'engagement' ? 'bg-emerald-500' : 'bg-primary')}></div>
                        {sig.text}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-3 py-1 rounded-full">{sig.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground font-medium italic text-lg">{t('platform.console.no_ask_configured', 'No active brief generated.')}</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
         <div className="bg-card border border-border rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-6 bg-muted/30 border-b border-border flex justify-between items-center cursor-pointer select-none" onClick={() => toggleSection('talkingPoints')}>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <FileText className="w-4 h-4"/> {t('platform.console.talking_points', 'Talking Points')}
              </h3>
              {expandedSections.talkingPoints ? <ChevronUp className="w-4 h-4 text-muted-foreground"/> : <ChevronDown className="w-4 h-4 text-muted-foreground"/>}
            </div>
            
            <AnimatePresence>
              {expandedSections.talkingPoints && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="p-8">
                    {brief ? (
                      <ul className="space-y-6">
                        {brief.talkingPoints.map((tp: string, i: number) => (
                          <li key={i} className="flex gap-4 items-start group">
                            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 text-xs font-bold group-hover:bg-primary/10 group-hover:text-primary transition-colors">{i+1}</div>
                            <span className="text-base font-medium text-foreground leading-relaxed pt-0.5">{tp}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-muted-foreground font-medium italic">{t('platform.console.review_timeline_context', 'Review timeline for context')}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
         </div>

         <div className="bg-card border border-border rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-6 bg-muted/30 border-b border-border flex justify-between items-center cursor-pointer select-none" onClick={() => toggleSection('context')}>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 Agenda & Context
              </h3>
              {expandedSections.context ? <ChevronUp className="w-4 h-4 text-muted-foreground"/> : <ChevronDown className="w-4 h-4 text-muted-foreground"/>}
            </div>
            
            <AnimatePresence>
              {expandedSections.context && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="p-8 space-y-8">
                    {brief ? (
                      <>
                         <div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3">Agenda</div>
                            <div className="space-y-3">
                               {brief.agenda.map((a:string, i:number) => (
                                 <div key={i} className="text-sm font-medium text-foreground flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-border"></div> {a}</div>
                               ))}
                            </div>
                         </div>
                         {brief.contradictions.length > 0 && (
                           <div>
                              <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-3 flex items-center gap-2"><AlertTriangle className="w-3 h-3"/> Known Contradictions</div>
                              <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl space-y-2">
                                 {brief.contradictions.map((c:string, i:number) => (
                                   <div key={i} className="text-sm font-medium text-foreground">{c}</div>
                                 ))}
                              </div>
                           </div>
                         )}
                         <div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3">Attendee Context</div>
                            <div className="text-sm font-medium text-foreground/80 bg-muted/50 p-5 rounded-2xl border border-border/50 italic">"{brief.attendeeContext}"</div>
                         </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground font-medium italic">No context available.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
         </div>
      </div>

      <div className="border-t border-border pt-12 flex flex-col gap-6">
         <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            Execution Workspace
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Checklist</div>
              <div className="space-y-3">
                {brief?.followUpActions.map((a:string, i:number) => (
                  <label key={i} className={cn("flex items-center gap-4 cursor-pointer p-3 rounded-xl transition-colors border", completedActions[i] ? "bg-muted/50 border-transparent opacity-60" : "bg-background border-border hover:border-primary/30")}>
                    <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0 border transition-colors", completedActions[i] ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30 text-transparent")}>
                      <Check className="w-4 h-4"/>
                    </div>
                    <span className={cn("text-sm font-medium transition-colors", completedActions[i] ? "text-muted-foreground line-through" : "text-foreground")}>{a}</span>
                    <input type="checkbox" className="hidden" checked={!!completedActions[i]} onChange={() => toggleAction(i)} />
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Notes & Commitments</div>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log commitments, mood, and next steps here..." 
                className="flex-1 w-full bg-card border border-border rounded-[32px] p-6 text-base font-medium outline-none focus:border-primary/50 transition-colors shadow-inner resize-none min-h-[200px]"
              />
              <div className="mt-4 flex justify-end">
                <button className="px-6 py-2.5 rounded-full bg-foreground text-background font-bold text-xs shadow-sm hover:shadow-md transition-all">Save to CRM</button>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
