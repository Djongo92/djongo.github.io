import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { Check, Clock, FileText, User, ShieldAlert, Undo2, Phone, Mail, Linkedin, MessageSquare } from 'lucide-react';
import { cn, parseEuro, fmtEuro } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityTicker } from '../components/ActivityTicker';
import { Confetti } from '@/components/ui/confetti';
import { CompanyMark } from '@/components/ui/company-mark';

type Item = (typeof platformData.console.ritual.items)[number];

const URGENCY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const URGENCY_STYLE: Record<string, { bar: string; dot: string; text: string }> = {
  Critical: { bar: 'bg-destructive', dot: 'bg-destructive', text: 'text-destructive' },
  High: { bar: 'bg-amber-500', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  Medium: { bar: 'bg-sky-500', dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300' },
  Low: { bar: 'bg-muted-foreground/30', dot: 'bg-muted-foreground/50', text: 'text-muted-foreground' },
};
// Enumerated labels in the priority data are English; Serbian gets these.
const SR_LABELS: Record<string, string> = {
  'RENEWAL RISK': 'RIZIK OBNOVE', 'CHURN WARNING': 'UPOZORENJE O ODLASKU', OPPORTUNITY: 'PRILIKA',
  Today: 'Danas', Tomorrow: 'Sutra', 'This Week': 'Ove nedelje', 'Next Week': 'Sledeće nedelje',
  Phone: 'Telefon', Email: 'Email', LinkedIn: 'LinkedIn',
  Critical: 'Kritično', High: 'Visok', Medium: 'Srednji', Low: 'Nizak',
};

const CHANNEL_ICON: Record<string, React.ElementType> = { Phone, Email: Mail, LinkedIn: Linkedin };

// "Ranked by what's at stake": value first, urgency breaks ties.
function rank(items: Item[]): Item[] {
  return [...items].sort((a, b) => parseEuro(b.expectedValue) - parseEuro(a.expectedValue) || URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
}

export function RitualView({ navigateTo, showToast, updateBadge }: any) {
  const { t, lang } = useI18n();
  const L = (s: string) => (lang === 'sr' ? SR_LABELS[s] ?? s : s);
  const [completed, setCompleted] = useState<string[]>([]);
  const [snoozed, setSnoozed] = useState<string[]>([]);
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null);
  const [snoozeNote, setSnoozeNote] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedPoints, setCheckedPoints] = useState<Record<string, boolean>>({});
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const ranked = useMemo(() => rank(platformData.console.ritual.items), []);
  const open = ranked.filter((i) => !completed.includes(i.id) && !snoozed.includes(i.id));
  const cleared = ranked.filter((i) => completed.includes(i.id) || snoozed.includes(i.id));
  const selected = open.find((i) => i.id === selectedId) ?? open[0] ?? null;
  const atStake = open.reduce((s, i) => s + parseEuro(i.expectedValue), 0);

  useEffect(() => { updateBadge(open.length); }, [open.length]);

  const resolve = (id: string, kind: 'done' | 'snooze') => {
    const idx = open.findIndex((i) => i.id === id);
    const next = open[idx + 1] ?? open[idx - 1] ?? null;
    if (kind === 'done') {
      setCompleted((p) => [...p, id]);
      showToast(t('console_v2.priority_done', 'Done. Logged to the account timeline.'));
      setConfettiTrigger((n) => n + 1);
    } else {
      setSnoozed((p) => [...p, id]);
      showToast(t('console_v2.priority_snoozed', 'Snoozed. It comes back Monday.'));
    }
    setSelectedId(next?.id ?? null);
  };

  const undo = (id: string) => {
    setCompleted((p) => p.filter((x) => x !== id));
    setSnoozed((p) => p.filter((x) => x !== id));
    setSelectedId(id);
  };

  const select = (id: string) => {
    setSelectedId(id);
    rowRefs.current[id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // Inbox keys: j/k (or arrows) move, e marks done, s snoozes, o/Enter opens the account.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || snoozeFor) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (!selected) return;
      const idx = open.findIndex((i) => i.id === selected.id);
      const key = e.key.toLowerCase();
      if (key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); const n = open[Math.min(idx + 1, open.length - 1)]; if (n) select(n.id); }
      else if (key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); const n = open[Math.max(idx - 1, 0)]; if (n) select(n.id); }
      else if (key === 'e') { e.preventDefault(); resolve(selected.id, 'done'); }
      else if (key === 's') { e.preventDefault(); setSnoozeFor(selected.id); }
      else if (key === 'o' || (e.key === 'Enter' && el?.tagName !== 'BUTTON')) { e.preventDefault(); navigateTo('heatmap', selected.companyId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const detail = (item: Item, inline = false) => {
    const company = platformData.allMembers.find((m) => m.id === item.companyId);
    const brief = (platformData.console.briefs as any)[item.companyId];
    const retentionCase = platformData.console.retention.find((r) => r.companyId === item.companyId);
    const ChannelIcon = CHANNEL_ICON[item.channel] ?? MessageSquare;
    const facts: [string, React.ReactNode][] = [
      [t('console_v2.next_step', 'Next step'), item.action],
      [t('console_v2.at_stake', 'At stake'), item.expectedValue],
      [t('console_v2.due', 'Due'), L(item.dueDate)],
      [t('console_v2.channel', 'Channel'), <span className="inline-flex items-center gap-1.5"><ChannelIcon className="w-3.5 h-3.5" />{L(item.channel)}</span>],
      [t('console_v2.owner', 'Owner'), item.owner],
      [t('console_v2.signal', 'Signal'), `${item.source} · ${item.confidence}`],
    ];
    return (
      <div className="space-y-6">
        <div className={cn('flex items-start gap-4', inline && 'hidden')}>
          <CompanyMark name={company?.name} sector={company?.sector} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-lg font-bold text-foreground">{company?.name}</span>
              <span className={cn('text-[11px] font-bold uppercase tracking-wider', URGENCY_STYLE[item.urgency].text)}>{L(item.tag)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{company?.tier} · {company?.sector} · {t('console_v2.score', 'Score')} {company?.score}</p>
          </div>
        </div>

        {!inline && <p className="text-xl font-serif leading-snug text-foreground text-balance">{item.text}</p>}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{k}</dt>
              <dd className="font-semibold text-foreground">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => resolve(item.id, 'done')} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold shadow-sm hover:bg-primary/90 active:scale-95 transition-all">
            <Check className="w-4 h-4" /> {t('console_v2.mark_done', 'Done')} <kbd className="hidden md:inline text-[11px] font-bold opacity-70 ml-1">E</kbd>
          </button>
          <button onClick={() => setSnoozeFor(item.id)} className="inline-flex items-center gap-2 bg-background border border-border px-5 py-2.5 rounded-full text-sm font-bold hover:bg-muted transition-colors">
            <Clock className="w-4 h-4 text-muted-foreground" /> {t('console_v2.snooze', 'Snooze')} <kbd className="hidden md:inline text-[11px] font-bold text-muted-foreground ml-1">S</kbd>
          </button>
          <button onClick={() => navigateTo('heatmap', item.companyId)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <User className="w-4 h-4" /> {t('console_v2.open_account', 'Open account')}
          </button>
          {brief && (
            <button onClick={() => navigateTo('brief', item.companyId)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <FileText className="w-4 h-4" /> {t('console_v2.brief', 'Brief')}
            </button>
          )}
          {retentionCase && (
            <button onClick={() => navigateTo('retention', item.companyId)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors">
              <ShieldAlert className="w-4 h-4" /> {t('console_v2.save_case', 'Save case')} · {L(retentionCase.risk)}
            </button>
          )}
        </div>

        {brief && (
          <div className="border-t border-border pt-5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">{t('console_v2.before_you_call', 'Before you call')}</h4>
            <div className="space-y-2">
              {brief.talkingPoints.map((pt: string, i: number) => {
                const ptId = `${item.id}-pt-${i}`;
                const isChecked = !!checkedPoints[ptId];
                return (
                  <label key={i} className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={isChecked} onChange={() => setCheckedPoints((p) => ({ ...p, [ptId]: !p[ptId] }))} className="sr-only peer" />
                    <span className={cn('w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors peer-focus-visible:ring-2 ring-primary/40', isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border group-hover:border-foreground/40')}>
                      {isChecked && <Check className="w-3 h-3" />}
                    </span>
                    <span className={cn('text-sm leading-relaxed', isChecked ? 'text-muted-foreground line-through' : 'text-foreground/90')}>{pt}</span>
                  </label>
                );
              })}
            </div>
            {brief.attendeeContext && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed"><span className="font-bold text-foreground">{t('console_v2.who', 'Who you’re talking to')}:</span> {brief.attendeeContext}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 font-sans space-y-6">
      <Confetti trigger={confettiTrigger} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif tracking-tight text-foreground mb-2">{t('platform.console.ritual', 'Priorities')}</h2>
          <p className="text-muted-foreground">{t('platform.console.ritual_purpose', "The moves that matter most this week, ranked by what's at stake.")}</p>
        </div>
        <dl className="flex items-stretch divide-x divide-border rounded-2xl border border-border bg-card text-sm shrink-0">
          <div className="px-4 py-2.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('console_v2.open', 'Open')}</dt>
            <dd className="text-lg font-bold tabular-nums text-foreground">{open.length}</dd>
          </div>
          <div className="px-4 py-2.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('console_v2.at_stake', 'At stake')}</dt>
            <dd className="text-lg font-bold tabular-nums text-foreground">{fmtEuro(atStake)}</dd>
          </div>
          <div className="px-4 py-2.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('console_v2.on_time', 'On time')}</dt>
            <dd className="text-lg font-bold tabular-nums text-foreground">{t('console_v2.days_running', '{n} days running').replace('{n}', String(platformData.console.ritual.streak))}</dd>
          </div>
        </dl>
      </div>

      <ActivityTicker />

      {open.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-card/50 text-center px-6">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-5">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-serif text-foreground mb-2">{t('console_v2.all_clear', 'All clear')}</h3>
          <p className="text-muted-foreground">{t('platform.console.ritual_done', 'All clear. New priorities appear as signals come in.')}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="min-w-0">
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground mb-2 px-1">
              {[['J', 'K', t('console_v2.key_move', 'move')], ['E', t('console_v2.key_done', 'done')], ['S', t('console_v2.key_snooze', 'snooze')], ['O', t('console_v2.key_open', 'open account')]].map((g) => (
                <span key={g.join()} className="inline-flex items-center gap-1">
                  {g.slice(0, -1).map((k) => <kbd key={k} className="min-w-5 h-5 px-1 rounded border border-border bg-card text-[11px] font-bold text-foreground inline-flex items-center justify-center">{k}</kbd>)}
                  <span className="ml-0.5">{g[g.length - 1]}</span>
                </span>
              ))}
            </div>
            <div role="listbox" aria-label={t('platform.console.ritual', 'Priorities')} className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
              <AnimatePresence initial={false}>
                {open.map((item) => {
                  const company = platformData.allMembers.find((m) => m.id === item.companyId);
                  const isSel = selected?.id === item.id;
                  const u = URGENCY_STYLE[item.urgency];
                  return (
                    <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
                      <div className={cn('relative group transition-colors', isSel ? 'bg-primary/[0.06]' : 'hover:bg-muted/40')}>
                        <span aria-hidden className={cn('absolute left-0 top-0 bottom-0 w-1', u.bar, !isSel && 'opacity-60')} />
                        <button
                          ref={(el) => { rowRefs.current[item.id] = el; }}
                          role="option"
                          aria-selected={isSel}
                          onClick={() => setSelectedId(item.id)}
                          className="w-full text-left flex items-start gap-3 pl-5 pr-4 md:pr-24 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                        >
                          <CompanyMark name={company?.name} sector={company?.sector} size="sm" className="mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-foreground truncate">{company?.name}</span>
                              <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider shrink-0', u.text)}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', u.dot)} />{L(item.tag)}
                              </span>
                            </div>
                            <p className={cn('text-sm text-muted-foreground', isSel ? 'line-clamp-2' : 'line-clamp-2 md:line-clamp-1')}>{item.text}</p>
                          </div>
                          <div className="text-right shrink-0 md:group-hover:opacity-0 md:transition-opacity">
                            <div className="text-sm font-bold tabular-nums text-foreground">{item.expectedValue.split(' ')[0]}</div>
                            <div className={cn('text-xs', item.dueDate === 'Today' ? 'text-destructive font-bold' : 'text-muted-foreground')}>{L(item.dueDate)}</div>
                          </div>
                        </button>
                        <div className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => resolve(item.id, 'done')} title={t('console_v2.mark_done', 'Done')} aria-label={`${t('console_v2.mark_done', 'Done')}: ${company?.name}`} className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setSnoozeFor(item.id)} title={t('console_v2.snooze', 'Snooze')} aria-label={`${t('console_v2.snooze', 'Snooze')}: ${company?.name}`} className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"><Clock className="w-4 h-4" /></button>
                        </div>
                      </div>
                      {isSel && <div className="lg:hidden px-5 pb-6 pt-2 bg-primary/[0.03]">{detail(item, true)}</div>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {cleared.length > 0 && (
              <div className="mt-6">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{t('console_v2.cleared_today', 'Cleared today')} · {cleared.length}</h4>
                <div className="rounded-2xl border border-border divide-y divide-border">
                  {cleared.map((item) => {
                    const company = platformData.allMembers.find((m) => m.id === item.companyId);
                    const wasDone = completed.includes(item.id);
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        {wasDone ? <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" /> : <Clock className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <span className="font-semibold text-muted-foreground truncate flex-1">{company?.name} <span className="font-normal">· {wasDone ? t('console_v2.done_label', 'Done') : t('console_v2.snoozed', 'Snoozed')}</span></span>
                        <button onClick={() => undo(item.id)} className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"><Undo2 className="w-3.5 h-3.5" /> {t('console_v2.undo', 'Undo')}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {selected && (
            <motion.aside key={selected.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }} className="hidden lg:block sticky top-4 rounded-3xl border border-border bg-card p-7 shadow-sm">
              {detail(selected)}
            </motion.aside>
          )}
        </div>
      )}

      {snoozeFor && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onKeyDown={(e) => e.key === 'Escape' && setSnoozeFor(null)}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="snooze-title" initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h3 id="snooze-title" className="text-2xl font-serif mb-1 text-foreground">{t('console_v2.snooze_title', 'Snooze until Monday')}</h3>
            <p className="text-sm text-muted-foreground mb-5">{t('console_v2.snooze_help', 'Pick a reason so the account owner knows why it moved.')}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {[t('console_v2.snooze_r1', 'Waiting on their reply'), t('console_v2.snooze_r2', 'Their budget cycle'), t('console_v2.snooze_r3', 'Owner is out this week')].map((r) => (
                <button key={r} onClick={() => setSnoozeNote(r)} className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-colors', snoozeNote === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>{r}</button>
              ))}
            </div>
            <textarea id="snooze-note" autoFocus value={snoozeNote} onChange={(e) => setSnoozeNote(e.target.value)} className="w-full bg-background border border-border rounded-2xl p-3 text-sm outline-none focus:border-primary focus:ring-2 ring-primary/20 mb-5 resize-none h-20" placeholder={t('console_v2.snooze_placeholder', 'Or add a note (optional)')} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setSnoozeFor(null); setSnoozeNote(''); }} className="px-5 py-2.5 rounded-full text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">{t('console_v2.cancel', 'Cancel')}</button>
              <button onClick={() => { resolve(snoozeFor, 'snooze'); setSnoozeFor(null); setSnoozeNote(''); }} className="px-6 py-2.5 rounded-full text-sm font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95 transition-all">{t('console_v2.snooze', 'Snooze')}</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
