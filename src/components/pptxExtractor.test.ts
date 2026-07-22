import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { extractParagraphs, extractPptxSlides } from "./pptxExtractor";

const slideXml = (title: string, bullets: string[]) => `<?xml version="1.0"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp><p:txBody><a:p><a:r><a:t>${title}</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody>${bullets.map((b) => `<a:p><a:r><a:t>${b}</a:t></a:r></a:p>`).join("")}</p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

const notesXml = (note: string) => `<?xml version="1.0"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp><p:txBody><a:p><a:fld><a:t>1</a:t></a:fld></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>${note}</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;

describe("extractParagraphs", () => {
  it("concatenates multiple runs within one paragraph into a single line", () => {
    const xml = "<a:p><a:r><a:t>Hello </a:t></a:r><a:r><a:t>world</a:t></a:r></a:p>";
    expect(extractParagraphs(xml)).toEqual(["Hello world"]);
  });

  it("decodes XML entities", () => {
    const xml = "<a:p><a:r><a:t>Smith &amp; Jones</a:t></a:r></a:p>";
    expect(extractParagraphs(xml)).toEqual(["Smith & Jones"]);
  });

  it("decodes the named apostrophe entity PowerPoint actually emits, not just &#39;", () => {
    const xml = "<a:p><a:r><a:t>who&apos;s done 40 of them</a:t></a:r></a:p>";
    expect(extractParagraphs(xml)).toEqual(["who's done 40 of them"]);
  });

  it("skips empty paragraphs", () => {
    const xml = "<a:p><a:r><a:t></a:t></a:r></a:p><a:p><a:r><a:t>Real text</a:t></a:r></a:p>";
    expect(extractParagraphs(xml)).toEqual(["Real text"]);
  });
});

describe("extractPptxSlides", () => {
  it("extracts title, body, and notes per slide in numeric filename order", async () => {
    const zip = new JSZip();
    zip.file("ppt/slides/slide2.xml", slideXml("Second Slide", ["Point B"]));
    zip.file("ppt/slides/slide1.xml", slideXml("First Slide", ["Point A1", "Point A2"]));
    zip.file("ppt/notesSlides/notesSlide1.xml", notesXml("Say this out loud for slide one."));

    const blob = await zip.generateAsync({ type: "blob" });
    const slides = await extractPptxSlides(blob);

    expect(slides).toHaveLength(2);
    expect(slides[0].title).toBe("First Slide");
    expect(slides[0].bodyText).toBe("Point A1\nPoint A2");
    expect(slides[0].notes).toBe("Say this out loud for slide one.");
    expect(slides[1].title).toBe("Second Slide");
    expect(slides[1].notes).toBe("");
  });

  it("drops the numeric slide-number placeholder from notes rather than treating it as spoken content", async () => {
    const zip = new JSZip();
    zip.file("ppt/slides/slide1.xml", slideXml("Title", []));
    zip.file("ppt/notesSlides/notesSlide1.xml", notesXml("Actual note text"));
    const blob = await zip.generateAsync({ type: "blob" });
    const slides = await extractPptxSlides(blob);
    expect(slides[0].notes).toBe("Actual note text");
    expect(slides[0].notes).not.toContain("1");
  });

  it("returns an empty array for a zip with no slides", async () => {
    const zip = new JSZip();
    zip.file("ppt/presentation.xml", "<p:presentation/>");
    const blob = await zip.generateAsync({ type: "blob" });
    expect(await extractPptxSlides(blob)).toEqual([]);
  });
});
