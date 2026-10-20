import { describe, it, expect } from "vitest";
import { parsePitchDeckMarkdown, serializeSlidesToMarkdown, classifySlideLayout } from "./pitchDeckParser";

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
  it("classifies numbered bullets as a process slide and lead:detail bullets as cards", () => {
    const steps = { title: "Approach", headline: "H", bullets: ["1. Scope: agree the brief", "2. Draft: first pass in a week", "3. Close: sign-off"] };
    expect(classifySlideLayout(steps, 3)).toBe("process");
    const cards = { title: "Team", headline: "H", bullets: ["Banking: 12 lawyers", "Disputes: 8 lawyers", "Tax: 5 lawyers"] };
    expect(classifySlideLayout(cards, 3)).toBe("cards");
  });

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

describe("classifySlideLayout", () => {
  const base = { title: "T", headline: "A headline", bullets: ["one", "two"] };

  it("slide 1 is always the cover", () => {
    expect(classifySlideLayout(base, 0)).toBe("title");
  });

  it("a headline-only slide is a section divider", () => {
    expect(classifySlideLayout({ ...base, bullets: [] }, 2)).toBe("section");
  });

  it("a quoted headline is a quote slide", () => {
    expect(classifySlideLayout({ ...base, headline: "“They closed in six weeks.”" }, 1)).toBe("quote");
  });

  it("a bullet list that mostly leads with numbers is a stats slide", () => {
    expect(classifySlideLayout({ title: "Proof", headline: "H", bullets: ["40+ deals closed", "98% retention", "Sector depth"] }, 3)).toBe("stats");
  });

  it("everything else is bullets", () => {
    expect(classifySlideLayout(base, 1)).toBe("bullets");
  });
});

describe("serializeSlidesToMarkdown round-trip", () => {
  it("parse(serialize(parse(md))) deep-equals parse(md)", () => {
    const once = parsePitchDeckMarkdown(SAMPLE);
    const twice = parsePitchDeckMarkdown(serializeSlidesToMarkdown(once));
    expect(twice).toEqual(once);
  });

  it("keeps slide visuals out of the markdown contract (session-local, text-only)", () => {
    const slides = parsePitchDeckMarkdown(SAMPLE);
    slides[0].imageUrl = "data:image/png;base64,AAAA";
    const md = serializeSlidesToMarkdown(slides);
    expect(md).not.toContain("data:image");
    expect(parsePitchDeckMarkdown(md)[0].imageUrl).toBeUndefined();
  });

  it("preserves user edits (title/headline/bullets/notes) through the round-trip", () => {
    const slides = parsePitchDeckMarkdown(SAMPLE);
    slides[1].headline = "Edited headline";
    slides[1].bullets = ["new bullet one", "new bullet two"];
    slides[1].notes = "Edited notes.";
    const round = parsePitchDeckMarkdown(serializeSlidesToMarkdown(slides));
    expect(round[1].headline).toBe("Edited headline");
    expect(round[1].bullets).toEqual(["new bullet one", "new bullet two"]);
    expect(round[1].notes).toBe("Edited notes.");
  });
});
