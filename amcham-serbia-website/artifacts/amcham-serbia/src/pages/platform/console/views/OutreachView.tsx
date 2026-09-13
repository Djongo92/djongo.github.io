import React, { useState, useMemo } from 'react';
import { platformData } from '@/data/platform';
import { MessageSquare, Clock, X, Send, Calendar, AlertTriangle, User, Zap, ChevronDown, Activity, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useConsoleState } from '../console-state';

export function OutreachView() {
  const { outreachQueue: queue, completeOutreach } = useConsoleState();
  const [composerOpen, setComposerOpen] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [filterSource, setFilterSource] = useState<string>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filteredQueue = useMemo(() => {
    if (filterSource === 'all') return queue;
    return queue.filter(q => (q.source === 'ask' && filterSource === 'ask') || (q.source !== 'ask' && filterSource === 'system'));
  }, [queue, filterSource]);

  const handleAction = (id: string) => {
    completeOutreach(id);
    setComposerOpen(null);
    setMessage("");
    if (expandedItem === id) setExpandedItem(null);
  };

  const toggleExpand = (id: string) => {
    if (expandedItem === id) setExpandedItem(null);
    else setExpandedItem(id);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 font-sans">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <h2 className="text-4xl font-serif text-foreground font-light tracking-tight mb-3">Outreach Queue</h2>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">Your assigned relationship touchpoints and check-ins.</p>
            <div className="flex items-center bg-muted/50 rounded-full p-1 border border-border/50">
              <button onClick={() => setFilterSource('all')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-colors", filterSource === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>All</button>
              <button onClick={() => setFilterSource('system')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-colors", filterSource === 'system' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>System</button>
              <button onClick={() => setFilterSource('ask')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1", filterSource === 'ask' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                From Ask <Zap className="w-3 h-3 text-amber-500" />
              </button>
            </div>
          </div>
        </div>
        <div className="text-sm font-bold px-6 py-3 bg-foreground text-background rounded-full shadow-md flex items-center gap-2">
          {filteredQueue.length} {filteredQueue.length === 1 ? 'Item' : 'Items'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-[32px] p-8 shadow-sm sticky top-24">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Queue Health
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-muted/50 p-4 rounded-2xl border border-border/50">
                <span className="text-sm font-bold text-foreground">On Cadence</span>
                <span className="text-2xl font-serif tabular-nums">{platformData.console.outreach.stats.onCadence}</span>
              </div>
              <div className="flex justify-between items-center bg-destructive/10 p-4 rounded-2xl border border-destructive/20">
                <span className="text-sm font-bold text-destructive">Overdue</span>
                <span className="text-2xl font-serif text-destructive tabular-nums">{queue.filter(q => q.overdue > 0).length}</span>
              </div>
              <div className="flex justify-between items-center bg-primary/10 p-4 rounded-2xl border border-primary/20">
                <span className="text-sm font-bold text-primary">Avg Time/Touch</span>
                <span className="text-2xl font-serif text-primary tabular-nums">{platformData.console.outreach.stats.timePerPerson}</span>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/50 text-xs font-medium text-muted-foreground leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              Quiet hours enforcement is active. Emails composed for accounts in quiet hours will be scheduled for next business morning automatically.
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {filteredQueue.map(item => {
              const company = platformData.allMembers.find(m => m.id === item.companyId);
              const isExpanded = expandedItem === item.id;
              const brief = (platformData.console.briefs as any)[item.companyId];

              return (
                <motion.div layout key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("bg-card border rounded-[32px] overflow-hidden transition-all", isExpanded ? "border-foreground/30 shadow-md" : "border-border shadow-sm")}>
                  <div className="p-6 cursor-pointer group" onClick={() => toggleExpand(item.id)}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border shadow-inner text-xl font-serif text-foreground">{company?.avatar}</div>
                        <div>
                          <h4 className="font-bold text-xl text-foreground flex items-center gap-2 group-hover:text-primary transition-colors">
                            {company?.name} 
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border/50">{item.tier}</span>
                          </h4>
                          <p className="text-xs font-bold text-muted-foreground mt-1.5 flex items-center gap-2">
                            <Clock className="w-3 h-3"/> Last Touch: <span className="text-foreground">{item.lastTouch}</span> 
                            <span className="text-border">•</span> 
                            {item.overdue > 0 ? (
                              <span className="text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Overdue {item.overdue}d</span>
                            ) : (
                              <span className="text-green-600 flex items-center gap-1"><Check className="w-3 h-3"/> On Track</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {item.quietHours && <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm"><Clock className="w-3 h-3"/> Quiet Hours</span>}
                        {item.source === 'ask' && <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-500/20 flex items-center gap-1"><Zap className="w-3 h-3"/> From Ask</span>}
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border/50 bg-muted/20">
                        <div className="p-6 space-y-6">
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                              <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Trigger Reason</div>
                              <div className="text-sm font-bold text-foreground">{item.reason}</div>
                              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.context}</div>
                            </div>
                            
                            {brief && (
                              <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Recent Signals</div>
                                <ul className="space-y-2">
                                  {brief.signals.slice(0, 2).map((sig: any, idx: number) => (
                                    <li key={idx} className="text-xs text-foreground flex gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                      {sig.text}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {composerOpen === item.id ? (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                              <div className="border border-primary/40 rounded-2xl p-1 bg-background shadow-inner focus-within:border-primary focus-within:ring-4 ring-primary/10 transition-all">
                                <textarea autoFocus value={message} onChange={e => setMessage(e.target.value)} className="w-full bg-transparent border-none rounded-xl p-4 text-sm font-medium outline-none resize-none h-32 text-foreground" placeholder={`Draft your message to ${company?.manager}...`} />
                                <div className="flex justify-between items-center px-4 py-3 bg-muted/50 rounded-xl border-t border-border/50">
                                  <div className="text-xs font-bold text-muted-foreground flex items-center gap-2"><User className="w-3.5 h-3.5"/> Sending as <span className="text-foreground">{item.owner}</span> via <span className="text-foreground">{item.channel}</span></div>
                                  <div className="flex gap-2">
                                    <button onClick={() => setComposerOpen(null)} className="px-4 py-2 rounded-full text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
                                    <button onClick={() => handleAction(item.id)} className="px-4 py-2 rounded-full text-xs font-bold bg-background text-foreground border border-border hover:bg-muted transition-colors flex items-center gap-1.5 shadow-sm"><Calendar className="w-3.5 h-3.5 text-muted-foreground"/> Schedule</button>
                                    <button onClick={() => handleAction(item.id)} className="px-6 py-2 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95 flex items-center gap-1.5"><Send className="w-3.5 h-3.5"/> Send {item.quietHours && "Later"}</button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex justify-end gap-3 pt-2">
                              <button onClick={() => handleAction(item.id)} className="px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">Mark Complete</button>
                              <button onClick={() => { setComposerOpen(item.id); setMessage(brief ? `Hi ${company?.manager.split(' ')[0]},\n\nWanted to check in regarding ${item.reason.toLowerCase()}. ${item.context}\n\nBest,\n${item.owner}` : ''); }} className="px-6 py-2.5 text-sm font-bold bg-foreground text-background shadow-md hover:bg-foreground/90 rounded-full transition-transform active:scale-95 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4"/> Draft Message
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredQueue.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[32px] bg-card/50">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-serif text-foreground mb-2">Inbox Zero</h3>
              <p className="text-muted-foreground text-sm font-medium">No outreach tasks match this filter.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
