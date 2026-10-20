// Canvas renderer + PDF/PNG exports for the Deck Builder. Split out of
// PitchDeck.tsx so jsPDF/jszip are only fetched when the user actually
// exports — same dynamic-import pattern as pitchDeckPptx.ts and
// battlePlanPdf.ts. The five layouts mirror pitchDeckPreview.tsx exactly;
// if a treatment changes, change it in both.
import { paletteFor, type DeckTheme, type DeckPalette } from "@/lib/deckTheme";
import { stripStepPrefix, splitLead, type ParsedSlide } from "./pitchDeckParser";
import {
  COVER_IMAGE, COVER_TEXT_MAX, COVER_TEXT_MAX_PLAIN, SECTION_IMAGE, SECTION_TEXT_MAX, SECTION_TEXT_MAX_PLAIN,
  CONTENT_IMAGE, CONTENT_TEXT_MAX, CONTENT_TEXT_MAX_PLAIN, CONTENT_BULLETS_MAX, CONTENT_BULLETS_MAX_PLAIN,
} from "./slideVisualGeometry";


const W = 1600;
const H = 900;

export interface RenderOptions {
  audience?: string;
  firmName?: string | null;
  theme?: DeckTheme;
}

const slideNumber = (i: number, total: number) =>
  `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

/** Word-wrap against the canvas measure — splits on whitespace only. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Splits "40+ closed deals" into ["40+", "closed deals"] for stat callouts. */
function splitStat(bullet: string): [string, string] {
  const m = bullet.trim().match(/^([\d$€£%×x+~][\d.,$€£%+×x~kKmMbB]*)\s+([\s\S]*)$/);
  return m ? [m[1], m[2]] : ["", bullet];
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("slide image failed to load"));
    img.src = src;
  });
}

/** Cover-crop draw into a rect — mirrors object-fit: cover in the DOM preview. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/** Navy → transparent fade over the left edge of a full-height image panel. */
function fadeInFromNavy(ctx: CanvasRenderingContext2D, C: DeckPalette, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, 0, x + w * 0.45, 0);
  g.addColorStop(0, C.navy);
  g.addColorStop(1, `rgba(${C.primaryRgb}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function paperChrome(ctx: CanvasRenderingContext2D, C: DeckPalette, slide: ParsedSlide, i: number, total: number) {
  const SANS = C.sans;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.navy;
  ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, 10, W, 4);
  ctx.font = `bold 24px ${SANS}`;
  ctx.fillStyle = C.gold;
  ctx.fillText(slideNumber(i, total), 80, 110);
  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.save();
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "2px";
  ctx.fillText(slide.title.toUpperCase(), 80, 165);
  ctx.restore();
}

