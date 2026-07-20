import { useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Loader2, X, Award, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { chapters } from "@/data/chapters";
import { guidebookSummary } from "@/lib/chapterToText";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Fix { title: string; detail: string; impact: "high" | "medium" | "low" }
interface Result {
  score: number;
  headline: string;
  strengths: string[];
  fixes: Fix[];
  url: string;
  pageTitle?: string;
}

const impactStyles = {
  high: "text-destructive bg-destructive/10 border-destructive/30",
  medium: "text-gold-light bg-gold/10 border-gold/30",
  low: "text-muted-foreground bg-muted border-border",
};

const ScoreWebsite = () => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const grade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/score-website`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ url, guidebookSummary: guidebookSummary(chapters) }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Couldn't grade that site");
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
            <Globe className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1">Score My Firm's Website</h3>
            <p className="text-xs text-muted-foreground font-body">
              AI grades your site against the guidebook's principles · Free instant analysis
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity self-center" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => !loading && setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-2xl max-h-[90vh] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-lg text-foreground">Score My Website</h3>
                </div>
                <button onClick={() => !loading && setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground" disabled={loading}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!result && (
                  <form onSubmit={grade}>
                    <p className="text-sm text-muted-foreground font-body mb-4">
                      Paste your firm's website URL. AI will analyze it against the guidebook's principles and return a personalized 5-point fix list.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="yourlawfirm.com"
                        className="flex-1 bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary/50"
                        disabled={loading}
                      />
                      <button
                        type="submit"
                        disabled={!url.trim() || loading}
                        className="bg-primary text-primary-foreground px-5 py-2 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-primary/90 transition-colors min-w-[100px]"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Analyze"}
                      </button>
                    </div>
                    {loading && (
                      <p className="text-xs text-muted-foreground font-body mt-3 italic">
                        Fetching site, analyzing content, grading against guidebook principles… (15-30s)
                      </p>
                    )}
                  </form>
                )}

                {result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="text-center mb-6 pb-6 border-b border-border/50">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-primary/30 mb-3 relative">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle cx="48" cy="48" r="44" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                            strokeDasharray={`${result.score * 2.764} 276.4`} strokeLinecap="round" />
                        </svg>
                        <span className="font-display text-3xl font-semibold text-foreground">{result.score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-body mb-1">Score · {result.url}</p>
                      <p className="font-display text-base text-foreground italic">{result.headline}</p>
                    </div>

                    {result.strengths.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="w-4 h-4 text-primary" />
                          <h4 className="font-display text-base text-foreground">What's working</h4>
                        </div>
                        <ul className="space-y-2">
                          {result.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm font-body text-secondary-foreground/80">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-gold-light" />
                        <h4 className="font-display text-base text-foreground">Top fixes</h4>
                      </div>
                      <div className="space-y-3">
                        {result.fixes.map((f, i) => (
                          <div key={i} className="border border-border/40 rounded-sm p-4">
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <h5 className="font-display text-sm text-foreground font-medium">
                                {i + 1}. {f.title}
                              </h5>
                              <span className={`text-[9px] tracking-wider uppercase font-body font-medium px-2 py-0.5 rounded-sm border shrink-0 ${impactStyles[f.impact]}`}>
                                {f.impact}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-body leading-relaxed">{f.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => { setResult(null); setUrl(""); }}
                      className="mt-6 text-xs text-primary hover:text-gold-light font-body"
                    >
                      ← Score another site
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

export default ScoreWebsite;
