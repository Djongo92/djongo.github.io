import { useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, Check, X as XIcon, RotateCcw } from "lucide-react";
import { Chapter } from "@/data/chapters";
import { chapterToText } from "@/lib/chapterToText";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface QuizQ {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const ChapterQuiz = ({ chapter }: { chapter: Chapter }) => {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const load = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ chapterTitle: chapter.title, chapterContent: chapterToText(chapter) }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Quiz unavailable");
        return;
      }
      setQuestions(data.questions || []);
      setLoaded(true);
      setAnswers({});
      setSubmitted(false);
    } catch {
      toast.error("Couldn't load quiz");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setLoaded(false); setQuestions([]); setAnswers({}); setSubmitted(false); };
  const score = Object.entries(answers).filter(([qi, ai]) => questions[+qi]?.correctIndex === ai).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-10 border border-border/40 rounded-sm overflow-hidden print:hidden"
    >
      <div className="bg-muted/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <div>
            <h3 className="font-display text-base text-foreground">Test Yourself</h3>
            <p className="text-[11px] text-muted-foreground font-body">5 questions · AI-generated · Find your weak spots</p>
          </div>
        </div>
        {!loaded && (
          <button
            onClick={load}
            disabled={loading}
            className="text-xs font-body text-primary hover:text-gold-light disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Start →"}
          </button>
        )}
        {loaded && (
          <button onClick={reset} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {loaded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 py-5 space-y-6">
              {questions.map((q, qi) => (
                <div key={qi}>
                  <p className="font-body text-sm text-foreground mb-3">
                    <span className="text-primary mr-2">{qi + 1}.</span>{q.question}
                  </p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const picked = answers[qi] === oi;
                      const correct = q.correctIndex === oi;
                      const showResult = submitted;
                      let cls = "border-border/50 hover:border-primary/40 text-muted-foreground hover:text-foreground";
                      if (showResult && correct) cls = "border-primary bg-primary/10 text-foreground";
                      else if (showResult && picked && !correct) cls = "border-destructive bg-destructive/10 text-foreground";
                      else if (picked) cls = "border-primary text-foreground";
                      return (
                        <button
                          key={oi}
                          onClick={() => !submitted && setAnswers((a) => ({ ...a, [qi]: oi }))}
                          disabled={submitted}
                          className={`w-full text-left px-3 py-2 rounded-sm border text-xs font-body transition-colors flex items-center gap-2 ${cls}`}
                        >
                          {showResult && correct && <Check className="w-3 h-3 text-primary shrink-0" />}
                          {showResult && picked && !correct && <XIcon className="w-3 h-3 text-destructive shrink-0" />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {submitted && (
                    <p className="text-[11px] text-muted-foreground font-body italic mt-2 pl-2 border-l-2 border-primary/20">
                      {q.explanation}
                    </p>
                  )}
                </div>
              ))}

              {!submitted ? (
                <button
                  onClick={() => setSubmitted(true)}
                  disabled={Object.keys(answers).length < questions.length}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-primary/90 transition-colors"
                >
                  See my score
                </button>
              ) : (
                <div className="text-center py-4 border-t border-border/30">
                  <p className="font-display text-3xl text-primary font-semibold">{score} / {questions.length}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">
                    {score === questions.length ? "Perfect — you've internalized this." :
                     score >= 3 ? "Solid grasp. Review the questions you missed." :
                     "Worth re-reading the chapter before implementing."}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChapterQuiz;
