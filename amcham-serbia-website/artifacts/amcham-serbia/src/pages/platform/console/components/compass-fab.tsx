import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, X, Send, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { useConsoleState } from '../console-state';
import { answerCompassQuery, getProactiveNudge, getCompanyGroundingContext, CompassAnswer, CompassAction } from '../compass-engine';
import { AiBadge, AiThinking, TypewriterText } from '@/components/ui/ai-badge';
import { askCompassAI, CompassAiError } from '@/lib/compass-ai';
import { cn } from '@/lib/utils';

interface CompassMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  answer?: CompassAnswer;
  // Transient UI state for the AI-escalation path — never part of a
  // resolved CompassAnswer.
  pending?: boolean;
}

// Phrased the way someone would actually ask, not in filter-syntax — proof
// that runFixtureQuery's synonym matching (struggling/at-risk/top performers/
// gone quiet/who needs a call) understands natural phrasing, not just the
// exact trigger words. Shown before the first message; clicking one submits
// it immediately.
const SUGGESTED_QUESTIONS = ["Who's struggling right now?", 'Anyone I should call today?', 'Our top performers', "Who's gone quiet?"];

interface CompassFabProps {
  view: string;
  selectedCompanyId: string | null;
  roleParam: string;
  navigateTo: (view: string, companyId?: string, extraParams?: Record<string, string>) => void;
  showToast: (msg: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

// The "quick asks / on-the-go" surface, distinct on purpose from Ask (deep
// analysis, full table, bulk actions) and Cmd+K (ephemeral preview while
// typing): a persistent, multi-turn transcript that resolves instantly —
// no fake "thinking" delay, that theater already belongs to Ask.
export function CompassFab({ view, selectedCompanyId, roleParam, navigateTo, showToast, open, setOpen }: CompassFabProps) {
  const { t } = useI18n();
  const { queueOutreach } = useConsoleState();
  const [messages, setMessages] = useState<CompassMessage[]>([]);
  const [draft, setDraft] = useState('');
  // Snapshotted on open, not read live from props — the Dossier panel shares
  // the FAB's right-hand edge, so opening Compass closes it (see toggleOpen
  // below); without pinning, that would also drop the very company context
  // a "brief me on this" question depends on.
  const [pinnedCompanyId, setPinnedCompanyId] = useState<string | null>(null);

  const nudge = useMemo(() => getProactiveNudge(), []);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0 && nudge) {
      setMessages([{ id: 'nudge', role: 'assistant', answer: nudge }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const canShowDeepLinks = roleParam !== 'exec';

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

  const sendQuery = async (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    const userMsg: CompassMessage = { id: `u-${Date.now()}`, role: 'user', text: query };
    const answer = answerCompassQuery(query, { selectedCompanyId: pinnedCompanyId }, t);
    setDraft('');

    if (answer.matched) {
      const assistantMsg: CompassMessage = { id: `a-${Date.now()}`, role: 'assistant', answer };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      return;
    }

    const placeholderId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: placeholderId, role: 'assistant', pending: true }]);
    const groundingContext = pinnedCompanyId ? getCompanyGroundingContext(pinnedCompanyId) : buildBookContext();
    try {
      const text = await askCompassAI(query, groundingContext);
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, pending: false, answer: { text } } : m)));
    } catch (err) {
      const text = err instanceof CompassAiError ? err.message : 'Compass could not answer that just now.';
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, pending: false, answer: { text } } : m)));
    }
  };
  const send = () => sendQuery(draft);

  const suggestions = useMemo(() => {
    if (!pinnedCompanyId) return SUGGESTED_QUESTIONS;
    const company = platformData.allMembers.find((c) => c.id === pinnedCompanyId);
    return company ? [`Brief me on ${company.name}`, ...SUGGESTED_QUESTIONS.slice(0, 3)] : SUGGESTED_QUESTIONS;
  }, [pinnedCompanyId]);

  // The Dossier side panel shares the FAB's right-hand edge (console.tsx's
  // own condition for showing it, mirrored here) — opening Compass closes it
  // rather than floating on top of it, after snapshotting whatever company
  // was in view so a "brief me on this" question still has it in scope.
  const dossierShowing = !!selectedCompanyId && view !== 'brief';
  const toggleOpen = () => {
    const opening = !open;
    if (opening) {
      setPinnedCompanyId(selectedCompanyId);
      if (dossierShowing) navigateTo(view);
    }
    setOpen(opening);
  };

  return (
    <div className="fixed bottom-24 right-6 md:right-10 z-[65] print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="mb-4 w-[calc(100vw-3rem)] max-w-sm bg-card border border-border rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
            style={{ height: 460 }}
          >
            <div className="p-4 bg-secondary text-secondary-foreground flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4" />
                <div className="font-bold text-sm">Ask Compass</div>
              </div>
              <AiBadge className="bg-secondary-foreground/10 border-secondary-foreground/10 text-secondary-foreground/70" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {!messages.some((m) => m.role === 'user') && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Quick questions about the book, in your own words — try one below, or type your own.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendQuery(s)}
                        className="text-left text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-background hover:border-primary/40 hover:text-primary transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  {m.role === 'user' ? (
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%] shadow-sm">{m.text}</div>
                  ) : (
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm max-w-[92%] shadow-sm text-foreground space-y-2.5">
                      {m.pending ? <AiThinking /> : <TypewriterText text={m.answer?.text || ''} runKey={m.id} speedMs={6} />}
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
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.sector} · {c.tier}</div>
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
                              <div className="text-[10px] text-muted-foreground">{d.sector} · departed {d.departedDate}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {m.answer?.actions && m.answer.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {m.answer.actions
                            .filter((a) => canShowDeepLinks || a.type === 'queue')
                            .map((a, i) => (
                              <button
                                key={i}
                                onClick={() => handleAction(a)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                {a.label} <ArrowUpRight className="w-3 h-3" />
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
            <div className="p-3 border-t border-border flex items-center gap-2 bg-card shrink-0">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about the book..."
                className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
              />
              <button onClick={send} disabled={!draft.trim()} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity">
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
          !open && nudge && messages.length === 0 && 'after:content-[""] after:absolute after:top-1 after:right-1 after:w-3 after:h-3 after:rounded-full after:bg-destructive after:border-2 after:border-background',
        )}
        aria-label="Ask Compass"
      >
        {open ? <X className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
      </button>
    </div>
  );
}
