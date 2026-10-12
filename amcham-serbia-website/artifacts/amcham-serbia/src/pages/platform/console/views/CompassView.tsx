import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearch } from 'wouter';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, BadgeEuro, CalendarDays, Landmark, Inbox, Users, Layers, Check, Clock, X, EyeOff, Copy, Send,
  Info, ArrowRight, ChevronDown, Download, ShieldCheck, Lock, FileText, Sparkles, Undo2, ArrowRightLeft,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { cn, parseEuro, fmtEuro } from '@/lib/utils';
import { TierChip } from '@/components/ai-privacy';
import { CompanyMark } from '@/components/ui/company-mark';
import { SIGNALS, CATEGORY_LABEL, TRIAGE_EMAILS, CompassSignal, SignalCategory } from '../compass-signals';
import { compassStore, useCompassStore, Delivery } from '../compass-store';

const CATEGORY_STYLE: Record<SignalCategory, { icon: React.ElementType; tile: string; bar: string }> = {
  membership: { icon: BadgeEuro, tile: 'bg-rose-500/12 text-rose-700 dark:text-rose-300', bar: 'bg-rose-500' },
  events: { icon: CalendarDays, tile: 'bg-sky-500/12 text-sky-700 dark:text-sky-300', bar: 'bg-sky-500' },
  advocacy: { icon: Landmark, tile: 'bg-violet-500/12 text-violet-700 dark:text-violet-300', bar: 'bg-violet-500' },
  service: { icon: Inbox, tile: 'bg-amber-500/14 text-amber-800 dark:text-amber-300', bar: 'bg-amber-500' },
  team: { icon: Users, tile: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500' },
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as SignalCategory[];
const DELIVERY_LABEL: Record<Delivery, string> = { realtime: 'Real time', morning: 'Morning brief', weekly: 'Weekly', off: 'Off' };
const DELIVERY_HINT: Record<SignalCategory, string> = {
  membership: 'Renewals, upgrades, introductions, prospects',
  events: 'Seats, waitlists, no-shows, follow-ups, speakers',
  advocacy: 'Consultations, positions, minutes, ministry meetings',
  service: 'Shared inbox, portal questions, onboarding',
  team: 'Workload, cover, weekly wrap, unusual changes',
};
const THIS_WEEK = new Set(['Today', 'Tomorrow', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'This week', '6 days']);

function CategoryTile({ category, size = 'md' }: { category: SignalCategory; size?: 'sm' | 'md' }) {
  const s = CATEGORY_STYLE[category];
  const Icon = s.icon;
  return (
    <span className={cn('rounded-xl flex items-center justify-center shrink-0', s.tile, size === 'sm' ? 'w-7 h-7' : 'w-9 h-9')}>
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
    </span>
  );
}

function ConfidenceDot({ level }: { level: 'High' | 'Medium' }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
      <span className={cn('w-1.5 h-1.5 rounded-full', level === 'High' ? 'bg-emerald-500' : 'bg-amber-500')} />
      {level} confidence
    </span>
  );
}

// ── Action panels ─────────────────────────────────────────────────────────

function DraftPanel({ signal, onDone, showToast }: { signal: CompassSignal; onDone: () => void; showToast: (m: string) => void }) {
  const action = signal.action as Extract<CompassSignal['action'], { kind: 'draft' }>;
  const [text, setText] = useState(() => action.draft());
  useEffect(() => setText(action.draft()), [signal.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); showToast('Draft copied. Paste it into Outlook.'); compassStore.log(`Copied draft: ${action.draftTitle}`, signal.tier); }
    catch { showToast('Copy is blocked in this browser.'); }
  };
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/40">
        <span className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0"><FileText className="w-3.5 h-3.5 text-primary shrink-0" /><span className="truncate">{action.draftTitle}</span></span>
        <span className="text-[11px] text-muted-foreground shrink-0">Draft · editable</span>
      </div>
      <label htmlFor={`draft-${signal.id}`} className="sr-only">Draft text</label>
      <textarea id={`draft-${signal.id}`} value={text} onChange={(e) => setText(e.target.value)} className="w-full h-64 resize-y bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground outline-none" />
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-border">
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:bg-primary/90"><Copy className="w-3.5 h-3.5" /> Copy draft</button>
        <button onClick={() => { compassStore.setStatus(signal, 'done', `Marked as sent: ${action.draftTitle}`); showToast('Marked as sent and logged.'); onDone(); }} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold hover:bg-muted"><Send className="w-3.5 h-3.5" /> Mark as sent</button>
        <span className="text-[11px] text-muted-foreground ml-auto">You send it. Compass never does.</span>
      </div>
    </div>
  );
}

