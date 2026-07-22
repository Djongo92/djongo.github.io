// Turns a parsed pitch deck into a real, downloadable .pptx — split out of
// PitchDeck.tsx so pptxgenjs (a real dependency, not tiny) is only fetched
// when the user actually clicks Download, same dynamic-import pattern
// BattlePlan.tsx uses for jsPDF.
import PptxGenJS from "pptxgenjs";
import type { ParsedSlide } from "./pitchDeckParser";

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

export async function buildPitchDeckPptx({ slides, audience, opportunity, firmName }: BuildPptxArgs): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "LEGALOS_16X9", width: 10, height: 5.625 });
  pptx.layout = "LEGALOS_16X9";
  pptx.author = firmName || "LegalOS";
  pptx.title = `Pitch Deck — ${opportunity || audience}`;

  // ── Cover slide ──
  const cover = pptx.addSlide();
  cover.background = { color: NAVY };
  cover.addShape("rect", { x: 0, y: 0, w: 10, h: 0.08, fill: { color: GOLD } });
  cover.addText(firmName || "LegalOS", {
    x: 0.5, y: 0.4, w: 9, h: 0.4, fontFace: SANS, fontSize: 11, color: GOLD_LIGHT, charSpacing: 2,
  });
  cover.addText("New Business Pitch", {
    x: 0.5, y: 2.0, w: 9, h: 1.0, fontFace: SERIF, fontSize: 40, bold: true, color: "FFFFFF",
  });
  cover.addText(opportunity || "Opportunity", {
    x: 0.5, y: 2.9, w: 9, h: 0.6, fontFace: SERIF, fontSize: 18, italic: true, color: GOLD_LIGHT,
  });
  cover.addText(`Prepared for: ${audience}`, {
    x: 0.5, y: 4.9, w: 9, h: 0.4, fontFace: SANS, fontSize: 12, color: "FFFFFF",
  });

  // ── Content slides ──
  slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    s.background = { color: PAPER };
    s.addShape("rect", { x: 0, y: 0, w: 10, h: 0.06, fill: { color: NAVY } });
    s.addShape("rect", { x: 0, y: 0.06, w: 10, h: 0.02, fill: { color: GOLD } });

    s.addText(`${String(i + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`, {
      x: 0.5, y: 0.25, w: 2, h: 0.3, fontFace: SANS, fontSize: 9, color: GOLD, bold: true,
    });
    s.addText(slide.title.toUpperCase(), {
      x: 0.5, y: 0.55, w: 9, h: 0.3, fontFace: SANS, fontSize: 10, color: MUTED, charSpacing: 1,
    });

    if (slide.headline) {
      s.addText(slide.headline, {
        x: 0.5, y: 0.95, w: 9, h: 1.1, fontFace: SERIF, fontSize: 26, bold: true, color: NAVY,
        shrinkText: true,
      });
    }

    if (slide.bullets.length > 0) {
      s.addText(
        slide.bullets.map((b) => ({ text: b, options: { bullet: { code: "2022" }, breakLine: true } })),
        { x: 0.5, y: 2.15, w: 9, h: 3.0, fontFace: SANS, fontSize: 15, color: INK, lineSpacing: 28, valign: "top" },
      );
    }

    if (slide.notes) s.addNotes(slide.notes);
  });

  const fileName = `${(firmName || "pitch-deck").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-pitch-deck.pptx`;
  await pptx.writeFile({ fileName });
}
