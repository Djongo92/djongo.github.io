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

  doc.setFont(SERIF, "bold");
  doc.setFontSize(48);
  doc.setTextColor(...INK);
  doc.text(`${Math.round(data.totalScore)}`, margin, 180);
  doc.setFont(SANS, "normal");
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text("/ 200", margin + 68, 180);

  if (data.percentile !== null) {
    doc.setFont(SANS, "normal");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(`Better than ${data.percentile}% of ${data.peerCount} peer firms in ${data.market}`, margin, 202);
  }

  let y = 232;
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
      return [meta.label, `${Math.round((cat?.score ?? 0) * 10) / 10} / ${meta.max}`, cat?.provenance ?? "missing"];
    }),
    styles: { font: SANS, fontSize: 9.5, textColor: INK },
    headStyles: { fillColor: [245, 240, 230], textColor: INK, fontStyle: "bold" },
    theme: "grid",
  });

  // deno-lint-ignore no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 24;

  if (data.history.length > 1) {
    doc.setFont(SANS, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text("TREND", margin, y);
    y += 12;
    const first = data.history[0];
    const last = data.history[data.history.length - 1];
    const delta = Math.round((last.totalScore - first.totalScore) * 10) / 10;
    doc.setFont(SANS, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(
      `${delta >= 0 ? "+" : ""}${delta} points since ${new Date(first.recordedAt).toLocaleDateString()} (${data.history.length} measurements)`,
      margin, y,
    );
    y += 24;
  }

  const weakest = [...CATEGORY_ORDER].sort((a, b) => {
    const aPct = (data.categories[a]?.score ?? 0) / CATEGORY_META[a].max;
    const bPct = (data.categories[b]?.score ?? 0) / CATEGORY_META[b].max;
    return aPct - bPct;
  })[0];

  doc.setFont(SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("WHAT'S NEXT", margin, y);
  y += 14;
  doc.setFont(SANS, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(`Highest-leverage focus: ${CATEGORY_META[weakest].label} — ${CATEGORY_META[weakest].why}`, margin, y, { maxWidth: contentW });

  doc.setFont(SANS, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("LegalOS — Market Visibility Executive Report", margin, doc.internal.pageSize.getHeight() - 30);

  doc.save(`${data.firmName.replace(/[^a-z0-9]+/gi, "-")}-executive-report.pdf`);
}