function TriagePanel({ signal, onDone, showToast }: { signal: CompassSignal; onDone: () => void; showToast: (m: string) => void }) {
  const [routed, setRouted] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(signal.id === 'prospect' ? 'm1' : null);
  const emails = signal.id === 'prospect' ? TRIAGE_EMAILS.filter((e) => e.id === 'm1') : TRIAGE_EMAILS;
  const CAT_TONE: Record<string, string> = {
    'Membership enquiry': 'text-rose-700 dark:text-rose-300 bg-rose-500/10', Event: 'text-sky-700 dark:text-sky-300 bg-sky-500/10', Press: 'text-violet-700 dark:text-violet-300 bg-violet-500/10',
    Invoice: 'text-amber-800 dark:text-amber-300 bg-amber-500/12', Committee: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10', Spam: 'text-muted-foreground bg-muted',
  };
  const routeAll = () => {
    setRouted(emails.map((e) => e.id));
    compassStore.setStatus(signal, 'done', `Routed ${emails.length} email${emails.length === 1 ? '' : 's'} from info@ (${emails.filter((e) => e.reply).length} with drafted replies)`);
    showToast(`Routed ${emails.length} email${emails.length === 1 ? '' : 's'}. Owners have the drafts.`);
    onDone();
  };
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
        <span className="flex items-center gap-2 text-xs font-bold text-foreground"><Inbox className="w-3.5 h-3.5 text-primary" /> info@amcham.rs</span>
        <span className="text-[11px] text-muted-foreground">{emails.length - routed.length} to route</span>
      </div>
      <ul className="divide-y divide-border">
        {emails.map((e) => {
          const isOpen = open === e.id;
          const done = routed.includes(e.id);
          return (
            <li key={e.id} className={cn(done && 'opacity-60')}>
              <button onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen} className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground truncate">{e.from}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{e.org}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">{e.received}</span>
                  </div>
                  <div className="text-sm text-foreground/90 truncate">{e.subject}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold', CAT_TONE[e.category])}>{e.category}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><ArrowRight className="w-3 h-3" />{e.routeTo}</span>
                    {e.reply && <span className="text-[11px] font-semibold text-primary">Reply drafted</span>}
                    {done && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"><Check className="w-3 h-3" /> Routed</span>}
                  </div>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground mt-1 shrink-0 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 -mt-1 space-y-2">
                  {e.reply ? <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed rounded-xl bg-muted/50 border border-border p-3 text-foreground">{e.reply}</pre>
                    : <p className="text-xs text-muted-foreground">{e.category === 'Spam' ? 'Will be archived. No reply.' : 'Routed without a draft; the owner answers this one personally.'}</p>}
                  {!done && (
                    <button onClick={() => { setRouted((r) => [...r, e.id]); compassStore.log(`Routed “${e.subject}” to ${e.routeTo}`, 'on-prem'); }} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted">
                      Route to {e.routeTo}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <button onClick={routeAll} className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:bg-primary/90"><Check className="w-3.5 h-3.5" /> {emails.length === 1 ? 'Route it' : `Route all ${emails.length}`}</button>
        <span className="text-[11px] text-muted-foreground ml-auto">Owners get the email and the draft. Nothing is sent to members.</span>
      </div>
    </div>
  );
}

function ReassignPanel({ signal, onDone, showToast }: { signal: CompassSignal; onDone: () => void; showToast: (m: string) => void }) {
  const items = ((platformData.console as any).ritual.items as any[]).filter((r) => r.owner === 'Nikola K.');
  const [pick, setPick] = useState<string>(items.find((i) => i.urgency !== 'Critical')?.id ?? items[0]?.id);
  const [to, setTo] = useState('Milica Kostić');
  const picked = items.find((i) => i.id === pick);
  const name = (id: string) => platformData.allMembers.find((m) => m.id === id)?.name ?? id;
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/40 text-xs font-bold text-foreground flex items-center gap-2"><ArrowRightLeft className="w-3.5 h-3.5 text-primary" /> Move one of Nikola’s priorities</div>
      <fieldset className="divide-y divide-border">
        <legend className="sr-only">Priority to move</legend>
        {items.map((it) => {
          const co = platformData.allMembers.find((m) => m.id === it.companyId);
          return (
            <label key={it.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40">
              <input type="radio" name="reassign" value={it.id} checked={pick === it.id} onChange={() => setPick(it.id)} className="accent-[hsl(var(--primary))]" />
              <CompanyMark name={co?.name} sector={co?.sector} size="sm" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground truncate">{name(it.companyId)}</div>
                <div className="text-[11px] text-muted-foreground">{it.tag.toLowerCase()} · {it.expectedValue.split(' ')[0]} · due {it.dueDate.toLowerCase()}</div>
              </div>
            </label>
          );
        })}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-border">
        <label htmlFor="reassign-to" className="text-xs font-semibold text-muted-foreground">Give to</label>
        <select id="reassign-to" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground">
          <option>Milica Kostić</option>
          <option>Marija Jovanović</option>
        </select>
        <button
          onClick={() => {
            compassStore.setStatus(signal, 'done', `Moved ${picked ? name(picked.companyId) : 'a priority'} from Nikola Krstić to ${to}`);
            showToast(`${picked ? name(picked.companyId) : 'Priority'} moved to ${to.split(' ')[0]}.`);
            onDone();
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:bg-primary/90"
        >
          Move it
        </button>
      </div>
    </div>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────

function SignalDetail({ signal, navigateTo, showToast, onAdvance, onClose }: {
  signal: CompassSignal; navigateTo: (v: string, c?: string) => void; showToast: (m: string) => void; onAdvance: () => void; onClose?: () => void;
}) {
  const { t } = useI18n();
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const co = signal.companyId ? platformData.allMembers.find((m) => m.id === signal.companyId) : undefined;
  const a = signal.action;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', CATEGORY_STYLE[signal.category].tile)}>
            {React.createElement(CATEGORY_STYLE[signal.category].icon, { className: 'w-3.5 h-3.5' })} {CATEGORY_LABEL[signal.category]}
          </span>
          <ConfidenceDot level={signal.confidence} />
          {signal.audience === 'team' && <span className="text-[11px] font-semibold text-muted-foreground">· Shared with the team</span>}
        </div>
        {onClose && <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button>}
      </div>

      <div>
        <h3 className="text-2xl font-serif leading-snug text-foreground text-balance mb-2">{signal.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{signal.summary}</p>
        {co && (
          <button onClick={() => navigateTo('heatmap', co.id)} className="mt-3 inline-flex items-center gap-2 rounded-full border border-border pl-1 pr-3 py-1 text-xs font-bold text-foreground hover:bg-muted">
            <CompanyMark name={co.name} sector={co.sector} size="xs" /> {co.name} <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

      <section>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">{t('compass_hub.noticed', 'What Compass noticed')}</h4>
        <ul className="space-y-2.5">
          {signal.evidence.map((e, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="min-w-0"><span className="text-foreground">{e.text}</span> <span className="text-[11px] text-muted-foreground whitespace-nowrap">· {e.source}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-xl bg-muted/50 border border-border px-3.5 py-3 flex gap-2.5 text-xs leading-relaxed">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-px" />
        <div><span className="font-bold text-foreground">{t('compass_hub.why', 'Why you’re seeing this')}: </span><span className="text-muted-foreground">{signal.why}</span></div>
      </div>

      {a.kind === 'draft' && <DraftPanel signal={signal} onDone={onAdvance} showToast={showToast} />}
      {a.kind === 'triage' && <TriagePanel signal={signal} onDone={onAdvance} showToast={showToast} />}
      {a.kind === 'reassign' && <ReassignPanel signal={signal} onDone={onAdvance} showToast={showToast} />}
      {a.kind === 'navigate' && (
        <button onClick={() => { compassStore.log(`Opened ${a.label.replace(/^Open /, '')} from “${signal.title}”`, signal.tier); navigateTo(a.view, a.companyId); }} className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:bg-primary/90">
          {a.label} <ArrowRight className="w-4 h-4" />
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
        <div className="relative">
          <button onClick={() => setSnoozeOpen((o) => !o)} aria-expanded={snoozeOpen} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"><Clock className="w-3.5 h-3.5" /> Snooze <ChevronDown className="w-3 h-3" /></button>
          {snoozeOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-40 rounded-xl border border-border bg-popover shadow-xl p-1 z-10">
              {['Until tomorrow', 'Until Monday', 'For a week'].map((o) => (
                <button key={o} onClick={() => { setSnoozeOpen(false); compassStore.setStatus(signal, 'snoozed', `Snoozed “${signal.title}” ${o.toLowerCase()}`); showToast(`Snoozed ${o.toLowerCase()}.`); onAdvance(); }} className="w-full text-left rounded-lg px-3 py-2 text-xs font-semibold hover:bg-muted">{o}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => { compassStore.setStatus(signal, 'dismissed', `Dismissed “${signal.title}”`); onAdvance(); }} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"><X className="w-3.5 h-3.5" /> Dismiss</button>
        <button onClick={() => { compassStore.mute(signal); showToast(`Got it. Fewer ${signal.kindLabel} from now on.`); onAdvance(); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"><EyeOff className="w-3.5 h-3.5" /> Fewer like this</button>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">Runs on <TierChip tier={signal.tier} /></span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function CompassView({ navigateTo, showToast }: { navigateTo: (v: string, c?: string, extra?: Record<string, string>) => void; showToast: (m: string) => void }) {
  const { t } = useI18n();
  const search = useSearch();
  const store = useCompassStore();
  const [tab, setTab] = useState<'signals' | 'activity' | 'prefs'>('signals');
  const [category, setCategory] = useState<SignalCategory | 'all'>('all');
  const [audience, setAudience] = useState<'all' | 'me'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(search).get('signal'));
  const [drawer, setDrawer] = useState(false);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const list = useMemo(
    () => store.visible.filter((s) => (category === 'all' || s.category === category) && (audience === 'all' || s.audience === 'me')),
    [store.visible, category, audience],
  );
  const selected = list.find((s) => s.id === selectedId) ?? list[0] ?? null;
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: store.visible.length };
    for (const s of store.visible) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, [store.visible]);
  const dueThisWeek = store.visible.filter((s) => s.due && THIS_WEEK.has(s.due)).length;
  const atStake = store.visible.reduce((sum, s) => sum + (s.value ? parseEuro(s.value) : 0), 0);
  const actedToday = Object.values(store.status).filter((v) => v === 'done').length;
  const tierCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of SIGNALS) c[s.tier] = (c[s.tier] ?? 0) + 1;
    return c;
  }, []);

  // A deep link (?signal=), e.g. from the Compass panel, selects that signal,
  // and on a narrow screen opens it straight in the drawer.
  useEffect(() => {
    const id = new URLSearchParams(search).get('signal');
    if (!id) return;
    setTab('signals');
    setCategory('all');
    setSelectedId(id);
    if (window.innerWidth < 1400) setDrawer(true);
    requestAnimationFrame(() => rowRefs.current[id]?.scrollIntoView({ block: 'nearest' }));
  }, [search]);

  const select = (id: string) => {
    setSelectedId(id);
    if (window.innerWidth < 1400) setDrawer(true);
    rowRefs.current[id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  // After acting on a signal, move to the next one in the list.
  const advance = () => {
    if (!selected) return;
    const idx = list.findIndex((s) => s.id === selected.id);
    const next = list[idx + 1] ?? list[idx - 1];
    setSelectedId(next?.id ?? null);
    if (!next) setDrawer(false);
  };

  useEffect(() => {
    if (tab !== 'signals') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (!selected) return;
      const idx = list.findIndex((s) => s.id === selected.id);
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); const n = list[Math.min(idx + 1, list.length - 1)]; if (n) { setSelectedId(n.id); rowRefs.current[n.id]?.scrollIntoView({ block: 'nearest' }); } }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); const n = list[Math.max(idx - 1, 0)]; if (n) { setSelectedId(n.id); rowRefs.current[n.id]?.scrollIntoView({ block: 'nearest' }); } }
      else if (e.key === 'Escape') setDrawer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const tabs = [
    { id: 'signals', label: t('compass_hub.tab_signals', 'Signals'), count: store.visible.length },
    { id: 'activity', label: t('compass_hub.tab_activity', 'Activity log') },
    { id: 'prefs', label: t('compass_hub.tab_prefs', 'Preferences') },
  ] as const;

  return (
    <div className="max-w-[1400px] mx-auto pb-20 font-sans space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 shrink-0"><Compass className="w-6 h-6" /></span>
          <div>
            <h2 className="text-4xl font-serif tracking-tight text-foreground mb-1">Compass</h2>
            <p className="text-muted-foreground max-w-2xl">{t('compass_hub.subtitle', 'What Compass has noticed across the book, ranked by what’s at stake. It drafts and suggests; nothing goes out without you.')}</p>
          </div>
        </div>
        <div className="flex rounded-full bg-muted p-1 border border-border self-start lg:self-auto" role="tablist">
          {tabs.map((tb) => (
            <button key={tb.id} role="tab" aria-selected={tab === tb.id} onClick={() => setTab(tb.id)} className={cn('px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors inline-flex items-center gap-1.5', tab === tb.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {tb.label}
              {'count' in tb && <span className={cn('rounded-full px-1.5 min-w-5 text-[10.5px] tabular-nums', tab === tb.id ? 'bg-primary text-primary-foreground' : 'bg-border text-foreground')}>{tb.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === 'signals' && (
        <>
          <dl className="grid grid-cols-2 md:grid-cols-4 rounded-2xl border border-border bg-card divide-x divide-y md:divide-y-0 divide-border overflow-hidden">
            {[
              [t('compass_hub.stat_open', 'Open'), String(store.visible.length)],
              [t('compass_hub.stat_week', 'Due this week'), String(dueThisWeek)],
              [t('compass_hub.stat_stake', 'Revenue in play'), fmtEuro(atStake)],
              [t('compass_hub.stat_acted', 'Handled today'), String(actedToday)],
            ].map(([k, v]) => (
              <div key={k} className="px-5 py-3.5">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="text-2xl font-bold tabular-nums text-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)] min-[1400px]:grid-cols-[210px_minmax(0,1fr)_minmax(0,440px)] items-start">
            {/* Filters */}
            <aside className="space-y-5 lg:sticky lg:top-4">
              <nav aria-label="Categories" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-1 px-1 pb-1 lg:pb-0">
                {(['all', ...CATEGORIES] as const).map((cat) => {
                  const active = category === cat;
                  return (
                    <button key={cat} onClick={() => setCategory(cat)} className={cn('flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors', active ? 'bg-card border border-border shadow-sm text-foreground' : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60')}>
                      {cat === 'all' ? <span className="w-7 h-7 rounded-xl bg-foreground/5 flex items-center justify-center"><Layers className="w-3.5 h-3.5" /></span> : <CategoryTile category={cat} size="sm" />}
                      <span className="flex-1 text-left">{cat === 'all' ? t('compass_hub.all', 'Everything') : CATEGORY_LABEL[cat]}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{counts[cat] ?? 0}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="hidden lg:block">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{t('compass_hub.showing', 'Showing')}</div>
                <div className="flex rounded-full bg-muted p-0.5 border border-border">
                  {([['all', 'Everyone'], ['me', 'Just me']] as const).map(([id, label]) => (
                    <button key={id} onClick={() => setAudience(id)} className={cn('flex-1 rounded-full py-1.5 text-xs font-bold', audience === id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="hidden lg:block rounded-2xl border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Lock className="w-3 h-3" /> {t('compass_hub.where', 'Where this runs')}</div>
                {(['on-prem', 'anonymised', 'public'] as const).map((tier) => (
                  <div key={tier} className="flex items-center justify-between gap-2"><TierChip tier={tier} /><span className="text-xs font-bold tabular-nums text-foreground">{tierCounts[tier] ?? 0}</span></div>
                ))}
              </div>
            </aside>

            {/* List */}
            <div className="min-w-0">
              {list.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-card/50 py-20 text-center px-6">
                  <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="font-serif text-xl text-foreground mb-1">{t('compass_hub.empty_title', 'Nothing here right now')}</p>
                  <p className="text-sm text-muted-foreground">{t('compass_hub.empty_body', 'Compass will flag anything new as it comes in.')}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border" role="listbox" aria-label="Signals">
                  <AnimatePresence initial={false}>
                    {list.map((s) => {
                      const isSel = selected?.id === s.id;
                      return (
                        <motion.div key={s.id} layout exit={{ opacity: 0, height: 0 }} className="relative">
                          <span aria-hidden className={cn('absolute left-0 top-0 bottom-0 w-1 transition-opacity', CATEGORY_STYLE[s.category].bar, isSel ? 'opacity-100' : 'opacity-0')} />
                          <button
                            ref={(el) => { rowRefs.current[s.id] = el; }}
                            role="option"
                            aria-selected={isSel}
                            onClick={() => select(s.id)}
                            className={cn('w-full text-left flex gap-3.5 pl-5 pr-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40', isSel ? 'bg-primary/[0.05]' : 'hover:bg-muted/40')}
                          >
                            <CategoryTile category={s.category} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-3">
                                <span className="font-bold text-foreground leading-snug flex-1">{s.title}</span>
                                {s.due && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', s.due === 'Today' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground')}>{s.due}</span>}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{s.summary}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                                <TierChip tier={s.tier} />
                                <ConfidenceDot level={s.confidence} />
                                {s.value && <span className="text-[11px] font-bold tabular-nums text-foreground">{s.value}</span>}
                                <span className="text-[11px] text-muted-foreground truncate">{s.evidence[0]?.source}</span>
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
              <p className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mt-3 px-1">
                <span className="inline-flex items-center gap-1"><kbd className="min-w-5 h-5 px-1 rounded border border-border bg-card text-[10px] font-bold text-foreground inline-flex items-center justify-center">J</kbd><kbd className="min-w-5 h-5 px-1 rounded border border-border bg-card text-[10px] font-bold text-foreground inline-flex items-center justify-center">K</kbd> move</span>
                <span>Every suggestion and action is recorded in the activity log.</span>
              </p>
            </div>

            {/* Detail (wide screens, 1400px and up) */}
            {selected && (
              <motion.aside key={selected.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }} className="hidden min-[1400px]:block sticky top-4 rounded-3xl border border-border bg-card p-6 pb-24 shadow-sm max-h-[calc(100dvh-2rem)] overflow-y-auto">
                <SignalDetail signal={selected} navigateTo={navigateTo} showToast={showToast} onAdvance={advance} />
              </motion.aside>
            )}
          </div>

          {/* Detail drawer (narrower screens); portalled so an animated
              ancestor can't become its containing block. */}
          {createPortal(<AnimatePresence>
            {drawer && selected && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} className="min-[1400px]:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[70]" />
                <motion.div role="dialog" aria-label={selected.title} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }} className="min-[1400px]:hidden fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-[71] overflow-y-auto p-5">
                  <SignalDetail signal={selected} navigateTo={navigateTo} showToast={showToast} onAdvance={advance} onClose={() => setDrawer(false)} />
                </motion.div>
              </>
            )}
          </AnimatePresence>, document.body)}
        </>
      )}

      {tab === 'activity' && (
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border">
            <p className="text-sm text-muted-foreground max-w-2xl">{t('compass_hub.log_intro', 'Every suggestion Compass made and everything done with it: what data it read, where it ran and who acted. This is the audit trail the board can inspect.')}</p>
            <button onClick={() => showToast('Activity log exported for the board (demo).')} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold hover:bg-muted shrink-0"><Download className="w-3.5 h-3.5" /> Export</button>
          </div>
          <ol className="divide-y divide-border">
            {store.log.map((l) => (
              <li key={l.id} className="grid gap-2 sm:grid-cols-[110px_160px_minmax(0,1fr)_auto] sm:items-center px-6 py-3.5">
                <span className="text-xs tabular-nums text-muted-foreground">{l.time}</span>
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold', l.actor === 'Compass' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground')}>{l.actor === 'Compass' ? <Compass className="w-3.5 h-3.5" /> : l.actor.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
                  {l.actor}
                </span>
                <span className="min-w-0">
                  <span className="text-sm text-foreground">{l.text}</span>
                  {l.detail && <span className="block text-xs text-muted-foreground">{l.detail}</span>}
                </span>
                <TierChip tier={l.tier} />
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab === 'prefs' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-start">
          <section className="rounded-3xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">{t('compass_hub.delivery_title', 'How Compass reaches you')}</h3>
              <p className="text-sm text-muted-foreground">{t('compass_hub.delivery_body', 'Real time puts it in Compass as it happens; morning brief and weekly bundle it; off stops that kind of suggestion entirely.')}</p>
            </div>
            <div className="divide-y divide-border">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="flex flex-col md:flex-row md:items-center gap-3 px-6 py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <CategoryTile category={cat} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground">{CATEGORY_LABEL[cat]}</div>
                      <div className="text-xs text-muted-foreground">{DELIVERY_HINT[cat]}</div>
                    </div>
                  </div>
                  <div className="flex rounded-full bg-muted p-0.5 border border-border self-start md:self-auto" role="radiogroup" aria-label={`${CATEGORY_LABEL[cat]} delivery`}>
                    {(Object.keys(DELIVERY_LABEL) as Delivery[]).map((d) => (
                      <button key={d} role="radio" aria-checked={store.delivery[cat] === d} onClick={() => { compassStore.setDelivery(cat, d); compassStore.log(`${CATEGORY_LABEL[cat]} suggestions set to ${DELIVERY_LABEL[d].toLowerCase()}`, 'on-prem'); }} className={cn('rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap', store.delivery[cat] === d ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                        {DELIVERY_LABEL[d]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-border bg-card p-6">
              <h3 className="font-bold text-foreground mb-1">{t('compass_hub.learned_title', 'What Compass has learned')}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('compass_hub.learned_body', 'Kinds of suggestion you asked to see less of.')}</p>
              {store.muted.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">{t('compass_hub.learned_empty', 'Nothing yet. Choose “Fewer like this” on any suggestion and it will appear here.')}</p>
              ) : (
                <ul className="space-y-2">
                  {store.muted.map((kind) => {
                    const label = SIGNALS.find((s) => s.kind === kind)?.kindLabel ?? kind;
                    return (
                      <li key={kind} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                        <span className="text-sm text-foreground">Fewer {label}</span>
                        <button onClick={() => { compassStore.unmute(kind); SIGNALS.filter((s) => s.kind === kind).forEach((s) => compassStore.restore(s.id)); }} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"><Undo2 className="w-3.5 h-3.5" /> Show again</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <section className="rounded-3xl border border-border bg-card p-6">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {t('compass_hub.rules_title', 'Ground rules')}</h3>
              <ul className="space-y-2.5 text-sm text-foreground">
                {[
                  t('compass_hub.rule1', 'Compass drafts, queues and suggests. It never sends anything on its own.'),
                  t('compass_hub.rule2', 'Every suggestion shows where its facts came from.'),
                  t('compass_hub.rule3', 'Anything about a member runs on AmCham’s private model.'),
                  t('compass_hub.rule4', 'Everything it does is in the activity log.'),
                ].map((r) => <li key={r} className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{r}</li>)}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
