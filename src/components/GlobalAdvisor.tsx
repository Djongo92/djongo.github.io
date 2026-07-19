import { useState, useRef, useEffect } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chapters } from "@/data/chapters";
import { guidebookSummary } from "@/lib/chapterToText";
import { useFirmContext } from "@/hooks/useFirmContext";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Props {
  readChapters: string[];
  bookmarks: string[];
  implementedCount: number;
  totalActions: number;
}

const GlobalAdvisor = ({ readChapters, bookmarks, implementedCount, totalActions }: Props) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const { context } = useFirmContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    try {
      const readTitles = readChapters.map((id) => chapters.find((c) => c.id === id)?.title).filter(Boolean) as string[];
      const bookmarkedTitles = bookmarks.map((id) => chapters.find((c) => c.id === id)?.title).filter(Boolean) as string[];

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/global-advisor`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({
          messages: [...messages, userMsg],
          guidebookSummary: guidebookSummary(chapters),
          userProgress: { read: readTitles, bookmarked: bookmarkedTitles, implementedCount, totalActions },
          firmContext: context,
        }),
      });

      if (resp.status === 429) { toast.error("Rate limit reached."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantSoFar += c;
              const snapshot = assistantSoFar;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
                }
                return [...prev, { role: "assistant", content: snapshot }];
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't reach advisor.");
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    "What should I focus on first?",
    "Build me a 30-day plan",
    "How do I get partners to write more?",
  ];

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 group flex items-center gap-2 bg-gradient-to-br from-primary to-gold-light text-primary-foreground pl-3 pr-4 py-2.5 rounded-full shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-shadow print:hidden"
        aria-label="Open AI Strategy Advisor"
      >
        <div className="relative">
          <Sparkles className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-card rounded-full border border-primary animate-pulse" />
        </div>
        <span className="font-body text-xs font-medium hidden sm:inline">Strategy Advisor</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 print:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md h-[85vh] sm:h-[640px] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/20 rounded-sm">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-base text-foreground">Strategy Advisor</h3>
                    <p className="text-[10px] text-muted-foreground font-body">AI · Knows the full guidebook</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <div className="inline-flex p-3 bg-primary/10 rounded-full mb-4">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-display text-lg text-foreground mb-2">Your personal strategist</h4>
                    <p className="text-sm text-muted-foreground font-body mb-5 max-w-xs mx-auto">
                      Ask anything about your firm's marketing. I have the entire guidebook ({chapters.length} chapters) in mind.
                    </p>
                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="text-xs font-body text-left px-3 py-2 border border-border/50 rounded-sm hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-lg text-sm font-body leading-relaxed ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-primary prose-li:text-foreground/90 prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1.5">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : m.content}
                    </div>
                  </div>
                ))}

                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-3 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="px-5 py-3 border-t border-border/50 flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Ask your strategist…"
                  className="flex-1 resize-none bg-background border border-border rounded-sm px-3 py-2 text-sm font-body focus:outline-none focus:border-primary/50 max-h-32"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2 bg-primary text-primary-foreground rounded-sm disabled:opacity-30 hover:bg-primary/90 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalAdvisor;
