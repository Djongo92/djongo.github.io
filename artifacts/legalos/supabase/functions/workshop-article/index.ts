// Article / Insight Drafter — client alerts, insight pieces, explainers and
// opinion pieces meant to be published on the firm's OWN site under a named
// author. Thought Leadership is the heaviest scoring pillar, and the score
// rewards own-site articles with a named byline, so the drafter is built to
// produce exactly that: a publishable piece, an SEO title/description, and a
// list of facts a human must verify before it goes live.
import { handleWritingTool, field } from "../_shared/writingTool.ts";

const LENGTHS: Record<string, string> = {
  short: "about 500 words",
  standard: "about 900 words",
  long: "about 1,500 words",
};

Deno.serve(handleWritingTool({
  toolId: "article",
  memoryQuery: (b) => `${field(b.format, 60)} ${field(b.topic, 300)}`,
  maxTokens: 4500,
  build: (b) => {
    const format = field(b.format, 60) || "Client alert";
    const length = LENGTHS[field(b.length, 20)] ?? LENGTHS.standard;
    const system = `You are a senior legal-insight editor. You draft articles that a law firm publishes on its own website under a named partner's byline — pieces that get read, shared, cited by the press, and that win work.

Format: ${format}. Target length: ${length}.

Structure (use markdown):
1. "## Headline options" — 3 distinct headlines (a plain one, a benefit-led one, a sharp/provocative one). Under 70 characters each.
2. "## Article" — the piece itself:
   - A one-sentence standfirst under the title that states the point.
   - An opening that leads with what changed and why the reader should care, in the first two sentences. No throat-clearing.
   - Short sections with clear subheadings.
   - A "What this means in practice" section with concrete, numbered steps or decisions the reader now faces.
   - If the brief gives the firm's view, make it unmistakable and defensible — a real position, not a survey of "on the one hand".
   - A short, low-pressure close inviting contact, naming the author (use the byline name if given, otherwise [AUTHOR NAME, TITLE]).
3. "## For publishing" — an SEO title (≤60 chars), a meta description (≤155 chars), 3–5 tags, and 2 internal-link suggestions described generically (e.g. "link to your employment practice page").
4. "## Verify before publishing" — a bullet list of every legal citation, date, threshold, figure or claim in the draft that a lawyer must check against the primary source. Be exhaustive; this protects the firm.

If source material (text of a law, ruling or notice) is supplied, base every legal statement on it and quote section/article numbers exactly as given. If none is supplied, keep legal statements general and mark specifics as [CITE: …] placeholders rather than guessing.`;
    const user = [
      `Topic / trigger: ${field(b.topic, 1500)}`,
      b.audience ? `Who it's for: ${field(b.audience, 400)}` : "",
      b.view ? `The firm's view / angle: ${field(b.view, 1500)}` : "",
      b.byline ? `Author byline: ${field(b.byline, 120)}` : "Author byline: not supplied — use a placeholder.",
      b.sources ? `Source material (primary text to rely on):\n${field(b.sources, 8000)}` : "No source material supplied.",
    ].filter(Boolean).join("\n\n");
    return { system, user };
  },
}));
