import { useRef } from "react";
import { ImagePlus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_DECK_THEME, FONT_PAIRS, PAPER_CHOICES, luminance, type DeckTheme, type FontPairId } from "@/lib/deckTheme";
import { fileToSlideImage } from "@/lib/slideImage";

interface Props {
  theme: DeckTheme;
  onChange: (t: DeckTheme) => void;
  /** Hide the logo control where there is no cover to put it on. */
  showLogo?: boolean;
}

const BrandPanel = ({ theme, onChange, showLogo = true }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<DeckTheme>) => onChange({ ...theme, ...patch });

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      set({ logoUrl: await fileToSlideImage(file) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that logo.");
    }
  };

  const tooLight = luminance(theme.primary) > 0.18;
  const label = "text-[11px] text-muted-foreground font-body";
  const swatch = "w-8 h-8 p-0 border border-border rounded-sm bg-transparent cursor-pointer";

  return (
    <div className="bg-card border border-border/50 rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-[10px] text-muted-foreground">Brand — applies to the preview and every export</p>
        <button onClick={() => onChange(DEFAULT_DECK_THEME)} className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className={label}>Main colour</span>
          <input type="color" className={swatch} value={theme.primary} onChange={(e) => set({ primary: e.target.value.toUpperCase() })} aria-label="Main brand colour" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Accent</span>
          <input type="color" className={swatch} value={theme.accent} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} aria-label="Accent colour" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Background</span>
          <select value={theme.paper} onChange={(e) => set({ paper: e.target.value })} className="bg-background border border-border rounded-sm px-2 py-1.5 text-xs font-body">
            {PAPER_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Fonts</span>
          <select value={theme.fonts} onChange={(e) => set({ fonts: e.target.value as FontPairId })} className="bg-background border border-border rounded-sm px-2 py-1.5 text-xs font-body">
            {Object.entries(FONT_PAIRS).map(([id, f]) => <option key={id} value={id}>{f.label}</option>)}
          </select>
        </label>
        {showLogo && (
          <div className="flex flex-col gap-1">
            <span className={label}>Logo (cover)</span>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onLogo} />
            {theme.logoUrl ? (
              <div className="flex items-center gap-2">
                <img src={theme.logoUrl} alt="Logo" className="h-8 max-w-[96px] object-contain bg-secondary/60 rounded-sm px-1" />
                <button onClick={() => set({ logoUrl: undefined })} aria-label="Remove logo" className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:text-gold-light font-body border border-primary/30 rounded-sm px-2.5 py-1.5 inline-flex items-center gap-1">
                <ImagePlus className="w-3.5 h-3.5" /> Upload
              </button>
            )}
          </div>
        )}
      </div>
      {tooLight && <p className="text-[10px] text-muted-foreground font-body italic">That main colour is very light — it's darkened automatically so white text stays readable.</p>}
      <p className="text-[10px] text-muted-foreground font-body italic">Fonts are common system fonts so the .pptx opens correctly on any computer. Saved in this browser.</p>
    </div>
  );
};

export default BrandPanel;
