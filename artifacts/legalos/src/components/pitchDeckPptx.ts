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
import type { ParsedSlide } from "./pitchDeckParser";
import {
  INCH_PER_PX, COVER_IMAGE, COVER_TEXT_MAX, SECTION_IMAGE, SECTION_TEXT_MAX,
  CONTENT_IMAGE, CONTENT_TEXT_MAX, QUOTE_SCRIM_TRANSPARENCY_PCT,
} from "./slideVisualGeometry";

// Brand palette, hex — same values as battlePlanPdf.ts's RGB tuples.
const NAVY = "121826";
const GOLD = "B8893B";
const GOLD_LIGHT = "D4B279";
const PAPER = "F8F5EE";
const INK = "222226";
const MUTED = "6E6E78";

const SERIF = "Georgia";
const SANS = "Calibri";

export interface BuildPptxArgs {
  slides: ParsedSlide[];
  audience: string;
  opportunity: string;
  firmName?: string | null;
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
  s.background = { color: PAPER };
  s.addShape("rect", { x: 0, y: 0, w: 10, h: 0.08, fill: { color: NAVY } });
  s.addShape("rect", { x: 0, y: 0.08, w: 10, h: 0.03, fill: { color: GOLD } });
  s.addText(slideNumber(i, total), { x: 0.5, y: 0.28, w: 2, h: 0.3, fontFace: SANS, fontSize: 9, color: GOLD, bold: true });
  s.addText(slide.title.toUpperCase(), { x: 0.5, y: 0.58, w: 9, h: 0.3, fontFace: SANS, fontSize: 10, color: MUTED, charSpacing: 1 });
}

function addTitleSlide(pptx: PptxGenJS, slide: ParsedSlide, args: BuildPptxArgs): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  s.addShape("rect", { x: 0, y: 0, w: 10, h: 0.09, fill: { color: GOLD } });
  const textW = slide.imageUrl ? COVER_TEXT_MAX * INCH_PER_PX : 8.9;
  if (slide.imageUrl) {
    const w = COVER_IMAGE.w * INCH_PER_PX;
    s.addImage({ data: slide.imageUrl, x: COVER_IMAGE.x * INCH_PER_PX, y: 0, w, h: 5.625, sizing: { type: "cover", w, h: 5.625 } });
  }
  s.addText((args.firmName || "UVID").toUpperCase(), {
    x: 0.55, y: 0.5, w: 9, h: 0.35, fontFace: SANS, fontSize: 11, color: GOLD_LIGHT, charSpacing: 3,
  });
  s.addText(slide.headline || slide.title, {
    x: 0.55, y: 1.6, w: textW, h: 2.2, fontFace: SERIF, fontSize: 34, bold: true, color: "FFFFFF", shrinkText: true,
  });
  if (slide.bullets.length > 0) {
    s.addText(
      slide.bullets.slice(0, 4).map((b) => ({ text: `—  ${b}`, options: { breakLine: true } })),
      { x: 0.55, y: 3.8, w: textW, h: 1.2, fontFace: SANS, fontSize: 12, color: GOLD_LIGHT, lineSpacing: 20, valign: "top" },
    );
  }
  if (args.audience) {
    s.addText(`PREPARED FOR — ${args.audience.toUpperCase()}`, {
      x: 0.55, y: 5.1, w: 9, h: 0.35, fontFace: SANS, fontSize: 10, color: "FFFFFF", charSpacing: 1,
    });
  }
  return s;
}

function addSectionSlide(pptx: PptxGenJS, slide: ParsedSlide, i: number, total: number): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  s.addText(slideNumber(i, total), { x: 0.55, y: 0.5, w: 2, h: 0.3, fontFace: SANS, fontSize: 11, color: GOLD, bold: true });
  s.addText(slide.title.toUpperCase(), { x: 0.55, y: 0.95, w: 9, h: 0.3, fontFace: SANS, fontSize: 11, color: GOLD_LIGHT, charSpacing: 2 });
  if (slide.imageUrl) {
    const w = SECTION_IMAGE.w * INCH_PER_PX;
    s.addImage({ data: slide.imageUrl, x: SECTION_IMAGE.x * INCH_PER_PX, y: 0, w, h: 5.625, sizing: { type: "cover", w, h: 5.625 } });
  }
  s.addText(slide.headline, {
    x: 0.55, y: 2.1, w: slide.imageUrl ? SECTION_TEXT_MAX * INCH_PER_PX : 8.9, h: 2.4, fontFace: SERIF, fontSize: 38, bold: true, color: "FFFFFF", shrinkText: true,
  });
  return s;
}

