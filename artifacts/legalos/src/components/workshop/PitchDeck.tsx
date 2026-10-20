import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Presentation, Copy, Download, FileType2, FileText, Images, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { LoadingTips } from "@/components/LoadingTips";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { useActiveFirmName } from "@/hooks/useActiveFirmName";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { streamSSE } from "@/lib/streamSSE";
import { recordRun } from "@/hooks/useWorkshopHistory";
import { parsePitchDeckMarkdown, serializeSlidesToMarkdown, classifySlideLayout, type ParsedSlide } from "@/components/pitchDeckParser";
import { PITCH_DECK_SECTIONS, PITCH_DECK_TITLE_SECTION, PITCH_DECK_ASK_SECTION } from "@/components/pitchDeckSections";
import { styleMemoryIdentity } from "@/lib/styleFeedback";
import { useHandoffReceive } from "@/lib/handoff";
import { applyToAllSlides } from "@/components/deckApplyFixes";
import DeckBuilder from "./DeckBuilder";

const TONES = ["Formal & authoritative", "Confident & direct", "Warm & consultative"] as const;

const STEPS = ["Basics", "Your case", "Structure", "Review"] as const;

const PitchDeck = () => {
  const { context } = useFirmContext();
  const firmName = useActiveFirmName();
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

  // The deck: slides are the source of truth once generated; rawStream is
  // the in-flight streaming buffer, fallbackMarkdown a last-resort view if
  // the model ever emits unparsable output.
  const [slides, setSlides] = useState<ParsedSlide[] | null>(null);
  const [rawStream, setRawStream] = useState("");
  const [fallbackMarkdown, setFallbackMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [exportingPptx, setExportingPptx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);

  // Roast My Deck handoff — critique fixes carried into regeneration.
  const [pendingFixes, setPendingFixes] = useState<string[] | null>(null);
  const [applyingFixes, setApplyingFixes] = useState(false);
  useHandoffReceive("deck", (p) => {
    if (p.kind === "deck-fixes") setPendingFixes(p.fixes);
  });

  // Identity pinned at REQUEST time (see run()); the completion effect must
  // use this rather than re-reading the workspace pin, which may have moved.
  const runIdentity = useRef<ReturnType<typeof styleMemoryIdentity> | null>(null);
  // Latest-slides ref so the sequential apply-fixes loop always regenerates
  // from the freshest deck state.
  const slidesRef = useRef<ParsedSlide[] | null>(null);
  slidesRef.current = slides;

  const selectedSections = PITCH_DECK_SECTIONS.filter((s) => sections[s.key]);
  const totalSlides = selectedSections.length + 2; // + title + ask

  // Edited slides are what every export and the run history receive.
  const markdown = useMemo(() => (slides ? serializeSlidesToMarkdown(slides) : ""), [slides]);

  useEffect(() => {
    if (!loading && slides && slides.length > 0 && audience && opportunity) {
      recordRun({
        toolId: "deck",
        toolLabel: "Pitch Deck",
        title: `Pitch · ${audience.slice(0, 50)}`,
        preview: opportunity.slice(0, 120),
        output: serializeSlidesToMarkdown(slides),
      }, runIdentity.current ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const toggleSection = (key: string) => setSections((s) => ({ ...s, [key]: !s[key] }));

  const canAdvance = step === 0 ? !!audience.trim() && !!opportunity.trim() : true;

  const run = async () => {
    if (!audience.trim() || !opportunity.trim() || loading) return;
    setLoading(true); setSlides(null); setRawStream(""); setFallbackMarkdown("");
    const identity = styleMemoryIdentity();
    runIdentity.current = identity;
    try {
      const resp = await fetch(fnUrl("workshop-pitch-deck"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          audience, opportunity, ourEdge, proof, ask, tone,
          sectionKeys: selectedSections.map((s) => s.key),
          improvementNotes: pendingFixes && pendingFixes.length > 0 ? pendingFixes : undefined,
          firmContext: context,
          ...identity,
        }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      let full = "";
      await streamSSE(resp, (t) => { full = t; setRawStream(t); });
      const parsed = parsePitchDeckMarkdown(full);
      if (parsed.length === 0) {
        // Unparsable model output — keep the raw text available rather than
        // discarding work the user just waited for.
        setFallbackMarkdown(full);
        toast.error("Couldn't parse that deck into slides — showing the raw draft instead.");
        return;
      }
      // Preserve per-slide visuals across regenerate-all / roast-fixes:
      // uploads and AI images are session-local, not part of the markdown
      // the model returns, so re-attach them by position.
      setSlides((prev) => parsed.map((s, i) => ({ ...s, imageUrl: prev?.[i]?.imageUrl })));
      setActiveSlide(0);
      setPendingFixes(null);
    } catch (e) { console.error(e); toast.error("Couldn't draft deck."); }
    finally { setLoading(false); }
  };

  /**
   * Regenerates one slide via the edge function's single-slide mode.
   * Returns success so batch callers can report partial failure honestly
   * instead of claiming a full rebuild after a dropped slide.
   */
  const regenerateOne = async (index: number, feedback?: string): Promise<boolean> => {
    const target = slidesRef.current?.[index];
    if (!target) return false;
    setRegenerating(index);
    const identity = styleMemoryIdentity();
    try {
      const resp = await fetch(fnUrl("workshop-pitch-deck"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          singleSlide: true,
          slide: { index: index + 1, title: target.title, headline: target.headline, bullets: target.bullets, notes: target.notes },
          feedback,
          improvementNotes: pendingFixes && pendingFixes.length > 0 ? pendingFixes : undefined,
          audience, opportunity, ourEdge, proof, ask, tone,
          firmContext: context,
          ...identity,
        }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return false; }
      let full = "";
      await streamSSE(resp, (t) => { full = t; });
      const parsed = parsePitchDeckMarkdown(full);
      if (parsed.length === 0) { toast.error("Couldn't parse the regenerated slide — try again."); return false; }
      // parse() classifies slide 1 as the cover — re-classify at the real index.
      const replacement = { ...parsed[0], layout: classifySlideLayout(parsed[0], index) };
      // Keep the slide's visual — regenerating the text shouldn't drop an
      // uploaded or AI-generated image.
      setSlides((prev) => (prev ? prev.map((s, i) => (i === index ? { ...replacement, imageUrl: s.imageUrl } : s)) : prev));
      return true;
    } catch (e) { console.error(e); toast.error("Couldn't regenerate that slide."); return false; }
    finally { setRegenerating(null); }
  };

  const regenerateSlide = (index: number, feedback?: string) => {
    if (!slides || regenerating !== null || applyingFixes) return;
    void regenerateOne(index, feedback);
  };

  /** Applies the roast fixes to every slide, sequentially. Fixes are only
   *  cleared when every slide regenerated — partial failure keeps them so
   *  the user can retry the slides that were left unchanged. */
  const applyFixes = async () => {
    if (!slides || !pendingFixes || applyingFixes || regenerating !== null) return;
    setApplyingFixes(true);
    const failed = await applyToAllSlides(slides.length, (i) => regenerateOne(i));
    setApplyingFixes(false);
    if (failed.length === 0) {
      setPendingFixes(null);
      toast.success("Deck rebuilt with the roast fixes applied.");
    } else {
      toast.error(
        `${failed.length} slide${failed.length === 1 ? "" : "s"} (${failed.map((i) => i + 1).join(", ")}) couldn't be regenerated — the fixes are kept so you can retry.`,
      );
    }
  };


  const handleEdit = (i: number, patch: Partial<Pick<ParsedSlide, "title" | "headline" | "bullets" | "notes" | "imageUrl">>) => {
    setSlides((prev) => {
      if (!prev) return prev;
      const next = prev.map((s, j) => (j === i ? { ...s, ...patch } : s));
      // Layout is content-derived — re-classify so an emptied bullet list
      // becomes a divider, a numbered list becomes a stats slide, etc.
      next[i] = { ...next[i], layout: classifySlideLayout(next[i], i) };
      return next;
    });
  };

  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pitch-deck.md";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPptx = async () => {
    if (!slides || exportingPptx) return;
    setExportingPptx(true);
    try {
      const { buildPitchDeckPptx } = await import("@/components/pitchDeckPptx");
      await buildPitchDeckPptx({ slides, audience, opportunity, firmName });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't build the .pptx file.");
    } finally {
      setExportingPptx(false);
    }
  };

  const downloadPdf = async () => {
    if (!slides || exportingPdf) return;
    setExportingPdf(true);
    try {
      const { buildPitchDeckPdf } = await import("@/components/pitchDeckExport");
      await buildPitchDeckPdf({ slides, audience, opportunity, firmName });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't build the PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const downloadPngs = async () => {
    if (!slides || exportingPng) return;
    setExportingPng(true);
    try {
      const { downloadSlidesAsPngZip } = await import("@/components/pitchDeckExport");
      await downloadSlidesAsPngZip({ slides, audience, firmName });
      toast.success("One PNG per slide — sized for LinkedIn carousels.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't render the slide PNGs.");
    } finally {
      setExportingPng(false);
    }
  };

  const startOver = () => {
    setSlides(null);
    setRawStream("");
    setFallbackMarkdown("");
    setActiveSlide(0);
    setStep(0);
  };

  // ── Generated deck: visual builder (or raw fallback / streaming view) ──
  if (slides || loading || fallbackMarkdown) {
    const exportBar = (
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => { navigator.clipboard.writeText(markdown); toast.success("Copied"); }} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
        <button onClick={download} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Download className="w-3 h-3" /> .md</button>
        <button onClick={downloadPptx} disabled={exportingPptx} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1 disabled:opacity-50">
          {exportingPptx ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileType2 className="w-3 h-3" />}
          {exportingPptx ? "Building…" : ".pptx"}
        </button>
        <button onClick={downloadPdf} disabled={exportingPdf} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1 disabled:opacity-50">
          {exportingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
          {exportingPdf ? "Building…" : "PDF"}
        </button>
        <button onClick={downloadPngs} disabled={exportingPng} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1 disabled:opacity-50">
          {exportingPng ? <Loader2 className="w-3 h-3 animate-spin" /> : <Images className="w-3 h-3" />}
          {exportingPng ? "Rendering…" : "PNGs"}
        </button>
      </div>
    );

    return (
      <div className="space-y-6">
        {loading && !slides && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-sm p-6 min-h-[400px]">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-body"><Loader2 className="w-4 h-4 animate-spin" /> Structuring {totalSlides} slides…</div>
            <div className="mt-4"><LoadingTips active /></div>
            {rawStream && (
              <div className="mt-4 prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-primary prose-strong:text-foreground prose-hr:border-border/50">
                <ReactMarkdown>{rawStream}</ReactMarkdown>
              </div>
            )}
          </motion.div>
        )}
        {slides && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <DeckBuilder
              slides={slides}
              activeIndex={activeSlide}
              onSelect={setActiveSlide}
              onEdit={handleEdit}
              onRegenerate={regenerateSlide}
              regenerating={regenerating}
              applyingFixes={applyingFixes}
              audience={audience}
              firmName={firmName}
              pendingFixes={pendingFixes}
              onApplyFixes={applyFixes}
              onDismissFixes={() => setPendingFixes(null)}
              onStartOver={startOver}
              exportBar={exportBar}
            />
          </motion.div>
        )}
        {!slides && !loading && fallbackMarkdown && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-sm p-6 min-h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <button onClick={startOver} className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> Start over
              </button>
              <button onClick={() => { navigator.clipboard.writeText(fallbackMarkdown); toast.success("Copied"); }} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-primary prose-strong:text-foreground prose-hr:border-border/50">
              <ReactMarkdown>{fallbackMarkdown}</ReactMarkdown>
            </div>
          </motion.div>
        )}
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

      {/* Roast fixes carried into a fresh deck */}
      {pendingFixes && pendingFixes.length > 0 && (
        <p className="text-center text-xs text-primary font-body">
          {pendingFixes.length} fix{pendingFixes.length === 1 ? "" : "es"} from Roast My Deck will shape the next deck you draft.
        </p>
      )}

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
