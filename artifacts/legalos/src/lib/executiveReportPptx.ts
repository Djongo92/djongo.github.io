// §9 — Reports and exports: the Executive Report as a short PowerPoint
// deck, for a partner meeting rather than a read-alone document. Same
// brand palette / 16:9 layout convention as pitchDeckPptx.ts.
import PptxGenJS from "pptxgenjs";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/visibilityCategories";
import type { ExecutiveReportData } from "@/lib/executiveReportData";
import { computeTrendSummary } from "@/lib/executiveReportData";
import { computeMeasuredTotals, measuredExcludedNote, categoryScoreCell, pickHighestLeverageCategory, toScale500, scale500Suffix } from "@/lib/measuredScore";

const NAVY = "121826";
const GOLD = "B8893B";
const GOLD_LIGHT = "D4B279";
const INK = "222226";
const MUTED = "6E6E78";
const SERIF = "Georgia";
const SANS = "Calibri";

export async function buildExecutiveReportPptx(data: ExecutiveReportData): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "LEGALOS_16X9", width: 10, height: 5.625 });
  pptx.layout = "LEGALOS_16X9";
  pptx.author = data.firmName;
  pptx.title = `Executive Report — ${data.firmName}`;

  // ── Cover ──
  const cover = pptx.addSlide();
  cover.background = { color: NAVY };
  cover.addShape("rect", { x: 0, y: 0, w: 10, h: 0.08, fill: { color: GOLD } });
  cover.addText("EXECUTIVE REPORT", { x: 0.5, y: 0.4, w: 9, h: 0.4, fontFace: SANS, fontSize: 11, color: GOLD_LIGHT, charSpacing: 2 });
  cover.addText(data.firmName, { x: 0.5, y: 2.0, w: 9, h: 1.0, fontFace: SERIF, fontSize: 36, bold: true, color: "FFFFFF" });
  cover.addText(`${data.domain} · ${data.market}`, { x: 0.5, y: 2.9, w: 9, h: 0.5, fontFace: SANS, fontSize: 14, color: GOLD_LIGHT });
  cover.addText(`Generated ${data.generatedAt.toLocaleDateString()}`, { x: 0.5, y: 4.9, w: 9, h: 0.4, fontFace: SANS, fontSize: 11, color: "FFFFFF" });

  // ── Score overview ──
  const score = pptx.addSlide();
  score.background = { color: "FFFFFF" };
  score.addText("Market Visibility Score", { x: 0.5, y: 0.4, w: 9, h: 0.5, fontFace: SANS, fontSize: 12, color: GOLD, charSpacing: 1 });
  const measured = computeMeasuredTotals(data.categories);
  const excludedNote = measuredExcludedNote(measured);
  score.addText(`${toScale500(data.totalScore, measured.isPartial ? measured.measuredMax : 200)}`, { x: 0.5, y: 1.0, w: 4, h: 1.6, fontFace: SERIF, fontSize: 72, bold: true, color: INK });
  score.addText(scale500Suffix(measured), { x: 3.2, y: 1.9, w: 2.6, h: 0.6, fontFace: SANS, fontSize: 16, color: MUTED });
  if (data.percentile !== null) {
    score.addText(`Better than ${data.percentile}% of ${data.peerCount} peer firms in ${data.market}`, {
      x: 0.5, y: 2.7, w: 9, h: 0.5, fontFace: SANS, fontSize: 14, color: INK,
    });
  }
  if (excludedNote) {
    score.addText(excludedNote, { x: 0.5, y: 3.1, w: 9, h: 0.4, fontFace: SANS, fontSize: 10, italic: true, color: MUTED });
  }
  if (data.narrative) {
    score.addText(data.narrative, { x: 0.5, y: excludedNote ? 3.55 : 3.3, w: 9, h: excludedNote ? 1.65 : 1.9, fontFace: SANS, fontSize: 12, italic: true, color: MUTED, valign: "top" });
  }

  // ── Category breakdown ──
  const breakdown = pptx.addSlide();
  breakdown.background = { color: "FFFFFF" };
  breakdown.addText("Category Breakdown", { x: 0.5, y: 0.4, w: 9, h: 0.5, fontFace: SANS, fontSize: 12, color: GOLD, charSpacing: 1 });
  const rows: PptxGenJS.TableRow[] = [
    [
      { text: "Category", options: { bold: true, fill: { color: "F5F0E6" } } },
      { text: "Score", options: { bold: true, fill: { color: "F5F0E6" } } },
      { text: "Provenance", options: { bold: true, fill: { color: "F5F0E6" } } },
    ],
    ...CATEGORY_ORDER.map((key) => {
      const meta = CATEGORY_META[key];
      const cat = data.categories[key];
      return [
        { text: meta.label },
        { text: categoryScoreCell(cat, key) },
        { text: cat?.provenance ?? "missing" },
      ] as PptxGenJS.TableRow;
    }),
  ];
  breakdown.addTable(rows, { x: 0.5, y: 1.1, w: 9, fontFace: SANS, fontSize: 12, color: INK, border: { type: "solid", color: "DDDDDD" } });

  // ── Trend ── compact slide idiom: the shared delta line as the headline,
  // the thin-sample caveat and latest evidence as muted sub-lines — the same
  // strings the PDF/DOCX render, so no format drifts.
  const trend = computeTrendSummary(data.history);
  if (trend) {
    const trendSlide = pptx.addSlide();
    trendSlide.background = { color: "FFFFFF" };
    trendSlide.addText("TREND", { x: 0.5, y: 0.4, w: 9, h: 0.4, fontFace: SANS, fontSize: 11, color: GOLD, charSpacing: 2 });
    trendSlide.addText(trend.deltaLine, { x: 0.5, y: 1.4, w: 9, h: 0.8, fontFace: SERIF, fontSize: 26, bold: true, color: INK, valign: "top" });
    let trendY = 2.4;
    if (trend.thinSampleNote) {
      trendSlide.addText(trend.thinSampleNote, { x: 0.5, y: trendY, w: 9, h: 0.7, fontFace: SANS, fontSize: 12, italic: true, color: MUTED, valign: "top" });
      trendY += 0.8;
    }
    if (trend.evidenceLine) {
      trendSlide.addText(trend.evidenceLine, { x: 0.5, y: trendY, w: 9, h: 0.5, fontFace: SANS, fontSize: 12, color: MUTED, valign: "top" });
    }
  }

  // ── What's next ──
  const weakest = pickHighestLeverageCategory(data.categories);
  const next = pptx.addSlide();
  next.background = { color: NAVY };
  next.addText("WHAT'S NEXT", { x: 0.5, y: 0.4, w: 9, h: 0.4, fontFace: SANS, fontSize: 11, color: GOLD_LIGHT, charSpacing: 2 });
  if (weakest) {
    next.addText(`Highest-leverage focus: ${CATEGORY_META[weakest].label}`, { x: 0.5, y: 1.6, w: 9, h: 0.8, fontFace: SERIF, fontSize: 26, bold: true, color: "FFFFFF" });
    next.addText(CATEGORY_META[weakest].why, { x: 0.5, y: 2.6, w: 9, h: 1.8, fontFace: SANS, fontSize: 14, color: GOLD_LIGHT, valign: "top" });
  } else {
    next.addText("Highest-leverage focus: unavailable until at least one category is measured.", { x: 0.5, y: 1.6, w: 9, h: 0.8, fontFace: SANS, fontSize: 16, italic: true, color: GOLD_LIGHT });
  }

  await pptx.writeFile({ fileName: `${data.firmName.replace(/[^a-z0-9]+/gi, "-")}-executive-report.pptx` });
}