function addQuoteSlide(pptx: PptxGenJS, slide: ParsedSlide, i: number, total: number): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: PAPER };
  if (slide.imageUrl) {
    s.addImage({ data: slide.imageUrl, x: 0, y: 0, w: 10, h: 5.625, sizing: { type: "cover", w: 10, h: 5.625 } });
    // Paper scrim so the quote text stays readable over the image.
    s.addShape("rect", { x: 0, y: 0, w: 10, h: 5.625, fill: { color: PAPER, transparency: QUOTE_SCRIM_TRANSPARENCY_PCT } });
  }
  s.addShape("rect", { x: 0, y: 0, w: 10, h: 0.08, fill: { color: NAVY } });
  s.addShape("rect", { x: 0, y: 0.08, w: 10, h: 0.03, fill: { color: GOLD } });
  s.addText("\u201c", { x: 0.7, y: 0.4, w: 2, h: 1.8, fontFace: SERIF, fontSize: 120, color: GOLD });
  s.addText(slide.headline, {
    x: 1.1, y: 2.1, w: 7.8, h: 1.9, fontFace: SERIF, fontSize: 24, bold: true, italic: true, color: NAVY, align: "center", shrinkText: true,
  });
  if (slide.bullets.length > 0) {
    s.addText(
      slide.bullets.slice(0, 3).map((b) => ({ text: b, options: { breakLine: true } })),
      { x: 1.1, y: 4.2, w: 7.8, h: 1.1, fontFace: SANS, fontSize: 11, color: MUTED, align: "center", lineSpacing: 18, valign: "top" },
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
      x: 0.5, y: 1.0, w: textW, h: 0.9, fontFace: SERIF, fontSize: 22, bold: true, color: NAVY, shrinkText: true,
    });
  }
  if (slide.bullets.length > 0) {
    // Each bullet becomes [big gold stat run][label run], one paragraph per bullet.
    s.addText(
      slide.bullets.slice(0, 4).flatMap((b): PptxGenJS.TextProps[] => {
        const [stat, rest] = splitStat(b);
        if (!stat) return [{ text: `•  ${b}`, options: { fontFace: SANS, fontSize: 13, color: INK, breakLine: true } }];
        return [
          { text: `${stat}   `, options: { fontFace: SERIF, fontSize: 26, bold: true, color: GOLD } },
          { text: rest, options: { fontFace: SANS, fontSize: 13, color: INK, breakLine: true } },
        ];
      }),
      { x: 0.5, y: 2.1, w: textW, h: 3.2, lineSpacing: 34, valign: "top" },
    );
  }
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
      x: 0.5, y: 0.95, w: textW, h: 1.1, fontFace: SERIF, fontSize: 26, bold: true, color: NAVY, shrinkText: true,
    });
  }
  if (slide.bullets.length > 0) {
    s.addText(
      slide.bullets.map((b) => ({ text: b, options: { bullet: { code: "2022" }, breakLine: true } })),
      { x: 0.5, y: 2.15, w: textW, h: 3.0, fontFace: SANS, fontSize: 15, color: INK, lineSpacing: 28, valign: "top" },
    );
  }
  return s;
}

/** Builds the deck: exactly one PowerPoint slide per parsed slide, in order. */
export function assemblePitchDeckPptx(args: BuildPptxArgs): PptxGenJS {
  const { slides } = args;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "UVID_16X9", width: 10, height: 5.625 });
  pptx.layout = "UVID_16X9";
  pptx.author = args.firmName || "Uvid";
  pptx.title = `Pitch Deck — ${args.opportunity || args.audience}`;

  slides.forEach((slide, i) => {
    let s: PptxGenJS.Slide;
    switch (slide.layout) {
      case "title": s = addTitleSlide(pptx, slide, args); break;
      case "section": s = addSectionSlide(pptx, slide, i, slides.length); break;
      case "quote": s = addQuoteSlide(pptx, slide, i, slides.length); break;
      case "stats": s = addStatsSlide(pptx, slide, i, slides.length); break;
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
