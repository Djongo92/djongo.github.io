import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, X, Send, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company } from '@/data/platform';
import { usePortalState } from '../portal-state';
import { answerPortalQuery, getPortalNudge, PortalCompassAnswer, PortalCompassAction } from '../portal-compass-engine';
import { AiBadge, TypewriterText } from '@/components/ui/ai-badge';
import { cn } from '@/lib/utils';

interface PortalCompassMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  answer?: PortalCompassAnswer;
}

// Phrased the way a member would actually ask, not in filter-syntax.
const SUGGESTED_QUESTIONS = ['How\'s my score?', 'When do I renew?', 'Any recommended intros?', 'What events are open?'];

interface PortalCompassFabProps {
  member: Company;
  billing: { renewalDate: string; paymentMethod: string; invoices: any[] };
  scoreNarrative?: { summary?: string } | null;
  roleParam: string;
  navigateTo: (view: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

// The portal's first-ever Compass surface — same "quick asks" job as the
// console FAB, but scoped to member-safe data only: this member's own
// numbers, plus the Directory's already-public peer fields (name, sector,
// tier, recommended reason). Never manager, lifecycle, contactFreshness, or
// another company's raw score — those stay staff-internal.
export function PortalCompassFab({ member, billing, scoreNarrative, roleParam, navigateTo, open, setOpen }: PortalCompassFabProps) {
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

  const sendQuery = (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    const userMsg: PortalCompassMessage = { id: `u-${Date.now()}`, role: 'user', text: query };
    const answer = answerPortalQuery(query, context);
    const assistantMsg: PortalCompassMessage = { id: `a-${Date.now()}`, role: 'assistant', answer };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setDraft('');
  };
  const send = () => sendQuery(draft);

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
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  {m.role === 'user' ? (
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%] shadow-sm">{m.text}</div>
                  ) : (
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm max-w-[92%] shadow-sm text-foreground space-y-2.5">
                      <TypewriterText text={m.answer?.text || ''} runKey={m.id} speedMs={6} />
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
