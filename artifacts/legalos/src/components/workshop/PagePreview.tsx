import { useMemo, useRef, useState } from "react";
import { Download, Copy, Monitor, Tablet, Smartphone } from "lucide-react";
import { toast } from "sonner";
import BrandPanel from "./BrandPanel";
import { loadDeckTheme, saveDeckTheme, type DeckTheme } from "@/lib/deckTheme";
import { extractHtml, sanitizeHtml, buildPageDocument, PAGE_THEMES, type PageTheme, type PageWidth, type PageDensity } from "@/lib/pagePreview";
import { fileToSlideImage, svgToSlideImage } from "@/lib/slideImage";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { styleMemoryIdentity } from "@/lib/styleFeedback";
import { paletteFor } from "@/lib/deckTheme";
import { ImagePlus, Wand2, Loader2, X } from "lucide-react";

const DEVICES = [
  { id: "desktop", label: "Desktop", width: "100%", icon: Monitor },
  { id: "tablet", label: "Tablet", width: "768px", icon: Tablet },
  { id: "mobile", label: "Mobile", width: "390px", icon: Smartphone },
] as const;

const PagePreview = ({ output, title }: { output: string; title?: string }) => {
  const [theme, setTheme] = useState<PageTheme>("brand");
  const [accent, setAccent] = useState("#b8893b");
  const [brand, setBrand] = useState<DeckTheme>(loadDeckTheme);
  const changeBrand = (t: DeckTheme) => { setBrand(t); saveDeckTheme(t); };
  const [pageWidth, setPageWidth] = useState<PageWidth>("standard");
  const [density, setDensity] = useState<PageDensity>("comfortable");
  const [heroSrc, setHeroSrc] = useState<string | undefined>();
  const [heroBrief, setHeroBrief] = useState("");
  const [heroBusy, setHeroBusy] = useState(false);
  const [customCss, setCustomCss] = useState("");
  const heroFile = useRef<HTMLInputElement>(null);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");

  const html = useMemo(() => extractHtml(output), [output]);
  const doc = useMemo(() => (html ? buildPageDocument(html, { theme, accent, title, brand, width: pageWidth, density, heroSrc, customCss }) : ""), [html, theme, accent, title, brand, pageWidth, density, heroSrc, customCss]);
  const width = DEVICES.find((d) => d.id === device)!.width;

  if (!html) {
    return <p className="text-sm text-muted-foreground font-body py-12 text-center">The preview appears once the draft includes its HTML section.</p>;
  }

  const onHeroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { setHeroSrc(await fileToSlideImage(file)); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't read that image."); }
  };

  const illustrateHero = async () => {
    if (heroBusy) return;
    setHeroBusy(true);
    const P = paletteFor(brand);
    try {
      const resp = await fetch(fnUrl("workshop-slide-visual"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ brief: heroBrief.trim() || title || "calm, structured, professional", context: "website hero banner", primary: P.navy, accent: P.gold, paper: P.paper, shape: "wide", ...styleMemoryIdentity() }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      const data = await resp.json();
      if (!data?.svg) { toast.error("The illustration came back empty — try rephrasing."); return; }
      setHeroSrc(await svgToSlideImage(data.svg, "wide"));
    } catch (e) { console.error(e); toast.error("Couldn't generate that illustration."); }
    finally { setHeroBusy(false); }
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([doc], { type: "text/html;charset=utf-8" }));
    a.download = "draft-page.html";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-sm border text-xs font-body ${active ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PAGE_THEMES.map((t) => (
          <button key={t.id} className={chip(theme === t.id)} aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</button>
        ))}
        {theme !== "brand" && (<label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-body ml-1">
          Accent
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} aria-label="Accent colour" className="w-6 h-6 p-0 border border-border rounded-sm bg-transparent" />
        </label>)}
        <span className="flex-1" />
        {DEVICES.map((d) => (
          <button key={d.id} className={`${chip(device === d.id)} inline-flex items-center gap-1`} aria-pressed={device === d.id} onClick={() => setDevice(d.id)} title={d.label}>
            <d.icon className="w-3 h-3" /> <span className="hidden sm:inline">{d.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-card border border-border/50 rounded-sm p-3">
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground font-body">Width
          <select value={pageWidth} onChange={(e) => setPageWidth(e.target.value as PageWidth)} className="bg-background border border-border rounded-sm px-2 py-1 text-xs">
            <option value="narrow">Narrow</option><option value="standard">Standard</option><option value="wide">Wide</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground font-body">Spacing
          <select value={density} onChange={(e) => setDensity(e.target.value as PageDensity)} className="bg-background border border-border rounded-sm px-2 py-1 text-xs">
            <option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="airy">Airy</option>
          </select>
        </label>
        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground font-body">Hero image
          <input ref={heroFile} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onHeroFile} />
          {heroSrc ? (
            <span className="inline-flex items-center gap-2">
              <img src={heroSrc} alt="" className="h-7 w-14 object-cover rounded-sm border border-border/50" />
              <button onClick={() => setHeroSrc(undefined)} aria-label="Remove hero image" className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <button onClick={() => heroFile.current?.click()} className="text-xs text-primary border border-primary/30 rounded-sm px-2 py-1 inline-flex items-center gap-1"><ImagePlus className="w-3 h-3" /> Upload</button>
              <input value={heroBrief} onChange={(e) => setHeroBrief(e.target.value)} placeholder="or describe an illustration" aria-label="Hero illustration brief" className="bg-background border border-border rounded-sm px-2 py-1 text-xs w-44" />
              <button onClick={illustrateHero} disabled={heroBusy} className="text-xs text-primary border border-primary/30 rounded-sm px-2 py-1 inline-flex items-center gap-1 disabled:opacity-40">
                {heroBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Illustrate
              </button>
            </span>
          )}
        </div>
        <details className="basis-full">
          <summary className="text-[11px] text-muted-foreground font-body cursor-pointer">Custom CSS (advanced)</summary>
          <textarea value={customCss} onChange={(e) => setCustomCss(e.target.value)} rows={4} spellCheck={false} placeholder={"h1 { letter-spacing: .02em }\nblockquote { border-color: #c33 }"} aria-label="Custom CSS" className="mt-1.5 w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs font-mono" />
          <p className="text-[10px] text-muted-foreground font-body italic mt-1">Applies to the preview and the downloaded page. Imports and external URLs are removed.</p>
        </details>
      </div>

      {theme === "brand" && <BrandPanel theme={brand} onChange={changeBrand} />}

      <div className="bg-secondary/40 border border-border/50 rounded-sm p-3 flex justify-center">
        <iframe
          title="Page preview"
          sandbox=""
          srcDoc={doc}
          style={{ width, maxWidth: "100%", height: 620, border: "1px solid hsl(var(--border))", background: "#fff", borderRadius: 2 }}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => { navigator.clipboard.writeText(sanitizeHtml(html)); toast.success("Clean HTML copied"); }} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
          <Copy className="w-3 h-3" /> Copy clean HTML
        </button>
        <button onClick={download} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
          <Download className="w-3 h-3" /> Download styled page (.html)
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground font-body italic">
        The preview uses a built-in theme. The copied HTML is unstyled on purpose, so your site's own design takes over.
      </p>
    </div>
  );
};

export default PagePreview;
