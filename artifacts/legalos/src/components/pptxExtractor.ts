// Client-side .pptx text extraction — a .pptx is just a zip of OOXML, so no
// server upload is needed to read it. Reads ppt/slides/slideN.xml (title +
// body text) and ppt/notesSlides/notesSlideN.xml (speaker notes) for each
// slide, in numeric filename order. That order matches real-world export
// order for the overwhelming majority of files (including ones this app's
// own pitchDeckPptx.ts generates) without needing to parse the full
// presentation.xml relationship graph just to answer "what order are the
// slides in."
import JSZip from "jszip";

export interface ExtractedSlide {
  index: number;
  title: string;
  bodyText: string;
  notes: string;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

/** Concatenates <a:t> text runs within each <a:p> paragraph into one line per paragraph. */
export function extractParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  const pRegex = /<a:p>([\s\S]*?)<\/a:p>/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const tRegex = /<a:t>([\s\S]*?)<\/a:t>/g;
    let tMatch: RegExpExecArray | null;
    const runs: string[] = [];
    while ((tMatch = tRegex.exec(pMatch[1])) !== null) {
      runs.push(decodeXmlEntities(tMatch[1]));
    }
    const line = runs.join("").trim();
    if (line) paragraphs.push(line);
  }
  return paragraphs;
}

const slideNumber = (filename: string): number | null => {
  const m = filename.match(/slide(\d+)\.xml$/);
  return m ? parseInt(m[1], 10) : null;
};

export async function extractPptxSlides(file: File | Blob): Promise<ExtractedSlide[]> {
  const zip = await JSZip.loadAsync(file);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => (slideNumber(a) ?? 0) - (slideNumber(b) ?? 0));

  const slides: ExtractedSlide[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const name = slideFiles[i];
    const num = slideNumber(name);
    const xml = await zip.files[name].async("string");
    const paragraphs = extractParagraphs(xml);
    const title = paragraphs[0] ?? "";
    const bodyText = paragraphs.slice(1).join("\n");

    let notes = "";
    const notesFile = num != null ? zip.files[`ppt/notesSlides/notesSlide${num}.xml`] : undefined;
    if (notesFile) {
      const notesXml = await notesFile.async("string");
      // Drop a lone numeric line — the slide-number placeholder every notes
      // page inherits from the notes master, not an actual spoken note.
      notes = extractParagraphs(notesXml).filter((p) => !/^\d+$/.test(p)).join("\n");
    }

    slides.push({ index: i + 1, title, bodyText, notes });
  }

  return slides;
}
