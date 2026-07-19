import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, X, Download, CheckCircle2, Circle, Loader2, Flame, Map, Target, Gauge, Trophy, UserSquare, ShieldCheck } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useBattlePlanCache } from "@/hooks/useBattlePlanCache";
import { useFirmContext } from "@/hooks/useFirmContext";
import { toast } from "sonner";

interface Props {
  readChaptersCount: number;
  totalChapters: number;
  implementationScore: number;
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

const BattlePlan = ({ readChaptersCount, totalChapters, implementationScore }: Props) => {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { roast, competitor, roadmap, maturity, headline, bio, visibilityScore } = useBattlePlanCache();
  const { context } = useFirmContext();

  const hasAny = !!(roast || competitor || roadmap || maturity || headline || bio || visibilityScore);
  const coreSteps = [
    { key: "roast", label: "Run Roast My Homepage", done: !!roast, icon: "roast" as const },
    { key: "competitor", label: "Run Competitor Analysis", done: !!competitor, icon: "competitor" as const },
    { key: "roadmap", label: "Generate 30/60/90 Roadmap", done: !!roadmap, icon: "roadmap" as const },
  ];
  const optionalSteps = [
    { key: "maturity", label: "Firm Maturity Score", done: !!maturity, icon: "maturity" as const },
    { key: "headline", label: "Headline Lab champion", done: !!headline, icon: "headline" as const },
    { key: "bio", label: "Bio Rewriter result", done: !!bio, icon: "bio" as const },
    { key: "visibilityScore", label: "Market Visibility Score", done: !!visibilityScore, icon: "visibilityScore" as const },
  ];
  const completedCore = coreSteps.filter((s) => s.done).length;
  const completedOptional = optionalSteps.filter((s) => s.done).length;

  const generate = async () => {
    if (!hasAny) {
      toast.error("Run at least one analysis first");
      return;
    }
    setGenerating(true);
    try {
      buildPdf({ roast, competitor, roadmap, maturity, headline, bio, visibilityScore, context, readChaptersCount, totalChapters, implementationScore });
      toast.success("Battle Plan downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't build PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full p-5 bg-gradient-to-br from-gold/10 via-card to-card border border-gold/40 rounded-sm text-left hover:border-gold/70 hover:shadow-lg hover:shadow-gold/10 transition-all relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 px-2 py-0.5 bg-gold text-primary-foreground text-[9px] tracking-[0.2em] uppercase font-body">
          Flagship
        </div>
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-gold/15 text-gold-light">
            <Swords className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1">Your Battle Plan</h3>
            <p className="text-xs text-muted-foreground font-body">
              Branded one-page PDF · Roast + competitor gaps + 90-day moves · The artifact you forward to your managing partner
            </p>
            {hasAny && (
              <p className="text-[11px] text-gold-light font-body mt-2">
                {completedCore}/3 core · {completedOptional}/3 bonus inputs ready
              </p>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => !generating && setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-xl max-h-[92vh] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-gold-light" />
                  <h3 className="font-display text-lg text-foreground">Your Battle Plan</h3>
                </div>
                <button onClick={() => !generating && setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground" disabled={generating}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-sm text-secondary-foreground/80 font-body mb-1">
                  A single, branded PDF that combines everything you've generated into one document worth forwarding.
                </p>
                <p className="text-xs text-muted-foreground font-body mb-6 italic">
                  Each input below is optional — but the more complete, the more devastating the plan.
                </p>

                <div className="space-y-2 mb-6">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body mb-1">Core inputs</p>
                  {coreSteps.map((s) => (
                    <div
                      key={s.key}
                      className={`flex items-center gap-3 p-3 rounded-sm border ${s.done ? "border-gold/30 bg-gold/5" : "border-border/40 bg-card"}`}
                    >
                      {s.done ? (
                        <CheckCircle2 className="w-4 h-4 text-gold-light shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={`text-sm font-body ${s.done ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                      {s.icon === "roast" && <Flame className="w-3 h-3 text-destructive/60 ml-auto" />}
                      {s.icon === "competitor" && <Target className="w-3 h-3 text-primary/60 ml-auto" />}
                      {s.icon === "roadmap" && <Map className="w-3 h-3 text-primary/60 ml-auto" />}
                    </div>
                  ))}
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body mt-4 mb-1">Bonus inputs (optional)</p>
                  {optionalSteps.map((s) => (
                    <div
                      key={s.key}
                      className={`flex items-center gap-3 p-3 rounded-sm border ${s.done ? "border-gold/30 bg-gold/5" : "border-border/40 bg-card"}`}
                    >
                      {s.done ? (
                        <CheckCircle2 className="w-4 h-4 text-gold-light shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={`text-sm font-body ${s.done ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                      {s.icon === "maturity" && <Gauge className="w-3 h-3 text-primary/60 ml-auto" />}
                      {s.icon === "headline" && <Trophy className="w-3 h-3 text-gold-light/70 ml-auto" />}
                      {s.icon === "bio" && <UserSquare className="w-3 h-3 text-primary/60 ml-auto" />}
                      {s.icon === "visibilityScore" && <ShieldCheck className="w-3 h-3 text-emerald-500/70 ml-auto" />}
                    </div>
                  ))}
                </div>

                <div className="bg-gold/5 border-l-4 border-gold/60 p-4 rounded-r-sm mb-6">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-gold-light font-body mb-1">Included automatically</p>
                  <p className="text-xs text-secondary-foreground/80 font-body leading-relaxed">
                    Firm context · Reading & implementation progress · Cover page · Legal Web Playbook branding · Generated date
                  </p>
                </div>

                <button
                  onClick={generate}
                  disabled={!hasAny || generating}
                  className="w-full bg-gold text-primary-foreground py-3 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-gold-light transition-colors flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Building PDF…</>
                  ) : (
                    <><Download className="w-4 h-4" /> {hasAny ? `Generate Battle Plan (${completedCore + completedOptional}/${coreSteps.length + optionalSteps.length} inputs)` : "Run an analysis first"}</>
                  )}
                </button>

                {!hasAny && (
                  <p className="text-[11px] text-muted-foreground font-body italic text-center mt-3">
                    Close this and run Roast, Competitor Analysis, or Roadmap to populate.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   PDF generation
   ────────────────────────────────────────────────────────────────────────── */

interface BuildArgs {
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
}

function buildPdf({ roast, competitor, roadmap, maturity, headline, bio, visibilityScore, context, readChaptersCount, totalChapters, implementationScore }: BuildArgs) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // ── Cover page ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, pageH, "F");

  // gold rule top
  doc.setFillColor(...GOLD);
  doc.rect(margin, margin, 80, 3, "F");

  doc.setTextColor(...GOLD_LIGHT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("THE LEGAL WEB PLAYBOOK", margin, margin + 24);

  doc.setTextColor(255, 255, 255);
  doc.setFont("times", "normal");
  doc.setFontSize(46);
  doc.text("Battle Plan", margin, margin + 110);

  doc.setFontSize(16);
  doc.setTextColor(...GOLD_LIGHT);
  doc.setFont("times", "italic");
  const subtitle = context
    ? `Personalised for a ${context.practiceArea} firm · ${context.firmSize}`
    : "A strategic marketing intervention";
  doc.text(subtitle, margin, margin + 138);

  if (context) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 215, 200);
    const goal = doc.splitTextToSize(`Primary goal: ${context.primaryGoal}`, contentW);
    doc.text(goal, margin, margin + 162);
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
  doc.setFont("helvetica", "normal");
  doc.text("PREPARED", margin, pageH - margin - 32);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(today, margin, pageH - margin - 18);

  doc.setTextColor(...GOLD_LIGHT);
  doc.setFontSize(8);
  doc.text("CONFIDENTIAL · FOR INTERNAL USE", pageW - margin, pageH - margin - 18, { align: "right" });

  // ── Subsequent pages ──
  let cursor = startPage(doc);

  // Executive summary box (always rendered)
  cursor = drawSectionHeader(doc, "Executive Summary", cursor);
  const summaryLines: string[] = [];
  if (competitor) summaryLines.push(competitor.executiveSummary);
  if (roast) summaryLines.push(`Homepage assessment: Grade ${roast.grade}. "${roast.verdict}"`);
  if (roadmap) summaryLines.push(roadmap.summary);
  if (summaryLines.length === 0) summaryLines.push("Run an analysis from the dashboard to populate this section.");
  cursor = drawParagraph(doc, summaryLines.join("\n\n"), cursor, contentW, margin);
  cursor += 14;

  // ── Roast section ──
  if (roast) {
    cursor = ensureSpace(doc, cursor, 140);
    cursor = drawSectionHeader(doc, "Homepage Diagnosis", cursor);

    // Grade badge
    doc.setFillColor(...gradeColor(roast.grade));
    doc.roundedRect(margin, cursor, 56, 56, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(36);
    doc.text(roast.grade, margin + 28, cursor + 38, { align: "center" });

    // Verdict beside it
    doc.setTextColor(...INK);
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    const verdictLines = doc.splitTextToSize(`"${roast.verdict}"`, contentW - 72);
    doc.text(verdictLines, margin + 72, cursor + 18);
    doc.setFont("helvetica", "normal");
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
    cursor = drawSectionHeader(doc, "Competitive Position", cursor);

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
      styles: { lineColor: RULE, lineWidth: 0.5 },
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
        styles: { lineColor: RULE, lineWidth: 0.5 },
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
    cursor = drawSectionHeader(doc, "30 / 60 / 90 Day Battle Plan", cursor);
    cursor = drawParagraph(doc, roadmap.summary, cursor, contentW, margin);
    cursor += 8;

    roadmap.phases.forEach((phase) => {
      cursor = ensureSpace(doc, cursor, 90);
      // phase header bar
      doc.setFillColor(...NAVY);
      doc.rect(margin, cursor, contentW, 22, "F");
      doc.setTextColor(...GOLD_LIGHT);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(phase.label.toUpperCase(), margin + 10, cursor + 14);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(220, 215, 200);
      doc.text(phase.focus, margin + 100, cursor + 14);
      cursor += 30;

      phase.actions.forEach((a, i) => {
        cursor = ensureSpace(doc, cursor, 60);
        doc.setFillColor(...GOLD);
        doc.circle(margin + 8, cursor + 5, 3, "F");
        doc.setTextColor(...INK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const titleLines = doc.splitTextToSize(a.title, contentW - 24);
        doc.text(titleLines, margin + 20, cursor + 8);
        cursor += titleLines.length * 12 + 2;

        doc.setFont("helvetica", "normal");
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
    cursor = drawSectionHeader(doc, "Firm Maturity Index", cursor);

    // Big score
    doc.setFont("times", "bold");
    doc.setFontSize(48);
    doc.setTextColor(...NAVY);
    doc.text(`${maturity.score}`, margin, cursor + 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("/ 100", margin + 68, cursor + 36);
    doc.setFont("helvetica", "italic");
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
      styles: { lineColor: RULE, lineWidth: 0.5 },
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
    cursor = drawSectionHeader(doc, "Champion Headline", cursor);

    // The line itself, large
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(headline.text, contentW);
    lines.forEach((l: string, i: number) => doc.text(l, margin, cursor + 22 + i * 26));
    cursor += 22 + lines.length * 26 + 6;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...GOLD);
    doc.text(`Angle: ${headline.angle}`, margin, cursor);
    cursor += 16;

    cursor = drawCallout(doc, "WHY IT WINS", headline.why, cursor, contentW, margin, GOLD);

    if (headline.brief) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Brief: ${headline.brief.slice(0, 200)}`, margin, cursor, { maxWidth: contentW });
      cursor += 16;
    }
  }

  // ── Bio rewrite ──
  if (bio) {
    cursor = ensureSpace(doc, cursor, 160);
    cursor = drawSectionHeader(doc, "Bio Rewrite", cursor);

    if (bio.name || bio.role) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...GOLD);
      doc.text([bio.name, bio.role].filter(Boolean).join(" · "), margin, cursor);
      cursor += 14;
    }
    if (bio.emphases.length > 0) {
      doc.setFont("helvetica", "normal");
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
    cursor = drawSectionHeader(doc, "Market Visibility Score", cursor);

    doc.setFont("times", "bold");
    doc.setFontSize(48);
    doc.setTextColor(...GREEN);
    doc.text(`${Math.round(visibilityScore.totalScore)}`, margin, cursor + 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("/ 200", margin + 68, cursor + 36);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    const peerLabel = visibilityScore.percentile !== null
      ? `Better than ${visibilityScore.percentile}% of ${visibilityScore.peerCount} peer firms in ${visibilityScore.market}`
      : `Externally verified · ${visibilityScore.market}, ${visibilityScore.peerGroup.replace(/_/g, " ")}`;
    doc.text(peerLabel, margin + 110, cursor + 24, { maxWidth: contentW - 110 });
    cursor += 56;

    const categoryLabels: Record<string, string> = {
      performance: "Performance", social: "Social Media", seoAuthority: "SEO & Authority",
      thoughtLeadership: "Thought Leadership", reputation: "Reputation",
    };
    autoTable(doc, {
      startY: cursor,
      margin: { left: margin, right: margin },
      head: [["Category", "Score", "Source"]],
      body: Object.entries(visibilityScore.categories).map(([key, cat]) => [
        categoryLabels[key] ?? key,
        `${Math.round(cat.score * 10) / 10}`,
        cat.provenance === "missing" ? "Pending setup" : cat.provenance.replace(/_/g, " "),
      ]),
      headStyles: { fillColor: NAVY, textColor: GOLD_LIGHT, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: INK, valign: "top", cellPadding: 6 },
      columnStyles: { 0: { cellWidth: contentW * 0.5 }, 1: { cellWidth: contentW * 0.2, halign: "right", fontStyle: "bold" }, 2: { cellWidth: contentW * 0.3 } },
      theme: "grid",
      styles: { lineColor: RULE, lineWidth: 0.5 },
    });
    cursor = (doc as any).lastAutoTable.finalY + 16;
  }

  // ── Final page: signature line ──
  cursor = ensureSpace(doc, cursor, 100);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.5);
  doc.line(margin, cursor, pageW - margin, cursor);
  cursor += 16;

  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(
    "Strategy without execution is theatre. Pick three actions from this plan and commit to dates.",
    margin, cursor, { maxWidth: contentW }
  );

  // Footers on every non-cover page
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("The Legal Web Playbook · Battle Plan", margin, pageH - 22);
    doc.text(`${p} / ${totalPages}`, pageW - margin, pageH - 22, { align: "right" });
  }

  const slug = (context?.practiceArea || "law-firm").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`battle-plan-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── PDF helpers ──

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

function drawSectionHeader(doc: jsPDF, label: string, y: number): number {
  const margin = 48;
  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text(label, margin, y + 18);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(margin, y + 26, margin + 36, y + 26);
  return y + 42;
}

function drawSubheader(doc: jsPDF, label: string, y: number): number {
  const margin = 48;
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label.toUpperCase(), margin, y);
  return y + 14;
}

function drawParagraph(doc: jsPDF, text: string, y: number, width: number, margin: number): number {
  doc.setFont("helvetica", "normal");
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
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(body, innerW);
  const boxH = 36 + lines.length * 13;
  doc.setFillColor(252, 248, 240);
  doc.rect(margin, y, width, boxH, "F");
  doc.setFillColor(...accent);
  doc.rect(margin, y, 3, boxH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  doc.text(label, margin + 12, y + 14);
  doc.setFont("helvetica", "normal");
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
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...GOLD);
  doc.text(`${n}.`, margin, cursor + 12);
  doc.setFont("helvetica", "normal");
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
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(lines, margin + 14, cursor + 10);
  return cursor + lines.length * 13 + 4;
}

function drawStat(doc: jsPDF, x: number, y: number, label: string, value: string, sub: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(label, x, y);
  doc.setFont("times", "bold");
  doc.setFontSize(40);
  doc.setTextColor(255, 255, 255);
  doc.text(value, x, y + 36);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(220, 215, 200);
  doc.text(sub, x, y + 54);
}

function gradeColor(grade: string): [number, number, number] {
  if (grade === "A" || grade === "B") return [60, 130, 90];
  if (grade === "C") return GOLD;
  return RED;
}

// Crude markdown → plain text for PDF rendering
function stripMd(md: string): string {
  return md
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

export default BattlePlan;
