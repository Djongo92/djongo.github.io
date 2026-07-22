import { useEffect, useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useFirmContext } from "@/hooks/useFirmContext";
import { streamSSE } from "@/lib/streamSSE";
import { toast } from "sonner";
import { saveMaturity } from "@/hooks/useBattlePlanCache";
import { isDemoMode } from "@/lib/demoMode";
import ModalShell from "@/components/ui/modal-shell";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const DIMENSIONS = [
  { key: "website", label: "Website & digital home", q: "Our website converts visitors into qualified leads." },
  { key: "brand", label: "Brand identity & positioning", q: "Our brand is distinct from every other firm in our market." },
  { key: "content", label: "Content & thought leadership", q: "We publish original, useful content on a consistent cadence." },
  { key: "seo", label: "SEO & organic visibility", q: "We rank for the search terms our ideal clients actually use." },
  { key: "events", label: "Event marketing", q: "We extract 10+ pieces of content from every conference we attend." },
  { key: "social", label: "Social media presence", q: "Our partners post regularly and our firm has a recognizable voice." },
  { key: "pr", label: "PR & media relations", q: "Our lawyers are quoted in the press at least monthly." },
  { key: "email", label: "Email & newsletter", q: "Our newsletter has measurable open rates and drives client conversations." },
  { key: "client_experience", label: "Client experience", q: "Our intake, onboarding, and offboarding feel premium and intentional." },
  { key: "data", label: "Data & analytics", q: "We track which marketing efforts actually produce revenue." },
  { key: "reputation", label: "Reputation management", q: "We actively cultivate reviews, awards, and rankings." },
  { key: "internal", label: "Internal marketing culture", q: "Our partners treat marketing as a core responsibility, not an afterthought." },
] as const;

const SCORE_LABELS = ["Not at all", "Barely", "Sometimes", "Mostly", "Best in class"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectChapter?: (id: string) => void;
}

const FirmMaturityScore = ({ open, onClose }: Props) => {
  const { context } = useFirmContext();
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"survey" | "report">("survey");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);

  // When the plan finishes streaming, top up the saved maturity cache with the plan text
  useEffect(() => {
    // Demo mode still runs the real survey + plan generation but doesn't let
    // it overwrite the demo's seeded Battle Plan sample — see
    // RoastHomepage.tsx for why.
    if (!loading && plan && phase === "report" && !isDemoMode()) {
      const payload = DIMENSIONS.map((d) => ({ label: d.label, score: scores[d.key] ?? 3 }));
      const avgPct = Math.round((payload.reduce((a, b) => a + b.score, 0) / payload.length) * 20);
      saveMaturity({ score: avgPct, dimensions: payload, plan });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, plan, phase]);

  const reset = () => {
    setStep(0);
    setScores({});
    setPlan("");
    setPhase("survey");
  };

  const setScore = (key: string, score: number) => {
    setScores((s) => ({ ...s, [key]: score }));
    setTimeout(() => {
      if (step < DIMENSIONS.length - 1) setStep(step + 1);
      else generatePlan({ ...scores, [key]: score });
    }, 220);
  };

  const generatePlan = async (final: Record<string, number>) => {
    setPhase("report");
    setLoading(true);
    setPlan("");
    try {
      const payload = DIMENSIONS.map((d) => ({ dimension: d.label, score: final[d.key] || 3 }));
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/firm-maturity-plan`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ scores: payload, firmContext: context }),
      });
      if (resp.status === 429) { toast.error("Rate limit reached."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok) throw new Error("Stream failed");
      await streamSSE(resp, (full) => setPlan(full));
      // Persist for Battle Plan (skipped in demo mode — see effect above)
      if (!isDemoMode()) {
        const avgPct = Math.round((payload.reduce((a, b) => a + b.score, 0) / payload.length) * 20);
        saveMaturity({
          score: avgPct,
          dimensions: payload.map((d) => ({ label: d.dimension, score: d.score })),
          plan: "", // populated after streaming completes via effect below if needed
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't generate plan.");
    } finally {
      setLoading(false);
    }
  };

  // Compute weakest dimensions for radar-ish bar viz
  const radarData = DIMENSIONS.map((d) => ({
    label: d.label,
    score: scores[d.key] ?? 0,
  }));
  const avg = phase === "report" ? Math.round((radarData.reduce((a, b) => a + b.score, 0) / DIMENSIONS.length) * 20) : 0;

  const current = DIMENSIONS[step];

  return (
    <ModalShell open={open} onClose={onClose} maxWidthClass="max-w-2xl">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/20 rounded-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-base text-foreground">Firm Maturity Score</h3>
                <p className="text-[10px] text-muted-foreground font-body">12 questions · personalized 30-day plan</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {phase === "survey" && current && (
              <div className="p-8">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body">
                      Question {step + 1} of {DIMENSIONS.length}
                    </span>
                    <span className="text-[10px] text-primary font-body">{current.label}</span>
                  </div>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={false}
                      animate={{ width: `${((step + 1) / DIMENSIONS.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.key}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h4 className="font-display text-2xl text-foreground mb-8 leading-snug">{current.q}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {SCORE_LABELS.map((label, i) => {
                        const value = i + 1;
                        const selected = scores[current.key] === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setScore(current.key, value)}
                            className={`px-3 py-4 border rounded-sm text-xs font-body transition-all ${
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="font-display text-lg text-foreground mb-1">{value}</div>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {step > 0 && (
                      <button
                        onClick={() => setStep(step - 1)}
                        className="mt-6 text-xs text-muted-foreground hover:text-primary font-body"
                      >
                        ← Back
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {phase === "report" && (
              <div className="p-8">
                {isDemoMode() && (
                  <p className="text-[11px] text-muted-foreground font-body italic text-center mb-4">
                    Demo mode — this real result won't be saved to your Battle Plan sample.
                  </p>
                )}
                <div className="text-center mb-8">
                  <div className="font-display text-5xl text-primary font-semibold mb-2">{avg}<span className="text-2xl text-muted-foreground">/100</span></div>
                  <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-body">Maturity Index</p>
                </div>

                {/* Bar visualization (radar-style readout) */}
                <div className="space-y-2 mb-8">
                  {radarData.map((d) => (
                    <div key={d.label} className="flex items-center gap-3">
                      <div className="w-44 text-xs text-muted-foreground font-body truncate">{d.label}</div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(d.score / 5) * 100}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full rounded-full ${d.score <= 2 ? "bg-destructive/60" : d.score <= 3 ? "bg-amber-500/70" : "bg-primary"}`}
                        />
                      </div>
                      <div className="w-8 text-right text-xs text-foreground font-display">{d.score}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/50 pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">Your 30-day plan</span>
                  </div>
                  {loading && !plan && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm font-body">
                      <Loader2 className="w-4 h-4 animate-spin" /> Drafting tailored plan…
                    </div>
                  )}
                  {plan && (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-strong:text-primary">
                      <ReactMarkdown>{plan}</ReactMarkdown>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button onClick={reset} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-body">
                    <RefreshCw className="w-3 h-3" /> Retake
                  </button>
                  <button onClick={onClose} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-body rounded-sm hover:bg-gold-light transition-colors">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
    </ModalShell>
  );
};

export default FirmMaturityScore;