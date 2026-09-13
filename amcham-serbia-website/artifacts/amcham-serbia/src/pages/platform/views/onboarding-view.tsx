import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, ArrowRight, SkipForward, Mail, X, TrendingUp, CheckCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { platformData } from '@/data/platform';

export default function OnboardingView({ t, navigateTo, showToast }: any) {
  const oData = (platformData.portal as any).onboarding;
  
  // Local state for phases and steps
  const [phases, setPhases] = useState(oData.phases);
  const [selectedPhaseId, setSelectedPhaseId] = useState('ph2'); // Active by default

  const [emailDraftOpen, setEmailDraftOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailBody, setEmailBody] = useState('Hi, we would like to schedule our onboarding check-in call to review our first-90-days plan.');

  useEffect(() => {
    if (!emailDraftOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEmailDraftOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [emailDraftOpen]);

  const markGoal = (phaseId: string, stepId: string, action: 'done' | 'skipped') => {
    setPhases(phases.map((ph:any) => {
      if (ph.id === phaseId) {
        return {
          ...ph,
          steps: ph.steps.map((s:any) => s.id === stepId ? { ...s, done: action === 'done', skipped: action === 'skipped' } : s)
        };
      }
      return ph;
    }));
    showToast(action === 'done' ? 'Goal completed!' : 'Goal skipped.');
  };

  const totalSteps = phases.reduce((acc:number, ph:any) => acc + ph.steps.length, 0);
  const completedSteps = phases.reduce((acc:number, ph:any) => acc + ph.steps.filter((s:any) => s.done || s.skipped).length, 0);
  const progress = Math.round((completedSteps / totalSteps) * 100);

  const activePhase = phases.find((p:any) => p.id === selectedPhaseId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-foreground text-background p-8 md:p-12 rounded-[40px] shadow-xl flex flex-col md:flex-row gap-8 justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#40D9F1]/10 pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-4">Day {oData.day}</div>
          <h2 className="text-4xl md:text-5xl font-serif font-light mb-4">Your First 90 Days</h2>
          <p className="text-background/80 text-sm md:text-base leading-relaxed">
            A guided plan to integrate your team and start seeing concrete value from membership.
          </p>
        </div>
        
        <div className="relative z-10 bg-background/10 backdrop-blur-md rounded-[32px] p-6 border border-background/20 min-w-[250px] shrink-0">
          <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-4">Overall Progress</div>
          <div className="flex items-end gap-2 mb-3">
             <div className="text-5xl font-serif font-light">{progress}%</div>
          </div>
          <div className="w-full bg-background/20 rounded-full h-2 overflow-hidden mb-1">
             <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="bg-[#40D9F1] h-full" />
          </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 p-6 md:p-8 rounded-[32px] flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6 text-primary"/>
        </div>
        <div>
          <h4 className="font-bold text-lg mb-1 text-primary">You are ahead of the curve</h4>
          <p className="text-sm text-foreground/80 leading-relaxed">Companies in the <strong className="text-foreground">{platformData.member.sector}</strong> sector typically complete the first engagement phase by day 40. You're on track to finish by day 30, placing you in the top 15% of active new members.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          
          {/* FUNNEL VIZ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {phases.map((ph:any, i:number) => (
              <div key={ph.id} onClick={() => setSelectedPhaseId(ph.id)} className={cn("p-6 rounded-[32px] border cursor-pointer transition-all flex flex-col h-full relative group", selectedPhaseId === ph.id ? "bg-foreground text-background border-foreground shadow-lg scale-[1.02]" : "bg-card border-border hover:border-primary/50 text-foreground")}>
                <div className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-70">{ph.timeframe}</div>
                <div className="font-serif text-xl mb-4">{ph.title}</div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-current/10">
                  <div className="text-xs font-bold">{ph.steps.filter((s:any)=>s.done || s.skipped).length}/{ph.steps.length} done</div>
                  {ph.status === 'completed' || ph.steps.every((s:any) => s.done || s.skipped) ? (
                    <CheckCircle2 className={cn("w-5 h-5", selectedPhaseId === ph.id ? "text-[#40D9F1]" : "text-green-500")}/>
                  ) : ph.status === 'active' ? (
                    <div className="w-2 h-2 rounded-full bg-[#40D9F1] animate-pulse"/>
                  ) : null}
                </div>
                
                {selectedPhaseId === ph.id && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-foreground z-10" />
                )}
              </div>
            ))}
          </div>

          {/* ACTIVE PHASE DETAILS */}
          <div className="bg-card border border-border rounded-[40px] p-8 shadow-sm mt-6">
            <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-6">Action Plan: {activePhase.title}</h3>
            
            <AnimatePresence mode="wait">
              <motion.div key={activePhase.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {activePhase.steps.map((g:any, i:number) => (
                  <div key={g.id} className={cn("flex flex-col sm:flex-row gap-4 p-6 rounded-3xl border transition-all", g.done ? "bg-primary/5 border-primary/20" : g.skipped ? "bg-muted/50 border-border opacity-60" : "bg-background border-border shadow-sm")}>
                     <div className="flex gap-4 flex-1">
                       <div className="mt-1 shrink-0">
                         {g.done ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <div className="w-6 h-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-[10px] font-bold text-muted-foreground">{i + 1}</div>}
                       </div>
                       <div className="flex-1">
                         <h4 className={cn("text-lg font-bold mb-1", g.done || g.skipped ? "text-muted-foreground" : "text-foreground")}>{g.title}</h4>
                         <p className="text-sm text-muted-foreground mb-4">{g.desc}</p>
                         
                         {g.skipped && <span className="text-xs font-bold text-muted-foreground">Skipped</span>}
                       </div>
                     </div>
                     
                     {!(g.done || g.skipped) && (
                       <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                         <button onClick={() => navigateTo(g.route)} className="w-full sm:w-auto px-5 py-2.5 bg-foreground text-background rounded-full font-bold text-xs shadow-sm hover:scale-95 transition-transform flex items-center justify-center gap-2">Go to {g.title.split(' ')[1] || 'Page'} <ArrowRight className="w-3 h-3"/></button>
                         <div className="flex gap-2 w-full sm:w-auto">
                           <button onClick={() => markGoal(activePhase.id, g.id, 'done')} className="flex-1 px-4 py-2.5 border border-border rounded-full font-bold text-xs hover:bg-muted transition-colors flex items-center justify-center gap-2"><CheckCircle2 className="w-3 h-3"/> Mark Done</button>
                           <button onClick={() => markGoal(activePhase.id, g.id, 'skipped')} className="flex-1 px-4 py-2.5 text-muted-foreground font-bold text-xs hover:bg-muted rounded-full transition-colors flex items-center justify-center gap-2"><SkipForward className="w-3 h-3"/> Skip</button>
                         </div>
                       </div>
                     )}
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-[40px] p-8 shadow-sm flex flex-col items-center text-center sticky top-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-3xl font-bold text-primary mb-6 relative">
              {oData.manager.avatar}
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-card rounded-full"></div>
            </div>
            <h3 className="text-2xl font-serif font-medium mb-1">{oData.manager.name}</h3>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-6">{oData.manager.role}</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              "I'm here to ensure you get the most out of your membership. If you're not sure where to start, reach out."
            </p>
            {emailSent ? (
              <div className="w-full px-6 py-4 bg-green-500/10 text-green-600 border border-green-500/20 rounded-full font-bold text-sm flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5"/> {t('portal_message_sent', 'Message Sent')}</div>
            ) : (
              <button onClick={() => setEmailDraftOpen(true)} className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-full font-bold text-sm shadow-sm hover:scale-95 transition-transform flex items-center justify-center gap-2">
                <Mail className="w-4 h-4"/> Contact Manager
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {emailDraftOpen && (
          <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEmailDraftOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} role="dialog" aria-modal="true" aria-label={`Message ${oData.manager.name}`} className="bg-card border border-border rounded-[40px] shadow-2xl max-w-lg w-full p-8 md:p-10" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-serif text-3xl font-light flex items-center gap-3"><Mail className="w-6 h-6 text-primary"/> Message {oData.manager.name}</h3>
                <button onClick={() => setEmailDraftOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors" aria-label="Close dialog"><X className="w-5 h-5"/></button>
              </div>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                rows={5}
                aria-label={`Message body to ${oData.manager.name}`}
                className="w-full bg-muted/30 border border-border rounded-2xl p-5 text-sm outline-none focus:border-primary/50 resize-none mb-8"
              />
              <button
                onClick={() => { setEmailSent(true); setEmailDraftOpen(false); showToast(`Message sent to ${oData.manager.name}`); }}
                disabled={!emailBody.trim()}
                className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-full font-bold text-sm shadow-sm disabled:opacity-50 transition-transform active:scale-95"
              >
                Send Message
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
