import { describe, it, expect } from "vitest";
import { parsePitchDeckMarkdown } from "./pitchDeckParser";

const SAMPLE = `## Slide 1 — Title / First Impression

**Headline:** Cross-border deals close faster with counsel who's done 40 of them.

**Body:**
- 40+ closed cross-border M&A transactions
- Manufacturing & logistics focus
- CEE-wide deal experience

**Speaker notes:** We open with the number because it's the single most credible thing we can say in the first ten seconds.

---

## Slide 2 — The Shift

**Headline:** Cross-border deal flow into CEE has tripled since 2023.

**Body:**
- PE-backed roll-ups accelerating
- Regulatory harmonization lowering friction
- Local counsel now table stakes, not a differentiator

**Speaker notes:** This sets up why timing matters.

---
`;

describe("parsePitchDeckMarkdown", () => {
  it("parses each slide's title, headline, bullets, and notes", () => {
    const slides = parsePitchDeckMarkdown(SAMPLE);
    expect(slides).toHaveLength(2);
    expect(slides[0].title).toBe("Title / First Impression");
    expect(slides[0].headline).toBe("Cross-border deals close faster with counsel who's done 40 of them.");
    expect(slides[0].bullets).toEqual([
      "40+ closed cross-border M&A transactions",
      "Manufacturing & logistics focus",
      "CEE-wide deal experience",
    ]);
    expect(slides[0].notes).toBe("We open with the number because it's the single most credible thing we can say in the first ten seconds.");
  });

  it("parses the second slide independently of the first", () => {
    const slides = parsePitchDeckMarkdown(SAMPLE);
    expect(slides[1].title).toBe("The Shift");
    expect(slides[1].bullets).toHaveLength(3);
  });

  it("returns an empty array for markdown with no slide headings", () => {
    expect(parsePitchDeckMarkdown("Just some prose, no slides here.")).toEqual([]);
  });

  it("skips a slide with an empty title rather than rendering blank text", () => {
    const bad = "## Slide 1 —   \n\n**Headline:** something\n";
    expect(parsePitchDeckMarkdown(bad)).toEqual([]);
  });

  it("handles a slide missing speaker notes gracefully", () => {
    const noNotes = "## Slide 1 — Title\n\n**Headline:** H\n\n**Body:**\n- one\n";
    const slides = parsePitchDeckMarkdown(noNotes);
    expect(slides).toHaveLength(1);
    expect(slides[0].notes).toBe("");
    expect(slides[0].bullets).toEqual(["one"]);
  });

  it("handles a hyphen instead of an em dash after the slide number", () => {
    const hyphen = "## Slide 3 - Proof\n\n**Headline:** H\n\n**Body:**\n- a\n";
    const slides = parsePitchDeckMarkdown(hyphen);
    expect(slides).toHaveLength(1);
    expect(slides[0].title).toBe("Proof");
  });
});
