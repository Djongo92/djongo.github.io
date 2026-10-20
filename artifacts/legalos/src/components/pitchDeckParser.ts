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
/** Visual treatment a slide gets in the builder, PPTX, PDF, and PNG exports. */
export type SlideLayout = "title" | "section" | "quote" | "stats" | "process" | "cards" | "split" | "bullets";

/** Layouts a person can pick by hand; "split" is never chosen automatically. */
export const ALL_LAYOUTS: { id: SlideLayout; label: string }[] = [
  { id: "bullets", label: "Bullets" },
  { id: "split", label: "Split" },
  { id: "stats", label: "Stats" },
  { id: "process", label: "Steps" },
  { id: "cards", label: "Cards" },
  { id: "quote", label: "Quote" },
  { id: "section", label: "Divider" },
  { id: "title", label: "Cover" },
];

export interface ParsedSlide {
  title: string;
  headline: string;
  bullets: string[];
  notes: string;
  layout: SlideLayout;
  /**
   * Optional visual (data URL) attached in the Deck Builder — uploaded or
   * AI-generated. Never parsed from or serialized into markdown (session-
   * local; the markdown contract stays text-only), but rendered by the
   * preview, canvas PDF/PNG export, and PPTX export.
   */
  imageUrl?: string;
  /** Set when the person picked this layout by hand; automatic classification then leaves it alone. */
  layoutLocked?: boolean;
}

const STAT_LEAD = /^[\d$€£%×x+~]/;
const QUOTE_LEAD = /^["“‘]/;
const STEP_LEAD = /^(?:\d{1,2}[.):]|step\s*\d+|phase\s*\d+|week\s*\d+)\s+\S/i;
const STEP_PREFIX = /^(?:\d{1,2}[.):]|step\s*\d+[.:)]?|phase\s*\d+[.:)]?)\s+/i;

/** "1. Scope the work" → "Scope the work" (process layout shows its own numbers). */
export function stripStepPrefix(bullet: string): string {
  return bullet.trim().replace(STEP_PREFIX, "");
}

/** "Fixed fee: no surprises" → ["Fixed fee", "no surprises"]; ["", bullet] when there is no short lead. */
export function splitLead(bullet: string): [string, string] {
  const m = bullet.trim().match(/^([^:—–]{2,32}?)\s*(?::|\s[—–]\s)\s*(\S[\s\S]*)$/);
  return m ? [m[1].trim(), m[2].trim()] : ["", bullet.trim()];
}

/**
 * Deterministic layout classification — positional first (slide 1 is always
 * the cover), then content heuristics. Kept pure and shared so the DOM
 * preview, canvas renderer, and PPTX export never disagree about treatment.
 */
export function classifySlideLayout(
  slide: { title: string; headline: string; bullets: string[] },
  index: number,
): SlideLayout {
  if (index === 0) return "title";
  if (slide.bullets.length === 0 && slide.headline) return "section";
  if (
    QUOTE_LEAD.test(slide.headline.trim()) ||
    (slide.bullets.length > 0 && slide.bullets.every((b) => QUOTE_LEAD.test(b.trim())))
  ) return "quote";
  if (
    slide.bullets.length >= 3 && slide.bullets.length <= 5 &&
    slide.bullets.filter((b) => STEP_LEAD.test(b.trim())).length >= Math.ceil(slide.bullets.length * 0.6)
  ) return "process";
  if (
    slide.bullets.length >= 2 &&
    slide.bullets.filter((b) => STAT_LEAD.test(b.trim())).length >= Math.ceil(slide.bullets.length * 0.6)
  ) return "stats";
  if (slide.bullets.length >= 3 && slide.bullets.length <= 4 && slide.bullets.every((b) => splitLead(b)[0] !== "")) return "cards";
  return "bullets";
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
      layout: "bullets", // classified below, once the deck length is known
    });
  }

  return slides.map((s, i) => ({ ...s, layout: classifySlideLayout(s, i) }));
}

/**
 * Serializes (possibly user-edited) slides back to the contracted markdown
 * shape — the source of truth for Copy/.md export, run history, and the
 * round-trip guarantee: parse(serialize(parse(md))) deep-equals parse(md).
 */
export function serializeSlidesToMarkdown(slides: ParsedSlide[]): string {
  return slides
    .map((s, i) => {
      const body = s.bullets.length > 0 ? `**Body:**\n${s.bullets.map((b) => `- ${b}`).join("\n")}\n\n` : "";
      return `## Slide ${i + 1} — ${s.title}\n\n**Headline:** ${s.headline}\n\n${body}**Speaker notes:** ${s.notes}`;
    })
    .join("\n\n---\n\n");
}
