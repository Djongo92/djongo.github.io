// Battle Plan PDF assembly — split out of BattlePlan.tsx so jspdf/
// jspdf-autotable are only fetched when the user actually clicks Generate
// (dynamic import in BattlePlan.tsx), instead of sitting in the main
// bundle for every visitor.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { useBattlePlanCache } from "@/hooks/useBattlePlanCache";
import { SERIF_REGULAR, SERIF_BOLD, SERIF_ITALIC, SANS_REGULAR, SANS_BOLD, SANS_ITALIC } from "./pdfFonts";
import { CATEGORY_META, CATEGORY_ORDER, PROVENANCE_META, type CategoryKey, type Provenance } from "@/lib/visibilityCategories";

const titleCase = (s: string) => s.length ? s[0].toUpperCase() + s.slice(1) : s;

// jsPDF's built-in "times"/"helvetica" fonts only support WinAnsi encoding
// — no Latin Extended-A, so any firm or attorney name with a Balkan/CEE
// diacritic (Petrović, Đorđević, Nikšić — exactly the pilot market this
// product targets) silently loses the accented letter. Embedding the
// app's own brand fonts (Cormorant Garamond / Inter, subsetted to Latin +
// Latin Extended-A/B + general punctuation — see pdfFonts.ts) fixes that
// and makes the PDF typographically match the web app instead of reading
// as a generic report.
const SERIF = "PDFSerif";
const SANS = "PDFSans";

function registerFonts(doc: jsPDF) {
  doc.addFileToVFS("CormorantGaramond-Regular.ttf", SERIF_REGULAR);
  doc.addFont("CormorantGaramond-Regular.ttf", SERIF, "normal");
  doc.addFileToVFS("CormorantGaramond-Bold.ttf", SERIF_BOLD);
  doc.addFont("CormorantGaramond-Bold.ttf", SERIF, "bold");
  doc.addFileToVFS("CormorantGaramond-Italic.ttf", SERIF_ITALIC);
  doc.addFont("CormorantGaramond-Italic.ttf", SERIF, "italic");
  doc.addFileToVFS("Inter-Regular.ttf", SANS_REGULAR);
  doc.addFont("Inter-Regular.ttf", SANS, "normal");
  doc.addFileToVFS("Inter-Bold.ttf", SANS_BOLD);
  doc.addFont("Inter-Bold.ttf", SANS, "bold");
  doc.addFileToVFS("Inter-Italic.ttf", SANS_ITALIC);
  doc.addFont("Inter-Italic.ttf", SANS, "italic");
}

// Brand palette (RGB tuples) — pulled from index.css gold + navy tokens.
const NAVY: [number, number, number] = [18, 24, 38];
const GOLD: [number, number, number] = [184, 137, 59];
const GOLD_LIGHT: [number, number, number] = [212, 178, 121];
const PAPER: [number, number, number] = [248, 245, 238];
const INK: [number, number, number] = [34, 34, 38];
const MUTED: [number, number, number] = [110, 110, 120];
const RED: [number, number, number] = [192, 60, 60];
const RULE: [number, number, number] = [220, 215, 205];
const GREEN: [number, number, number] = [16, 150, 105]; // emerald — matches the Market Visibility Score's "Verified" accent

interface TocEntry {
  label: string;
  tag?: string;
  tagColor: [number, number, number];
  page: number;
}

export interface BuildArgs {
  roast: ReturnType<typeof useBattlePlanCache>["roast"];
  competitor: ReturnType<typeof useBattlePlanCache>["competitor"];
  roadmap: ReturnType<typeof useBattlePlanCache>["roadmap"];
  maturity: ReturnType<typeof useBattlePlanCache>["maturity"];
  headline: ReturnType<typeof useBattlePlanCache>["headline"];
  bio: ReturnType<typeof useBattlePlanCache>["bio"];
  visibilityScore: ReturnType<typeof useBattlePlanCache>["visibilityScore"];
  context: { practiceArea: string; firmSize: string; primaryGoal: string } | null;
  readChaptersCount: number;
  totalChapters: number;
  implementationScore: number;
  logoDataUrl?: string | null;
}

