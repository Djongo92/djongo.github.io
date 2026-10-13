import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, X, Send, ArrowUpRight, Cpu, Laptop, Cloud, Copy, BadgeEuro, CalendarDays, Landmark, Inbox, Users, Sun, MessageSquare, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { useConsoleState } from '../console-state';
import { answerCompassQuery, getProactiveNudge, getCompanyGroundingContext, CompassAnswer, CompassAction } from '../compass-engine';
import { buildBriefing, BriefingAction } from '../compass-briefing';
import { compassStore, useCompassStore } from '../compass-store';
import { CATEGORY_LABEL, SignalCategory } from '../compass-signals';
import { AiSuggestionChip, AiThinking, TypewriterText } from '@/components/ui/ai-badge';
import { CompanyMark } from '@/components/ui/company-mark';
import { askCompassAI, buildCompassHistory, CompassAiError } from '@/lib/compass-ai';
import { askLocal, checkLocal, getProvider, setProvider as saveProvider, CompassProvider, LocalStatus, CompassLocalError } from '@/lib/compass-local';
import { createRedactor } from '@/lib/compass-redact';
import { findConsoleRehearsed, CONSOLE_SHOWCASE_PROMPTS, REHEARSED_THINK_MS } from '@/lib/compass-rehearsed';
import { useShowcase } from '@/components/showcase-tour';
import { cn } from '@/lib/utils';

// Where an answer came from. Shown under every reply, because "where does
// this run?" is the first question a privacy-minded room will ask.
type Source = 'builtin' | 'local' | 'cloud';

interface CompassMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  answer?: CompassAnswer;
  // Transient UI state for the AI-escalation path — never part of a
  // resolved CompassAnswer.
  pending?: boolean;
  source?: Source;
  model?: string;
  // For cloud answers: exactly what left the browser, after redaction.
  sent?: string;
}

// Phrased the way someone would actually ask, not in filter-syntax — proof
// that runFixtureQuery's synonym matching (struggling/at-risk/top performers/
// gone quiet/who needs a call) understands natural phrasing, not just the
// exact trigger words.
const SUGGESTED_QUESTIONS = ["Who's struggling right now?", 'Anyone I should call today?', 'Our top performers', "Who's gone quiet?"];

// Lightweight page-awareness for the AI escalation path. Plain English is
// enough here — this only ever reaches the model as a JSON field, never
// rendered UI copy, so it doesn't need to track the sidebar's i18n keys.
const VIEW_LABELS: Record<string, string> = {
  ritual: 'Priorities list',
  compass: 'Compass signals page',
  heatmap: 'Portfolio Heatmap',
  accounts: 'Accounts',
  retention: 'Retention queue',
  outreach: 'Outreach',
  ask: 'Ask',
  matchmaking: 'Matchmaking',
  sponsorship: 'Sponsorship pipeline',
  committees: 'Committees',
  intelligence: 'Intelligence',
  flags: 'Flags queue',
  approvals: 'Approvals queue',
  'my-team': 'My Team',
  'board-summary': 'Board Summary',
  cover: 'Cover page',
  digests: 'Digests',
  analytics: 'Analytics',
  reports: 'Reports',
  brief: 'a company Brief',
  network: 'Relationship Network graph',
  integrations: 'Integrations',
};

const FIRST_NAMES: Record<string, string> = { lead: 'Stefan', staffer: 'Milica', exec: 'Ana' };
const CATEGORY_ICON: Record<SignalCategory, React.ElementType> = { membership: BadgeEuro, events: CalendarDays, advocacy: Landmark, service: Inbox, team: Users };
const URGENCY_DOT: Record<string, string> = { Critical: 'bg-destructive', High: 'bg-amber-500', Medium: 'bg-sky-500', Low: 'bg-muted-foreground/50' };
const BRIEF_SEEN_KEY = 'amcham_compass_brief_seen';

