import { useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Loader2, X, Download, Sparkles, ChevronRight } from "lucide-react";
import { chapters } from "@/data/chapters";
import { useFirmContext } from "@/hooks/useFirmContext";
import { saveRoadmap } from "@/hooks/useBattlePlanCache";
import { isDemoMode } from "@/lib/demoMode";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface RoadmapAction { title: string; why: string; chapterRef: string }
interface RoadmapPhase { label: string; focus: string; actions: RoadmapAction[] }
interface Roadmap { summary: string; phases: RoadmapPhase[] }

interface Props {
  readChapters: string[];
  bookmarks: string[];
  isImplemented: (chapterId: string, index: number) => boolean;
  onRequestPersonalize: () => void;
}

const RoadmapGenerator = ({ readChapters, bookmarks, isImplemented, onRequestPersonalize }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const { context, hasContext } = useFirmContext();

  const generate = async () => {
    setLoading(true);
    setRoadmap(null);
    try {
      const allActions: any[] = [];
      const implementedActions: string[] = [];
      chapters.forEach((c) => {
        c.actionItems?.forEach((a, i) => {
          if (isImplemented(c.id, i)) {
            implementedActions.push(a.text);
          } else {
            allActions.push({ ...a, chapterId: c.id, chapterTitle: c.title, chapterNumber: c.number });
          }
        });
      });

      const readTitles = readChapters.map((id) => chapters.find((c) => c.id === id)?.title).filter(Boolean) as string[];
      const bookmarkedTitles = bookmarks.map((id) => chapters.find((c) => c.id === id)?.title).filter(Boolean) as string[];

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-roadmap`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({
          firmContext: context,
          readChapters: readTitles,
          bookmarked: bookmarkedTitles,
          implementedActions,
          allActions,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Couldn't generate roadmap");
        return;
      }
      setRoadmap(data);
      // Demo mode still generates a real roadmap from the seeded demo
      // progress but doesn't let it overwrite the demo's seeded Battle Plan
      // sample — see RoastHomepage.tsx for why.
      if (!isDemoMode()) {
        try {
          saveRoadmap({ summary: data.summary, phases: data.phases || [] });
        } catch { /* non-fatal */ }
      }
    } catch {
      toast.error("Couldn't reach AI service");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!roadmap && !loading) generate();
  };

  const exportRoadmap = () => {
    if (!roadmap) return;
    let md = "# Your 30/60/90 Day Marketing Roadmap\n\n";
    if (context) md += `_For ${context.practiceArea} firm · ${context.firmSize} · Goal: ${context.primaryGoal}_\n\n`;
    md += `${roadmap.summary}\n\n`;
    roadmap.phases.forEach((p) => {
      md += `## ${p.label}\n*${p.focus}*\n\n`;
      p.actions.forEach((a, i) => {
        md += `${i + 1}. **${a.title}** — ${a.why} _(${a.chapterRef})_\n`;
      });
      md += "\n";
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "marketing-roadmap.md";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Roadmap exported");
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="group w-full p-5 bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 rounded-sm text-left hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-primary/10 text-primary">
            <Map className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1 flex items-center gap-2">
              Generate My 30/60/90 Plan
              <Sparkles className="w-3 h-3 text-primary" />
            </h3>
            <p className="text-xs text-muted-foreground font-body">
              AI builds a personalized roadmap from your reading & implementation progress
            </p>
          </div>
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
              className="w-full sm:max-w-3xl max-h-[90vh] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-lg text-foreground">Your 30/60/90 Day Roadmap</h3>
                </div>
                <div className="flex items-center gap-1">
                  {roadmap && (
                    <button onClick={exportRoadmap} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" aria-label="Export">
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => !loading && setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground" disabled={loading}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!hasContext && !loading && !roadmap && (
                  <div className="bg-primary/5 border border-primary/20 rounded-sm p-4 mb-5">
                    <p className="text-sm font-body text-foreground mb-3">
                      💡 Add your firm details for a sharper, personalized plan.
                    </p>
                    <button
                      onClick={() => { setOpen(false); onRequestPersonalize(); }}
                      className="text-xs text-primary hover:text-gold-light font-body underline"
                    >
                      Personalize first →
                    </button>
                  </div>
                )}

                {loading && (
                  <div className="text-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="font-display text-base text-foreground mb-1">Building your roadmap…</p>
                    <p className="text-xs text-muted-foreground font-body">
                      AI is reviewing your progress, prioritizing actions, and sequencing the next 90 days
                    </p>
                  </div>
                )}

                {roadmap && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {isDemoMode() && (
                      <p className="text-[11px] text-muted-foreground font-body italic mb-4">
                        Demo mode — this real roadmap won't be saved to your Battle Plan sample.
                      </p>
                    )}
                    <p className="font-display text-base text-foreground italic mb-8 leading-relaxed">
                      {roadmap.summary}
                    </p>
                    <div className="space-y-8">
                      {roadmap.phases.map((phase, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <div className="flex items-baseline gap-3 mb-3">
                            <span className="font-display text-3xl text-primary font-semibold">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <h4 className="font-display text-xl text-foreground">{phase.label}</h4>
                              <p className="text-xs text-primary font-body italic">{phase.focus}</p>
                            </div>
                          </div>
                          <ol className="space-y-3 pl-12">
                            {phase.actions.map((a, j) => (
                              <li key={j} className="border-l-2 border-primary/20 pl-4 py-1">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                                  <span className="font-display text-sm text-foreground font-medium">{a.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground font-body leading-relaxed pl-5">
                                  {a.why} <span className="text-primary">· {a.chapterRef}</span>
                                </p>
                              </li>
                            ))}
                          </ol>
                        </motion.div>
                      ))}
                    </div>
                    <button
                      onClick={generate}
                      className="mt-8 text-xs text-primary hover:text-gold-light font-body"
                    >
                      ↻ Regenerate roadmap
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

export default RoadmapGenerator;