export function buildPdf({ roast, competitor, roadmap, maturity, headline, bio, visibilityScore, context, readChaptersCount, totalChapters, implementationScore, logoDataUrl }: BuildArgs) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  registerFonts(doc);
  doc.setFont(SANS, "normal");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // ── Cover page ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, pageH, "F");

  // Faint concentric-ring motif, echoing the same geometric language as
  // the in-app FirmCrest mark — gives the cover real depth instead of a
  // flat fill, without competing with the title for attention. Uses
  // pre-blended navy/gold solids rather than jsPDF's ExtGState opacity —
  // that API renders inconsistently (fully opaque in some renderers), so
  // a real low-contrast color is the only reliable way to get "faint"
  // here across every PDF viewer.
  [[31, 33, 40], [26, 29, 39], [23, 27, 39]].forEach((rgb, i) => {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(1.5);
    doc.circle(pageW - 40, pageH * 0.32, 90 + i * 70, "S");
  });

  // gold rule top
  doc.setFillColor(...GOLD);
  doc.rect(margin, margin, 80, 3, "F");

  if (logoDataUrl) {
    try {
      const logoSize = 36;
      doc.addImage(logoDataUrl, "PNG", pageW - margin - logoSize, margin, logoSize, logoSize);
    } catch {
      // A corrupt/unsupported data URL shouldn't sink the whole PDF — the cover just renders without it.
    }
  }

  doc.setTextColor(...GOLD_LIGHT);
  doc.setFont(SANS, "normal");
  doc.setFontSize(9);
  doc.text("LEGALOS", margin, margin + 24);

  const firmName = visibilityScore?.displayName || visibilityScore?.auditedDomain;
  if (firmName) {
    doc.setFont(SANS, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GOLD_LIGHT);
    doc.text(firmName, pageW - margin, margin + 24, { align: "right" });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont(SERIF, "normal");
  doc.setFontSize(46);
  doc.text("Battle Plan", margin, margin + 110);

  doc.setFontSize(16);
  doc.setTextColor(...GOLD_LIGHT);
  doc.setFont(SERIF, "italic");
  const subtitle = context
    ? `Personalised for a ${context.practiceArea} firm · ${context.firmSize}`
    : "A strategic marketing intervention";
  doc.text(subtitle, margin, margin + 138);

  if (context) {
    doc.setFontSize(11);
    doc.setFont(SANS, "normal");
    doc.setTextColor(220, 215, 200);
    const goal = doc.splitTextToSize(`Primary goal: ${context.primaryGoal}`, contentW);
    doc.text(goal, margin, margin + 162);
  }

  // Verified Visibility Score badge — the flagship, externally-sourced
  // number gets top billing on the cover itself, not just a buried table
  // row, since it's the one score here that isn't an LLM's opinion.
  if (visibilityScore) {
    const badgeY = margin + 186;
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(1);
    doc.roundedRect(margin, badgeY, 190, 40, 4, 4, "S");
    doc.setFont(SERIF, "bold");
    doc.setFontSize(22);
    doc.setTextColor(...GREEN);
    doc.text(`${Math.round(visibilityScore.totalScore)}`, margin + 12, badgeY + 27);
    doc.setFont(SANS, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD_LIGHT);
    doc.text("/200", margin + 40, badgeY + 27);
    doc.setFontSize(8);
    doc.setFont(SANS, "bold");
    doc.setTextColor(...GREEN);
    const badgeLabel = visibilityScore.percentile !== null
      ? `TOP ${100 - visibilityScore.percentile}% · VERIFIED VISIBILITY SCORE`
      : "VERIFIED VISIBILITY SCORE";
    const badgeLines = doc.splitTextToSize(badgeLabel, 128);
    doc.text(badgeLines, margin + 62, badgeY + (badgeLines.length > 1 ? 14 : 20));
  }

  // Big stat blocks
  const statY = pageH / 2 + 20;
  drawStat(doc, margin, statY, "READING PROGRESS", `${readChaptersCount}/${totalChapters}`, `chapters absorbed`);
  drawStat(doc, margin + (contentW / 3), statY, "IMPLEMENTATION", `${implementationScore}%`, `actions executed`);
  const allInputs = [roast, competitor, roadmap, maturity, headline, bio, visibilityScore];
  const inputsCount = allInputs.filter(Boolean).length;
  drawStat(doc, margin + (contentW / 3) * 2, statY, "ANALYSES RUN", `${inputsCount}/${allInputs.length}`, `intelligence gathered`);

  // Footer on cover
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.setFontSize(8);
  doc.setTextColor(...GOLD_LIGHT);
  doc.setFont(SANS, "normal");
  doc.text("PREPARED", margin, pageH - margin - 32);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(today, margin, pageH - margin - 18);

  doc.setTextColor(...GOLD_LIGHT);
  doc.setFontSize(8);
  doc.text("CONFIDENTIAL · FOR INTERNAL USE", pageW - margin, pageH - margin - 18, { align: "right" });

  // ── Subsequent pages ──
  // Recorded as each section header is drawn (drawSectionHeader pushes to
  // this), then rendered onto a Table of Contents page inserted after the
  // fact — real pagination, not a page-number guess made before the
  // content that determines it actually exists.
  const toc: TocEntry[] = [];
  let cursor = startPage(doc);

  // Executive summary box (always rendered) — leads with the one number
  // in this whole document that isn't an LLM's opinion, when there is one.
  cursor = drawSectionHeader(doc, "Executive Summary", cursor, toc);
  const summaryLines: string[] = [];
  if (visibilityScore) {
    const peerLine = visibilityScore.percentile !== null
      ? ` — better than ${visibilityScore.percentile}% of ${visibilityScore.peerCount} peer firms in ${titleCase(visibilityScore.market)}`
      : "";
    summaryLines.push(
      `${firmName ?? "This firm"} scores ${Math.round(visibilityScore.totalScore)} out of 200 on an externally verified Market Visibility Score${peerLine}.`
    );
  }
  if (competitor) summaryLines.push(competitor.executiveSummary);
  if (roast) summaryLines.push(`Homepage assessment: Grade ${roast.grade}. "${roast.verdict}"`);
  if (roadmap) summaryLines.push(roadmap.summary);
  if (summaryLines.length === 0) summaryLines.push("Run an analysis from the dashboard to populate this section.");
  cursor = drawParagraph(doc, summaryLines.join("\n\n"), cursor, contentW, margin);
  cursor += 14;

  // ── Roast section ──
  if (roast) {
    cursor = ensureSpace(doc, cursor, 140);
    cursor = drawSectionHeader(doc, "Homepage Diagnosis", cursor, toc, "AI-assisted", GOLD);

    // Grade badge
    doc.setFillColor(...gradeColor(roast.grade));
    doc.roundedRect(margin, cursor, 56, 56, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(SERIF, "bold");
    doc.setFontSize(36);
    doc.text(roast.grade, margin + 28, cursor + 38, { align: "center" });

    // Verdict beside it
    doc.setTextColor(...INK);
    doc.setFont(SERIF, "italic");
    doc.setFontSize(14);
    const verdictLines = doc.splitTextToSize(`"${roast.verdict}"`, contentW - 72);
    doc.text(verdictLines, margin + 72, cursor + 18);
    doc.setFont(SANS, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(roast.url, margin + 72, cursor + 18 + verdictLines.length * 16 + 4);
    cursor += Math.max(64, 28 + verdictLines.length * 16) + 12;

    // The burn
    cursor = drawCallout(doc, "THE BURN", roast.burn, cursor, contentW, margin, RED);

    // Top 3 fixes
    cursor = ensureSpace(doc, cursor, 90);
    cursor = drawSubheader(doc, "Top 3 Fixes — In Order", cursor);
    roast.topThreeFixes.slice(0, 3).forEach((fix, i) => {
      cursor = drawNumberedItem(doc, i + 1, fix, cursor, contentW, margin);
    });
    cursor += 8;
  }

  // ── Competitor section ──
  if (competitor) {
    cursor = ensureSpace(doc, cursor, 160);
    cursor = drawSectionHeader(doc, "Competitive Position", cursor, toc, "AI-assisted", GOLD);

    cursor = drawSubheader(doc, "Where you stand", cursor);
    cursor = drawParagraph(doc, competitor.yourPositioning.summary, cursor, contentW, margin);
    cursor += 8;

    // Two-column strengths/weaknesses table
    autoTable(doc, {
      startY: cursor,
      margin: { left: margin, right: margin },
      head: [["Strengths", "Weaknesses"]],
      body: [[
        competitor.yourPositioning.strengths.map((s) => `• ${s}`).join("\n") || "—",
        competitor.yourPositioning.weaknesses.map((s) => `• ${s}`).join("\n") || "—",
      ]],
      headStyles: { fillColor: NAVY, textColor: GOLD_LIGHT, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: INK, valign: "top", cellPadding: 8 },
      alternateRowStyles: {},
      columnStyles: { 0: { cellWidth: contentW / 2 }, 1: { cellWidth: contentW / 2 } },
      theme: "grid",
      styles: { font: SANS, lineColor: RULE, lineWidth: 0.5 },
    });
    cursor = (doc as any).lastAutoTable.finalY + 16;

    // Gaps to close
    if (competitor.gaps.length > 0) {
      cursor = ensureSpace(doc, cursor, 120);
      cursor = drawSubheader(doc, "Gaps to Close", cursor);
      autoTable(doc, {
        startY: cursor,
        margin: { left: margin, right: margin },
        head: [["Gap", "Why it matters"]],
        body: competitor.gaps.slice(0, 5).map((g) => [g.gap, g.why]),
        headStyles: { fillColor: NAVY, textColor: GOLD_LIGHT, fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: INK, valign: "top", cellPadding: 8 },
        columnStyles: { 0: { cellWidth: contentW * 0.4, fontStyle: "bold" }, 1: { cellWidth: contentW * 0.6 } },
        theme: "grid",
        styles: { font: SANS, lineColor: RULE, lineWidth: 0.5 },
      });
      cursor = (doc as any).lastAutoTable.finalY + 16;
    }

    // Opportunities
    if (competitor.opportunities.length > 0) {
      cursor = ensureSpace(doc, cursor, 80);
      cursor = drawSubheader(doc, "Unclaimed Opportunities", cursor);
      competitor.opportunities.slice(0, 5).forEach((o) => {
        cursor = drawBullet(doc, o, cursor, contentW, margin);
      });
      cursor += 8;
    }
  }

  // ── Roadmap section ──
  if (roadmap) {
    cursor = ensureSpace(doc, cursor, 160);
    cursor = drawSectionHeader(doc, "30 / 60 / 90 Day Battle Plan", cursor, toc, "AI-assisted", GOLD);
    cursor = drawParagraph(doc, roadmap.summary, cursor, contentW, margin);
    cursor += 8;

    roadmap.phases.forEach((phase) => {
      cursor = ensureSpace(doc, cursor, 100);
      // Phase header bar — label and focus stack on separate lines rather
      // than sharing one (a long phase label, e.g. "Phase 1 — Foundations
      // (Weeks 1-2)", ran past where the focus text started and the two
      // overlapped).
      doc.setFont(SANS, "bold");
      doc.setFontSize(10);
      const labelText = phase.label.toUpperCase();
      doc.setFont(SANS, "italic");
      doc.setFontSize(9);
      const focusLines = doc.splitTextToSize(phase.focus, contentW - 20);
      const barH = 16 + focusLines.length * 12 + 6;

      doc.setFillColor(...NAVY);
      doc.rect(margin, cursor, contentW, barH, "F");
      doc.setTextColor(...GOLD_LIGHT);
      doc.setFont(SANS, "bold");
      doc.setFontSize(10);
      doc.text(labelText, margin + 10, cursor + 14);
      doc.setFont(SANS, "italic");
      doc.setFontSize(9);
      doc.setTextColor(220, 215, 200);
      doc.text(focusLines, margin + 10, cursor + 28);
      cursor += barH + 8;

      phase.actions.forEach((a, i) => {
        cursor = ensureSpace(doc, cursor, 60);
        doc.setFillColor(...GOLD);
        doc.circle(margin + 8, cursor + 5, 3, "F");
        doc.setTextColor(...INK);
        doc.setFont(SANS, "bold");
        doc.setFontSize(10);
        const titleLines = doc.splitTextToSize(a.title, contentW - 24);
        doc.text(titleLines, margin + 20, cursor + 8);
        cursor += titleLines.length * 12 + 2;

        doc.setFont(SANS, "normal");
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        const whyLines = doc.splitTextToSize(a.why, contentW - 24);
        doc.text(whyLines, margin + 20, cursor + 8);
        cursor += whyLines.length * 11 + 4;

        doc.setFontSize(7);
        doc.setTextColor(...GOLD);
        doc.text(`REF · ${a.chapterRef}`, margin + 20, cursor + 6);
        cursor += 16;
      });
      cursor += 10;
    });
  }

  // ── Maturity score ──
  if (maturity) {
    cursor = ensureSpace(doc, cursor, 200);
    cursor = drawSectionHeader(doc, "Firm Maturity Index", cursor, toc, "Self-assessed", GOLD);

    // Big score
    doc.setFont(SERIF, "bold");
    doc.setFontSize(48);
    doc.setTextColor(...NAVY);
    doc.text(`${maturity.score}`, margin, cursor + 36);
    doc.setFont(SANS, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("/ 100", margin + 68, cursor + 36);
    doc.setFont(SANS, "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text("Self-assessed across 12 marketing dimensions", margin + 110, cursor + 24);
    cursor += 56;

    // Dimension table
    autoTable(doc, {
      startY: cursor,
      margin: { left: margin, right: margin },
      head: [["Dimension", "Score"]],
      body: maturity.dimensions.map((d) => [d.label, `${d.score} / 5`]),
      headStyles: { fillColor: NAVY, textColor: GOLD_LIGHT, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: INK, valign: "top", cellPadding: 6 },
      columnStyles: { 0: { cellWidth: contentW * 0.75 }, 1: { cellWidth: contentW * 0.25, halign: "right", fontStyle: "bold" } },
      theme: "grid",
      styles: { font: SANS, lineColor: RULE, lineWidth: 0.5 },
    });
    cursor = (doc as any).lastAutoTable.finalY + 16;

    // 30-day plan (strip markdown to plain)
    if (maturity.plan) {
      cursor = ensureSpace(doc, cursor, 80);
      cursor = drawSubheader(doc, "Your 30-day plan", cursor);
      cursor = drawParagraph(doc, stripMd(maturity.plan), cursor, contentW, margin);
      cursor += 8;
    }
  }

  // ── Headline champion ──
  if (headline) {
    cursor = ensureSpace(doc, cursor, 140);
    cursor = drawSectionHeader(doc, "Champion Headline", cursor, toc, "AI-assisted", GOLD);

    // The line itself, large
    doc.setFont(SERIF, "bold");
    doc.setFontSize(22);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(headline.text, contentW);
    lines.forEach((l: string, i: number) => doc.text(l, margin, cursor + 22 + i * 26));
    cursor += 22 + lines.length * 26 + 6;

    doc.setFont(SANS, "italic");
    doc.setFontSize(10);
    doc.setTextColor(...GOLD);
    doc.text(`Angle: ${headline.angle}`, margin, cursor);
    cursor += 16;

    cursor = drawCallout(doc, "WHY IT WINS", headline.why, cursor, contentW, margin, GOLD);

    if (headline.brief) {
      doc.setFont(SANS, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Brief: ${headline.brief.slice(0, 200)}`, margin, cursor, { maxWidth: contentW });
      cursor += 16;
    }
  }

  // ── Bio rewrite ──
  if (bio) {
    cursor = ensureSpace(doc, cursor, 160);
    cursor = drawSectionHeader(doc, "Bio Rewrite", cursor, toc, "AI-assisted", GOLD);

    if (bio.name || bio.role) {
      doc.setFont(SANS, "italic");
      doc.setFontSize(10);
      doc.setTextColor(...GOLD);
      doc.text([bio.name, bio.role].filter(Boolean).join(" · "), margin, cursor);
      cursor += 14;
    }
    if (bio.emphases.length > 0) {
      doc.setFont(SANS, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Emphasis: ${bio.emphases.join(", ")}`, margin, cursor);
      cursor += 14;
    }
    cursor = drawParagraph(doc, stripMd(bio.rewrite), cursor, contentW, margin);
    cursor += 8;
  }

  // ── Market Visibility Score ──
  if (visibilityScore) {
    cursor = ensureSpace(doc, cursor, 160);
    cursor = drawSectionHeader(doc, "Market Visibility Score", cursor, toc, "Externally verified", GREEN);

    doc.setFont(SERIF, "bold");
    doc.setFontSize(48);
    doc.setTextColor(...GREEN);
    doc.text(`${Math.round(visibilityScore.totalScore)}`, margin, cursor + 36);
    doc.setFont(SANS, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("/ 200", margin + 68, cursor + 36);
    doc.setFont(SANS, "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    const peerLabel = visibilityScore.percentile !== null
      ? `Better than ${visibilityScore.percentile}% of ${visibilityScore.peerCount} peer firms in ${titleCase(visibilityScore.market)}`
      : `Externally verified · ${titleCase(visibilityScore.market)}, ${visibilityScore.peerGroup.replace(/_/g, " ")}`;
    doc.text(peerLabel, margin + 110, cursor + 24, { maxWidth: contentW - 110 });
    cursor += 56;

    autoTable(doc, {
      startY: cursor,
      margin: { left: margin, right: margin },
      head: [["Category", "Score", "Source"]],
      body: CATEGORY_ORDER.map((key: CategoryKey) => {
        const cat = visibilityScore.categories[key];
        const meta = CATEGORY_META[key];
        const provenance = PROVENANCE_META[(cat?.provenance ?? "missing") as Provenance];
        return [
          meta.label,
          cat ? `${Math.round(cat.score * 10) / 10} / ${meta.max}` : `— / ${meta.max}`,
          provenance.label,
        ];
      }),
      headStyles: { fillColor: NAVY, textColor: GOLD_LIGHT, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: INK, valign: "top", cellPadding: 6 },
      columnStyles: { 0: { cellWidth: contentW * 0.42 }, 1: { cellWidth: contentW * 0.28, halign: "right", fontStyle: "bold" }, 2: { cellWidth: contentW * 0.3 } },
      theme: "grid",
      styles: { font: SANS, lineColor: RULE, lineWidth: 0.5 },
    });
    cursor = (doc as any).lastAutoTable.finalY + 16;
  }

  // ── Final page: signature line ──
  cursor = ensureSpace(doc, cursor, 100);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.5);
  doc.line(margin, cursor, pageW - margin, cursor);
  cursor += 16;

  doc.setFont(SERIF, "italic");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(
    "Strategy without execution is theatre. Pick three actions from this plan and commit to dates.",
    margin, cursor, { maxWidth: contentW }
  );

  // ── Table of Contents ──
  // Inserted now, after the real page each section landed on is already
  // known, rather than guessed before the content that determines it
  // exists. Every recorded page number shifts by one once this page is
  // inserted at position 2.
  const TOC_PAGE = 2;
  doc.insertPage(TOC_PAGE);
  doc.setPage(TOC_PAGE);
  drawTocPage(doc, toc.map((t) => ({ ...t, page: t.page + 1 })), margin, contentW, pageW, pageH);

  // Footers on every non-cover page
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    doc.setFont(SANS, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("LegalOS · Battle Plan", margin, pageH - 22);
    doc.text(`${p} / ${totalPages}`, pageW - margin, pageH - 22, { align: "right" });
  }

  const slug = (context?.practiceArea || "law-firm").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`battle-plan-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── PDF helpers ──

// Draws onto an already-existing blank page (one inserted via
// doc.insertPage, not one freshly created by startPage's own addPage
// call) — so it repeats startPage's background/brand-bar chrome itself
// rather than reusing that function.
function drawTocPage(doc: jsPDF, entries: TocEntry[], margin: number, contentW: number, pageW: number, pageH: number) {
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 6, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 6, pageW, 1, "F");

  let y = 48;
  doc.setTextColor(...NAVY);
  doc.setFont(SERIF, "bold");
  doc.setFontSize(20);
  doc.text("Table of Contents", margin, y + 18);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(margin, y + 26, margin + 36, y + 26);
  y += 56;

  entries.forEach((entry) => {
    doc.setFont(SERIF, "normal");
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(entry.label, margin, y);

    doc.setFont(SANS, "normal");
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text(`${entry.page}`, pageW - margin, y, { align: "right" });
    y += 14;

    if (entry.tag) {
      doc.setFont(SANS, "bold");
      doc.setFontSize(7);
      doc.setTextColor(...entry.tagColor);
      doc.text(entry.tag.toUpperCase(), margin, y);
      y += 10;
    }

    y += 8;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 20;
  });
}

function startPage(doc: jsPDF): number {
  doc.addPage();
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");
  // top brand bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 6, doc.internal.pageSize.getWidth(), 1, "F");
  return 48;
}

function ensureSpace(doc: jsPDF, cursor: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (cursor + needed > pageH - 60) {
    return startPage(doc);
  }
  return cursor;
}

// A section-level provenance tag — the single clearest signal in this
// document for a partner skimming it: which pages are a real, externally-
// verified number versus an AI's read of the situation. Drawn top-right of
// the section header, in the given accent color. Also records itself into
// `toc` (page number as of this call) so the Table of Contents page
// inserted at the end reflects real pagination, not a guess.
function drawSectionHeader(doc: jsPDF, label: string, y: number, toc: TocEntry[], tag?: string, tagColor: [number, number, number] = MUTED): number {
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  toc.push({ label, tag, tagColor, page: doc.internal.getNumberOfPages() });
  doc.setTextColor(...NAVY);
  doc.setFont(SERIF, "bold");
  doc.setFontSize(20);
  doc.text(label, margin, y + 18);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(margin, y + 26, margin + 36, y + 26);

  if (tag) {
    doc.setFont(SANS, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...tagColor);
    doc.text(tag.toUpperCase(), pageW - margin, y + 14, { align: "right" });
  }

  return y + 42;
}

function drawSubheader(doc: jsPDF, label: string, y: number): number {
  const margin = 48;
  doc.setTextColor(...GOLD);
  doc.setFont(SANS, "bold");
  doc.setFontSize(8);
  doc.text(label.toUpperCase(), margin, y);
  return y + 14;
}

function drawParagraph(doc: jsPDF, text: string, y: number, width: number, margin: number): number {
  doc.setFont(SANS, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(text, width);
  let cursor = y;
  lines.forEach((line: string) => {
    cursor = ensureSpace(doc, cursor, 14);
    doc.text(line, margin, cursor + 10);
    cursor += 13;
  });
  return cursor;
}

function drawCallout(doc: jsPDF, label: string, body: string, y: number, width: number, margin: number, accent: [number, number, number]): number {
  // Reserve 12pt left padding (after the accent bar) + 14pt right padding
  const innerW = width - 26;
  doc.setFont(SANS, "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(body, innerW);
  const boxH = 36 + lines.length * 13;
  doc.setFillColor(252, 248, 240);
  doc.rect(margin, y, width, boxH, "F");
  doc.setFillColor(...accent);
  doc.rect(margin, y, 3, boxH, "F");
  doc.setFont(SANS, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  doc.text(label, margin + 12, y + 14);
  doc.setFont(SANS, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  // Render line-by-line so leading is consistent with the height calc
  lines.forEach((line: string, i: number) => {
    doc.text(line, margin + 12, y + 30 + i * 13);
  });
  return y + boxH + 18;
}

function drawNumberedItem(doc: jsPDF, n: number, text: string, y: number, width: number, margin: number): number {
  const lines = doc.splitTextToSize(text, width - 28);
  let cursor = ensureSpace(doc, y, lines.length * 13 + 12);
  doc.setFont(SERIF, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...GOLD);
  doc.text(`${n}.`, margin, cursor + 12);
  doc.setFont(SANS, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(lines, margin + 22, cursor + 12);
  return cursor + lines.length * 13 + 8;
}

function drawBullet(doc: jsPDF, text: string, y: number, width: number, margin: number): number {
  const lines = doc.splitTextToSize(text, width - 16);
  let cursor = ensureSpace(doc, y, lines.length * 13 + 6);
  doc.setFillColor(...GOLD);
  doc.circle(margin + 4, cursor + 8, 1.8, "F");
  doc.setFont(SANS, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(lines, margin + 14, cursor + 10);
  return cursor + lines.length * 13 + 4;
}

function drawStat(doc: jsPDF, x: number, y: number, label: string, value: string, sub: string) {
  doc.setFont(SANS, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(label, x, y);
  doc.setFont(SERIF, "bold");
  doc.setFontSize(40);
  doc.setTextColor(255, 255, 255);
  doc.text(value, x, y + 36);
  doc.setFont(SANS, "italic");
  doc.setFontSize(9);
  doc.setTextColor(220, 215, 200);
  doc.text(sub, x, y + 54);
}

function gradeColor(grade: string): [number, number, number] {
  if (grade === "A" || grade === "B") return [60, 130, 90];
  if (grade === "C") return GOLD;
  return RED;
}

// Crude markdown → plain text for PDF rendering. Every call site renders
// this under a section subheader battlePlanPdf.ts already drew (e.g.
// "YOUR 30-DAY PLAN"), so a leading "## Your 30-Day Plan" in the AI-
// generated markdown itself would just repeat that title as a redundant
// line of body text — drop a leading heading entirely rather than
// demoting it to plain text. Headings further down (e.g. "## Long
// Version" partway through a bio rewrite) are real content and stay.
function stripMd(md: string): string {
  const withoutLeadingHeading = md.replace(/^\s*#{1,6}[^\S\n]+.*\n+/, "");
  return withoutLeadingHeading
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (m) => m)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}
