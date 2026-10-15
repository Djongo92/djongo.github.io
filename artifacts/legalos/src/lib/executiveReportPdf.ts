// §9 — Reports and exports: the Executive Report is its own artifact, not
// a shortened Battle Plan — a 1-2 page, board-level summary (score,
// percentile, narrative, category breakdown, what's next) rather than the
// Battle Plan's tactical, tool-by-tool document. Reuses registerFonts from
// battlePlanPdf.ts so both PDFs embed the same Cormorant Garamond/Inter
// subset instead of duplicating the font data.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerFonts } from "@/components/battlePlanPdf";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/visibilityCategories";
import type { ExecutiveReportData } from "@/lib/executiveReportData";
import { computeTrendSummary } from "@/lib/executiveReportData";
import { computeMeasuredTotals, measuredExcludedNote, categoryScoreCell, pickHighestLeverageCategory, toScale500, scale500Suffix } from "@/lib/measuredScore";

const SERIF = "PDFSerif";
const SANS = "PDFSans";
const GOLD: [number, number, number] = [176, 141, 87];
const INK: [number, number, number] = [30, 30, 32];
const MUTED: [number, number, number] = [120, 120, 125];

export function buildExecutiveReportPdf(data: ExecutiveReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  registerFonts(doc);
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 56;
  const contentW = pageW - margin * 2;

  doc.setFont(SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("EXECUTIVE REPORT", margin, 64);

  doc.setFont(SERIF, "bold");
  doc.setFontSize(26);
  doc.setTextColor(...INK);
  doc.text(data.firmName, margin, 96);

  doc.setFont(SANS, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`${data.domain} · ${data.market} · Generated ${data.generatedAt.toLocaleDateString()}`, margin, 114);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(margin, 128, pageW - margin, 128);

  const measured = computeMeasuredTotals(data.categories);

  doc.setFont(SERIF, "bold");
  doc.setFontSize(48);
  doc.setTextColor(...INK);
  doc.text(`${toScale500(data.totalScore, measured.isPartial ? measured.measuredMax : 200)}`, margin, 180);
  doc.setFont(SANS, "normal");
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text(scale500Suffix(measured), margin + 68, 180);

  if (data.percentile !== null) {
    doc.setFont(SANS, "normal");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(`Better than ${data.percentile}% of ${data.peerCount} peer firms in ${data.market}`, margin, 202);
  }

  let y = 202;
  const excludedNote = measuredExcludedNote(measured);
  if (excludedNote) {
    y += 16;
    doc.setFont(SANS, "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(excludedNote, margin, y, { maxWidth: contentW });
  }
  y += 30;
  if (data.narrative) {
    doc.setFont(SANS, "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(data.narrative, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 20;
  }

  doc.setFont(SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("CATEGORY BREAKDOWN", margin, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Category", "Score", "Provenance"]],
    body: CATEGORY_ORDER.map((key) => {
      const meta = CATEGORY_META[key];
      const cat = data.categories[key];
      return [meta.label, categoryScoreCell(cat, key), cat?.provenance ?? "missing"];
    }),
    styles: { font: SANS, fontSize: 9.5, textColor: INK },
    headStyles: { fillColor: [245, 240, 230], textColor: INK, fontStyle: "bold" },
    theme: "grid",
  });

  // deno-lint-ignore no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 24;

  const trend = computeTrendSummary(data.history);
  if (trend) {
    doc.setFont(SANS, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text("TREND", margin, y);
    y += 12;
    doc.setFont(SANS, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(trend.deltaLine, margin, y);
    y += 14;

    // Trust signals from each snapshot's frozen metadata: flag thin-peer-
    // sample points so a past dip isn't misread as a real regression, and
    // show the latest snapshot's raw evidence. Blank-free for older rows —
    // notes only appear when the data was actually recorded.
    if (trend.thinSampleNote) {
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(trend.thinSampleNote, margin, y, { maxWidth: contentW });
      y += 12;
    }
    if (trend.evidenceLine) {
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(trend.evidenceLine, margin, y, { maxWidth: contentW });
      y += 12;
    }
    y += 10;
  }

  const weakest = pickHighestLeverageCategory(data.categories);

  doc.setFont(SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("WHAT'S NEXT", margin, y);
  y += 14;
  doc.setFont(SANS, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(
    weakest
      ? `Highest-leverage focus: ${CATEGORY_META[weakest].label} — ${CATEGORY_META[weakest].why}`
      : "Highest-leverage focus: unavailable until at least one category is measured.",
    margin, y, { maxWidth: contentW },
  );

  doc.setFont(SANS, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Uvid — Market Visibility Executive Report", margin, doc.internal.pageSize.getHeight() - 30);

  doc.save(`${data.firmName.replace(/[^a-z0-9]+/gi, "-")}-executive-report.pdf`);
}
