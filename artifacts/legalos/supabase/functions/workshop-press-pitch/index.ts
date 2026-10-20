// Press Pitch Builder — turns a deal, ruling, hire, ranking or article into
// a pitch for trade/business press. Press mentions (independent coverage of
// the firm) feed the Thought Leadership score, so this is the tool that
// turns firm news into earned coverage.
import { handleWritingTool, field } from "../_shared/writingTool.ts";

Deno.serve(handleWritingTool({
  toolId: "pitch",
  memoryQuery: (b) => `${field(b.storyType, 60)} ${field(b.story, 300)}`,
  maxTokens: 4000,
  build: (b) => {
    const system = `You are a legal PR specialist who has placed hundreds of stories in the legal and business trade press. Journalists receive dozens of pitches a day; yours must be easy to say yes to.

Produce (markdown):
1. "## Subject lines" — 3 options, each under 60 characters, factual and specific. No hype, no ALL CAPS, no "exclusive" unless the brief says it is.
2. "## Pitch email" — under 150 words. First line: the news in one sentence (who, what, why it matters). Then the one detail that makes it more than routine. Then what you can offer the journalist (a quote, a named lawyer for comment, a client willing to speak, background). End with a single clear ask. Plain text, no attachments assumed.
3. "## Short announcement" — a 120–180 word news-style item the outlet could run nearly as-is: headline, dateline placeholder, the facts, one approved-for-use quote, firm boilerplate placeholder.
4. "## Quotes for approval" — 2 draft quotes for the named spokesperson. Each must sound like a person talking, add insight rather than repeat the facts, and be clearly marked DRAFT — SPOKESPERSON MUST APPROVE.
5. "## Follow-up" — a 2-line follow-up to send 3 working days later if there is no reply.
6. "## Before you send" — a checklist: client consent to be named and to the disclosed terms, deal value disclosure, embargo timing, whether any regulator or court restriction applies, correct spelling of every name and title, and the right journalist/outlet (a one-line reason each suggested outlet type fits).

Tone suits the outlet type given. Never claim the story is more significant than the facts support.`;
    const user = [
      `Story type: ${field(b.storyType, 80) || "Deal / matter"}`,
      `The story: ${field(b.story, 2500)}`,
      b.newsworthy ? `Why it's newsworthy: ${field(b.newsworthy, 1000)}` : "",
      b.facts ? `Key facts (parties, advisers, value, dates, jurisdictions):\n${field(b.facts, 2500)}` : "",
      b.spokesperson ? `Spokesperson: ${field(b.spokesperson, 200)}` : "Spokesperson: not supplied — use [NAME, TITLE].",
      b.outlet ? `Target outlet / type: ${field(b.outlet, 200)}` : "Target outlet: legal trade press.",
      `Client consent to be named: ${field(b.consent, 80) || "unknown — treat as NOT confirmed and anonymise"}`,
      b.embargo ? `Embargo / timing: ${field(b.embargo, 200)}` : "",
    ].filter(Boolean).join("\n\n");
    return { system, user };
  },
}));