export async function renderSlideToCanvas(
  slide: ParsedSlide,
  index: number,
  total: number,
  opts: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  const C = paletteFor(opts.theme);
  const SERIF = C.serif;
  const SANS = C.sans;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Slide visual (uploaded or AI-generated) — a failed load degrades to the
  // text-only layout rather than failing the whole export.
  let visual: HTMLImageElement | null = null;
  if (slide.imageUrl) {
    try {
      visual = await loadImageEl(slide.imageUrl);
    } catch {
      visual = null;
    }
  }

  if (slide.layout === "title") {
    // ── Cover ──
    ctx.fillStyle = C.navy;
    ctx.fillRect(0, 0, W, H);
    if (visual) {
      drawCover(ctx, visual, COVER_IMAGE.x, COVER_IMAGE.y, COVER_IMAGE.w, COVER_IMAGE.h);
      fadeInFromNavy(ctx, C, COVER_IMAGE.x, COVER_IMAGE.y, COVER_IMAGE.w, COVER_IMAGE.h);
    }
    ctx.fillStyle = C.gold;
    ctx.fillRect(0, 0, W, 12);
    let logo: HTMLImageElement | null = null;
    if (C.logoUrl) { try { logo = await loadImageEl(C.logoUrl); } catch { logo = null; } }
    if (logo) {
      const k = Math.min(360 / logo.width, 72 / logo.height);
      ctx.drawImage(logo, 80, 64, logo.width * k, logo.height * k);
    } else {
      ctx.font = `26px ${SANS}`;
      ctx.fillStyle = C.goldLight;
      ctx.save();
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "6px";
      ctx.fillText((opts.firmName || "UVID").toUpperCase(), 80, 120);
      ctx.restore();
    }
    ctx.font = `bold 76px ${SERIF}`;
    ctx.fillStyle = "#FFFFFF";
    const headLines = wrapText(ctx, slide.headline || slide.title, visual ? COVER_TEXT_MAX : COVER_TEXT_MAX_PLAIN).slice(0, 4);
    headLines.forEach((l, li) => ctx.fillText(l, 80, 300 + li * 92));
    let y = 320 + headLines.length * 92;
    ctx.font = `30px ${SANS}`;
    ctx.fillStyle = C.goldLight;
    for (const b of slide.bullets.slice(0, 4)) {
      const line = wrapText(ctx, `—  ${b}`, visual ? COVER_TEXT_MAX : 1400)[0];
      if (line) ctx.fillText(line, 80, y);
      y += 48;
    }
    if (opts.audience) {
      ctx.font = `24px ${SANS}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(`PREPARED FOR — ${opts.audience.toUpperCase()}`, 80, 810);
    }
    return canvas;
  }

  if (slide.layout === "section") {
    // ── Section divider ──
    ctx.fillStyle = C.navy;
    ctx.fillRect(0, 0, W, H);
    if (visual) {
      drawCover(ctx, visual, SECTION_IMAGE.x, SECTION_IMAGE.y, SECTION_IMAGE.w, SECTION_IMAGE.h);
      fadeInFromNavy(ctx, C, SECTION_IMAGE.x, SECTION_IMAGE.y, SECTION_IMAGE.w, SECTION_IMAGE.h);
    }
    ctx.font = `bold 28px ${SANS}`;
    ctx.fillStyle = C.gold;
    ctx.fillText(slideNumber(index, total), 80, 120);
    ctx.font = `28px ${SANS}`;
    ctx.fillStyle = C.goldLight;
    ctx.save();
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "4px";
    ctx.fillText(slide.title.toUpperCase(), 80, 190);
    ctx.restore();
    ctx.font = `bold 88px ${SERIF}`;
    ctx.fillStyle = "#FFFFFF";
    wrapText(ctx, slide.headline, visual ? SECTION_TEXT_MAX : SECTION_TEXT_MAX_PLAIN).slice(0, 3).forEach((l, li) => ctx.fillText(l, 80, 400 + li * 108));
    return canvas;
  }

  if (slide.layout === "quote") {
    // ── Quote ──
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);
    if (visual) {
      drawCover(ctx, visual, 0, 0, W, H);
      ctx.fillStyle = `rgba(${C.paperRgb}, 0.88)`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = C.navy;
    ctx.fillRect(0, 0, W, 10);
    ctx.fillStyle = C.gold;
    ctx.fillRect(0, 10, W, 4);
    ctx.font = `240px ${SERIF}`;
    ctx.fillStyle = C.gold;
    ctx.fillText("“", 100, 320);
    ctx.textAlign = "center";
    ctx.font = `italic bold 56px ${SERIF}`;
    ctx.fillStyle = C.navy;
    const quoteLines = wrapText(ctx, slide.headline, 1200).slice(0, 4);
    quoteLines.forEach((l, li) => ctx.fillText(l, W / 2, 420 + li * 74));
    ctx.font = `30px ${SANS}`;
    ctx.fillStyle = C.muted;
    slide.bullets.slice(0, 3).forEach((b, bi) => ctx.fillText(b, W / 2, 440 + quoteLines.length * 74 + 40 + bi * 46));
    ctx.textAlign = "left";
    return canvas;
  }

  if (slide.layout === "stats") {
    // ── Stats callout ──
    paperChrome(ctx, C, slide, index, total);
    if (visual) drawCover(ctx, visual, CONTENT_IMAGE.x, CONTENT_IMAGE.y, CONTENT_IMAGE.w, CONTENT_IMAGE.h);
    const textMax = visual ? CONTENT_TEXT_MAX : CONTENT_TEXT_MAX_PLAIN;
    ctx.font = `bold 52px ${SERIF}`;
    ctx.fillStyle = C.navy;
    const headLines = wrapText(ctx, slide.headline, textMax).slice(0, 2);
    headLines.forEach((l, li) => ctx.fillText(l, 80, 260 + li * 66));
    let y = 280 + headLines.length * 66 + 60;
    for (const b of slide.bullets.slice(0, 4)) {
      const [stat, rest] = splitStat(b);
      if (stat) {
        ctx.font = `bold 64px ${SERIF}`;
        ctx.fillStyle = C.gold;
        ctx.fillText(stat, 80, y);
        const statW = ctx.measureText(stat).width;
        ctx.font = `30px ${SANS}`;
        ctx.fillStyle = C.ink;
        wrapText(ctx, rest, (visual ? CONTENT_BULLETS_MAX : 1200) - statW).slice(0, 2).forEach((l, li) => ctx.fillText(l, 110 + statW, y - 14 + li * 40));
      } else {
        ctx.font = `30px ${SANS}`;
        ctx.fillStyle = C.ink;
        ctx.fillText(`•  ${b}`, 80, y);
      }
      y += 120;
    }
    return canvas;
  }

  if (slide.layout === "split") {
    // ── Split: headline on brand colour left, bullets (or visual) right ──
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.navy;
    ctx.fillRect(0, 0, 800, H);
    ctx.fillStyle = C.gold;
    ctx.fillRect(0, 0, 800, 10);
    ctx.font = `22px ${SANS}`;
    ctx.fillStyle = C.goldLight;
    ctx.save();
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "4px";
    ctx.fillText(slide.title.toUpperCase(), 80, 110);
    ctx.restore();
    ctx.font = `bold 58px ${SERIF}`;
    ctx.fillStyle = "#FFFFFF";
    wrapText(ctx, slide.headline, 640).slice(0, 5).forEach((l, li) => ctx.fillText(l, 80, 260 + li * 74));
    ctx.font = `bold 20px ${SANS}`;
    ctx.fillStyle = C.gold;
    ctx.fillText(slideNumber(index, total), 80, 840);
    if (visual) {
      drawCover(ctx, visual, 800, 0, 800, H);
    } else {
      let y = 250;
      ctx.font = `34px ${SANS}`;
      for (const b of slide.bullets.slice(0, 5)) {
        ctx.fillStyle = C.gold;
        ctx.fillText("•", 880, y);
        ctx.fillStyle = C.ink;
        const lines = wrapText(ctx, b, 600).slice(0, 3);
        lines.forEach((l, li) => ctx.fillText(l, 930, y + li * 44));
        y += lines.length * 44 + 36;
      }
    }
    return canvas;
  }

  if (slide.layout === "process") {
    // ── Process / timeline: numbered steps along a line ──
    paperChrome(ctx, C, slide, index, total);
    ctx.font = `bold 52px ${SERIF}`;
    ctx.fillStyle = C.navy;
    wrapText(ctx, slide.headline, CONTENT_TEXT_MAX_PLAIN).slice(0, 2).forEach((l, li) => ctx.fillText(l, 80, 260 + li * 66));
    const steps = slide.bullets.slice(0, 5);
    const colW = 1440 / Math.max(steps.length, 1);
    const cy = 520;
    ctx.fillStyle = `${C.gold}66`;
    ctx.fillRect(80, cy - 2, 1440, 4);
    ctx.textAlign = "center";
    steps.forEach((b, i) => {
      const cx = 80 + colW * (i + 0.5);
      ctx.fillStyle = C.paper;
      ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.navy;
      ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.fill();
      ctx.font = `bold 48px ${SERIF}`;
      ctx.fillStyle = C.goldLight;
      ctx.fillText(String(i + 1), cx, cy + 17);
      const [lead, rest] = splitLead(stripStepPrefix(b));
      ctx.font = `bold 32px ${SERIF}`;
      ctx.fillStyle = C.navy;
      let ty = cy + 110;
      wrapText(ctx, lead || rest, colW - 50).slice(0, 2).forEach((l) => { ctx.fillText(l, cx, ty); ty += 40; });
      if (lead) {
        ctx.font = `26px ${SANS}`;
        ctx.fillStyle = C.ink;
        wrapText(ctx, rest, colW - 50).slice(0, 3).forEach((l) => { ctx.fillText(l, cx, ty + 8); ty += 34; });
      }
    });
    ctx.textAlign = "left";
    return canvas;
  }

  if (slide.layout === "cards") {
    // ── Cards: 3–4 lead + description tiles ──
    paperChrome(ctx, C, slide, index, total);
    ctx.font = `bold 52px ${SERIF}`;
    ctx.fillStyle = C.navy;
    wrapText(ctx, slide.headline, CONTENT_TEXT_MAX_PLAIN).slice(0, 2).forEach((l, li) => ctx.fillText(l, 80, 260 + li * 66));
    const cards = slide.bullets.slice(0, 4);
    const gap = 30;
    const cw = (1440 - gap * (cards.length - 1)) / Math.max(cards.length, 1);
    cards.forEach((b, i) => {
      const x = 80 + i * (cw + gap);
      const y = 410;
      ctx.save();
      ctx.shadowColor = "rgba(18,24,38,0.15)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 2;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x, y, cw, 400);
      ctx.restore();
      ctx.fillStyle = C.gold;
      ctx.fillRect(x, y, cw, 6);
      const [lead, rest] = splitLead(b);
      ctx.font = `bold 34px ${SERIF}`;
      ctx.fillStyle = C.navy;
      let ty = y + 70;
      wrapText(ctx, lead, cw - 56).slice(0, 2).forEach((l) => { ctx.fillText(l, x + 28, ty); ty += 42; });
      ctx.font = `26px ${SANS}`;
      ctx.fillStyle = C.ink;
      ty += 12;
      wrapText(ctx, rest, cw - 56).slice(0, 7).forEach((l) => { ctx.fillText(l, x + 28, ty); ty += 36; });
    });
    return canvas;
  }

  // ── Bullets (default) ──
  paperChrome(ctx, C, slide, index, total);
  if (visual) drawCover(ctx, visual, CONTENT_IMAGE.x, CONTENT_IMAGE.y, CONTENT_IMAGE.w, CONTENT_IMAGE.h);
  const textMax = visual ? CONTENT_TEXT_MAX : CONTENT_TEXT_MAX_PLAIN;
  ctx.font = `bold 56px ${SERIF}`;
  ctx.fillStyle = C.navy;
  const headLines = wrapText(ctx, slide.headline, textMax).slice(0, 3);
  headLines.forEach((l, li) => ctx.fillText(l, 80, 260 + li * 70));
  let y = 300 + headLines.length * 70 + 40;
  ctx.font = `34px ${SANS}`;
  for (const b of slide.bullets.slice(0, 5)) {
    ctx.fillStyle = C.gold;
    ctx.fillText("•", 80, y);
    ctx.fillStyle = C.ink;
    const lines = wrapText(ctx, b, visual ? CONTENT_BULLETS_MAX : CONTENT_BULLETS_MAX_PLAIN).slice(0, 2);
    lines.forEach((l, li) => ctx.fillText(l, 130, y + li * 44));
    y += lines.length * 44 + 34;
  }
  return canvas;
}

const fileSlug = (firmName?: string | null) =>
  (firmName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface ExportArgs extends RenderOptions {
  slides: ParsedSlide[];
  opportunity?: string;
}

/** Client-side PDF: each slide rendered to canvas, one landscape page each. */
export async function buildPitchDeckPdf({ slides, audience, firmName, opportunity, theme }: ExportArgs): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "in", format: [10, 5.625] });
  for (let i = 0; i < slides.length; i++) {
    if (i > 0) doc.addPage([10, 5.625], "landscape");
    const canvas = await renderSlideToCanvas(slides[i], i, slides.length, { audience, firmName, theme });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 10, 5.625);
  }
  const slug = fileSlug(firmName);
  doc.save(slug ? `${slug}-pitch-deck.pdf` : `pitch-deck${opportunity ? "" : ""}.pdf`);
}

/** One PNG per slide (1600×900), zipped — sized for LinkedIn carousels. */
export async function downloadSlidesAsPngZip({ slides, audience, firmName, theme }: ExportArgs): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (let i = 0; i < slides.length; i++) {
    const canvas = await renderSlideToCanvas(slides[i], i, slides.length, { audience, firmName, theme });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, blob);
  }
  const out = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(out);
  const slug = fileSlug(firmName);
  a.download = slug ? `${slug}-pitch-deck-slides.zip` : "pitch-deck-slides.zip";
  a.click();
  URL.revokeObjectURL(a.href);
}
