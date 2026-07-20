import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, X, Download, CheckCircle2, Circle, Loader2, Flame, Map, Target, Gauge, Trophy, UserSquare, ShieldCheck } from "lucide-react";
import { useBattlePlanCache } from "@/hooks/useBattlePlanCache";
import { useFirmContext } from "@/hooks/useFirmContext";
import { toast } from "sonner";

interface Props {
  readChaptersCount: number;
  totalChapters: number;
  implementationScore: number;
}

const BattlePlan = ({ readChaptersCount, totalChapters, implementationScore }: Props) => {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { roast, competitor, roadmap, maturity, headline, bio, visibilityScore } = useBattlePlanCache();
  const { context } = useFirmContext();

  const hasAny = !!(roast || competitor || roadmap || maturity || headline || bio || visibilityScore);
  const coreSteps = [
    { key: "roast", label: "Run Roast My Homepage", done: !!roast, icon: "roast" as const },
    { key: "competitor", label: "Run Competitor Analysis", done: !!competitor, icon: "competitor" as const },
    { key: "roadmap", label: "Generate 30/60/90 Roadmap", done: !!roadmap, icon: "roadmap" as const },
  ];
  const optionalSteps = [
    { key: "maturity", label: "Firm Maturity Score", done: !!maturity, icon: "maturity" as const },
    { key: "headline", label: "Headline Lab champion", done: !!headline, icon: "headline" as const },
    { key: "bio", label: "Bio Rewriter result", done: !!bio, icon: "bio" as const },
    { key: "visibilityScore", label: "Market Visibility Score", done: !!visibilityScore, icon: "visibilityScore" as const },
  ];
  const completedCore = coreSteps.filter((s) => s.done).length;
  const completedOptional = optionalSteps.filter((s) => s.done).length;

  const generate = async () => {
    if (!hasAny) {
      toast.error("Run at least one analysis first");
      return;
    }
    setGenerating(true);
    try {
      // jspdf/jspdf-autotable are heavy and only ever needed here, so this
      // stays a dynamic import rather than a module-level one — keeps them
      // out of the main bundle for every visitor who never opens this modal.
      const { buildPdf } = await import("./battlePlanPdf");
      buildPdf({ roast, competitor, roadmap, maturity, headline, bio, visibilityScore, context, readChaptersCount, totalChapters, implementationScore });
      toast.success("Battle Plan downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't build PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full p-5 bg-gradient-to-br from-gold/10 via-card to-card border border-gold/40 rounded-sm text-left hover:border-gold/70 hover:shadow-lg hover:shadow-gold/10 transition-all relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 px-2 py-0.5 bg-gold text-primary-foreground text-[9px] tracking-[0.2em] uppercase font-body">
          Flagship
        </div>
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-gold/15 text-gold-light">
            <Swords className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1">Your Battle Plan</h3>
            <p className="text-xs text-muted-foreground font-body">
              Branded one-page PDF · Roast + competitor gaps + 90-day moves · The artifact you forward to your managing partner
            </p>
            {hasAny && (
              <p className="text-[11px] text-gold-light font-body mt-2">
                {completedCore}/3 core · {completedOptional}/3 bonus inputs ready
              </p>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => !generating && setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-xl max-h-[92vh] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-gold-light" />
                  <h3 className="font-display text-lg text-foreground">Your Battle Plan</h3>
                </div>
                <button onClick={() => !generating && setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground" disabled={generating}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-sm text-secondary-foreground/80 font-body mb-1">
                  A single, branded PDF that combines everything you've generated into one document worth forwarding.
                </p>
                <p className="text-xs text-muted-foreground font-body mb-6 italic">
                  Each input below is optional — but the more complete, the more devastating the plan.
                </p>

                <div className="space-y-2 mb-6">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body mb-1">Core inputs</p>
                  {coreSteps.map((s) => (
                    <div
                      key={s.key}
                      className={`flex items-center gap-3 p-3 rounded-sm border ${s.done ? "border-gold/30 bg-gold/5" : "border-border/40 bg-card"}`}
                    >
                      {s.done ? (
                        <CheckCircle2 className="w-4 h-4 text-gold-light shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={`text-sm font-body ${s.done ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                      {s.icon === "roast" && <Flame className="w-3 h-3 text-destructive/60 ml-auto" />}
                      {s.icon === "competitor" && <Target className="w-3 h-3 text-primary/60 ml-auto" />}
                      {s.icon === "roadmap" && <Map className="w-3 h-3 text-primary/60 ml-auto" />}
                    </div>
                  ))}
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body mt-4 mb-1">Bonus inputs (optional)</p>
                  {optionalSteps.map((s) => (
                    <div
                      key={s.key}
                      className={`flex items-center gap-3 p-3 rounded-sm border ${s.done ? "border-gold/30 bg-gold/5" : "border-border/40 bg-card"}`}
                    >
                      {s.done ? (
                        <CheckCircle2 className="w-4 h-4 text-gold-light shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={`text-sm font-body ${s.done ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                      {s.icon === "maturity" && <Gauge className="w-3 h-3 text-primary/60 ml-auto" />}
                      {s.icon === "headline" && <Trophy className="w-3 h-3 text-gold-light/70 ml-auto" />}
                      {s.icon === "bio" && <UserSquare className="w-3 h-3 text-primary/60 ml-auto" />}
                      {s.icon === "visibilityScore" && <ShieldCheck className="w-3 h-3 text-emerald-500/70 ml-auto" />}
                    </div>
                  ))}
                </div>

                <div className="bg-gold/5 border-l-4 border-gold/60 p-4 rounded-r-sm mb-6">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-gold-light font-body mb-1">Included automatically</p>
                  <p className="text-xs text-secondary-foreground/80 font-body leading-relaxed">
                    Firm context · Reading & implementation progress · Cover page · Legal Web Playbook branding · Generated date
                  </p>
                </div>

                <button
                  onClick={generate}
                  disabled={!hasAny || generating}
                  className="w-full bg-gold text-primary-foreground py-3 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-gold-light transition-colors flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Building PDF…</>
                  ) : (
                    <><Download className="w-4 h-4" /> {hasAny ? `Generate Battle Plan (${completedCore + completedOptional}/${coreSteps.length + optionalSteps.length} inputs)` : "Run an analysis first"}</>
                  )}
                </button>

                {!hasAny && (
                  <p className="text-[11px] text-muted-foreground font-body italic text-center mt-3">
                    Close this and run Roast, Competitor Analysis, or Roadmap to populate.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BattlePlan;
