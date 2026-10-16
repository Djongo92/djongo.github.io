import type { Chapter } from "./types";

// Signature treatment: ANNOTATED REWRITE — the doctrine is demonstrated on a
// realistic passage, line by line, then codified as house style rules.
export const writingThatResonates: Chapter = {
  id: "writing-that-resonates",
  number: 6,
  title: "Writing That Resonates",
  subtitle: "Clarity signals mastery",
  hook: "Why the best legal writers sound nothing like lawyers",
  categories: ["thoughtLeadership"],
  proofMetric: "Thought Leadership category score at the next audit — and average draft readability: every published article at Flesch Reading Ease 50+ (measure drafts, not intentions).",
  actionItems: [
    { text: "Run your three most recent articles through a readability checker and rewrite the headlines to lead with the client's stake", priority: "quick-win" },
    { text: "Adopt the eight house style rules (Materials below) as the editing checklist for everything the firm publishes", priority: "strategic" },
    { text: "Institute a pre-publish readability gate: no article ships below Flesch 50 without a partner's explicit sign-off", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "checklist",
      title: "The House Style — Eight Rules",
      body: `1. Lead with why it matters to the reader — the stakes come before the statute.
2. One idea per sentence. If a sentence needs a map, split it.
3. Write in the client's vocabulary, not the profession's (\"selling your company\", not \"divestiture processes\").
4. Every section ends with something the reader can do, decide, or watch for.
5. Short paragraphs — three lines is a paragraph, six is a wall.
6. Name the actor. \"The court ruled\" not \"it was ruled.\"
7. Concrete beats comprehensive: one worked example outweighs three caveats.
8. Read it aloud. Anywhere you run out of breath, the reader runs out of patience.

Gate: every published draft scores Flesch Reading Ease 50+ (most business writing lands at 60–70; in our reviews of firm websites, the average article scores below 30).`
    }
  ],
  content: [
    {
      paragraphs: [
        "Some articles stand out — more engaging, easier to follow, more likely to make a reader remember the firm behind them. What sets them apart isn't legal knowledge. It's how that knowledge is framed.",
        "This isn't storytelling in the literary sense. It's context, clarity, and relevance — disciplines as learnable as citation format."
      ],
      comparison: {
        before: { title: "Typical Legal Writing", items: ["Dense paragraphs of legalese", "No context for why it matters", "Written for lawyers, not clients", "Generic conclusions"] },
        after: { title: "Writing That Resonates", items: ["Clear, scannable structure", "Leads with 'why it matters to you'", "Written in the client's language", "Actionable takeaways"] }
      }
    },
    {
      heading: "An Annotated Rewrite",
      paragraphs: [
        "Before: \"Pursuant to the recent amendments to the applicable regulatory framework, undertakings operating within the affected sectors are advised to undertake a comprehensive review of their contractual arrangements in order to ensure ongoing compliance.\"",
        "After: \"The rules changed. If your contracts predate March, review them now — the amended framework applies to every sector agreement signed or renewed this year.\"",
        "What changed: the actor is named (\"your contracts\"), the stakes lead (\"the rules changed\"), one sentence does one job, and the reader leaves with an action instead of an admonition. Nothing about the law was simplified — only the sentence was."
      ],
      pullQuote: "True expertise isn't the ability to construct a paragraph-long sentence. It's making complicated concepts easy to understand.",
      deepDive: {
        title: "The Flesch-Kincaid Readability Test",
        content: "The Flesch-Kincaid test measures how easy a text is to understand. Most successful business content scores 60-70 (easily understood by a 13-15 year old). In our reviews of firm websites, the average law firm article scores below 30. You don't need to dumb anything down — running drafts through a readability checker simply reveals where convoluted sentence structures are hiding clear ideas."
      }
    },
    {
      heading: "The Play",
      paragraphs: [
        "Codify the eight house rules (Materials below), attach the readability gate to the publishing checklist, and measure drafts — not intentions. Within a quarter, clarity stops being a talent some lawyers have and becomes the house standard."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Complexity as armor — the belief that difficult writing signals deep knowledge; readers read it as a lack of respect for their time.",
        "The disclaimer lede — opening with what the article isn't; the reader came for what it is.",
        "Written for peer review — if the imagined reader is another lawyer, the actual reader (a GC, a founder) is gone by paragraph two.",
        "Editing by committee — six partners adding caveats until the point dissolves; one editor owns the final voice."
      ]
    },
    {
      paragraphs: [
        "In a saturated content landscape, clarity is an edge. That's not just good writing — it's good marketing."
      ]
    }
  ]
};
