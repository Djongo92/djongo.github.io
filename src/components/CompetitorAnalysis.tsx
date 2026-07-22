import { useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Loader2, X, Plus, Trash2, ArrowRight, Download } from "lucide-react";
import { useFirmContext } from "@/hooks/useFirmContext";
import { saveCompetitor } from "@/hooks/useBattlePlanCache";
import { isDemoMode } from "@/lib/demoMode";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Result {
  executiveSummary: string;
  yourPositioning: { summary: string; strengths: string[]; weaknesses: string[] };
  competitors: { url: string; positioning: string; doingBetter: string[]; doingWorse: string[] }[];
  gaps: { gap: string; why: string }[];
  opportunities: string[];
  recommendedMoves: { move: string; impact: "high" | "medium" | "low"; effort: "low" | "medium" | "high" }[];
  meta?: { yourUrl: string; competitorUrls: string[]; unreachable: string[] };
}

const impactStyles: Record<string, string> = {
  high: "text-destructive bg-destructive/10 border-destructive/30",
  medium: "text-gold-light bg-gold/10 border-gold/30",
  low: "text-muted-foreground bg-muted border-border",
};

const CompetitorAnalysis = () => {
  const [open, setOpen] = useState(false);
  const [yourUrl, setYourUrl] = useState("");
  const [competitors, setCompetitors] = useState<string[]>(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { context } = useFirmContext();

  const update = (i: number, v: string) => {
    setCompetitors((prev) => prev.map((u, idx) => (idx === i ? v : u)));
  };

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = competitors.map((c) => c.trim()).filter(Boolean);
    if (!yourUrl.trim() || cleaned.length === 0 || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/competitor-analysis`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ yourUrl, competitorUrls: cleaned, firmContext: context }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Couldn't run analysis");
        return;
      }
      setResult(data);
      // Demo mode still runs the real analysis but doesn't let it overwrite
      // the demo's seeded Battle Plan sample — see RoastHomepage.tsx for why.
      if (!isDemoMode()) {
        try {
          saveCompetitor({
            yourUrl: data.meta?.yourUrl || yourUrl,
            competitorUrls: data.meta?.competitorUrls || cleaned,
            executiveSummary: data.executiveSummary,
            yourPositioning: data.yourPositioning,
            competitors: data.competitors || [],
            gaps: data.gaps || [],
            opportunities: data.opportunities || [],
            recommendedMoves: data.recommendedMoves || [],
          });
        } catch { /* non-fatal */ }
      }
      if (data.meta?.unreachable?.length) {
        toast.warning(`Couldn't load ${data.meta.unreachable.length} competitor site(s) — analysis based on the rest.`);
      }
    } catch {
      toast.error("Couldn't reach the AI service");
    } finally {
      setLoading(false);
    }
  };

  const exportMd = () => {
    if (!result) return;
    let md = "# Competitive Positioning Analysis\n\n";
    md += `**Your firm:** ${result.meta?.yourUrl || yourUrl}\n\n`;
    md += `## Executive Summary\n${result.executiveSummary}\n\n`;
    md += `## Your Positioning\n${result.yourPositioning.summary}\n\n`;
    md += `**Strengths:**\n${result.yourPositioning.strengths.map((s) => `- ${s}`).join("\n")}\n\n`;
    md += `**Weaknesses:**\n${result.yourPositioning.weaknesses.map((s) => `- ${s}`).join("\n")}\n\n`;
    md += `## Competitors\n\n`;
    result.competitors.forEach((c) => {
      md += `### ${c.url}\n${c.positioning}\n\n**Doing better:**\n${c.doingBetter.map((s) => `- ${s}`).join("\n")}\n\n**Doing worse:**\n${c.doingWorse.map((s) => `- ${s}`).join("\n")}\n\n`;
    });
    md += `## Gaps to Close\n${result.gaps.map((g) => `- **${g.gap}** — ${g.why}`).join("\n")}\n\n`;
    md += `## Unclaimed Opportunities\n${result.opportunities.map((o) => `- ${o}`).join("\n")}\n\n`;
    md += `## Recommended 90-Day Moves\n${result.recommendedMoves.map((m, i) => `${i + 1}. **[${m.impact} impact / ${m.effort} effort]** ${m.move}`).join("\n")}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "competitor-analysis.md";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Analysis exported");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full p-5 bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 rounded-sm text-left hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-primary/10 text-primary">
            <Swords className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1">Competitor Analysis</h3>
            <p className="text-xs text-muted-foreground font-body">
              Paste 1-3 competitor URLs · AI writes a positioning gap analysis with 90-day moves
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
                  <Swords className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-lg text-foreground">Competitor Analysis</h3>
                </div>
                <div className="flex items-center gap-1">
                  {result && (
                    <button onClick={exportMd} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" aria-label="Export">
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => !loading && setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground" disabled={loading}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!result && (
                  <form onSubmit={analyze}>
                    <p className="text-sm text-muted-foreground font-body mb-5">
                      Paste your firm's URL and up to 3 competitors. AI will analyze positioning, identify gaps, and recommend specific 90-day moves.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] tracking-[0.2em] uppercase text-primary font-body block mb-1.5">Your firm</label>
                        <input
                          type="text" value={yourUrl} onChange={(e) => setYourUrl(e.target.value)}
                          placeholder="yourlawfirm.com" disabled={loading}
                          className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary/50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body block mb-1.5">Competitors (up to 3)</label>
                        <div className="space-y-2">
                          {competitors.map((c, i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                type="text" value={c} onChange={(e) => update(i, e.target.value)}
                                placeholder={`competitor${i + 1}.com`} disabled={loading}
                                className="flex-1 bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary/50"
                              />
                              {competitors.length > 1 && (
                                <button
                                  type="button" disabled={loading}
                                  onClick={() => setCompetitors((p) => p.filter((_, idx) => idx !== i))}
                                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          {competitors.length < 3 && (
                            <button
                              type="button" disabled={loading}
                              onClick={() => setCompetitors((p) => [...p, ""])}
                              className="flex items-center gap-1.5 text-xs text-primary hover:text-gold-light font-body"
                            >
                              <Plus className="w-3 h-3" /> Add competitor
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!yourUrl.trim() || competitors.every((c) => !c.trim()) || loading}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-primary/90 transition-colors"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing all sites…
                          </span>
                        ) : "Run analysis"}
                      </button>
                      {loading && (
                        <p className="text-xs text-muted-foreground font-body italic text-center">
                          Loading sites in parallel, comparing positioning, generating recommendations… (20-40s)
                        </p>
                      )}
                    </div>
                  </form>
                )}

                {result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {isDemoMode() && (
                      <p className="text-[11px] text-muted-foreground font-body italic mb-4">
                        Demo mode — this real analysis won't be saved to your Battle Plan sample.
                      </p>
                    )}
                    {/* Executive summary */}
                    <div className="mb-6 pb-6 border-b border-border/40">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-body mb-2">Executive Summary</p>
                      <p className="font-display text-base text-foreground italic leading-relaxed">{result.executiveSummary}</p>
                    </div>

                    {/* Your positioning */}
                    <div className="mb-6">
                      <h4 className="font-display text-base text-foreground mb-2">Your Positioning</h4>
                      <p className="text-sm text-secondary-foreground/80 font-body mb-3">{result.yourPositioning.summary}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-primary/5 border border-primary/20 rounded-sm p-4">
                          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-body mb-2">Strengths</p>
                          <ul className="space-y-1.5">
                            {result.yourPositioning.strengths.map((s, i) => (
                              <li key={i} className="text-xs font-body text-foreground/85">• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-destructive/5 border border-destructive/20 rounded-sm p-4">
                          <p className="text-[10px] tracking-[0.2em] uppercase text-destructive font-body mb-2">Weaknesses</p>
                          <ul className="space-y-1.5">
                            {result.yourPositioning.weaknesses.map((s, i) => (
                              <li key={i} className="text-xs font-body text-foreground/85">• {s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Competitors */}
                    <div className="mb-6">
                      <h4 className="font-display text-base text-foreground mb-3">Competitor Breakdown</h4>
                      <div className="space-y-3">
                        {result.competitors.map((c, i) => (
                          <div key={i} className="border border-border/40 rounded-sm p-4">
                            <p className="text-[11px] text-primary font-body mb-1">{c.url}</p>
                            <p className="text-sm text-foreground font-display italic mb-3">{c.positioning}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-primary mb-1 font-body">Better than you</p>
                                <ul className="space-y-1">
                                  {c.doingBetter.map((s, j) => <li key={j} className="font-body text-foreground/80">• {s}</li>)}
                                </ul>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-body">Worse than you</p>
                                <ul className="space-y-1">
                                  {c.doingWorse.map((s, j) => <li key={j} className="font-body text-foreground/80">• {s}</li>)}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gaps */}
                    <div className="mb-6">
                      <h4 className="font-display text-base text-foreground mb-3">Gaps to Close</h4>
                      <ul className="space-y-2">
                        {result.gaps.map((g, i) => (
                          <li key={i} className="border-l-2 border-primary/30 pl-3">
                            <p className="font-body text-sm text-foreground font-medium">{g.gap}</p>
                            <p className="text-xs text-muted-foreground font-body italic">{g.why}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Opportunities */}
                    <div className="mb-6">
                      <h4 className="font-display text-base text-foreground mb-3">Unclaimed Opportunities</h4>
                      <ul className="space-y-1.5">
                        {result.opportunities.map((o, i) => (
                          <li key={i} className="text-sm font-body text-secondary-foreground/85">→ {o}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommended moves */}
                    <div>
                      <h4 className="font-display text-base text-foreground mb-3">Recommended 90-Day Moves</h4>
                      <div className="space-y-2">
                        {result.recommendedMoves.map((m, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 border border-border/40 rounded-sm">
                            <span className="font-display text-lg text-primary min-w-[1.5rem]">{i + 1}</span>
                            <div className="flex-1">
                              <p className="text-sm font-body text-foreground mb-1.5">{m.move}</p>
                              <div className="flex gap-2">
                                <span className={`text-[9px] tracking-wider uppercase font-body font-medium px-2 py-0.5 rounded-sm border ${impactStyles[m.impact]}`}>
                                  {m.impact} impact
                                </span>
                                <span className="text-[9px] tracking-wider uppercase font-body font-medium px-2 py-0.5 rounded-sm border border-border text-muted-foreground">
                                  {m.effort} effort
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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

export default CompetitorAnalysis;