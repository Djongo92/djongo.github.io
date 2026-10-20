// Turns a parsed pitch deck into a real, downloadable .pptx — split out of
// PitchDeck.tsx so pptxgenjs (a real dependency, not tiny) is only fetched
// when the user actually clicks Download, same dynamic-import pattern
// BattlePlan.tsx uses for jsPDF.
//
// Layout parity contract: this renders the SAME five layouts in the SAME
// order as the Deck Builder stage (pitchDeckPreview.tsx) and the PDF/PNG
// canvas export (pitchDeckExport.ts) — slide 1 IS the cover (no separate
// generic cover slide), section/quote/stats get their own treatments. The
// pure assemblePitchDeckPptx is exported separately from writeFile so tests
// can assert the slide sequence without triggering a browser download.
import PptxGenJS from "pptxgenjs";
import { paletteFor, type DeckTheme, type DeckPalette } from "@/lib/deckTheme";
import { resolveColor, isSafeImage, LINE_HEIGHT, type FreeDesign } from "@/lib/freeSlide";
import { stripStepPrefix, splitLead, type ParsedSlide } from "./pitchDeckParser";
import {
  INCH_PER_PX, COVER_IMAGE, COVER_TEXT_MAX, SECTION_IMAGE, SECTION_TEXT_MAX,
  CONTENT_IMAGE, CONTENT_TEXT_MAX, QUOTE_SCRIM_TRANSPARENCY_PCT,
} from "./slideVisualGeometry";

// Active palette — set from the deck theme at the start of assemblePitchDeckPptx.
let P: DeckPalette = paletteFor();

export interface BuildPptxArgs {
  slides: ParsedSlide[];
  audience: string;
  opportunity: string;
  firmName?: string | null;
  theme?: DeckTheme;
}

