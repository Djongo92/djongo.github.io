import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { Check, X, FileDiff, ArrowRight, ChevronDown, ChevronUp, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes';

export function ApprovalsView({ showToast, updateBadge }: any) {
  const { t } = useI18n();
  const [approvals, setApprovals] = useState(platformData.console.approvals.map(a => ({ ...a, status: 'pending' as ApprovalStatus })));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const resolvedApprovals = approvals.filter(a => a.status !== 'pending');

  const handleAction = (id: string, action: 'approved' | 'rejected' | 'changes') => {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: action } : a));
    updateBadge(pendingApprovals.length - 1);
    setExpandedId(null);
    showToast(`Approval ${action} successfully`);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight mb-2 text-foreground">{t('console_v2.approvals', 'Governance & Approvals')}</h2>
          <p className="text-sm font-medium text-muted-foreground">Review and authorize member requests, data changes, and matchmaking proposals.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between">
           <div>
             <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Pending</div>
             <div className="text-4xl font-serif font-light tabular-nums">{pendingApprovals.length}</div>
           </div>
           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Clock className="w-5 h-5"/></div>
        </div>
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between">
           <div>
             <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Processed</div>
             <div className="text-4xl font-serif font-light tabular-nums">{resolvedApprovals.length}</div>
           </div>
           <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600"><ShieldCheck className="w-5 h-5"/></div>
        </div>
        <div className="bg-foreground text-background rounded-[32px] border border-border p-6 shadow-lg flex items-center justify-between">
           <div>
             <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">SLA Target</div>
             <div className="text-4xl font-serif font-light tabular-nums">98<span className="text-2xl text-accent">%</span></div>
           </div>
           <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent"><Check className="w-5 h-5"/></div>
        </div>
      </div>

      <div className="space-y-6 mt-12">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Action Required ({pendingApprovals.length})</h3>
        {pendingApprovals.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground border border-dashed border-border rounded-[32px] bg-card flex flex-col items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center"><Check className="w-8 h-8 text-muted-foreground/50"/></div>
             <div className="text-lg font-medium">Inbox zero. All requests processed.</div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {pendingApprovals.map(app => (
                <motion.div key={app.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("bg-card border rounded-[32px] overflow-hidden transition-all", expandedId === app.id ? "border-primary/50 shadow-md" : "border-border shadow-sm hover:border-border/80")}>
                  <div className="p-6 cursor-pointer flex justify-between items-center group" onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-lg text-foreground shrink-0">{app.staff.charAt(0)}</div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-full uppercase tracking-widest">{app.type}</span>
                          <span className="text-xs font-bold text-muted-foreground">Requested by {app.staff}</span>
                        </div>
                        <h3 className="text-lg font-bold text-foreground leading-tight">{app.desc}</h3>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-border transition-colors shrink-0">
                      {expandedId === app.id ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === app.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-6 pt-0 border-t border-border mt-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                            <div>
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><FileDiff className="w-3 h-3"/> Context & History</div>
                              <p className="text-sm font-medium text-foreground/80 mb-4 bg-muted/50 p-4 rounded-2xl border border-border/50">{app.context}</p>
                              <p className="text-xs font-bold text-muted-foreground italic px-4">History: {app.history}</p>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck className="w-3 h-3"/> Policy Checks</div>
                              <ul className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/50">
                                {app.policyChecks.map((chk, i) => (
                                  <li key={i} className="text-sm font-bold text-foreground/80 flex items-center gap-3"><div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-emerald-600"/></div> {chk}</li>
                                ))}
                                <li className="text-sm font-bold text-foreground/80 flex items-center gap-3">
                                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", app.requesterConsent ? "bg-emerald-500/20 text-emerald-600" : "bg-orange-500/20 text-orange-600")}>
                                    {app.requesterConsent ? <Check className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>}
                                  </div> 
                                  Requester Consent {app.requesterConsent ? "Verified" : "Missing"}
                                </li>
                                <li className="text-sm font-bold text-foreground/80 flex items-center gap-3">
                                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", app.targetConsent ? "bg-emerald-500/20 text-emerald-600" : "bg-orange-500/20 text-orange-600")}>
                                    {app.targetConsent ? <Check className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>}
                                  </div> 
                                  Target Consent {app.targetConsent ? "Verified" : "Pending"}
                                </li>
                              </ul>
                            </div>
                          </div>
                          
                          {app.diffs.length > 0 && (
                            <div className="mt-6">
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><FileDiff className="w-3 h-3"/> Proposed State Changes</div>
                              <div className="bg-foreground text-background p-4 rounded-2xl font-mono text-xs shadow-inner">
                                {app.diffs.map((d, i) => (
                                  <div key={i} className="flex items-center gap-4 py-1">
                                    <span className="text-background/50 font-bold w-32">{d.field}:</span>
                                    <span className="text-destructive/80 line-through decoration-destructive">{d.old}</span>
                                    <ArrowRight className="w-3 h-3 text-background/30"/>
                                    <span className="text-emerald-400 font-bold">{d.new}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-8 flex justify-end gap-3 items-center">
                            <button onClick={(e) => { e.stopPropagation(); handleAction(app.id, 'rejected'); }} className="px-6 py-2.5 rounded-full text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/20">Decline</button>
                            <div className="w-px h-6 bg-border mx-1"></div>
                            <button onClick={(e) => { e.stopPropagation(); handleAction(app.id, 'changes'); }} className="px-6 py-2.5 rounded-full text-sm font-bold text-foreground bg-background border border-border hover:bg-muted shadow-sm transition-colors">{t('console_v2.request_changes', 'Request Changes')}</button>
                            <button onClick={(e) => { e.stopPropagation(); handleAction(app.id, 'approved'); }} className="px-8 py-2.5 rounded-full text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 shadow-md transition-transform active:scale-95 flex items-center gap-2"><Check className="w-4 h-4"/> {t('console_v2.approve', 'Authorize')}</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {resolvedApprovals.length > 0 && (
        <div className="space-y-6 mt-16">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Recently Resolved ({resolvedApprovals.length})</h3>
          <div className="space-y-3">
             {resolvedApprovals.map(app => (
               <div key={app.id} className="bg-muted/30 border border-border rounded-2xl p-4 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-600' : app.status === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-orange-500/20 text-orange-600')}>
                     {app.status === 'approved' ? <Check className="w-4 h-4" /> : app.status === 'rejected' ? <X className="w-4 h-4" /> : <Clock className="w-4 h-4"/>}
                   </div>
                   <div>
                     <h4 className="text-sm font-bold text-foreground line-clamp-1">{app.desc}</h4>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Requested by {app.staff} · {app.type}</p>
                   </div>
                 </div>
                 <div className="text-xs font-bold px-3 py-1 bg-background border border-border rounded-full capitalize">
                   {app.status}
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
