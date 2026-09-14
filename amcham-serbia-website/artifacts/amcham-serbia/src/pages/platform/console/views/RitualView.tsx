import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { Check, Clock, FileText, User, MessageSquare, AlertTriangle, ArrowRight, X, ChevronDown, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function RitualView({ navigateTo, showToast, updateBadge, roleParam }: any) {
  const { t } = useI18n();
  const [completed, setCompleted] = useState<string[]>([]);
  const [snoozed, setSnoozed] = useState<string[]>([]);
  const [snoozeModal, setSnoozeModal] = useState<string | null>(null);
  const [snoozeReason, setSnoozeReason] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [checkedPoints, setCheckedPoints] = useState<Record<string, boolean>>({});

  const items = platformData.console.ritual.items;
  const activeItems = items.filter(i => !completed.includes(i.id) && !snoozed.includes(i.id));

  const action = (id: string, type: 'complete' | 'snooze') => {
    if (type === 'complete') {
      setCompleted(p => [...p, id]);
      showToast(t('console_v2.completed', 'Completed'));
    } else {
      setSnoozed(p => [...p, id]);
      showToast(t('console_v2.snoozed', 'Snoozed'));
    }
    updateBadge(activeItems.length - 1);
    if (expandedItem === id) setExpandedItem(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const togglePoint = (id: string) => {
    setCheckedPoints(p => ({ ...p, [id]: !p[id] }));
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">Daily Ritual</h2>
          <p className="text-muted-foreground">High-leverage actions surfaced by the OS Engine.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Current Streak</span>
            <span className="text-lg font-serif text-primary">{platformData.console.ritual.streak} Days</span>
          </div>
          <div className="text-sm font-bold px-6 py-3 bg-foreground text-background rounded-full shadow-md flex items-center gap-2">
            {activeItems.length} Remaining
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {activeItems.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[32px] bg-card/50">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-serif text-foreground mb-2">Ritual Complete</h3>
            <p className="text-muted-foreground font-medium">You've cleared your high-priority items for today.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <AnimatePresence>
          {activeItems.map((item, idx) => {
            const isExpanded = expandedItem === item.id;
            const company = platformData.allMembers.find(m => m.id === item.companyId);
            const brief = (platformData.console.briefs as any)[item.companyId];

            return (
              <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("bg-card border rounded-[32px] overflow-hidden transition-all", isExpanded ? "border-foreground/30 shadow-md ring-1 ring-foreground/10" : "border-border shadow-sm")}>
                <div className="p-6 cursor-pointer group relative" onClick={() => toggleExpand(item.id)}>
                  <div className="absolute top-6 left-6 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground font-serif">{idx + 1}</div>
                  <div className="pl-12 flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className={cn("text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border", item.urgency === 'Critical' ? 'bg-destructive/10 text-destructive border-destructive/20' : item.urgency === 'High' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-primary/10 text-primary border-primary/20')}>{item.tag}</span>
                      <span className="text-xs font-medium text-muted-foreground">{item.source}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-bold text-foreground bg-muted px-3 py-1.5 rounded-full border border-border shadow-sm flex items-center gap-1.5">Value: {item.expectedValue}</div>
                      <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isExpanded ? "rotate-180" : "opacity-0 group-hover:opacity-100")} />
                    </div>
                  </div>
                  <div className="pl-12">
                    <h3 className="text-2xl font-serif mb-2 text-foreground group-hover:text-primary transition-colors">{item.text}</h3>
                    <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-3 gap-y-1.5">
                      <span className="font-bold text-foreground bg-background px-3 py-1 rounded-md border border-border shadow-sm text-xs flex items-center gap-1.5">Goal: {item.action}</span>
                      <span className="flex items-center gap-1">Confidence: <span className="font-bold text-foreground">{item.confidence}</span></span>
                      <span className="text-border hidden sm:inline">•</span>
                      <span className="flex items-center gap-1">Target: <span className="font-bold text-foreground">{company?.name}</span></span>
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border/50 bg-muted/20">
                      <div className="p-8 pl-18 space-y-8">
                        {brief && (
                          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Preparation Checklist</h4>
                            <div className="space-y-3">
                              {brief.talkingPoints.map((pt: string, i: number) => {
                                const ptId = `${item.id}-pt-${i}`;
                                const isChecked = checkedPoints[ptId];
                                return (
                                  <label key={i} className={cn("flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer", isChecked ? "bg-muted/50 border-border" : "bg-background border-border hover:border-foreground/30")}>
                                    <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors", isChecked ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border")}>
                                      {isChecked && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className={cn("text-sm font-medium transition-colors", isChecked ? "text-muted-foreground line-through" : "text-foreground")}>{pt}</span>
                                  </label>
                                );
                              })}
                            </div>
                            
                            <div className="mt-6 pt-5 border-t border-border flex items-start gap-3">
                              <User className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Attendee Context</div>
                                <div className="text-sm text-foreground/80 leading-relaxed">{brief.attendeeContext}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); action(item.id, 'complete'); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold shadow-md hover:bg-primary/90 hover:shadow-lg transform active:scale-95 transition-all">
                            <CheckCircle className="w-4 h-4" /> {t('console_v2.mark_complete', 'Mark Complete')}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setSnoozeModal(item.id); }} className="flex items-center gap-2 bg-background text-foreground border border-border px-6 py-3 rounded-full text-sm font-bold hover:bg-muted transition-colors shadow-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" /> {t('console_v2.snooze', 'Snooze')}
                          </button>
                          
                          <div className="w-px h-8 bg-border mx-2 hidden sm:block"></div>
                          
                          <button onClick={(e) => { e.stopPropagation(); navigateTo('heatmap', item.companyId); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-bold px-4 py-2 rounded-full hover:bg-muted transition-colors border border-transparent hover:border-border">
                            <User className="w-4 h-4" /> {t('console_v2.dossier', 'Dossier')}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); navigateTo('brief', item.companyId); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-bold px-4 py-2 rounded-full hover:bg-muted transition-colors border border-transparent hover:border-border">
                            <FileText className="w-4 h-4" /> {t('console_v2.brief', 'Brief')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {snoozeModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-card border border-border rounded-[32px] p-8 w-full max-w-md shadow-2xl font-sans relative overflow-hidden">
            <h3 className="text-2xl font-serif mb-2 text-foreground">{t('console_v2.snooze_reason', 'Snooze item')}</h3>
            <p className="text-sm text-muted-foreground mb-6">Briefly explain why you're delaying this action.</p>
            <textarea autoFocus value={snoozeReason} onChange={e => setSnoozeReason(e.target.value)} className="w-full bg-background border border-border rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 ring-primary/20 mb-6 resize-none h-28 shadow-inner transition-all" placeholder="E.g., Waiting for Q4 budgets to finalize..." />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSnoozeModal(null)} className="px-5 py-2.5 rounded-full text-sm font-bold text-muted-foreground hover:bg-muted transition-colors hover:text-foreground">Cancel</button>
              <button onClick={() => { action(snoozeModal, 'snooze'); setSnoozeModal(null); }} disabled={!snoozeReason.trim()} className="px-6 py-2.5 rounded-full text-sm font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50">{t('console_v2.snooze', 'Snooze')}</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