const slideNumber = (i: number, total: number) =>
  `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

/** Splits "40+ closed deals" into ["40+", "closed deals"] — mirrors the canvas/DOM stat treatment. */
function splitStat(bullet: string): [string, string] {
  const m = bullet.trim().match(/^([\d$€£%×x+~][\d.,$€£%+×x~kKmMbB]*)\s+([\s\S]*)$/);
  return m ? [m[1], m[2]] : ["", bullet];
}

/** Paper background + navy/gold top rules + slide number + section eyebrow. */
function addChrome(s: PptxGenJS.Slide, slide: ParsedSlide, i: number, total: number) {
  s.background = { color: P.hex.paper };
  if (P.rules) {
    s.addShape("rect", { x: 0, y: 0, w: 10, h: 0.08, fill: { color: P.hex.navy } });
    s.addShape("rect", { x: 0, y: 0.08, w: 10, h: 0.03, fill: { color: P.hex.gold } });
  }
  s.addText(slideNumber(i, total), { x: 0.5, y: 0.28, w: 2, h: 0.3, fontFace: P.face.sans, fontSize: 9, color: P.hex.gold, bold: true });
  s.addText(slide.title.toUpperCase(), { x: 0.5, y: 0.58, w: 9, h: 0.3, fontFace: P.face.sans, fontSize: 10, color: P.hex.muted, charSpacing: 1 });
}

function addTitleSlide(pptx: PptxGenJS, slide: ParsedSlide, args: BuildPptxArgs): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: P.hex.navy };
  s.addShape("rect", { x: 0, y: 0, w: 10, h: 0.09, fill: { color: P.hex.gold } });
  const textW = slide.imageUrl ? COVER_TEXT_MAX * INCH_PER_PX : 8.9;
  if (slide.imageUrl) {
    const w = COVER_IMAGE.w * INCH_PER_PX;
    s.addImage({ data: slide.imageUrl, x: COVER_IMAGE.x * INCH_PER_PX, y: 0, w, h: 5.625, sizing: { type: "cover", w, h: 5.625 } });
  }
  if (P.logoUrl) {
    s.addImage({ data: P.logoUrl, x: 0.55, y: 0.4, w: 2.2, h: 0.5, sizing: { type: "contain", w: 2.2, h: 0.5 } });
  } else {
    s.addText((args.firmName || "UVID").toUpperCase(), {
      x: 0.55, y: 0.5, w: 9, h: 0.35, fontFace: P.face.sans, fontSize: 11, color: P.hex.goldLight, charSpacing: 3,
    });
  }
  s.addText(slide.headline || slide.title, {
    x: 0.55, y: 1.6, w: textW, h: 2.2, fontFace: P.face.serif, fontSize: 34, bold: true, color: "FFFFFF", shrinkText: true,
  });
  if (slide.bullets.length > 0) {
    s.addText(
      slide.bullets.slice(0, 4).map((b) => ({ text: `—  ${b}`, options: { breakLine: true } })),
      { x: 0.55, y: 3.8, w: textW, h: 1.2, fontFace: P.face.sans, fontSize: 12, color: P.hex.goldLight, lineSpacing: 20, valign: "top" },
    );
  }
  if (args.audience) {
    s.addText(`PREPARED FOR — ${args.audience.toUpperCase()}`, {
      x: 0.55, y: 5.1, w: 9, h: 0.35, fontFace: P.face.sans, fontSize: 10, color: "FFFFFF", charSpacing: 1,
    });
  }
  return s;
}

function addSectionSlide(pptx: PptxGenJS, slide: ParsedSlide, i: number, total: number): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: P.hex.navy };
  s.addText(slideNumber(i, total), { x: 0.55, y: 0.5, w: 2, h: 0.3, fontFace: P.face.sans, fontSize: 11, color: P.hex.gold, bold: true });
  s.addText(slide.title.toUpperCase(), { x: 0.55, y: 0.95, w: 9, h: 0.3, fontFace: P.face.sans, fontSize: 11, color: P.hex.goldLight, charSpacing: 2 });
  if (slide.imageUrl) {
    const w = SECTION_IMAGE.w * INCH_PER_PX;
    s.addImage({ data: slide.imageUrl, x: SECTION_IMAGE.x * INCH_PER_PX, y: 0, w, h: 5.625, sizing: { type: "cover", w, h: 5.625 } });
  }
  s.addText(slide.headline, {
    x: 0.55, y: 2.1, w: slide.imageUrl ? SECTION_TEXT_MAX * INCH_PER_PX : 8.9, h: 2.4, fontFace: P.face.serif, fontSize: 38, bold: true, color: "FFFFFF", shrinkText: true,
  });
  return s;
}

function addQuoteSlide(pptx: PptxGenJS, slide: ParsedSlide, i: number, total: number): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: P.hex.paper };
  if (slide.imageUrl) {
    s.addImage({ data: slide.imageUrl, x: 0, y: 0, w: 10, h: 5.625, sizing: { type: "cover", w: 10, h: 5.625 } });
    // Paper scrim so the quote text stays readable over the image.
    s.addShape("rect", { x: 0, y: 0, w: 10, h: 5.625, fill: { color: P.hex.paper, transparency: QUOTE_SCRIM_TRANSPARENCY_PCT } });
  }
  if (P.rules) {
    s.addShape("rect", { x: 0, y: 0, w: 10, h: 0.08, fill: { color: P.hex.navy } });
    s.addShape("rect", { x: 0, y: 0.08, w: 10, h: 0.03, fill: { color: P.hex.gold } });
  }
  s.addText("\u201c", { x: 0.7, y: 0.4, w: 2, h: 1.8, fontFace: P.face.serif, fontSize: 120, color: P.hex.gold });
  s.addText(slide.headline, {
    x: 1.1, y: 2.1, w: 7.8, h: 1.9, fontFace: P.face.serif, fontSize: 24, bold: true, italic: true, color: P.hex.navy, align: "center", shrinkText: true,
  });
  if (slide.bullets.length > 0) {
    s.addText(
      slide.bullets.slice(0, 3).map((b) => ({ text: b, options: { breakLine: true } })),
      { x: 1.1, y: 4.2, w: 7.8, h: 1.1, fontFace: P.face.sans, fontSize: 11, color: P.hex.muted, align: "center", lineSpacing: 18, valign: "top" },
    );
  }
  void i; void total;
  return s;
}

function addStatsSlide(pptx: PptxGenJS, slide: ParsedSlide, i: number, total: number): PptxGenJS.Slide {
  const s = pptx.addSlide();
  addChrome(s, slide, i, total);
  const textW = slide.imageUrl ? CONTENT_TEXT_MAX * INCH_PER_PX : 9;
  if (slide.imageUrl) {
    const w = CONTENT_IMAGE.w * INCH_PER_PX;
    const h = CONTENT_IMAGE.h * INCH_PER_PX;
    s.addImage({ data: slide.imageUrl, x: CONTENT_IMAGE.x * INCH_PER_PX, y: CONTENT_IMAGE.y * INCH_PER_PX, w, h, sizing: { type: "cover", w, h } });
  }
  if (slide.headline) {
    s.addText(slide.headline, {
      x: 0.5, y: 1.0, w: textW, h: 0.9, fontFace: P.face.serif, fontSize: 22, bold: true, color: P.hex.navy, shrinkText: true,
    });
  }
  if (slide.bullets.length > 0) {
    // Each bullet becomes [big gold stat run][label run], one paragraph per bullet.
    s.addText(
      slide.bullets.slice(0, 4).flatMap((b): PptxGenJS.TextProps[] => {
        const [stat, rest] = splitStat(b);
        if (!stat) return [{ text: `•  ${b}`, options: { fontFace: P.face.sans, fontSize: 13, color: P.hex.ink, breakLine: true } }];
        return [
          { text: `${stat}   `, options: { fontFace: P.face.serif, fontSize: 26, bold: true, color: P.hex.gold } },
          { text: rest, options: { fontFace: P.face.sans, fontSize: 13, color: P.hex.ink, breakLine: true } },
        ];
      }),
      { x: 0.5, y: 2.1, w: textW, h: 3.2, lineSpacing: 34, valign: "top" },
    );
  }
  return s;
}

/** Free-form slide → native, editable PowerPoint objects (px / 160 = inches; px × 0.45 = pt). */
function addFreeSlide(pptx: PptxGenJS, free: FreeDesign): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: resolveColor(free.bg, P).slice(1) };
  const inch = (v: number) => v / 160;
  for (const it of free.items) {
    const pos = { x: inch(it.x), y: inch(it.y), w: inch(it.w), h: inch(it.h) };
    if (it.kind === "shape") {
      const kind = it.shape === "ellipse" ? "ellipse" : it.shape === "round" ? "roundRect" : "rect";
      s.addShape(kind, { ...pos, fill: { color: resolveColor(it.fill, P).slice(1) }, ...(kind === "roundRect" ? { rectRadius: 0.15 } : {}) });
    } else if (it.kind === "image") {
      if (!isSafeImage(it.src)) continue;
      s.addImage({ data: it.src!, ...pos, rounding: !!it.round, sizing: { type: "cover", w: pos.w, h: pos.h } });
    } else {
      s.addText(it.text ?? "", {
        ...pos,
        fontFace: it.font === "serif" ? P.face.serif : P.face.sans,
        fontSize: Math.max(6, Math.round((it.fontSize ?? 32) * 0.45 * 10) / 10),
        bold: !!it.bold,
        italic: !!it.italic,
        color: resolveColor(it.color, P).slice(1),
        align: it.align ?? "left",
        valign: "top",
        margin: 0,
        lineSpacingMultiple: LINE_HEIGHT * 0.95,
      });
    }
  }
  return s;
}

function addSplitSlide(pptx: PptxGenJS, slide: ParsedSlide, i: number, total: number): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: P.hex.paper };
  s.addShape("rect", { x: 0, y: 0, w: 5, h: 5.625, fill: { color: P.hex.navy } });
  s.addShape("rect", { x: 0, y: 0, w: 5, h: 0.06, fill: { color: P.hex.gold } });
  s.addText(slide.title.toUpperCase(), { x: 0.5, y: 0.45, w: 4.2, h: 0.3, fontFace: P.face.sans, fontSize: 10, color: P.hex.goldLight, charSpacing: 2 });
  s.addText(slide.headline, { x: 0.5, y: 1.2, w: 4.1, h: 3.4, fontFace: P.face.serif, fontSize: 28, bold: true, color: "FFFFFF", valign: "top", shrinkText: true });
  s.addText(slideNumber(i, total), { x: 0.5, y: 5.1, w: 2, h: 0.3, fontFace: P.face.sans, fontSize: 9, color: P.hex.gold, bold: true });
  if (slide.imageUrl) {
    s.addImage({ data: slide.imageUrl, x: 5, y: 0, w: 5, h: 5.625, sizing: { type: "cover", w: 5, h: 5.625 } });
  } else if (slide.bullets.length > 0) {
    s.addText(
      slide.bullets.slice(0, 5).map((b) => ({ text: b, options: { bullet: { code: "2022" }, breakLine: true } })),
      { x: 5.5, y: 1.0, w: 4, h: 3.8, fontFace: P.face.sans, fontSize: 15, color: P.hex.ink, lineSpacing: 26, valign: "top" },
    );
  }
  return s;
}

function addProcessSlide(pptx: PptxGenJS, slide: ParsedSlide, i: number, total: number): PptxGenJS.Slide {
  const s = pptx.addSlide();
  addChrome(s, slide, i, total);
  if (slide.headline) {
    s.addText(slide.headline, { x: 0.5, y: 0.95, w: 9, h: 1.1, fontFace: P.face.serif, fontSize: 26, bold: true, color: P.hex.navy, shrinkText: true });
  }
  const steps = slide.bullets.slice(0, 5);
  const colW = 9 / Math.max(steps.length, 1);
  const cy = 3.15;
  s.addShape("rect", { x: 0.5, y: cy - 0.01, w: 9, h: 0.02, fill: { color: P.hex.gold, transparency: 60 } });
  steps.forEach((b, k) => {
    const cx = 0.5 + colW * (k + 0.5);
    s.addShape("ellipse", { x: cx - 0.33, y: cy - 0.33, w: 0.66, h: 0.66, fill: { color: P.hex.navy }, line: { color: P.hex.paper, width: 3 } });
    const stepImg = slide.itemImages?.[k];
    if (isSafeImage(stepImg)) {
      s.addImage({ data: stepImg!, x: cx - 0.33, y: cy - 0.33, w: 0.66, h: 0.66, rounding: true, sizing: { type: "cover", w: 0.66, h: 0.66 } });
    } else {
      s.addText(String(k + 1), { x: cx - 0.33, y: cy - 0.33, w: 0.66, h: 0.66, align: "center", valign: "middle", fontFace: P.face.serif, fontSize: 20, bold: true, color: P.hex.goldLight });
    }
    const [lead, rest] = splitLead(stripStepPrefix(b));
    const runs: PptxGenJS.TextProps[] = lead
      ? [
          { text: lead, options: { fontFace: P.face.serif, fontSize: 13, bold: true, color: P.hex.navy, breakLine: true } },
          { text: rest, options: { fontFace: P.face.sans, fontSize: 11, color: P.hex.ink } },
        ]
      : [{ text: rest, options: { fontFace: P.face.serif, fontSize: 13, bold: true, color: P.hex.navy } }];
    s.addText(runs, { x: cx - colW / 2 + 0.08, y: cy + 0.5, w: colW - 0.16, h: 1.6, align: "center", valign: "top" });
  });
  return s;
}

function addCardsSlide(pptx: PptxGenJS, slide: ParsedSlide, i: number, total: number): PptxGenJS.Slide {
  const s = pptx.addSlide();
  addChrome(s, slide, i, total);
  if (slide.headline) {
    s.addText(slide.headline, { x: 0.5, y: 0.95, w: 9, h: 1.1, fontFace: P.face.serif, fontSize: 26, bold: true, color: P.hex.navy, shrinkText: true });
  }
  const cards = slide.bullets.slice(0, 4);
  const gap = 0.2;
  const cw = (9 - gap * (cards.length - 1)) / Math.max(cards.length, 1);
  cards.forEach((b, k) => {
    const x = 0.5 + k * (cw + gap);
    s.addShape(P.radius ? "roundRect" : "rect", { x, y: 2.3, w: cw, h: 2.7, fill: { color: "FFFFFF" }, line: { color: "E4DFD3", width: 0.75 }, ...(P.radius ? { rectRadius: 0.1 } : {}) });
    if (!P.radius) s.addShape("rect", { x, y: 2.3, w: cw, h: 0.04, fill: { color: P.hex.gold } });
    const cardImg = slide.itemImages?.[k];
    const hasImg = isSafeImage(cardImg);
    if (hasImg) s.addImage({ data: cardImg!, x: x + 0.02, y: 2.34, w: cw - 0.04, h: 0.95, sizing: { type: "cover", w: cw - 0.04, h: 0.95 } });
    const [lead, rest] = splitLead(b);
    s.addText(
      [
        { text: lead, options: { fontFace: P.face.serif, fontSize: 15, bold: true, color: P.hex.navy, breakLine: true } },
        { text: rest, options: { fontFace: P.face.sans, fontSize: 11.5, color: P.hex.ink } },
      ],
      { x: x + 0.15, y: hasImg ? 3.4 : 2.45, w: cw - 0.3, h: hasImg ? 1.55 : 2.45, valign: "top", paraSpaceAfter: 6 },
    );
  });
  return s;
}

function addBulletsSlide(pptx: PptxGenJS, slide: ParsedSlide, i: number, total: number): PptxGenJS.Slide {
  const s = pptx.addSlide();
  addChrome(s, slide, i, total);
  const textW = slide.imageUrl ? CONTENT_TEXT_MAX * INCH_PER_PX : 9;
  if (slide.imageUrl) {
    const w = CONTENT_IMAGE.w * INCH_PER_PX;
    const h = CONTENT_IMAGE.h * INCH_PER_PX;
    s.addImage({ data: slide.imageUrl, x: CONTENT_IMAGE.x * INCH_PER_PX, y: CONTENT_IMAGE.y * INCH_PER_PX, w, h, sizing: { type: "cover", w, h } });
  }
  if (slide.headline) {
    s.addText(slide.headline, {
      x: 0.5, y: 0.95, w: textW, h: 1.1, fontFace: P.face.serif, fontSize: 26, bold: true, color: P.hex.navy, shrinkText: true,
    });
  }
  if (slide.bullets.length > 0) {
    s.addText(
      slide.bullets.map((b) => ({ text: b, options: { bullet: { code: "2022" }, breakLine: true } })),
      { x: 0.5, y: 2.15, w: textW, h: 3.0, fontFace: P.face.sans, fontSize: 15, color: P.hex.ink, lineSpacing: 28, valign: "top" },
    );
  }
  return s;
}

/** Builds the deck: exactly one PowerPoint slide per parsed slide, in order. */
export function assemblePitchDeckPptx(args: BuildPptxArgs): PptxGenJS {
  const { slides } = args;
  P = paletteFor(args.theme);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "UVID_16X9", width: 10, height: 5.625 });
  pptx.layout = "UVID_16X9";
  pptx.author = args.firmName || "Uvid";
  pptx.title = `Pitch Deck — ${args.opportunity || args.audience}`;

  slides.forEach((slide, i) => {
    let s: PptxGenJS.Slide;
    if (slide.free) {
      s = addFreeSlide(pptx, slide.free);
      if (slide.notes) s.addNotes(slide.notes);
      return;
    }
    switch (slide.layout) {
      case "title": s = addTitleSlide(pptx, slide, args); break;
      case "section": s = addSectionSlide(pptx, slide, i, slides.length); break;
      case "quote": s = addQuoteSlide(pptx, slide, i, slides.length); break;
      case "stats": s = addStatsSlide(pptx, slide, i, slides.length); break;
      case "split": s = addSplitSlide(pptx, slide, i, slides.length); break;
      case "process": s = addProcessSlide(pptx, slide, i, slides.length); break;
      case "cards": s = addCardsSlide(pptx, slide, i, slides.length); break;
      default: s = addBulletsSlide(pptx, slide, i, slides.length); break;
    }
    if (slide.notes) s.addNotes(slide.notes);
  });
  return pptx;
}

export async function buildPitchDeckPptx(args: BuildPptxArgs): Promise<void> {
  const pptx = assemblePitchDeckPptx(args);
  const slug = (args.firmName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fileName = slug ? `${slug}-pitch-deck.pptx` : "pitch-deck.pptx";
  await pptx.writeFile({ fileName });
}
