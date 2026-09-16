import React, { useState } from 'react';
import { platformData, committeeRosters } from '@/data/platform';
import { policyWins } from '@/data/mock';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, ChevronDown, ChevronUp, Trophy, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CommitteesView({ navigateTo }: { navigateTo: (v: string, c?: string) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const engagedCompanyIds = new Set<string>();
  committeeRosters.forEach(c => { engagedCompanyIds.add(c.chairCompanyId); c.memberCompanyIds.forEach(id => engagedCompanyIds.add(id)); });
  const committeesWithWins = committeeRosters.filter(c => policyWins.some(w => w.committee === c.name)).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 font-sans">
      <div className="border-b border-border pb-6">
        <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">Committees</h2>
        <p className="text-sm font-medium text-muted-foreground max-w-2xl">Real rosters, not just names and icons — who chairs, who shows up, and which policy wins their work drove.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Active Committees</div>
            <div className="text-4xl font-serif font-light tabular-nums">{committeeRosters.length}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Users className="w-5 h-5"/></div>
        </div>
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Companies Engaged</div>
            <div className="text-4xl font-serif font-light tabular-nums">{engagedCompanyIds.size}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600"><Crown className="w-5 h-5"/></div>
        </div>
        <div className="bg-foreground text-background rounded-[32px] border border-border p-6 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">With a Policy Win</div>
            <div className="text-4xl font-serif font-light tabular-nums">{committeesWithWins} <span className="text-lg text-accent">/ {committeeRosters.length}</span></div>
          </div>
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent"><Trophy className="w-5 h-5"/></div>
        </div>
      </div>

      <div className="space-y-4">
        {committeeRosters.map(committee => {
          const chair = platformData.allMembers.find(c => c.id === committee.chairCompanyId);
          const members = committee.memberCompanyIds.map(id => platformData.allMembers.find(c => c.id === id)).filter(Boolean) as any[];
          const wins = policyWins.filter((w: any) => w.committee === committee.name);
          const isExpanded = expandedId === committee.id;

          return (
            <motion.div key={committee.id} layout className={cn("bg-card border rounded-[32px] overflow-hidden transition-all", isExpanded ? "border-primary/40 shadow-md" : "border-border shadow-sm")}>
              <div className="p-6 md:p-8 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : committee.id)}>
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-serif font-light text-foreground">{committee.name}</h3>
                      {wins.length > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1"><Trophy className="w-3 h-3"/> {wins.length} Win{wins.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{committee.mandate}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Next Meeting</div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground"/> {committee.nextMeeting}</div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground"/> : <ChevronDown className="w-5 h-5 text-muted-foreground"/>}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button onClick={(e) => { e.stopPropagation(); navigateTo('heatmap', chair?.id); }} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-full pl-1.5 pr-4 py-1.5 hover:bg-primary/10 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{chair?.avatar}</div>
                    <span className="text-xs font-bold text-primary">{chair?.name} · Chair</span>
                  </button>
                  {members.map(m => (
                    <button key={m.id} onClick={(e) => { e.stopPropagation(); navigateTo('heatmap', m.id); }} className="flex items-center gap-2 bg-muted rounded-full pl-1.5 pr-4 py-1.5 hover:bg-border/60 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-background text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0 border border-border">{m.avatar}</div>
                      <span className="text-xs font-bold text-foreground/80">{m.name}</span>
                    </button>
                  ))}
                  {members.length === 0 && <span className="text-xs text-muted-foreground/60 italic">No members beyond the chair yet</span>}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && wins.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-6 md:px-8 pb-8 pt-2 border-t border-border/50">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 mt-4">Policy Wins This Roster Drove</div>
                      <div className="space-y-3">
                        {wins.map((w: any) => (
                          <div key={w.id} className="bg-muted/30 border border-border/50 rounded-2xl p-4">
                            <div className="font-bold text-sm text-foreground mb-1">{w.title}</div>
                            <div className="text-xs text-muted-foreground leading-relaxed">{w.outcome}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