interface CompassFabProps {
  view: string;
  // The dossier panel covers the right 600px on desktop; sit beside it, not on it.
  dossierOpen?: boolean;
  selectedCompanyId: string | null;
  roleParam: string;
  navigateTo: (view: string, companyId?: string, extraParams?: Record<string, string>) => void;
  showToast: (msg: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  // True while the console's own guided tour is on screen.
  suppressNudge?: boolean;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function SourceLine({ m }: { m: CompassMessage }) {
  if (!m.source || m.pending) return null;
  if (m.source === 'local') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 pt-1">
        <Laptop className="w-3.5 h-3.5" /> Private model{m.model ? ` · ${m.model}` : ''} · stayed on this laptop
      </div>
    );
  }
  if (m.source === 'cloud') {
    return (
      <details className="pt-1 group">
        <summary className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 cursor-pointer list-none">
          <Cloud className="w-3.5 h-3.5" /> Cloud model · names and amounts removed
          <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
          <span className="text-muted-foreground font-medium">What was sent</span>
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted/60 border border-border p-2 text-[10.5px] leading-snug whitespace-pre-wrap break-words text-foreground">{m.sent}</pre>
      </details>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground pt-1">
      <Cpu className="w-3.5 h-3.5" /> Built in · nothing sent anywhere
    </div>
  );
}

export function CompassFab({ view, dossierOpen = false, selectedCompanyId, roleParam, navigateTo, showToast, open, setOpen, suppressNudge = false }: CompassFabProps) {
  const { t } = useI18n();
  const { queueOutreach } = useConsoleState();
  const { active: showcaseActive } = useShowcase();
  const [messages, setMessages] = useState<CompassMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState<'today' | 'ask'>('today');
  const [provider, setProviderState] = useState<CompassProvider>(getProvider);
  const [localStatus, setLocalStatus] = useState<LocalStatus>({ state: 'checking' });
  const [bubble, setBubble] = useState(false);
  // Snapshotted on open, not read live from props — the Dossier panel shares
  // the FAB's right-hand edge, so opening Compass closes it (see toggleOpen
  // below); without pinning, that would also drop the very company context
  // a "brief me on this" question depends on.
  const [pinnedCompanyId, setPinnedCompanyId] = useState<string | null>(null);

  const nudge = useMemo(() => getProactiveNudge(), []);
  const briefing = useMemo(() => buildBriefing(), []);
  const { visible: signals } = useCompassStore();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const firstName = FIRST_NAMES[roleParam] ?? 'there';
  const canShowDeepLinks = roleParam !== 'exec';

  useEffect(() => {
    if (open && messages.length === 0 && nudge) {
      setMessages([{ id: 'nudge', role: 'assistant', answer: nudge, source: 'builtin' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (tab === 'ask') transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, tab]);

  // Probe the local model whenever "This laptop" is chosen or the panel opens.
  useEffect(() => {
    if (provider !== 'local') return;
    let live = true;
    setLocalStatus({ state: 'checking' });
    checkLocal().then((s) => live && setLocalStatus(s));
    return () => { live = false; };
  }, [provider, open]);

  // Proactive: once per session, Compass offers the morning brief unprompted.
  useEffect(() => {
    if (suppressNudge || showcaseActive || open || view === 'compass') return;
    let seen = false;
    try { seen = sessionStorage.getItem(BRIEF_SEEN_KEY) === '1'; } catch { /* ignore */ }
    if (seen) return;
    const show = setTimeout(() => {
      setBubble(true);
      try { sessionStorage.setItem(BRIEF_SEEN_KEY, '1'); } catch { /* ignore */ }
    }, 1600);
    return () => clearTimeout(show);
  }, [suppressNudge, showcaseActive, open, view]);
  useEffect(() => {
    if (!bubble) return;
    const hide = setTimeout(() => setBubble(false), 15000);
    return () => clearTimeout(hide);
  }, [bubble]);
  useEffect(() => { if (open || showcaseActive || suppressNudge || view === 'compass') setBubble(false); }, [open, showcaseActive, suppressNudge, view]);

  const chooseProvider = (p: CompassProvider) => {
    setProviderState(p);
    saveProvider(p);
  };

  const handleAction = (action: CompassAction) => {
    if (action.type === 'queue' && action.companyId) {
      const company = platformData.allMembers.find((c) => c.id === action.companyId);
      if (company) {
        queueOutreach(company);
        showToast(`Queued ${company.name} for outreach`);
      }
      return;
    }
    if (action.type === 'openDossier' && action.companyId) {
      navigateTo(view, action.companyId);
    } else if (action.type === 'openBrief' && action.companyId) {
      navigateTo('brief', action.companyId);
    } else if (action.type === 'openAsk') {
      navigateTo('ask', undefined, action.query ? { q: action.query } : undefined);
    }
    setOpen(false);
  };

  const runBriefingAction = (a: BriefingAction) => {
    if (a.kind === 'ask') {
      sendQuery(a.prompt);
    } else {
      navigateTo(a.view, a.companyId);
      setOpen(false);
    }
  };

  // Book-level context for a query with no company pinned — a small summary,
  // never all 40 companies' full records. "at-risk" reuses ask.tsx's own
  // lifecycle==='at-risk' definition so Compass's book-wide answers stay
  // consistent with what Ask/Cmd+K already consider "at risk".
  const buildBookContext = () => {
    const members = platformData.allMembers;
    const byTier: Record<string, number> = {};
    for (const c of members) byTier[c.tier] = (byTier[c.tier] || 0) + 1;
    const topAtRisk = members
      .filter((c) => c.lifecycle === 'at-risk')
      .slice(0, 5)
      .map((c) => ({ name: c.name, score: c.score, scoreTrend: c.scoreTrend }));
    return { totalMembers: members.length, byTier, topAtRisk };
  };

  const resolve = (id: string, patch: Partial<CompassMessage>) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pending: false, ...patch } : m)));

  const sendQuery = async (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    setTab('ask');
    const userMsg: CompassMessage = { id: `u-${Date.now()}`, role: 'user', text: query };
    setDraft('');

    const rehearsed = findConsoleRehearsed(query);
    if (rehearsed) {
      const placeholderId = `a-${Date.now()}`;
      setMessages((prev) => [...prev, userMsg, { id: placeholderId, role: 'assistant', pending: true }]);
      await new Promise((r) => setTimeout(r, REHEARSED_THINK_MS));
      resolve(placeholderId, { answer: { text: rehearsed }, source: 'builtin' });
      return;
    }

    const answer = answerCompassQuery(query, { selectedCompanyId: pinnedCompanyId }, t);

    if (answer.matched) {
      setMessages((prev) => [...prev, userMsg, { id: `a-${Date.now()}`, role: 'assistant', answer, source: 'builtin' }]);
      return;
    }

    const placeholderId = `a-${Date.now()}`;
    const history = buildCompassHistory(messages);
    setMessages((prev) => [...prev, userMsg, { id: placeholderId, role: 'assistant', pending: true }]);
    const baseContext = pinnedCompanyId ? getCompanyGroundingContext(pinnedCompanyId) : buildBookContext();
    const pinnedCompanyName = pinnedCompanyId ? platformData.allMembers.find((c) => c.id === pinnedCompanyId)?.name : undefined;
    const pageLabel = VIEW_LABELS[view] ?? view.replace(/-/g, ' ');
    const groundingContext = {
      ...(baseContext ?? {}),
      currentPage: pinnedCompanyName ? `${pageLabel} (dossier open for ${pinnedCompanyName})` : pageLabel,
    };

    if (provider === 'local') {
      // Never fall back to the cloud when "This laptop" is chosen: that
      // would quietly break the promise the switch makes.
      if (localStatus.state !== 'ready' || !localStatus.model) {
        resolve(placeholderId, { answer: { text: "The private model isn't running on this laptop, so I haven't sent this anywhere. Built-in questions still work, or switch to Cloud." }, source: 'builtin' });
        return;
      }
      try {
        const text = await askLocal(query, groundingContext, history, localStatus.model);
        resolve(placeholderId, { answer: { text }, source: 'local', model: localStatus.model });
      } catch (err) {
        const text = err instanceof CompassLocalError ? err.message : 'The private model could not answer that just now.';
        resolve(placeholderId, { answer: { text }, source: 'builtin' });
      }
      return;
    }

    const redactor = createRedactor();
    const safeQuery = redactor.redact(query);
    const safeContext = JSON.parse(redactor.redact(JSON.stringify(groundingContext)));
    const safeHistory = history.map((h) => ({ ...h, text: redactor.redact(h.text) }));
    const hint = redactor.count() ? ' (Names and amounts appear as placeholders like [COMPANY_1]; keep them exactly as written.)' : '';
    const sent = JSON.stringify({ question: safeQuery, data: safeContext }, null, 1).slice(0, 1500);
    try {
      const text = await askCompassAI(safeQuery + hint, safeContext, safeHistory);
      resolve(placeholderId, { answer: { text: redactor.restore(text) }, source: 'cloud', sent });
    } catch (err) {
      const text = err instanceof CompassAiError ? err.message : 'Compass could not answer that just now.';
      resolve(placeholderId, { answer: { text }, source: 'builtin' });
    }
  };
  const send = () => sendQuery(draft);

  const copyDraft = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Draft copied. Paste it into Outlook.');
    } catch {
      showToast('Copy is blocked in this browser.');
    }
  };

  const suggestions = useMemo(() => {
    if (!pinnedCompanyId) return SUGGESTED_QUESTIONS;
    const company = platformData.allMembers.find((c) => c.id === pinnedCompanyId);
    return company ? [`Brief me on ${company.name}`, ...SUGGESTED_QUESTIONS.slice(0, 3)] : SUGGESTED_QUESTIONS;
  }, [pinnedCompanyId]);

  // Recurring, lightly contextual follow-ups shown after every resolved
  // answer, so the conversation never dead-ends into a bare text box.
  const hasUserMessage = messages.some((m) => m.role === 'user');
  const lastMsg = messages[messages.length - 1];
  const followUps = useMemo(() => {
    if (!hasUserMessage || !lastMsg || lastMsg.role !== 'assistant' || lastMsg.pending) return [];
    const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.text;
    const fromAnswer = lastMsg.answer?.companies?.slice(0, 1).map((c) => `Brief me on ${c.name}`) ?? [];
    const rest = suggestions.filter((s) => s !== lastUserText && !fromAnswer.includes(s));
    return [...fromAnswer, ...rest].slice(0, 3);
  }, [hasUserMessage, lastMsg, messages, suggestions]);
  const asked = new Set(messages.filter((m) => m.role === 'user').map((m) => m.text));
  const nextShowcase = CONSOLE_SHOWCASE_PROMPTS.find((p) => !asked.has(p));

  // The Dossier side panel shares the FAB's right-hand edge — opening Compass
  // closes it rather than floating on top of it, after snapshotting whatever
  // company was in view so a "brief me on this" question still has it in scope.
  const dossierShowing = !!selectedCompanyId && view !== 'brief';
  const openPanel = (toTab?: 'today' | 'ask') => {
    setPinnedCompanyId(selectedCompanyId);
    if (dossierShowing) navigateTo(view);
    if (toTab) setTab(toTab);
    setBubble(false);
    setOpen(true);
  };
  const toggleOpen = () => (open ? setOpen(false) : openPanel());

  const statusLabel = provider === 'cloud'
    ? 'Names and amounts removed before sending'
    : localStatus.state === 'checking' ? 'Looking for the private model…'
    : localStatus.state === 'ready' ? `Ready · ${localStatus.model} · works offline`
    : 'Private model not running on this laptop';

  return (
    <div className={cn("fixed bottom-24 right-6 md:right-10 z-[65] print:hidden transition-[right] duration-300", dossierOpen && "md:right-[624px]")}>
      <AnimatePresence>
        {bubble && !open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute bottom-[4.5rem] right-0 w-72 bg-card border border-border rounded-2xl shadow-2xl p-4"
            role="status"
          >
            <button onClick={() => setBubble(false)} aria-label="Dismiss" className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center"><Compass className="w-3.5 h-3.5 text-primary" /></span>
              <span className="text-xs font-bold text-foreground">Compass</span>
            </div>
            <p className="text-sm text-foreground leading-snug pr-4">
              {greeting()}, {firstName}. {briefing.priorities.length} priorities need you today ({briefing.atStake} at stake), and {signals.length} suggestions are waiting in Compass.
            </p>
            <button onClick={() => openPanel('today')} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              Open my brief <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="mb-4 w-[calc(100vw-3rem)] max-w-md bg-card border border-border rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
            style={{ height: 'min(600px, calc(100dvh - 9rem))' }}
            role="dialog"
            aria-label="Compass"
          >
            <div className="px-4 pt-4 pb-3 bg-secondary text-secondary-foreground shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4" />
                  <div className="font-bold text-sm">Compass</div>
                  <span className="text-[11px] text-secondary-foreground/75">Your AmCham assistant</span>
                </div>
                <div className="flex rounded-full bg-secondary-foreground/10 p-0.5" role="tablist">
                  {([['today', 'Today', Sun], ['ask', 'Ask', MessageSquare]] as const).map(([id, label, Icon]) => (
                    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-colors', tab === id ? 'bg-secondary-foreground text-secondary' : 'text-secondary-foreground/80 hover:text-secondary-foreground')}>
                      <Icon className="w-3 h-3" /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary-foreground/75 shrink-0">Runs on</span>
                <div className="flex rounded-full bg-secondary-foreground/10 p-0.5" role="radiogroup" aria-label="Where Compass runs">
                  {([['cloud', 'Cloud', Cloud], ['local', 'This laptop', Laptop]] as const).map(([id, label, Icon]) => (
                    <button key={id} role="radio" aria-checked={provider === id} onClick={() => chooseProvider(id)} className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors', provider === id ? 'bg-secondary-foreground text-secondary' : 'text-secondary-foreground/80 hover:text-secondary-foreground')}>
                      <Icon className="w-3 h-3" /> {label}
                    </button>
                  ))}
                </div>
                <span className="flex items-center gap-1.5 min-w-0 basis-full text-[11px] text-secondary-foreground/80">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', provider === 'cloud' ? 'bg-amber-400' : localStatus.state === 'ready' ? 'bg-emerald-400' : localStatus.state === 'checking' ? 'bg-secondary-foreground/40 animate-pulse' : 'bg-destructive')} />
                  <span className="truncate">{statusLabel}</span>
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {provider === 'local' && localStatus.state === 'offline' && (
                <details className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
                  <summary className="cursor-pointer font-semibold">Built-in answers still work. Nothing goes to the cloud while “This laptop” is on.</summary>
                  <div className="mt-2 space-y-1.5 text-muted-foreground">
                    <p>To answer free-form questions offline, start the private model on this laptop:</p>
                    <code className="block rounded bg-background border border-border px-2 py-1 text-foreground">ollama pull qwen2.5:7b</code>
                    <code className="block rounded bg-background border border-border px-2 py-1 text-foreground">OLLAMA_ORIGINS="*" ollama serve</code>
                  </div>
                </details>
              )}

              {tab === 'today' ? (
                <div className="space-y-5">
                  <div>
                    <p className="font-serif text-xl text-foreground">{greeting()}, {firstName}.</p>
                    <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · prepared from this morning’s data</p>
                  </div>

                  <section>
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Needs you today</h3>
                      {canShowDeepLinks && (
                        <button onClick={() => { navigateTo('ritual'); setOpen(false); }} className="text-[11px] font-bold text-primary hover:underline">
                          {briefing.openCount} open · {briefing.atStake} at stake
                        </button>
                      )}
                    </div>
                    <div className="rounded-2xl border border-border bg-card divide-y divide-border">
                      {briefing.priorities.map((p) => (
                        <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5">
                          <CompanyMark name={p.name} sector={p.sector} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-foreground truncate">{p.name}</span>
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', URGENCY_DOT[p.urgency])} />
                            </div>
                            <div className="text-[11px] text-muted-foreground">{p.tag.toLowerCase()} · {p.value} · due {p.due.toLowerCase()}</div>
                          </div>
                          {(p.action.kind === 'ask' || canShowDeepLinks) && (
                            <button onClick={() => runBriefingAction(p.action)} className="shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                              {p.action.label}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Compass noticed</h3>
                      {canShowDeepLinks && signals.length > 0 && (
                        <button onClick={() => { navigateTo('compass'); setOpen(false); }} className="text-[11px] font-bold text-primary hover:underline">See all {signals.length}</button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {signals.slice(0, 4).map((s) => {
                          const Icon = CATEGORY_ICON[s.category];
                          return (
                            <motion.div key={s.id} layout exit={{ opacity: 0, height: 0 }} className="rounded-2xl border border-border bg-card p-3">
                              <div className="flex gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5" /></span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold text-foreground leading-snug">{s.title}</div>
                                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{s.summary}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {canShowDeepLinks && (
                                      <button onClick={() => { navigateTo('compass', undefined, { signal: s.id }); setOpen(false); }} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20">{s.action.label}</button>
                                    )}
                                    <button onClick={() => compassStore.setStatus(s, 'dismissed', `Dismissed “${s.title}”`)} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">Dismiss</button>
                                    <span className="ml-auto text-[10.5px] text-muted-foreground truncate">{CATEGORY_LABEL[s.category]}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {signals.length === 0 && <p className="text-xs text-muted-foreground">You’re clear. I’ll flag anything new as it comes in.</p>}
                    </div>
                  </section>
                </div>
              ) : (
                <>
                  {!hasUserMessage && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Ask about your members in your own words, or ask me to draft something.
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {suggestions.map((s) => (
                          <button key={s} onClick={() => sendQuery(s)} className="text-left text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-background hover:border-primary/40 hover:text-primary transition-colors">
                            {s}
                          </button>
                        ))}
                        {CONSOLE_SHOWCASE_PROMPTS.slice(0, 2).map((p) => (
                          <AiSuggestionChip key={p} label={p} onClick={() => sendQuery(p)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start gap-2'}>
                      {m.role === 'user' ? (
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%] shadow-sm">{m.text}</div>
                      ) : (
                        <>
                          <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Compass className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm max-w-[92%] shadow-sm text-foreground space-y-2.5 min-w-0">
                            {m.pending ? <AiThinking /> : <TypewriterText text={m.answer?.text || ''} runKey={m.id} speedMs={6} className="whitespace-pre-line" />}
                            {m.answer?.companies && m.answer.companies.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {m.answer.companies.map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => canShowDeepLinks && handleAction({ type: 'openDossier', label: c.name, companyId: c.id })}
                                    disabled={!canShowDeepLinks}
                                    className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors disabled:cursor-default"
                                  >
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-foreground truncate">{c.name}</div>
                                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{c.sector} · {c.tier}</div>
                                    </div>
                                    <div className="text-xs font-bold text-foreground shrink-0 tabular-nums">{c.score}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {m.answer?.departed && m.answer.departed.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {m.answer.departed.map((d) => (
                                  <div key={d.id} className="px-3 py-2 rounded-xl border border-border bg-background">
                                    <div className="text-xs font-bold text-foreground">{d.name}</div>
                                    <div className="text-[11px] text-muted-foreground">{d.sector} · departed {d.departedDate}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {m.answer?.actions && m.answer.actions.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {m.answer.actions
                                  .filter((a) => canShowDeepLinks || a.type === 'queue')
                                  .map((a, i) => (
                                    <button key={i} onClick={() => handleAction(a)} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                      {a.label} <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                  ))}
                              </div>
                            )}
                            {!m.pending && m.answer?.text?.startsWith('Subject:') && (
                              <div>
                                <button onClick={() => copyDraft(m.answer!.text)} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                                  <Copy className="w-3 h-3" /> Copy draft
                                </button>
                              </div>
                            )}
                            {m.id !== 'nudge' && <SourceLine m={m} />}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {followUps.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {followUps.map((s) => (
                        <button key={s} onClick={() => sendQuery(s)} className="text-left text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-background hover:border-primary/40 hover:text-primary transition-colors">
                          {s}
                        </button>
                      ))}
                      {nextShowcase && <AiSuggestionChip label={nextShowcase} onClick={() => sendQuery(nextShowcase)} />}
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </>
              )}
            </div>
            <div className="p-3 border-t border-border flex items-center gap-2 bg-card shrink-0">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask, or ask me to draft something…"
                aria-label="Ask Compass"
                className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
              />
              <button onClick={send} disabled={!draft.trim()} aria-label="Send" className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={toggleOpen}
        className={cn(
          'w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform relative',
          !open && (signals.length > 0 || nudge) && messages.length === 0 && 'after:content-[""] after:absolute after:top-1 after:right-1 after:w-3 after:h-3 after:rounded-full after:bg-destructive after:border-2 after:border-background',
        )}
        aria-label="Ask Compass"
      >
        {open ? <X className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
      </button>
    </div>
  );
}
