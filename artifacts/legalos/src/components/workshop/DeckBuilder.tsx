// Visual deck editor: filmstrip + scaled slide stage + inline editing +
// per-slide AI regeneration. Presentational — PitchDeck.tsx owns the slides
// state, edge calls, and exports; this component reports edits up.
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Flame, X, ChevronLeft, ImagePlus, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { ParsedSlide } from "@/components/pitchDeckParser";
import { ScaledSlide } from "@/components/pitchDeckPreview";
import { fileToSlideImage } from "@/lib/slideImage";
import type { ReactNode } from "react";

export interface DeckBuilderProps {
  slides: ParsedSlide[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onEdit: (i: number, patch: Partial<Pick<ParsedSlide, "title" | "headline" | "bullets" | "notes" | "imageUrl">>) => void;
  onRegenerate: (i: number, feedback?: string) => void;
  /** Omit to hide AI visuals (no image provider is configured). Upload stays available. */
  onGenerateImage?: (i: number, prompt: string) => void;
  regenerating: number | null;
  generatingImage?: number | null;
  applyingFixes: boolean;
  audience: string;
  firmName?: string | null;
  /** Fixes handed over from Roast My Deck, if any. */
  pendingFixes: string[] | null;
  onApplyFixes: () => void;
  onDismissFixes: () => void;
  onStartOver: () => void;
  exportBar: ReactNode;
}

const LAYOUT_LABEL: Record<ParsedSlide["layout"], string> = {
  title: "Cover",
  section: "Divider",
  quote: "Quote",
  stats: "Stats",
  process: "Steps",
  cards: "Cards",
  bullets: "Bullets",
};

const DeckBuilder = ({
  slides, activeIndex, onSelect, onEdit, onRegenerate, onGenerateImage, regenerating, generatingImage, applyingFixes,
  audience, firmName, pendingFixes, onApplyFixes, onDismissFixes, onStartOver, exportBar,
}: DeckBuilderProps) => {
  const [feedback, setFeedback] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slide = slides[activeIndex];
  const busy = regenerating !== null || applyingFixes || generatingImage !== null;

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToSlideImage(file);
      onEdit(activeIndex, { imageUrl: dataUrl });
      toast.success("Visual added — it's on the slide and in every export.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that image.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <button onClick={onStartOver} className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Start over
        </button>
        {exportBar}
      </div>

      {/* Roast fixes banner */}
      {pendingFixes && pendingFixes.length > 0 && (
        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/30 rounded-sm px-4 py-3">
          <Flame className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-body text-foreground">
              {pendingFixes.length} fix{pendingFixes.length === 1 ? "" : "es"} from Roast My Deck loaded — they're applied to any slide you regenerate.
            </p>
          </div>
          <button
            onClick={onApplyFixes}
            disabled={busy}
            className="text-xs text-primary hover:text-gold-light font-body disabled:opacity-40 whitespace-nowrap"
          >
            {applyingFixes ? "Applying…" : "Apply to all slides"}
          </button>
          <button onClick={onDismissFixes} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss fixes">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filmstrip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`shrink-0 w-36 rounded-sm overflow-hidden border transition-colors ${
              i === activeIndex ? "border-primary ring-1 ring-primary" : "border-border/50 hover:border-border"
            }`}
          >
            <ScaledSlide slide={s} index={i} total={slides.length} audience={audience} firmName={firmName} />
            <div className={`text-[10px] font-body px-1.5 py-1 flex justify-between ${i === activeIndex ? "text-primary" : "text-muted-foreground"}`}>
              <span className="truncate">{s.title}</span>
              <span className="opacity-60 ml-1">{i + 1}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Stage */}
      <motion.div
        key={activeIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="relative rounded-sm border border-border/50 overflow-hidden"
      >
        <ScaledSlide slide={slide} index={activeIndex} total={slides.length} audience={audience} firmName={firmName} />
        {(regenerating === activeIndex || generatingImage === activeIndex) && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center gap-2 text-sm text-muted-foreground font-body">
            <Loader2 className="w-4 h-4 animate-spin" />
            {generatingImage === activeIndex ? "Generating visual…" : `Regenerating slide ${activeIndex + 1}…`}
          </div>
        )}
      </motion.div>

      {/* Editing panel */}
      <div className="bg-card border border-border/50 rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-[10px] text-muted-foreground">
            Slide {activeIndex + 1} · {LAYOUT_LABEL[slide.layout]} layout — edits update every export
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] text-muted-foreground font-body">Section title</span>
            <input
              value={slide.title}
              onChange={(e) => onEdit(activeIndex, { title: e.target.value })}
              className="mt-1 w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-muted-foreground font-body">Headline (on the slide)</span>
            <input
              value={slide.headline}
              onChange={(e) => onEdit(activeIndex, { headline: e.target.value })}
              className="mt-1 w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-[11px] text-muted-foreground font-body">Bullets — one per line</span>
          <textarea
            value={slide.bullets.join("\n")}
            onChange={(e) => onEdit(activeIndex, { bullets: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) })}
            rows={Math.max(2, slide.bullets.length)}
            className="mt-1 w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body focus:outline-none focus:border-primary resize-y"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground font-body">Speaker notes</span>
          <textarea
            value={slide.notes}
            onChange={(e) => onEdit(activeIndex, { notes: e.target.value })}
            rows={2}
            className="mt-1 w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body focus:outline-none focus:border-primary resize-y"
          />
        </label>

        {/* Visual: upload (headshots, logos, charts) or AI-generated */}
        <div className="pt-2 border-t border-border/30">
          <span className="text-[11px] text-muted-foreground font-body">Visual — appears on the slide and in every export</span>
          {slide.imageUrl ? (
            <div className="mt-1.5 flex items-center gap-3">
              <img src={slide.imageUrl} alt="Slide visual" className="w-28 h-[74px] object-cover rounded-sm border border-border/50" />
              <button
                onClick={() => onEdit(activeIndex, { imageUrl: undefined })}
                className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove visual
              </button>
            </div>
          ) : (
            <div className="mt-1.5 space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-gold-light font-body border border-primary/30 hover:border-primary/60 rounded-sm px-3 py-2 transition-colors disabled:opacity-40"
              >
                <ImagePlus className="w-3.5 h-3.5" /> Upload image (logo, headshot, chart…)
              </button>
              {onGenerateImage && (
              <div className="flex items-center gap-2">
                <input
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder='or describe a visual — e.g. "glass courthouse at dusk, navy and gold"'
                  className="flex-1 bg-background border border-border rounded-sm px-3 py-2 text-xs font-body focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => { onGenerateImage(activeIndex, imagePrompt.trim() || slide.headline || slide.title); setImagePrompt(""); }}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-gold-light font-body border border-primary/30 hover:border-primary/60 rounded-sm px-3 py-2 transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {generatingImage === activeIndex ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Generate with AI
                </button>
              </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional direction — e.g. punchier, add a proof point…"
            className="flex-1 bg-background border border-border rounded-sm px-3 py-2 text-xs font-body focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => { onRegenerate(activeIndex, feedback.trim() || undefined); setFeedback(""); }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-gold-light font-body border border-primary/30 hover:border-primary/60 rounded-sm px-3 py-2 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {regenerating === activeIndex ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate with AI
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;
