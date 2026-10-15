import { describe, it, expect } from "vitest";
import { formatRoastMarkdown, roastFileName, type DeckRoastResult } from "./roastMarkdown";

const VISUAL: DeckRoastResult = {
  verdict: "All sizzle, no mandate.",
  grade: "C",
  burn: "This deck leads with your logo and buries the deal.",
  designSummary: "Walls of text on slides 2–4; the stats slide is the only one with hierarchy.",
  slideNotes: [
    { slideNumber: 1, designIssue: "Hero image fights the headline", designFix: "Drop the image 40% and left-align the headline", copyIssue: "Title is the firm name, not the value", copyFix: "Lead with the outcome" },
    { slideNumber: 2, issue: "Three paragraphs of history", fix: "Cut to one proof point" },
  ],
  topThreeFixes: ["Rewrite the cover headline as the client's outcome", "Cut slides 2–4 to one number each", "Move the team slide behind the ask"],
  redemption: "The stats slide proves you can be concrete — do it everywhere.",
  slideCount: 8,
  mode: "visual",
};

describe("formatRoastMarkdown", () => {
  it("carries every section of the roast", () => {
    const md = formatRoastMarkdown(VISUAL, "Q3 Pitch.pptx");
    expect(md).toContain("# Deck Roast — Q3 Pitch.pptx");
    expect(md).toContain("**Grade: C** · 8 slides · design + copy critique");
    expect(md).toContain('> "All sizzle, no mandate."');
    expect(md).toContain("## The Burn");
    expect(md).toContain("## Visual Design");
    expect(md).toContain("1. Rewrite the cover headline as the client's outcome");
    expect(md).toContain("### Slide 1");
    expect(md).toContain("- **Design:** Hero image fights the headline");
    expect(md).toContain("- **Issue:** Three paragraphs of history");
    expect(md).toContain("## Credit where it's due");
  });

  it("omits the visual-design section for text-only roasts", () => {
    const textOnly: DeckRoastResult = { ...VISUAL, mode: "text", designSummary: undefined };
    const md = formatRoastMarkdown(textOnly, "deck.pdf");
    expect(md).not.toContain("## Visual Design");
    expect(md).toContain("copy critique (text-only)");
  });

  it("falls back to 'untitled deck' without a filename", () => {
    expect(formatRoastMarkdown(VISUAL, "")).toContain("# Deck Roast — untitled deck");
  });
});

describe("roastFileName", () => {
  it("strips the source extension and slugifies", () => {
    expect(roastFileName("Q3 Pitch (final v2).pptx")).toBe("deck-roast-q3-pitch-final-v2.md");
    expect(roastFileName("deck.pdf")).toBe("deck-roast-deck.md");
  });

  it("never produces an empty slug", () => {
    expect(roastFileName("")).toBe("deck-roast-deck.md");
    expect(roastFileName("---")).toBe("deck-roast-deck.md");
  });
});
