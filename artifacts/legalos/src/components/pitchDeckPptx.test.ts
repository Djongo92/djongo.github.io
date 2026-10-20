// @vitest-environment node
// Guards the export-parity regression the Deck Builder review caught: the
// PPTX must contain exactly one slide per parsed slide (the authored cover
// IS the cover — the old renderer added a generic cover on top, producing
// N+1) and layout-specific content must survive into the file. Asserts on
// the real .pptx zip, not on pptxgenjs internals.
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { assemblePitchDeckPptx } from "./pitchDeckPptx";
import { parsePitchDeckMarkdown } from "./pitchDeckParser";

const SAMPLE = `## Slide 1 — Title / First Impression

**Headline:** Cross-border deals close faster with counsel who's done 40 of them.

**Body:**
- 40+ closed cross-border M&A transactions
- CEE-wide deal experience

**Speaker notes:** Open with the number.

---

## Slide 2 — The Shift

**Headline:** Deal flow into CEE has tripled since 2023.

**Body:**
- PE-backed roll-ups accelerating
- Local counsel now table stakes

**Speaker notes:** Timing matters.

---

## Slide 3 — Proof

**Headline:** Results that survive diligence.

**Body:**
- 40+ closed transactions
- 98% client retention
- 6 CEE jurisdictions covered

**Speaker notes:** Proof slide.
`;

async function buildZip(slideCount?: never) {
  const slides = parsePitchDeckMarkdown(SAMPLE);
  const pptx = assemblePitchDeckPptx({ slides, audience: "GC", opportunity: "EU expansion" });
  const buf = await pptx.write({ outputType: "arraybuffer" });
  return { zip: await JSZip.loadAsync(buf), slides };
}

describe("assemblePitchDeckPptx", () => {
  it("renders exactly one PowerPoint slide per parsed slide — no duplicate generic cover", async () => {
    const { zip, slides } = await buildZip();
    const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slideFiles).toHaveLength(slides.length);
  });

  it("the stats-classified slide keeps all its bullets in the exported file", async () => {
    const { zip, slides } = await buildZip();
    expect(slides[2].layout).toBe("stats");
    const xml = await zip.file("ppt/slides/slide3.xml")!.async("string");
    expect(xml).toContain("40+");
    expect(xml).toContain("98%");
    expect(xml).toContain("jurisdictions");
  });

  it("brands the cover with the firm name when one is provided", async () => {
    const slides = parsePitchDeckMarkdown(SAMPLE);
    const pptx = assemblePitchDeckPptx({ slides, audience: "GC", opportunity: "EU expansion", firmName: "Acme Law" });
    const buf = await pptx.write({ outputType: "arraybuffer" });
    const zip = await JSZip.loadAsync(buf);
    const cover = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(cover).toContain("ACME LAW");
    expect(cover).not.toContain("UVID");
  });

  it("embeds a slide visual into the file when one is attached", async () => {
    const slides = parsePitchDeckMarkdown(SAMPLE);
    // 1×1 PNG — enough to exercise the embed path.
    slides[0].imageUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const pptx = assemblePitchDeckPptx({ slides, audience: "GC", opportunity: "EU expansion" });
    const buf = await pptx.write({ outputType: "arraybuffer" });
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files).some((f) => /^ppt\/media\//.test(f))).toBe(true);
  });

  it("quote slides render their visual too (full-bleed behind a scrim)", async () => {
    const slides = parsePitchDeckMarkdown(SAMPLE);
    // The SAMPLE deck classifies no slide as quote — force one to exercise
    // the quote renderer's image path.
    const quoteIndex = 2;
    slides[quoteIndex] = { ...slides[quoteIndex], layout: "quote" };
    slides[quoteIndex].imageUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const pptx = assemblePitchDeckPptx({ slides, audience: "GC", opportunity: "EU expansion" });
    const buf = await pptx.write({ outputType: "arraybuffer" });
    const zip = await JSZip.loadAsync(buf);
    const quoteXml = await zip.file(`ppt/slides/slide${quoteIndex + 1}.xml`)!.async("string");
    expect(quoteXml).toContain("<p:pic>");
  });

  it("speaker notes travel into the file", async () => {
    const { zip } = await buildZip();
    const notesFiles = Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f));
    expect(notesFiles.length).toBe(3);
    const notes1 = await zip.file("ppt/notesSlides/notesSlide1.xml")!.async("string");
    expect(notes1).toContain("Open with the number.");
  });

  it("process and cards slides export their steps and labels", async () => {
    const md = `## Slide 1 — Cover

**Headline:** Deal counsel

**Speaker notes:** n

---

## Slide 2 — Approach

**Headline:** Three phases

**Body:**
- 1. Scope: agree the brief
- 2. Draft: first pass in a week
- 3. Close: sign-off

**Speaker notes:** n

---

## Slide 3 — Team

**Headline:** Who runs it

**Body:**
- Banking: twelve lawyers
- Disputes: eight lawyers
- Tax: five lawyers

**Speaker notes:** n`;
    const slides = parsePitchDeckMarkdown(md);
    expect(slides.map((x) => x.layout)).toEqual(["title", "process", "cards"]);
    const buf = await assemblePitchDeckPptx({ slides, audience: "GC", opportunity: "x" }).write({ outputType: "arraybuffer" });
    const zip = await JSZip.loadAsync(buf);
    const process = await zip.file("ppt/slides/slide2.xml")!.async("string");
    expect(process).toContain("Scope");
    expect(process).toContain("agree the brief");
    expect(process).not.toContain("1. Scope");
    const cards = await zip.file("ppt/slides/slide3.xml")!.async("string");
    expect(cards).toContain("Banking");
    expect(cards).toContain("five lawyers");
  });
});
