// §9 — Reports and exports: the Executive Report as a Word document, for a
// partner who wants to annotate/redline it the way they would any other
// firm memo, rather than a locked PDF.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle,
} from "docx";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/visibilityCategories";
import type { ExecutiveReportData } from "@/lib/executiveReportData";
import { computeTrendSummary } from "@/lib/executiveReportData";
import { computeMeasuredTotals, measuredExcludedNote, categoryScoreCell, pickHighestLeverageCategory, toScale500, scale500Suffix } from "@/lib/measuredScore";

const GOLD = "B08D57";
const MUTED = "78787D";

const cell = (text: string, opts: { bold?: boolean; fill?: string } = {}) => new TableCell({
  children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
  shading: opts.fill ? { fill: opts.fill } : undefined,
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
});

export async function buildExecutiveReportDocx(data: ExecutiveReportData): Promise<void> {
  const measured = computeMeasuredTotals(data.categories);
  const excludedNote = measuredExcludedNote(measured);
  const weakest = pickHighestLeverageCategory(data.categories);
  const trend = computeTrendSummary(data.history);

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: "EXECUTIVE REPORT", bold: true, color: GOLD, size: 18 })],
        }),
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [new TextRun({ text: data.firmName })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `${data.domain} · ${data.market} · Generated ${data.generatedAt.toLocaleDateString()}`, color: MUTED, size: 20 })],
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: `${toScale500(data.totalScore, measured.isPartial ? measured.measuredMax : 200)}`, bold: true, size: 56 }),
            new TextRun({ text: ` ${scale500Suffix(measured)}`, color: MUTED, size: 24 }),
          ],
        }),
        ...(data.percentile !== null ? [new Paragraph({
          children: [new TextRun({ text: `Better than ${data.percentile}% of ${data.peerCount} peer firms in ${data.market}` })],
          spacing: { after: excludedNote ? 60 : 200 },
        })] : []),
        ...(excludedNote ? [new Paragraph({
          children: [new TextRun({ text: excludedNote, italics: true, color: MUTED, size: 18 })],
          spacing: { after: 200 },
        })] : []),

        ...(data.narrative ? [new Paragraph({
          children: [new TextRun({ text: data.narrative, italics: true, color: MUTED })],
          spacing: { after: 300 },
        })] : []),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Category Breakdown" })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
          },
          rows: [
            new TableRow({ children: [cell("Category", { bold: true, fill: "F5F0E6" }), cell("Score", { bold: true, fill: "F5F0E6" }), cell("Provenance", { bold: true, fill: "F5F0E6" })] }),
            ...CATEGORY_ORDER.map((key) => {
              const meta = CATEGORY_META[key];
              const cat = data.categories[key];
              return new TableRow({ children: [cell(meta.label), cell(categoryScoreCell(cat, key)), cell(cat?.provenance ?? "missing")] });
            }),
          ],
        }),

        // Trend — same shared summary the PDF's TREND section renders, so a
        // partner reading the Word version sees the identical delta line,
        // thin-sample caveat, and latest evidence.
        ...(trend ? [
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Trend" })], spacing: { before: 300 } }),
          new Paragraph({
            children: [new TextRun({ text: trend.deltaLine, bold: true })],
          }),
          ...(trend.thinSampleNote ? [new Paragraph({
            children: [new TextRun({ text: trend.thinSampleNote, italics: true, color: MUTED, size: 18 })],
          })] : []),
          ...(trend.evidenceLine ? [new Paragraph({
            children: [new TextRun({ text: trend.evidenceLine, italics: true, color: MUTED, size: 18 })],
          })] : []),
        ] : []),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "What's next" })], spacing: { before: 300 } }),
        ...(weakest ? [
          new Paragraph({
            children: [new TextRun({ text: `Highest-leverage focus: ${CATEGORY_META[weakest].label}`, bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: CATEGORY_META[weakest].why })],
          }),
        ] : [
          new Paragraph({
            children: [new TextRun({ text: "Highest-leverage focus: unavailable until at least one category is measured.", italics: true, color: MUTED })],
          }),
        ]),

        new Paragraph({
          children: [new TextRun({ text: "Uvid — Market Visibility Executive Report", color: MUTED, size: 16 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.firmName.replace(/[^a-z0-9]+/gi, "-")}-executive-report.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
