import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, FileText, BookOpen, MessageSquare, GitCompare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TierChip } from '@/components/ai-privacy';

// Mock-up for review: a committee draft checked against what AmCham has
// published before. Not linked from the sidebar yet.
const CHECKS = [
  {
    id: 'c1', status: 'conflict' as const,
    topic: 'Fixed-term contracts',
    draft: 'AmCham supports limiting fixed-term employment to a maximum of 12 months, after which the contract becomes permanent.',
    draftWhere: 'Draft comment, Article 37 · Labour & HR Committee · 9 Oct 2026',
    earlier: 'Members need flexibility for project-based work. We recommend keeping the maximum duration of fixed-term contracts at 24 months.',
    earlierWhere: '2025 position paper on the Labour Law, page 4 · published 14 Mar 2025',
    explain: 'The draft supports 12 months. The 2025 paper argued for 24. If AmCham’s view has changed, the comment should say why; if not, the draft needs correcting.',
  },
  {
    id: 'c2', status: 'match' as const,
    topic: 'Remote work',
    draft: 'Remote work should be allowed by agreement, with the employer covering agreed equipment costs.',
    draftWhere: 'Draft comment, Article 42',
    earlier: 'Remote work arrangements should be set by agreement between employer and employee.',
    earlierWhere: '2024 HR policy note',
    explain: 'Consistent with what AmCham said before.',
  },
  {
    id: 'c3', status: 'match' as const,
    topic: 'Transition period',
    draft: 'We ask for a transition period of at least 12 months for contracts already in force.',
    draftWhere: 'Draft comment, final provisions',
    earlier: 'Any change to employment rules should allow a transition period of at least one year.',
    earlierWhere: '2025 position paper, page 6',
    explain: 'Consistent with what AmCham said before.',
  },
];

export function PositionCheckView({ showToast }: { showToast: (m: string) => void }) {
  const [selected, setSelected] = useState('c1');
  const [resolved, setResolved] = useState<string | null>(null);
  const c = CHECKS.find((x) => x.id === selected)!;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2"><GitCompare className="w-4 h-4" />Position check</div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">Labour Law comment, checked</h2>
          <p className="text-muted-foreground leading-relaxed">Before the committee sends a comment, Compass compares every statement in it with what AmCham has published before, and points out anything that says something different.</p>
        </div>
        <TierChip tier="on-prem" className="self-start md:self-auto" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Statements checked</div><div className="text-3xl font-serif text-foreground">14</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Match earlier positions</div><div className="text-3xl font-serif text-foreground">13</div></div>
        <div className="rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-400/10 p-4"><div className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Says something different</div><div className="text-3xl font-serif text-foreground">{resolved ? 0 : 1}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-6 items-start">
        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {CHECKS.map((x) => (
            <button key={x.id} onClick={() => setSelected(x.id)} className={cn('w-full text-left p-4 flex gap-3', selected === x.id ? 'bg-primary/5' : 'hover:bg-muted/50')}>
              {x.status === 'conflict' && resolved !== x.id
                ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              <span>
                <span className="block font-semibold text-foreground">{x.topic}</span>
                <span className="block text-xs text-muted-foreground">{x.status === 'conflict' && resolved !== x.id ? 'Different from 2025' : 'Matches earlier position'}</span>
              </span>
            </button>
          ))}
          <div className="p-4 text-xs text-muted-foreground">+ 11 more statements that match</div>
        </div>

        <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <h3 className="text-2xl font-serif font-bold text-foreground">{c.topic}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={cn('rounded-xl p-4 space-y-2', c.status === 'conflict' ? 'border-2 border-amber-400/60' : 'border border-border')}>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"><FileText className="w-4 h-4" />The new draft says</div>
              <p className="text-sm text-foreground leading-relaxed">“{c.draft}”</p>
              <p className="text-xs text-muted-foreground">{c.draftWhere}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"><BookOpen className="w-4 h-4" />AmCham said before</div>
              <p className="text-sm text-foreground leading-relaxed">“{c.earlier}”</p>
              <p className="text-xs text-muted-foreground">{c.earlierWhere}</p>
            </div>
          </div>
          <p className={cn('text-sm leading-relaxed rounded-xl p-4', c.status === 'conflict' ? 'bg-amber-50 dark:bg-amber-400/10 text-foreground' : 'text-muted-foreground')}>{c.explain}</p>
          {c.status === 'conflict' && (
            resolved === c.id
              ? <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400"><Check className="w-4 h-4" />Noted. The committee chair will see this before the comment is sent.</div>
              : (
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => { setResolved(c.id); showToast('Marked as a deliberate change. A sentence explaining why has been suggested for the draft.'); }} className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90">Our view changed on purpose</button>
                  <button onClick={() => { setResolved(c.id); showToast('The draft now says 24 months, as in 2025.'); }} className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted">Use the 2025 position</button>
                  <button onClick={() => { setResolved(c.id); showToast('Question sent to the committee chair.'); }} className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted inline-flex items-center gap-2"><MessageSquare className="w-4 h-4" />Ask the committee chair</button>
                </div>
              )
          )}
        </motion.div>
      </div>
    </div>
  );
}
