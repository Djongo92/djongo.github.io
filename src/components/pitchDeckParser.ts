// Parses workshop-pitch-deck's markdown output into structured slide data.
// The edge function's system prompt (supabase/functions/workshop-pitch-deck)
// is contracted to always emit this exact shape per slide:
//
//   ## Slide N — Title
//
//   **Headline:** ...
//
//   **Body:**
//   - bullet
//   - bullet
//
//   **Speaker notes:** ...
//
// If the model drifts from that shape for a given slide, that slide is
// skipped rather than rendered with garbled/partial text — a slide with no
// title is worse than one slide missing from the deck.
export interface ParsedSlide {
  title: string;
  headline: string;
  bullets: string[];
  notes: string;
}

export function parsePitchDeckMarkdown(markdown: string): ParsedSlide[] {
  const slides: ParsedSlide[] = [];
  const blocks = markdown.split(/\n(?=##\s+Slide\s+\d+)/i);

  for (const block of blocks) {
    // Matched against the first line alone (not the whole block with an "m"
    // flag) — \s in a multiline match happily crosses newlines, so a title
    // line with only trailing spaces before the line break would otherwise
    // swallow the blank line and match into the next line's content.
    const firstLine = block.split("\n", 1)[0] ?? "";
    const titleMatch = firstLine.match(/^##\s+Slide\s+\d+\s*[—-]?\s*(.*)$/i);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();
    if (!title) continue;

    const headlineMatch = block.match(/\*\*Headline:\*\*\s*(.+)/i);
    const notesMatch = block.match(/\*\*Speaker notes:\*\*\s*([\s\S]*?)(?:\n---|\n##|$)/i);

    const bodyMatch = block.match(/\*\*Body:\*\*\s*([\s\S]*?)(?:\n\*\*Speaker notes:\*\*|\n---|\n##|$)/i);
    const bullets = bodyMatch
      ? bodyMatch[1]
        .split("\n")
        .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
        .filter(Boolean)
      : [];

    slides.push({
      title,
      headline: (headlineMatch?.[1] ?? "").trim(),
      bullets,
      notes: (notesMatch?.[1] ?? "").trim(),
    });
  }

  return slides;
}
