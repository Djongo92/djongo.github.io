import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Loader2, Upload, FileWarning, Palette, Presentation, Copy, Download, Share2, Ban } from "lucide-react";
import { LoadingTips } from "@/components/LoadingTips";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { useAuth } from "@/hooks/useAuth";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { recordRun } from "@/hooks/useWorkshopHistory";
import { styleMemoryIdentity } from "@/lib/styleFeedback";
import { sendTo } from "@/lib/handoff";
import { formatRoastMarkdown, roastFileName, isVisualRoastNote as isVisualNote, type DeckRoastResult } from "@/lib/roastMarkdown";

const gradeStyles: Record<string, string> = {
  A: "text-primary bg-primary/10 border-primary/40",
  B: "text-primary bg-primary/10 border-primary/40",
  C: "text-gold-light bg-gold/10 border-gold/30",
  D: "text-destructive bg-destructive/10 border-destructive/30",
  F: "text-destructive bg-destructive/15 border-destructive/40",
};

const DeckRoast = () => {
  const { context } = useFirmContext();
  // Share-link minting is a signed-in action (the edge function resolves the
  // verified firm from the session); anonymous/demo runs get Copy/.md only.
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeckRoastResult | null>(null);

  const [loadingSample, setLoadingSample] = useState(false);

  const trySampleDeck = async () => {
    if (extracting || loading || loadingSample) return;
    setLoadingSample(true);
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}sample-pitch-deck.pptx`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const file = new File([blob], "sample-pitch-deck.pptx", { type: blob.type });
      await handleFile(file);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load the sample deck.");
    } finally {
      setLoadingSample(false);
    }
  };

  const submitToBackend = async (body: Record<string, unknown>) => {
    setExtracting(false);
    setLoading(true);
    const identity = styleMemoryIdentity();
    const resp = await fetch(fnUrl("workshop-deck-roast"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...body, firmContext: context, ...identity }),
    });
    const err = await handleHttpError(resp);
    if (err) {
      toast.error(err);
      return;
    }
    const data = await resp.json();
    setResult(data);
    // The FULL roast as markdown is the run-history output (was: just the
    // burn) — that's what lets the result survive navigation via My Workshop.
    recordRun({
      toolId: "deckroast",
      toolLabel: "Roast My Deck",
      title: `Deck roast · ${fileName}`,
      preview: data.verdict,
      output: formatRoastMarkdown(data, fileName),
      payload: data,
    }, identity);
  };

  const downloadRoast = () => {
    if (!result) return;
    const blob = new Blob([formatRoastMarkdown(result, fileName)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = roastFileName(fileName);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Active share links (task #151): a firm that shared a brutal roast with
  // the wrong partner can kill the link before its 7-day expiry instead of
  // waiting it out. Listed whenever signed in — links may belong to roasts
  // from other sessions or devices.
  interface ShareLink { id: string; fileName: string | null; recipientLabel: string | null; expiresAt: string }
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadShareLinks = async () => {
    if (!user) return;
    try {
      const resp = await fetch(fnUrl("roast-share-link"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "list", ...styleMemoryIdentity() }),
      });
      if (!resp.ok) return; // listing is opportunistic — never block the tool
      const data = await resp.json();
      setShareLinks(Array.isArray(data?.links) ? data.links : []);
    } catch { /* offline etc. — leave the list as-is */ }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadShareLinks(); }, [user?.id]);

  const revokeShareLink = async (id: string) => {
    if (revoking) return;
    setRevoking(id);
    try {
      const resp = await fetch(fnUrl("roast-share-link"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "revoke", linkId: id, ...styleMemoryIdentity() }),
      });
      const err = await handleHttpError(resp);
      if (err) {
        toast.error(err);
        return;
      }
      setShareLinks((links) => links.filter((l) => l.id !== id));
      toast.success("Share link revoked — it now behaves like an expired one.");
    } finally {
      setRevoking(null);
    }
  };

  // Mint an expiring read-only link (task #136) — the partner opens it with
  // no account. The roast JSON is stored server-side verbatim (it is already
  // the run-history payload), so the link never re-derives anything.
  const shareRoast = async () => {
    if (!result || sharing) return;
    setSharing(true);
    try {
      const resp = await fetch(fnUrl("roast-share-link"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "create", ...styleMemoryIdentity(), payload: result, fileName, expiresInDays: 7 }),
      });
      const err = await handleHttpError(resp);
      if (err) {
        toast.error(err);
        return;
      }
      const data = await resp.json();
      const url = `${window.location.origin}${import.meta.env.BASE_URL}roast-share/${data.linkId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Read-only link copied — it expires in 7 days.");
      void loadShareLinks();
    } finally {
      setSharing(false);
    }
  };

  const handleFile = async (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isPptx = file.name.toLowerCase().endsWith(".pptx");
    if (!isPdf && !isPptx) {
      toast.error("Only .pdf and .pptx files are supported.");
      return;
    }
    setFileName(file.name);
    setResult(null);
    setExtracting(true);
    try {
      if (isPdf) {
        const { rasterizePdfToImages, PDF_RASTERIZE_MAX_PAGES } = await import("@/components/pdfRasterizer");
        const pages = await rasterizePdfToImages(file);
        if (pages.length === 0) {
          toast.error("Couldn't find any pages in that PDF.");
          return;
        }
        if (pages.length >= PDF_RASTERIZE_MAX_PAGES) {
          toast.info(`Analyzing the first ${PDF_RASTERIZE_MAX_PAGES} slides.`);
        }
        await submitToBackend({ pageImages: pages.map((p) => p.dataUrl) });
      } else {
        const { extractPptxSlides } = await import("@/components/pptxExtractor");
        const slides = await extractPptxSlides(file);
        if (slides.length === 0) {
          toast.error("Couldn't find any slides in that file.");
          return;
        }
        await submitToBackend({ slides });
      }
    } catch (e) {
      console.error(e);
      toast.error(`Couldn't read that file — make sure it's a valid ${isPdf ? ".pdf" : ".pptx"}.`);
    } finally {
      setExtracting(false);
      setLoading(false);
    }
  };

  const busy = extracting || loading || loadingSample;

  return (
    <div className="space-y-6">
      {!result && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground font-body mb-1">
            Upload a .pdf for full design + copy critique (Canva, Keynote, Google Slides, and PowerPoint all export
            PDF natively) — rendered entirely in your browser, nothing uploaded except the images. .pptx works too,
            but gets a copy-only critique — there's no layout renderer available for that format client-side.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.pptx"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className="flex items-center justify-center gap-3 flex-wrap mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="bg-destructive text-destructive-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-destructive/90 transition-all rounded-sm disabled:opacity-40 inline-flex items-center gap-2"
            >
              {extracting || loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {extracting ? "Reading deck…" : "Roasting…"}</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload a .pdf or .pptx to roast</>
              )}
            </button>
            <button
              onClick={trySampleDeck}
              disabled={busy}
              className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              {loadingSample ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
              {loadingSample ? "Loading sample…" : "Or try our sample deck"}
            </button>
          </div>
          {fileName && !result && (
            <p className="text-xs text-muted-foreground font-body mt-3">{fileName}</p>
          )}
          {(extracting || loading) && (
            <div className="mt-4 max-w-md mx-auto">
              <LoadingTips active />
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-4 mb-6">
              <div className={`shrink-0 w-16 h-16 rounded-sm border-2 flex items-center justify-center font-display text-3xl font-semibold ${gradeStyles[result.grade]}`}>
                {result.grade}
              </div>
              <div className="flex-1">
                <p className="font-display text-xl text-foreground italic leading-snug mb-1">"{result.verdict}"</p>
                <p className="text-[11px] text-muted-foreground font-body">
                  {fileName} · {result.slideCount} slides · {result.mode === "visual" ? "design + copy critique" : "copy critique (text-only)"}
                </p>
              </div>
            </div>

            <div className="bg-destructive/5 border-l-4 border-destructive p-5 rounded-r-sm mb-6">
              <p className="eyebrow text-[10px] text-destructive mb-2">The Burn</p>
              <p className="font-body text-sm text-foreground leading-relaxed">{result.burn}</p>
            </div>

            {result.designSummary && (
              <div className="bg-primary/5 border-l-4 border-primary/60 p-5 rounded-r-sm mb-6">
                <p className="eyebrow text-[10px] text-primary mb-2 flex items-center gap-1.5">
                  <Palette className="w-3 h-3" /> Visual Design
                </p>
                <p className="font-body text-sm text-foreground leading-relaxed">{result.designSummary}</p>
              </div>
            )}

            <div className="mb-6">
              <h4 className="font-display text-base text-foreground mb-3">Top 3 Fixes (in order)</h4>
              <ol className="space-y-2">
                {result.topThreeFixes.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-body text-secondary-foreground/85">
                    <span className="font-display text-lg text-destructive/60 min-w-[1.5rem]">{i + 1}.</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => {
                  sendTo("deck", { kind: "deck-fixes", fixes: result.topThreeFixes, source: "Roast My Deck", title: fileName });
                  toast.success("Fixes sent — open the Pitch Deck tool to rebuild with them applied.");
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:text-gold-light font-body border border-primary/30 hover:border-primary/60 rounded-sm px-3 py-2 transition-colors"
              >
                <Presentation className="w-3.5 h-3.5" /> Send these fixes to the Deck Builder
              </button>
            </div>

            <div className="mb-6">
              <h4 className="font-display text-base text-foreground mb-3">Slide-by-slide</h4>
              <div className="space-y-3">
                {result.slideNotes.map((s, i) => (
                  <div key={i} className="border border-border/40 rounded-sm p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="eyebrow text-[9px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary">
                        Slide {s.slideNumber}
                      </span>
                    </div>
                    {isVisualNote(s) ? (
                      <div className="space-y-2.5">
                        <div>
                          <p className="text-xs text-destructive/90 font-body italic">
                            <span className="font-medium not-italic">Design:</span> {s.designIssue}
                          </p>
                          <p className="text-xs text-primary font-body mt-0.5">
                            <span className="font-medium">Fix:</span> {s.designFix}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-border/30">
                          <p className="text-xs text-destructive/90 font-body italic">
                            <span className="font-medium not-italic">Copy:</span> {s.copyIssue}
                          </p>
                          <p className="text-xs text-primary font-body mt-0.5">
                            <span className="font-medium">Fix:</span> {s.copyFix}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-destructive/90 font-body italic mb-2">
                          <span className="font-medium not-italic">Issue:</span> {s.issue}
                        </p>
                        <p className="text-xs text-primary font-body">
                          <span className="font-medium">Fix:</span> {s.fix}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-sm mb-6">
              <p className="eyebrow text-[10px] text-primary mb-2">Credit where it's due</p>
              <p className="font-body text-xs text-secondary-foreground/85">{result.redemption}</p>
            </div>

            {/* Export row — same treatment as the Pitch Deck builder's */}
            <div className="flex gap-3 flex-wrap mb-6 pt-4 border-t border-border/30">
              <button
                onClick={() => { navigator.clipboard.writeText(formatRoastMarkdown(result, fileName)); toast.success("Roast copied — paste it anywhere."); }}
                className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <button
                onClick={downloadRoast}
                className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> .md
              </button>
              {user && (
                <button
                  onClick={shareRoast}
                  disabled={sharing}
                  className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1 disabled:opacity-40"
                >
                  <Share2 className="w-3 h-3" /> {sharing ? "Creating…" : "Share link"}
                </button>
              )}
            </div>

            <button
              onClick={() => { setResult(null); setFileName(""); }}
              className="text-xs text-primary hover:text-gold-light font-body"
            >
              ← Roast another deck
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && (
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground font-body italic justify-center">
          <FileWarning className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>.pdf and .pptx are supported — export a Keynote, Canva, or Google Slides deck to one of those first.</span>
        </div>
      )}

      {/* Active share links with early revoke (task #151) */}
      {user && shareLinks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border/30 space-y-1.5 max-w-md mx-auto w-full">
          <p className="eyebrow text-[9px] text-muted-foreground">Active share links</p>
          {shareLinks.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 text-xs font-body border border-border/30 rounded-sm px-3 py-1.5">
              <span className="text-secondary-foreground/80 truncate">
                {l.recipientLabel || l.fileName || "Shared roast"} · expires {new Date(l.expiresAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => revokeShareLink(l.id)}
                disabled={revoking === l.id}
                className="text-destructive hover:text-destructive/80 inline-flex items-center gap-1 shrink-0 disabled:opacity-40"
              >
                <Ban className="w-3 h-3" /> {revoking === l.id ? "Revoking…" : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeckRoast;
