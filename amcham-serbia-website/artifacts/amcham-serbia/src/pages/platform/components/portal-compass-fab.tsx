import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, X, Send, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company } from '@/data/platform';
import { usePortalState } from '../portal-state';
import { answerPortalQuery, getPortalNudge, toSafeMember, toPeer, PortalCompassAnswer, PortalCompassAction, PortalCompassContext, PortalPeer } from '../portal-compass-engine';
import { AiBadge, AiThinking, TypewriterText } from '@/components/ui/ai-badge';
import { askCompassAI, buildCompassHistory, CompassAiError } from '@/lib/compass-ai';
import { cn } from '@/lib/utils';

interface PortalCompassMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  answer?: PortalCompassAnswer;
  // Transient UI state for the AI-escalation path — never part of a
  // resolved PortalCompassAnswer.
  pending?: boolean;
}

// Phrased the way a member would actually ask, not in filter-syntax.
const SUGGESTED_QUESTIONS = ['How\'s my score?', 'When do I renew?', 'Any recommended intros?', 'What events are open?'];

// Lightweight page-awareness for the AI escalation path — a plain English
// label is enough since this only ever reaches the model as a JSON field.
const VIEW_LABELS: Record<string, string> = {
  home: 'Home dashboard',
  score: 'Membership Value (score breakdown)',
  glance: 'At a Glance',
  directory: 'the Member Directory',
  laptime: 'Lap Time',
  events: 'Events',
  marketplace: 'the Opportunities marketplace',
  committee: 'Committees',
  onboarding: 'Onboarding',
  seam: 'The Seam',
  people: 'People',
  billing: 'Billing',
  notifications: 'Notifications',
};

