import React, { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { Flag, MessageCircle, EyeOff, CheckCircle, RefreshCcw, Filter, AlertTriangle, ShieldAlert, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function FlagsView({ showToast, updateBadge }: any) {
  const { t } = useI18n();
  const [flags, setFlags] = useState(platformData.console.flags);
  const [replyText, setReplyText] = useState("");
  const [activeFlag, setActiveFlag] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const pendingCount = flags.filter(f => f.status === 'pending').length;

  const filteredFlags = useMemo(() => {
    if (filterSeverity === 'all') return flags;
    return flags.filter(f => f.severity.toLowerCase() === filterSeverity);
  }, [flags, filterSeverity]);

  const severityCounts = {
    high: flags.filter(f => f.status === 'pending' && f.severity === 'High').length,
    medium: flags.filter(f => f.status === 'pending' && f.severity === 'Medium').length,
    low: flags.filter(f => f.status === 'pending' && f.severity === 'Low').length
  };

  const toggleStatus = (id: string) => {
    setFlags(flags.map(f => {
      if (f.id === id) {
        const newStatus = f.status === 'pending' ? 'resolved' : 'pending';
        if (newStatus === 'resolved') showToast(t('console_v2.resolve', 'Resolved'));
        else showToast(t('console_v2.reopen', 'Reopened'));
        return { ...f, status: newStatus };
      }
      return f;
    }));
    const newCount = flags.map(f => f.id === id ? (f.status === 'pending' ? 'resolved' : 'pending') : f.status).filter(s => s === 'pending').length;
    updateBadge(newCount);
  };

  const addNote = (id: string, isInternal: boolean) => {
    showToast(isInternal ? "Internal note added" : "Member note updated");
    setReplyText("");
    setActiveFlag(null);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-6 gap-4">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">Flags & Support</h2>
          <p className="text-muted-foreground">Member inquiries and system-generated alerts requiring resolution.</p>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 rounded-full p-1.5 border border-border/50">
           <Filter className="w-4 h-4 text-muted-foreground ml-3 mr-1" />
           <button onClick={() => setFilterSeverity('all')} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2", filterSeverity === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>All <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">{pendingCount}</span></button>
           <button onClick={() => setFilterSeverity('high')} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2", filterSeverity === 'high' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>High <span className="px-1.5 py-0.5 bg-destructive/10 text-destructive rounded text-[10px]">{severityCounts.high}</span></button>
           <button onClick={() => setFilterSeverity('medium')} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2", filterSeverity === 'medium' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Medium <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[10px]">{severityCounts.medium}</span></button>
           <button onClick={() => setFilterSeverity('low')} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2", filterSeverity === 'low' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Low <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px]">{severityCounts.low}</span></button>
        </div>
      </div>

      <div className="space-y-6">
        <AnimatePresence>
          {filteredFlags.map(flag => (
            <motion.div key={flag.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("bg-card border rounded-[32px] overflow-hidden transition-all", flag.status === 'resolved' ? 'border-border/50 opacity-60 bg-muted/20' : 'border-border shadow-sm')}>
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-serif text-foreground flex items-center gap-3 mb-2 group">
                      {flag.companyName} 
                      <span className="text-[10px] font-bold font-sans text-muted-foreground uppercase tracking-widest px-3 py-1 bg-muted rounded-full border border-border/50">{flag.category}</span>
                      {flag.severity === 'High' && <span className="text-[10px] font-bold font-sans text-destructive uppercase tracking-widest px-3 py-1 bg-destructive/10 rounded-full flex items-center gap-1 border border-destructive/20"><ShieldAlert className="w-3 h-3"/> High Priority</span>}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Opened {flag.when}
                      <span className="text-border">•</span> 
                      SLA: <span className={cn("font-bold", flag.sla.includes('24h') ? 'text-amber-500' : 'text-foreground')}>{flag.sla}</span>
                    </p>
                  </div>
                  <span className={cn("text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm", flag.status === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border border-border')}>
                    {flag.status === 'pending' ? <AlertTriangle className="w-3.5 h-3.5"/> : <CheckCircle className="w-3.5 h-3.5"/>}
                    {flag.status}
                  </span>
                </div>
                
                <div className="text-lg text-foreground mb-8 p-6 bg-background rounded-3xl border border-border shadow-inner font-medium">
                  "{flag.note}"
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-muted/50 p-6 rounded-[24px] border border-border/50">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><EyeOff className="w-4 h-4"/> {t('console_v2.internal_note', 'Internal Notes')}</div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{flag.internalNotes}</p>
                  </div>
                  <div className="bg-primary/5 p-6 rounded-[24px] border border-primary/10">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4"/> {t('console_v2.member_note', 'Member Visible')}</div>
                    <p className="text-sm text-primary/80 leading-relaxed font-medium">{flag.memberVisibleNotes}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-6 mt-2">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-serif font-bold shadow-sm">{flag.assignee.charAt(0)}</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{flag.assignee}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Owner</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveFlag(activeFlag === flag.id ? null : flag.id)} className="px-5 py-2.5 rounded-full text-sm font-bold text-foreground bg-card border border-border hover:bg-muted transition-colors shadow-sm">Add Note</button>
                    <button onClick={() => toggleStatus(flag.id)} className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95 shadow-md">
                      {flag.status === 'pending' ? <><CheckCircle className="w-4 h-4"/> {t('console_v2.resolve', 'Resolve')}</> : <><RefreshCcw className="w-4 h-4"/> {t('console_v2.reopen', 'Reopen')}</>}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {activeFlag === flag.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-8 pt-8 border-t border-border">
                        <textarea autoFocus value={replyText} onChange={e => setReplyText(e.target.value)} className="w-full bg-background border border-border rounded-2xl p-5 text-sm font-medium outline-none focus:border-primary focus:ring-2 ring-primary/20 mb-5 resize-none h-32 shadow-inner transition-all text-foreground" placeholder="Type your note here..." />
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => addNote(flag.id, true)} disabled={!replyText.trim()} className="px-6 py-3 text-sm font-bold bg-muted text-foreground border border-border rounded-full hover:bg-border transition-colors shadow-sm disabled:opacity-50"><EyeOff className="w-4 h-4 inline-block mr-1.5"/> {t('console_v2.internal_note', 'Save Internal Note')}</button>
                          <button onClick={() => addNote(flag.id, false)} disabled={!replyText.trim()} className="px-6 py-3 text-sm font-bold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-transform active:scale-95 shadow-md flex items-center gap-2 disabled:opacity-50"><MessageCircle className="w-4 h-4"/> {t('console_v2.member_note', 'Update Member')}</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredFlags.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[32px] bg-card/50">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-serif text-foreground mb-2">No Flags Found</h3>
            <p className="text-muted-foreground font-medium text-sm">No items match the current severity filter.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
