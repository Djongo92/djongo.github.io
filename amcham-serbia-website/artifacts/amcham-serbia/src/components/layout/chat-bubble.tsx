import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { MessageCircle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message { from: 'them' | 'you'; text: string }

const GREETING: Message = { from: 'them', text: "Hi! I'm here if you have questions about membership, events, or advocacy at AmCham Serbia. Typically replies in under 2 hours." };
const AUTO_REPLY = "Thanks for reaching out — a member of our team will follow up by email shortly. In the meantime, feel free to browse Membership or Events.";

// Public-site trust theater only — an internal staff tool has no reason to
// prompt a "chat with us" widget, so this stays off every /platform/* route.
export function ChatBubble() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState('');

  if (location.startsWith('/platform')) return null;

  const send = () => {
    if (!draft.trim()) return;
    setMessages(prev => [...prev, { from: 'you', text: draft.trim() }]);
    setDraft('');
    setTimeout(() => setMessages(prev => [...prev, { from: 'them', text: AUTO_REPLY }]), 900);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70] print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="mb-4 w-[calc(100vw-3rem)] max-w-sm bg-card border border-border rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
            style={{ height: 420 }}
          >
            <div className="p-4 bg-secondary text-secondary-foreground flex items-center justify-between shrink-0">
              <div>
                <div className="font-bold text-sm">AmCham Serbia</div>
                <div className="text-[10px] uppercase tracking-widest text-secondary-foreground/60 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Typically replies in &lt;2h</div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-secondary-foreground/20 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {messages.map((m, i) => (
                <div key={i} className={m.from === 'you' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={m.from === 'you'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%] shadow-sm'
                    : 'bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm max-w-[85%] shadow-sm text-foreground'}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex items-center gap-2 bg-card shrink-0">
              <input
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Type a message..."
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
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open chat"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </div>
  );
}
