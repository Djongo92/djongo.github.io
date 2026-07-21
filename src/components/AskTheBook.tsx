import { useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Loader2, X, ArrowRight, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chapters } from "@/data/chapters";
import { chapterToText } from "@/lib/chapterToText";
import { useFirmContext } from "@/hooks/useFirmContext";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Citation {
  chapterId: string;
  chapterNumber: number;
  title: string;
  relevance: string;
}
interface AnswerResult {
  answer: string;
  keyTakeaways: string[];
  citations: Citation[];
  confidence: "high" | "medium" | "low";
}

const SUGGESTIONS = [
  "How do I get partners to actually contribute content?",
  "What's the single fastest way to grow inbound leads?",
  "How do I price thought-leadership work internally?",
  "Should we hire an in-house marketer or an agency?",
];

interface Props {
  onSelectChapter?: (id: string) => void;
}

const AskTheBook = ({ onSelectChapter }: Props) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const { context } = useFirmContext();

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const payload = chapters.map((c) => ({
        id: c.id,
        number: c.number,
        title: c.title,
        text: chapterToText(c),
      }));
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ask-the-book`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ question: q, chapters: payload, firmContext: context }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Couldn't answer that");
        return;
      }
      setResult(data);
    } catch {
      toast.error("Couldn't reach the AI service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full p-5 bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-sm text-left hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-primary/15 text-primary">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1">Ask the Whole Book</h3>
            <p className="text-xs text-muted-foreground font-body">
              Strategic Q&A across all {chapters.length} chapters · With chapter citations · Personalized to your firm
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity self-center" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => !loading && setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-3xl max-h-[92vh] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-lg text-foreground">Ask the Whole Book</h3>
                </div>
                <button onClick={() => !loading && setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground" disabled={loading}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="mb-6">
                  <p className="text-sm text-muted-foreground font-body mb-3">
                    Ask a strategic question. The AI synthesizes across every chapter and cites the ones it draws from.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g. How do I make our content actually generate leads?"
                      className="flex-1 bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary/50"
                      disabled={loading}
                    />
                    <button
                      type="submit" disabled={!question.trim() || loading}
                      className="bg-primary text-primary-foreground px-5 py-2 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-primary/90 transition-colors min-w-[100px]"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Ask"}
                    </button>
                  </div>
                </form>

                {!result && !loading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setQuestion(s); ask(s); }}
                        className="text-left text-xs font-body p-3 border border-border/40 rounded-sm hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mb-3" />
                    <p className="text-xs font-body italic">Reading all {chapters.length} chapters…</p>
                  </div>
                )}

                {result && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Confidence badge */}
                    {result.confidence === "low" && (
                      <div className="mb-4 p-3 border border-gold/30 bg-gold/5 rounded-sm">
                        <p className="text-xs font-body text-secondary-foreground/80">
                          ⚠ This question sits outside the book's main scope. Treat the answer as guidance, not gospel.
                        </p>
                      </div>
                    )}

                    {/* Answer */}
                    <div className="prose prose-sm dark:prose-invert max-w-none mb-6 prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/85 prose-strong:text-primary prose-li:text-foreground/85 prose-p:my-2">
                      <ReactMarkdown>{result.answer}</ReactMarkdown>
                    </div>

                    {/* Takeaways */}
                    <div className="mb-6 bg-primary/5 border-l-4 border-primary p-4 rounded-r-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <p className="text-[10px] tracking-[0.2em] uppercase font-body text-primary">Key takeaways</p>
                      </div>
                      <ul className="space-y-1.5">
                        {result.keyTakeaways.map((t, i) => (
                          <li key={i} className="text-sm font-body text-foreground/85 flex gap-2">
                            <span className="font-display text-primary">{i + 1}.</span><span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Citations */}
                    {result.citations?.length > 0 && (
                      <div>
                        <p className="text-[10px] tracking-[0.2em] uppercase font-body text-muted-foreground mb-3">
                          Drawn from {result.citations.length} chapter{result.citations.length === 1 ? "" : "s"}
                        </p>
                        <div className="space-y-2">
                          {result.citations.map((c) => (
                            <button
                              key={c.chapterId}
                              onClick={() => { onSelectChapter?.(c.chapterId); setOpen(false); }}
                              className="w-full text-left flex items-start gap-3 p-3 border border-border/40 rounded-sm hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                            >
                              <span className="font-display text-lg text-primary min-w-[2rem] text-right">
                                {String(c.chapterNumber).padStart(2, "0")}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-display text-sm text-foreground group-hover:text-primary transition-colors">{c.title}</p>
                                <p className="text-xs text-muted-foreground font-body mt-0.5">{c.relevance}</p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => { setResult(null); setQuestion(""); }}
                      className="mt-6 text-xs text-primary hover:text-gold-light font-body"
                    >
                      ← Ask another question
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AskTheBook;