import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Presentation, Copy, Download, FileType2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { streamSSE } from "@/lib/streamSSE";
import { recordRun } from "@/hooks/useWorkshopHistory";
import { parsePitchDeckMarkdown } from "@/components/pitchDeckParser";
import { PITCH_DECK_SECTIONS, PITCH_DECK_TITLE_SECTION, PITCH_DECK_ASK_SECTION } from "@/components/pitchDeckSections";

const TONES = ["Formal & authoritative", "Confident & direct", "Warm & consultative"] as const;

const STEPS = ["Basics", "Your case", "Structure", "Review"] as const;

const PitchDeck = () => {
  const { context } = useFirmContext();
  const [step, setStep] = useState(0);

  // Step 1 — basics
  const [audience, setAudience] = useState("");
  const [opportunity, setOpportunity] = useState("");

  // Step 2 — your case
  const [ourEdge, setOurEdge] = useState("");
  const [proof, setProof] = useState("");
  const [ask, setAsk] = useState("");
  const [tone, setTone] = useState<string>(TONES[1]);

  // Step 3 — structure (pick and choose)
  const [sections, setSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PITCH_DECK_SECTIONS.map((s) => [s.key, s.defaultOn])),
  );

  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);

  const selectedSections = PITCH_DECK_SECTIONS.filter((s) => sections[s.key]);
  const totalSlides = selectedSections.length + 2; // + title + ask

  useEffect(() => {
    if (!loading && output && audience && opportunity) {
      recordRun({
        toolId: "deck",
        toolLabel: "Pitch Deck",
        title: `Pitch · ${audience.slice(0, 50)}`,
        preview: opportunity.slice(0, 120),
        output,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const toggleSection = (key: string) => setSections((s) => ({ ...s, [key]: !s[key] }));

  const canAdvance = step === 0 ? !!audience.trim() && !!opportunity.trim() : true;

  const run = async () => {
    if (!audience.trim() || !opportunity.trim() || loading) return;
    setLoading(true); setOutput("");
    try {
      const resp = await fetch(fnUrl("workshop-pitch-deck"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          audience, opportunity, ourEdge, proof, ask, tone,
          sectionKeys: selectedSections.map((s) => s.key),
          firmContext: context,
        }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      await streamSSE(resp, (full) => setOutput(full));
    } catch (e) { console.error(e); toast.error("Couldn't draft deck."); }
    finally { setLoading(false); }
  };

  const download = () => {
    const blob = new Blob([output], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pitch-deck.md";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPptx = async () => {
    if (!output || exportingPptx) return;
    const slides = parsePitchDeckMarkdown(output);
    if (slides.length === 0) {
      toast.error("Couldn't find any slides to export — try regenerating the deck.");
      return;
    }
    setExportingPptx(true);
    try {
      const { buildPitchDeckPptx } = await import("@/components/pitchDeckPptx");
      await buildPitchDeckPptx({ slides, audience, opportunity });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't build the .pptx file.");
    } finally {
      setExportingPptx(false);
    }
  };

  const startOver = () => {
    setOutput("");
    setStep(0);
  };

  if (output || loading) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-sm p-6 min-h-[400px]">
          {output && !loading && (
            <div className="flex justify-between items-center mb-4">
              <button onClick={startOver} className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> Start over
              </button>
              <div className="flex gap-3">
                <button onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                <button onClick={download} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Download className="w-3 h-3" /> .md</button>
                <button
                  onClick={downloadPptx}
                  disabled={exportingPptx}
                  className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {exportingPptx ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileType2 className="w-3 h-3" />}
                  {exportingPptx ? "Building…" : ".pptx"}
                </button>
              </div>
            </div>
          )}
          {loading && !output && <div className="flex items-center gap-2 text-muted-foreground text-sm font-body"><Loader2 className="w-4 h-4 animate-spin" /> Structuring {totalSlides} slides…</div>}
          {output && (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-primary prose-strong:text-foreground prose-hr:border-border/50">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-body border ${
                i < step ? "bg-primary border-primary text-primary-foreground" : i === step ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-xs font-body hidden sm:inline ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="min-h-[220px]"
        >
          {step === 0 && (
            <div className="space-y-3 max-w-lg mx-auto">
              <p className="text-xs text-muted-foreground font-body text-center mb-2">Who's this for, and what's the opportunity?</p>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Who's the audience? (e.g. GC of a $500M PE-backed industrials co.)"
                className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary"
              />
              <input
                value={opportunity}
                onChange={(e) => setOpportunity(e.target.value)}
                placeholder="What's the opportunity? (e.g. add-on acquisition strategy across EU)"
                className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 max-w-lg mx-auto">
              <p className="text-xs text-muted-foreground font-body text-center mb-2">Optional, but this is what makes it specific instead of generic.</p>
              <textarea value={ourEdge} onChange={(e) => setOurEdge(e.target.value)} rows={2} placeholder="What makes us uniquely right for this? (sector depth, prior wins, team)" className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary resize-none" />
              <textarea value={proof} onChange={(e) => setProof(e.target.value)} rows={2} placeholder="Proof points to weave in (anonymized case studies, deal values, named clients we can cite)" className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary resize-none" />
              <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Desired next step (90-min working session, scoped pilot, RFP slot…)" className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
              <div>
                <p className="text-[11px] text-muted-foreground font-body mb-1.5">Tone</p>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-body border transition-colors ${tone === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-lg mx-auto">
              <p className="text-xs text-muted-foreground font-body text-center mb-3">
                Pick which sections belong in this deck — {totalSlides} slides selected (Title and The Ask are always included).
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-sm bg-secondary/30 text-xs font-body text-muted-foreground">
                  <div className="w-4 h-4 rounded-sm border border-border/60 flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></div>
                  {PITCH_DECK_TITLE_SECTION.label} <span className="text-[10px] opacity-60">— always included</span>
                </div>
                {PITCH_DECK_SECTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2.5 px-3 py-2 rounded-sm hover:bg-secondary/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!sections[s.key]}
                      onChange={() => toggleSection(s.key)}
                      className="w-4 h-4 accent-primary shrink-0"
                    />
                    <div>
                      <span className="text-sm font-body text-foreground">{s.label}</span>
                      <span className="text-xs font-body text-muted-foreground ml-2">{s.hint}</span>
                    </div>
                  </label>
                ))}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-sm bg-secondary/30 text-xs font-body text-muted-foreground">
                  <div className="w-4 h-4 rounded-sm border border-border/60 flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></div>
                  {PITCH_DECK_ASK_SECTION.label} <span className="text-[10px] opacity-60">— always included</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-lg mx-auto text-center space-y-4">
              <p className="text-sm font-body text-foreground">
                {totalSlides}-slide deck for <span className="text-primary">{audience || "your audience"}</span>
              </p>
              <p className="text-xs text-muted-foreground font-body">{opportunity}</p>
              <p className="text-[11px] text-muted-foreground/80 font-body">
                Tone: {tone} · Title, {selectedSections.map((s) => s.label).join(", ")}, and The Ask
              </p>
              <button
                onClick={run}
                disabled={!audience.trim() || !opportunity.trim() || loading}
                className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center gap-2 mx-auto"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Drafting…</> : <><Presentation className="w-4 h-4" /> Draft {totalSlides}-slide deck</>}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between max-w-lg mx-auto pt-2">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1 disabled:opacity-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        {step < STEPS.length - 1 && (
          <button
            onClick={() => canAdvance && setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={!canAdvance}
            className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1 disabled:opacity-30"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PitchDeck;
