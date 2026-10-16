// Serializes a Roast My Deck result into a self-contained markdown document.
// Used by the result's Copy/.md export row AND stored as the run-history
// `output` — that single string is what makes a roast survive navigation
// (the My Workshop drawer can copy it back out) without any server round-trip.

export interface RoastTextSlideNote {
  slideNumber: number;
  issue: string;
  fix: string;
}

export interface RoastVisualSlideNote {
  slideNumber: number;
  designIssue: string;
  designFix: string;
  copyIssue: string;
  copyFix: string;
}

export interface DeckRoastResult {
  verdict: string;
  grade: "A" | "B" | "C" | "D" | "F";
  burn: string;
  designSummary?: string;
  slideNotes: (RoastTextSlideNote | RoastVisualSlideNote)[];
  topThreeFixes: string[];
  redemption: string;
  slideCount: number;
  mode: "text" | "visual";
}

export const isVisualRoastNote = (n: RoastTextSlideNote | RoastVisualSlideNote): n is RoastVisualSlideNote =>
  "designIssue" in n;

export function formatRoastMarkdown(result: DeckRoastResult, fileName: string): string {
  const lines: string[] = [
    `# Deck Roast — ${fileName || "untitled deck"}`,
    "",
    `**Grade: ${result.grade}** · ${result.slideCount} slides · ${result.mode === "visual" ? "design + copy critique" : "copy critique (text-only)"}`,
    "",
    `> "${result.verdict}"`,
    "",
    "## The Burn",
    "",
    result.burn,
  ];
  if (result.designSummary) {
    lines.push("", "## Visual Design", "", result.designSummary);
  }
  lines.push("", "## Top 3 Fixes (in order)", "");
  result.topThreeFixes.forEach((f, i) => lines.push(`${i + 1}. ${f}`));
  lines.push("", "## Slide-by-slide");
  for (const s of result.slideNotes) {
    lines.push("", `### Slide ${s.slideNumber}`, "");
    if (isVisualRoastNote(s)) {
      lines.push(`- **Design:** ${s.designIssue}`, `  - Fix: ${s.designFix}`, `- **Copy:** ${s.copyIssue}`, `  - Fix: ${s.copyFix}`);
    } else {
      lines.push(`- **Issue:** ${s.issue}`, `- **Fix:** ${s.fix}`);
    }
  }
  lines.push("", "## Credit where it's due", "", result.redemption, "");
  return lines.join("\n");
}

/** `deck-roast-<deck-name>.md` — strips the source extension, slugifies. */
export function roastFileName(fileName: string): string {
  const base = (fileName || "deck").replace(/\.(pdf|pptx)$/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "deck";
  return `deck-roast-${base}.md`;
}
