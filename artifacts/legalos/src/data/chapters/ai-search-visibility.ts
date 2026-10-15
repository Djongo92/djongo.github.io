import type { Chapter } from "./types";

// NEW CHAPTER (Phase 3) — the 2026 differentiator. Signature treatment:
// FIELD GUIDE — how AI answers pick sources, and the checklists that make a
// firm citable.
export const aiSearchVisibility: Chapter = {
  id: "ai-search-visibility",
  number: 19,
  title: "AI-Search Visibility",
  subtitle: "Being the answer when clients ask ChatGPT, not Google",
  hook: "The next referral question is typed into an AI. Will it name you?",
  categories: ["seoAuthority", "thoughtLeadership"],
  proofMetric: "SEO Authority and Thought Leadership category scores at the next audit — plus the monthly AI-citation check (Materials below): your firm should move from absent to named on at least one tracked question.",
  actionItems: [
    { text: "Run the five-question AI-citation check (Materials below) on ChatGPT, Perplexity, and Gemini today — record who gets named instead of you", priority: "quick-win" },
    { text: "Reformat your top five practice pages and articles into answer-ready structure: question headings, direct answers up front, named authors with credentials", priority: "strategic" },
    { text: "Build the citation moat: original data, named expert commentary, and quotable definitions published on a cadence AI models can observe", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "checklist",
      title: "The Monthly AI-Citation Check",
      body: `Once a month, ask each major AI assistant (ChatGPT, Perplexity, Gemini) the five questions your clients actually ask. Record the answers in a spreadsheet — dated.

The five questions (adapt to your practice):
1. \"Which law firms in [city/country] specialize in [your niche]?\"
2. \"What should a [client type] know about [your regulatory area]?\"
3. \"How much does [your typical matter] usually cost in [market]?\"
4. \"What changed in [your area] law this year?\"
5. \"Who are recognized experts on [your niche] in [market]?\"

Log: was the firm named? Was a firm page or article cited? Who was named instead — and what did they publish that you haven't?

The output is an editorial to-do list: every question where a competitor is cited is a piece of content you need to write better.`
    },
    {
      type: "checklist",
      title: "The Answer-Ready Page Checklist",
      body: `AI assistants cite pages they can parse and trust. For each key page:
[ ] Headings phrased as the questions clients actually ask
[ ] The direct answer in the first two sentences under each heading — nuance after
[ ] Named author with credentials and a linked profile (anonymous text is unverifiable text)
[ ] A publication and update date, kept honest
[ ] Concrete specifics — numbers, jurisdictions, deadlines — over generalities
[ ] A short FAQ section at the foot of key pages (the exact format AI answers mirror)
[ ] Consistent firm description across the site, directories, and profiles — models reconcile sources, and contradictions cost citations
[ ] Original material AI can't get elsewhere: your data, your survey results, your definitions`
    }
  ],
  content: [
    {
      paragraphs: [
        "A growing share of professional research now starts in an AI assistant rather than a search box. The question \"which firm handles cross-border employment disputes in Poland?\" increasingly gets a synthesized answer — with names — instead of ten blue links.",
        "For law firms this changes the economics of visibility: there is no page two of an AI answer. You are either cited or invisible."
      ],
      callout: {
        type: "insight",
        content: "AI assistants don't rank pages — they assemble answers from sources they can parse, verify, and quote. The optimization target shifts from keywords to citability."
      }
    },
    {
      heading: "The Doctrine",
      numbered: [
        "Answer-first structure wins. Models extract passages that directly answer questions; a page that buries its answer under three paragraphs of preamble is invisible to the summarizer.",
        "Authority is inferred, not claimed. Named authors, dated pages, consistent facts across sources, and presence in directories and rankings all feed the models' picture of who is credible — the reputation work in this book doubles as AI-visibility work.",
        "Original material is the moat. An AI can summarize anyone's generic overview; it can only cite the firm that published the data, the survey, or the definition. Original research is the one input competitors can't replicate."
      ]
    },
    {
      heading: "The Play",
      paragraphs: [
        "Baseline yourself with the monthly citation check (Materials below) — most firms have never asked an AI the questions their clients ask, and the answers are clarifying. Then reformat the top pages answer-first (checklist in Materials), and start publishing the kind of original material — survey data, market definitions, regulatory timelines — that makes your firm a source rather than a summary."
      ],
      pullQuote: "Classic SEO asked: how do I rank? AI search asks: how do I become quotable? The second question has better answers."
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Keyword thinking — stuffing practice-area terms into text a model will never quote; questions and direct answers are the unit now.",
        "The anonymous library — a hundred well-written articles with no byline are a hundred unverifiable sources.",
        "Set-and-forget — AI answers shift monthly as models retrain; the citation check is a standing routine, not a one-off audit.",
        "Contradictory footprint — three different firm descriptions across the site, LinkedIn, and directories teach the model to trust none of them."
      ]
    },
    {
      paragraphs: [
        "The firms that treated websites as brochures lost the search decade. The firms that treat content as citable source material will own the answer decade."
      ]
    }
  ]
};
