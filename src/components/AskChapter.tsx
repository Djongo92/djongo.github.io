import { useState, useRef, useEffect } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Chapter } from "@/data/chapters";
import { chapterToText } from "@/lib/chapterToText";
import { useFirmContext } from "@/hooks/useFirmContext";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUGGESTED = [
  "How does this apply to a small firm?",
  "What's the #1 takeaway?",
  "Give me a 2-week implementation plan",
];

const AskChapter = ({ chapter }: { chapter: Chapter }) => {
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
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/chapter-chat`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({
          messages: [...messages, userMsg],
          chapterTitle: chapter.title,
          chapterContent: chapterToText(chapter),
          firmContext: context,
        }),
      });

      if (resp.status === 429) { toast.error("Rate limit reached. Try again shortly."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted. Add credits to continue."); setLoading(false); return; }
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
      toast.error("Couldn't reach AI. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onClick={() => setOpen(true)}
        className="w-full mt-12 group relative overflow-hidden rounded-sm border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 text-left hover:border-primary/60 transition-all hover:shadow-lg hover:shadow-primary/10 print:hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.08)_0%,_transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl text-foreground font-medium mb-1">Ask this chapter</h3>
            <p className="text-sm text-muted-foreground font-body">
              Get tailored advice on applying these ideas to your firm — powered by AI.
            </p>
          </div>
          <div className="text-[10px] tracking-wider uppercase text-primary font-body self-center">
            Open →
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 print:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-2xl h-[85vh] sm:h-[600px] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-base text-foreground">Ask: {chapter.title}</h3>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground font-body mb-5">
                      Ask anything about this chapter. I have the full content in mind.
                    </p>
                    <div className="flex flex-col gap-2 max-w-sm mx-auto">
                      {SUGGESTED.map((s) => (
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
                    <div className={`max-w-[85%] px-4 py-2.5 rounded-lg text-sm font-body leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
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
                className="px-5 py-4 border-t border-border/50 flex items-end gap-2"
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
                  placeholder="Ask anything about this chapter…"
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

export default AskChapter;
