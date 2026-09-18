import React, { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, X, Book, ArrowRight, Compass, UserMinus, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { runFixtureQuery } from '../views/ask';
import { AI_NAME } from '@/components/ui/ai-badge';

export function TourOverlay({ step, setStep, endTour, steps, labels, onBack, badge }: {
  step: number, setStep: (s:number)=>void, endTour: ()=>void,
  steps: { title: string, desc: string }[],
  labels: { skip: string, next: string, done: string, back?: string },
  onBack?: () => void,
  badge?: { icon: React.ComponentType<{ className?: string }>, label: string },
}) {
  const total = steps.length;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-center pb-10 px-4">
      <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="w-full max-w-md bg-foreground text-background rounded-3xl p-8 shadow-2xl pointer-events-auto border border-foreground/10 relative overflow-hidden font-sans">
        <svg className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none" viewBox="0 0 100 100">
           <circle cx="80" cy="20" r="40" fill="currentColor" />
        </svg>
        {badge && (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent mb-4">
            <badge.icon className="w-3.5 h-3.5" /> {badge.label}
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-1.5">
            {Array.from({length: total}).map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-accent" : "w-1.5 bg-background/20")}></div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {onBack && step > 0 && (
              <button onClick={onBack} className="text-[10px] font-bold uppercase tracking-widest text-background/50 hover:text-background transition-colors">{labels.back || 'Back'}</button>
            )}
            <button onClick={endTour} className="text-[10px] font-bold uppercase tracking-widest text-background/50 hover:text-background transition-colors">{labels.skip}</button>
          </div>
        </div>
        <h3 className="text-3xl font-serif font-light mb-3">{steps[step].title}</h3>
        <p className="text-sm font-medium text-background/70 mb-8 leading-relaxed">{steps[step].desc}</p>
        <div className="flex justify-between items-center">
          <div className="text-xs font-bold text-background/40">{step + 1} / {total}</div>
          <button onClick={() => {
            if (step === total - 1) endTour();
            else setStep(step + 1);
          }} className="px-6 py-2.5 rounded-full bg-accent text-foreground font-bold text-sm shadow-md hover:shadow-lg transition-transform active:scale-95">
            {step === total - 1 ? labels.done : labels.next} <ArrowRight className="inline w-4 h-4 ml-1" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function CommandPalette({ close, navigateTo }: { close: () => void, navigateTo: (v:string, c?:string) => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const views = [
    { id: 'ritual', label: t('platform.console.ritual') },
    { id: 'heatmap', label: t('platform.console.heatmap') },
    { id: 'accounts', label: t('platform.console.accounts') },
    { id: 'retention', label: t('platform.console.retention') },
    { id: 'outreach', label: t('platform.console.outreach') },
    { id: 'ask', label: t('platform.console.ask') },
    { id: 'matchmaking', label: t('platform.console.matchmaking') },
    { id: 'intelligence', label: t('platform.console.nav.intelligence') },
    { id: 'flags', label: t('platform.console.flags') },
    { id: 'approvals', label: t('platform.console.approvals') },
    { id: 'cover', label: t('platform.console.cover') },
    { id: 'digests', label: t('platform.console.nav_digests') },
    { id: 'my-team', label: t('platform.console.nav_my_team') },
     { id: 'board-summary', label: t('platform.console.nav_board_summary') }
  ];

  const matchedViews = views.filter(v => v.label.toLowerCase().includes(query.toLowerCase()));
  const matchedCompanies = platformData.allMembers.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  // Beyond simple name/destination matching, longer queries also go through
  // the same governed-answer engine that powers the dedicated Ask page, so
  // the palette can act as an omnipresent copilot rather than just a jump-to
  // tool. Only surfaces when the query actually resolves to a real filter.
  const compassAnswer = useMemo(() => {
    if (query.trim().length < 4) return null;
    const { results, departed, explanation, applied } = runFixtureQuery(query, t);
    if (applied.length === 0) return null;
    return { results, departed, explanation };
  }, [query]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 font-sans">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="w-full max-w-2xl bg-foreground text-background rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-foreground/10"
      >
        <div className="flex items-center px-6 border-b border-background/10">
          <Search className="w-5 h-5 text-accent mr-4" />
          <input 
            autoFocus
            type="text"
            placeholder={t('platform.console.search_console')}
            className="flex-1 h-16 bg-transparent text-lg outline-none text-background placeholder:text-background/40 font-light"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={close} className="text-[10px] font-bold text-foreground bg-background px-2 py-1 rounded-full uppercase tracking-wider">Esc</button>
        </div>
        
        <div className="max-h-[50vh] overflow-y-auto p-4 space-y-6">
          {compassAnswer && (
            <div className="bg-background/5 border border-accent/20 rounded-2xl p-5">
              <div className="text-[10px] uppercase font-bold text-accent tracking-widest px-0 mb-3 flex items-center gap-2">
                <Compass className="w-3.5 h-3.5" /> Ask {AI_NAME}
              </div>
              <p className="text-sm text-background/80 font-medium mb-4">{compassAnswer.explanation}</p>
              {compassAnswer.departed !== null ? (
                <div className="space-y-2 mb-4">
                  {compassAnswer.departed.slice(0, 3).map(d => (
                    <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background/10">
                      <UserMinus className="w-4 h-4 text-destructive shrink-0" />
                      <span className="text-sm font-medium text-background">{d.name}</span>
                    </div>
                  ))}
                </div>
              ) : compassAnswer.results.length > 0 && (
                <div className="space-y-2 mb-4">
                  {compassAnswer.results.slice(0, 3).map(c => (
                    <button key={c.id} onClick={() => { navigateTo('accounts', c.id); close(); }} className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-background/10 hover:bg-background/20 transition-colors group">
                      <span className="text-sm font-medium text-background group-hover:text-accent">{c.name}</span>
                      <span className="text-xs text-background/50 font-medium">Score: {c.score}</span>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => { navigateTo('ask'); close(); }} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                Open full results in Ask <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {matchedViews.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-accent tracking-widest px-4 mb-2">Destinations</div>
              {matchedViews.map(v => (
                <button key={v.id} onClick={() => { navigateTo(v.id); close(); }} className="w-full text-left px-4 py-3 rounded-2xl hover:bg-background/10 transition-all flex items-center gap-3 group">
                  <Command className="w-4 h-4 text-background/50 group-hover:text-accent" />
                  <span className="font-medium text-background group-hover:text-accent">{v.label}</span>
                </button>
              ))}
            </div>
          )}
          
          {matchedCompanies.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-accent tracking-widest px-4 mb-2">{t('platform.console.nav_relationships')}</div>
              {matchedCompanies.slice(0,5).map(c => (
                <button key={c.id} onClick={() => { navigateTo('accounts', c.id); close(); }} className="w-full text-left px-4 py-3 rounded-2xl hover:bg-background/10 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-background/5 flex items-center justify-center text-xs font-bold text-background/50 group-hover:bg-accent/20 group-hover:text-accent transition-colors">{c.avatar}</div>
                    <span className="font-medium text-background group-hover:text-accent">{c.name}</span>
                  </div>
                  <span className="text-xs text-background/50 font-medium">Score: {c.score}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function GlossaryDrawer({ close, navigateTo }: { close: () => void, navigateTo: (v:string) => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");

  const terms = [
    { title: t('platform.console.glossary_term1'), desc: t('platform.console.glossary_def1'), link: "accounts" },
    { title: t('platform.console.glossary_term2'), desc: t('platform.console.glossary_def2'), link: "outreach" },
    { title: t('platform.console.glossary_term3'), desc: t('platform.console.glossary_def3'), link: "flags" },
    { title: t('platform.console.glossary_term4'), desc: t('platform.console.glossary_def4'), link: "ritual" },
    { title: t('platform.console.glossary_term5'), desc: t('platform.console.glossary_def5'), link: "intelligence" },
  ].filter(x => x.title.toLowerCase().includes(search.toLowerCase()) || x.desc.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-[70] hidden md:block" />
      <motion.div initial={{ opacity: 0, x: '100%', filter: 'blur(10px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: '100%', filter: 'blur(10px)' }} transition={{ type: "spring", stiffness: 350, damping: 35 }} className="fixed inset-y-0 right-0 w-full md:w-[450px] border-l border-border bg-background/95 backdrop-blur-3xl flex flex-col shadow-2xl z-[80] shrink-0 font-sans">
        <div className="p-6 border-b border-border flex justify-between items-center bg-card shrink-0">
          <h3 className="font-bold text-foreground uppercase tracking-widest text-xs flex items-center gap-2"><Book className="w-4 h-4"/> {t('platform.console.glossary')}</h3>
          <button onClick={close} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-border transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 border-b border-border bg-background shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder={t('platform.console.glossary_search')} value={search} onChange={e => setSearch(e.target.value)} className="w-full h-12 bg-card border border-border rounded-full pl-10 pr-4 text-sm outline-none focus:border-primary/50 transition-colors shadow-inner" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {terms.map((term, i) => (
            <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm group">
               <h4 className="text-sm font-bold text-foreground mb-2">{term.title}</h4>
               <p className="text-sm text-muted-foreground leading-relaxed mb-4">{term.desc}</p>
               <button onClick={() => { navigateTo(term.link); close(); }} className="text-xs font-bold text-primary group-hover:underline">{t('platform.console.glossary_see_it')}</button>
            </div>
          ))}
          {terms.length === 0 && <div className="text-center text-muted-foreground text-sm italic py-10">No terms found.</div>}
        </div>
      </motion.div>
    </>
  );
}

const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ['⌘', 'K'], desc: 'Open the command palette / Ask Compass' },
  { keys: ['?'], desc: 'Open this shortcuts reference' },
  { keys: ['Esc'], desc: 'Close any open panel or overlay' },
  { keys: ['↑', '↓'], desc: 'Move between rows in a list or table' },
  { keys: ['Enter'], desc: 'Open the focused row or submit a form' },
];

export function ShortcutsOverlay({ close }: { close: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 font-sans">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="w-full max-w-md bg-background border border-border rounded-[32px] shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="font-bold text-foreground uppercase tracking-widest text-xs flex items-center gap-2"><Keyboard className="w-4 h-4" /> Keyboard Shortcuts</h3>
          <button onClick={close} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-border transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-foreground/80">{s.desc}</span>
              <div className="flex items-center gap-1 shrink-0">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="min-w-[28px] h-7 px-2 rounded-lg bg-muted border border-border text-xs font-bold text-foreground flex items-center justify-center shadow-sm">{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