interface PortalCompassFabProps {
  member: Company;
  billing: { renewalDate: string; paymentMethod: string; invoices: any[] };
  scoreNarrative?: { summary?: string } | null;
  roleParam: string;
  view: string;
  navigateTo: (view: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

// The portal's first-ever Compass surface — same "quick asks" job as the
// console FAB, but scoped to member-safe data only: this member's own
// numbers, plus the Directory's already-public peer fields (name, sector,
// tier, recommended reason). Never manager, lifecycle, contactFreshness, or
// another company's raw score — those stay staff-internal.
export function PortalCompassFab({ member, billing, scoreNarrative, roleParam, view, navigateTo, open, setOpen }: PortalCompassFabProps) {
  const { directory, events, opportunities, committees } = usePortalState();
  const [messages, setMessages] = useState<PortalCompassMessage[]>([]);
  const [draft, setDraft] = useState('');

  const context = useMemo(
    () => ({ member, billing, scoreNarrative, roleParam, directory, events, opportunities, committees }),
    [member, billing, scoreNarrative, roleParam, directory, events, opportunities, committees],
  );

  const nudge = useMemo(() => getPortalNudge(context), [context]);
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

  const handleAction = (action: PortalCompassAction) => {
    navigateTo(action.viewId);
    setOpen(false);
  };

  const sendQuery = async (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    const userMsg: PortalCompassMessage = { id: `u-${Date.now()}`, role: 'user', text: query };
    const answer = answerPortalQuery(query, context);
    setDraft('');

    if (answer.matched) {
      const assistantMsg: PortalCompassMessage = { id: `a-${Date.now()}`, role: 'assistant', answer };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      return;
    }

    const placeholderId = `a-${Date.now()}`;
    const history = buildCompassHistory(messages);
    setMessages((prev) => [...prev, userMsg, { id: placeholderId, role: 'assistant', pending: true }]);
    // Billing is re-gated here, not just inherited from `context` — the
    // deterministic fee branch above only gates it with a runtime `if`, so
    // this object (not `context` itself) is what actually leaves the
    // browser toward the AI backend. Everything else here (peers, events,
    // committees, opportunities) is already ungated in `context` — the
    // deterministic branches above read it with no role check — so folding
    // narrowed slices of it in here isn't a new exposure, just parity: the
    // AI path was previously blind to exactly the topics the suggested
    // questions invite (events, intros, committees), which is why an
    // unmatched version of those questions came back so thin.
    const recommendedPeers = directory.filter((d: PortalCompassContext['directory'][number]) => d.recommended).slice(0, 5).map(toPeer);
    const lastAnsweredPeers = [...messages].reverse().find((m) => m.role === 'assistant' && m.answer?.peers?.length)?.answer?.peers ?? [];
    const relevantPeers = new Map<string, PortalPeer>();
    for (const p of [...recommendedPeers, ...lastAnsweredPeers]) relevantPeers.set(p.id, p);
    const groundingContext = {
      member: toSafeMember(member),
      billing: roleParam === 'admin' ? billing : undefined,
      scoreNarrative,
      currentPage: VIEW_LABELS[view] ?? view,
      relevantPeers: Array.from(relevantPeers.values()).slice(0, 8),
      openEvents: events
        .filter((e: PortalCompassContext['events'][number]) => e.capacity.booked < e.capacity.total)
        .slice(0, 5)
        .map((e: PortalCompassContext['events'][number]) => ({ title: e.title, date: e.date })),
      notJoinedCommittees: committees
        .filter((c: PortalCompassContext['committees'][number]) => !c.joined)
        .map((c: PortalCompassContext['committees'][number]) => c.name),
      openOpportunities: opportunities
        .slice(0, 5)
        .map((o: PortalCompassContext['opportunities'][number]) => ({ title: o.title, author: o.author })),
    };
    try {
      const text = await askCompassAI(query, groundingContext, history);
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, pending: false, answer: { text } } : m)));
    } catch (err) {
      const text = err instanceof CompassAiError ? err.message : 'Compass could not answer that just now.';
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, pending: false, answer: { text } } : m)));
    }
  };
  const send = () => sendQuery(draft);

  // Same recurring-chip fix as the console FAB: surface a peer from the just-
  // given answer first, if there is one, then the static list minus whatever
  // was just asked — never just go silent after the first exchange.
  const hasUserMessage = messages.some((m) => m.role === 'user');
  const lastMsg = messages[messages.length - 1];
  const followUps = useMemo(() => {
    if (!hasUserMessage || !lastMsg || lastMsg.role !== 'assistant' || lastMsg.pending) return [];
    const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.text;
    const fromAnswer = lastMsg.answer?.peers?.slice(0, 1).map((p) => `Tell me more about ${p.name}`) ?? [];
    const rest = SUGGESTED_QUESTIONS.filter((s) => s !== lastUserText && !fromAnswer.includes(s));
    return [...fromAnswer, ...rest].slice(0, 3);
  }, [hasUserMessage, lastMsg, messages]);

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
                    Quick questions about your membership, in your own words — try one below, or type your own.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {SUGGESTED_QUESTIONS.map((s) => (
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
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start gap-2'}>
                  {m.role === 'user' ? (
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%] shadow-sm">{m.text}</div>
                  ) : (
                    <>
                    <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Compass className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm max-w-[92%] shadow-sm text-foreground space-y-2.5">
                      {m.pending ? <AiThinking /> : <TypewriterText text={m.answer?.text || ''} runKey={m.id} speedMs={6} />}
                      {m.answer?.peers && m.answer.peers.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {m.answer.peers.map((p) => (
                            <div key={p.id} className="px-3 py-2 rounded-xl border border-border bg-background">
                              <div className="text-xs font-bold text-foreground">{p.name}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{p.sector} · {p.tier}</div>
                              {p.recReason && <div className="text-[11px] text-muted-foreground mt-1">{p.recReason}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      {m.answer?.actions && m.answer.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {m.answer.actions.map((a, i) => (
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
                    </>
                  )}
                </div>
              ))}
              {followUps.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  {followUps.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendQuery(s)}
                      className="text-left text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-background hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
            <div className="p-3 border-t border-border flex items-center gap-2 bg-card shrink-0">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about your membership..."
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
        onClick={() => setOpen(!open)}
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
