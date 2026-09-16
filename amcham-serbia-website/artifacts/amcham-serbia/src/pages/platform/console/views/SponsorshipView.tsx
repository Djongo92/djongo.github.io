import React, { useState } from 'react';
import { platformData } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, TrendingUp, ArrowRight, XCircle, Target } from 'lucide-react';
import { cn, parseEuro, fmtEuro } from '@/lib/utils';

const STAGES = ['prospecting', 'proposed', 'confirmed'] as const;
const STAGE_LABEL: Record<string, string> = { prospecting: 'Prospecting', proposed: 'Proposed', confirmed: 'Confirmed', declined: 'Declined' };
const STAGE_COLOR: Record<string, string> = {
  prospecting: 'bg-muted text-muted-foreground border-border',
  proposed: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  declined: 'bg-destructive/10 text-destructive border-destructive/20'
};

export function SponsorshipView({ navigateTo }: { navigateTo: (v: string, c?: string) => void }) {
  const [items, setItems] = useState<any[]>(() => (platformData.console as any).sponsorship);

  const advance = (id: string) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const idx = STAGES.indexOf(i.stage);
      return idx >= 0 && idx < STAGES.length - 1 ? { ...i, stage: STAGES[idx + 1] } : i;
    }));
  };

  const decline = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, stage: 'declined' } : i));
  };

  const confirmedValue = items.filter(i => i.stage === 'confirmed').reduce((sum, i) => sum + parseEuro(i.value), 0);
  const pipelineValue = items.filter(i => i.stage !== 'declined').reduce((sum, i) => sum + parseEuro(i.value), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2 flex items-center gap-3"><Award className="w-8 h-8 text-primary"/> Sponsorship Pipeline</h2>
          <p className="text-sm font-medium text-muted-foreground max-w-2xl">Non-dues revenue from members sponsoring events and initiatives — sold against who's sponsored before.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Confirmed This Year</div>
            <div className="text-4xl font-serif font-light tabular-nums text-emerald-600">{fmtEuro(confirmedValue)}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600"><TrendingUp className="w-5 h-5"/></div>
        </div>
        <div className="bg-card rounded-[32px] border border-border p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Open Pipeline</div>
            <div className="text-4xl font-serif font-light tabular-nums">{fmtEuro(pipelineValue)}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Target className="w-5 h-5"/></div>
        </div>
        <div className="bg-foreground text-background rounded-[32px] border border-border p-6 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Active Deals</div>
            <div className="text-4xl font-serif font-light tabular-nums">{items.filter(i => i.stage !== 'declined').length}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent"><Award className="w-5 h-5"/></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...STAGES, 'declined'].map(stage => {
          const stageItems = items.filter(i => i.stage === stage);
          return (
            <div key={stage} className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border", STAGE_COLOR[stage])}>{STAGE_LABEL[stage]}</span>
                <span className="text-xs font-bold text-muted-foreground">{stageItems.length}</span>
              </div>
              <div className="space-y-4 min-h-[80px]">
                <AnimatePresence>
                  {stageItems.map(item => {
                    const company = platformData.allMembers.find(c => c.id === item.companyId);
                    return (
                      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={item.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                        <button onClick={() => navigateTo('heatmap', item.companyId)} className="font-bold text-foreground hover:text-primary transition-colors text-sm text-left mb-1">{company?.name}</button>
                        <div className="text-xs text-muted-foreground mb-3 leading-relaxed">{item.initiative}</div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-serif tabular-nums text-foreground">{item.value}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.owner}</span>
                        </div>
                        <p className="text-xs text-muted-foreground/80 border-t border-border/50 pt-3 mb-3">{item.notes}</p>
                        {stage !== 'confirmed' && stage !== 'declined' && (
                          <div className="flex gap-2">
                            <button onClick={() => advance(item.id)} className="flex-1 py-2 rounded-full text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5">
                              Advance <ArrowRight className="w-3 h-3"/>
                            </button>
                            <button onClick={() => decline(item.id)} className="p-2 rounded-full text-destructive bg-background border border-border hover:bg-destructive/10 transition-colors">
                              <XCircle className="w-4 h-4"/>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {stageItems.length === 0 && (
                  <div className="text-xs text-muted-foreground/60 italic text-center py-8 border border-dashed border-border rounded-2xl">None yet</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
