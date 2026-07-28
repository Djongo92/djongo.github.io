// §9 — Reports and exports: the Executive Report as a Word document, for a
// partner who wants to annotate/redline it the way they would any other
// firm memo, rather than a locked PDF.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle,
} from "docx";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/visibilityCategories";
import type { ExecutiveReportData } from "@/lib/executiveReportData";

const GOLD = "B08D57";
const MUTED = "78787D";

const cell = (text: string, opts: { bold?: boolean; fill?: string } = {}) => new TableCell({
  children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
  shading: opts.fill ? { fill: opts.fill } : undefined,
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
});

export async function buildExecutiveReportDocx(data: ExecutiveReportData): Promise<void> {
  const weakest = [...CATEGORY_ORDER].sort((a, b) => {
    const aPct = (data.categories[a]?.score ?? 0) / CATEGORY_META[a].max;
    const bPct = (data.categories[b]?.score ?? 0) / CATEGORY_META[b].max;
    return aPct - bPct;
  })[0];

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
            new TextRun({ text: `${Math.round(data.totalScore)}`, bold: true, size: 56 }),
            new TextRun({ text: " / 200", color: MUTED, size: 24 }),
          ],
        }),
        ...(data.percentile !== null ? [new Paragraph({
          children: [new TextRun({ text: `Better than ${data.percentile}% of ${data.peerCount} peer firms in ${data.market}` })],
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
              return new TableRow({ children: [cell(meta.label), cell(`${Math.round((cat?.score ?? 0) * 10) / 10} / ${meta.max}`), cell(cat?.provenance ?? "missing")] });
            }),
          ],
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "What's next" })], spacing: { before: 300 } }),
        new Paragraph({
          children: [new TextRun({ text: `Highest-leverage focus: ${CATEGORY_META[weakest].label}`, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: CATEGORY_META[weakest].why })],
        }),

        new Paragraph({
          children: [new TextRun({ text: "LegalOS — Market Visibility Executive Report", color: MUTED, size: 16 })],
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
