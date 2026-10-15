import type { Chapter } from "./types";

// Signature treatment: ANNOTATED REWRITE + TEMPLATE — the firm-centric page
// gets rewritten client-first, and the artifact is the reusable page skeleton.
export const practiceAreaPages: Chapter = {
  id: "practice-area-pages",
  number: 8,
  title: "Revitalizing Practice Area Pages",
  subtitle: "Turn boring pages into your site's most persuasive asset",
  hook: "Your most visited pages are probably your weakest",
  categories: ["seoAuthority", "reputation"],
  proofMetric: "SEO Authority and Reputation category scores at the next audit — plus bounce rate and time-on-page for the top three practice pages, which should move measurably within a quarter of the rewrite.",
  actionItems: [
    { text: "Rewrite your single highest-traffic practice page using the client-first skeleton (Materials below) — one page proves the model", priority: "quick-win" },
    { text: "Roll the skeleton across every practice area page, adding case examples and outcomes to each", priority: "strategic" },
    { text: "Set a quarterly freshness routine: every practice page gets a recent matter, article, or regulatory update each quarter", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "template",
      title: "The Client-First Practice Page Skeleton",
      body: `[H1: The client's situation, in their words]
\"Facing pressure from investors on ESG disclosures?\" — not \"Corporate Law.\"

[Opening: 2–3 sentences naming the challenge and its cost of inaction]

[How it resolves: the outcome, not the service list]
\"You close the round with disclosures investors sign off on.\"

[Proof: 2–3 recent matters with outcomes — anonymized where required]
\"Advised a regional manufacturer through its first CSRD cycle — zero qualified findings.\"

[The people: named experts with one line each on what they've actually done]

[Keep it current: latest article or regulatory development in this area]

[Next step: one clear, low-commitment action]
\"A 30-minute scoping call — what the new rules mean for your next filing.\"`
    }
  ],
  content: [
    {
      paragraphs: [
        "If there's one corner of a law firm website guaranteed to underperform, it's the practice area pages. In most cases, visitors get a couple of generic paragraphs followed by a laundry list of services.",
        "These pages segment your audience by intent — that is marketing gold. A visitor on your employment law page has an employment problem. Why greet that moment with boilerplate?"
      ],
      callout: {
        type: "mistake",
        content: "\"Our firm is a recognized leader in corporate law\" tells the client nothing about how you solve their problem. Lead with their situation instead."
      }
    },
    {
      heading: "An Annotated Rewrite",
      paragraphs: [
        "Before: \"Our Corporate Practice provides comprehensive legal services across the full spectrum of corporate matters, leveraging deep expertise and a client-focused approach.\"",
        "After: \"Selling a division? Buying a competitor? The structure you choose in week one determines the tax, liability, and timeline you live with in year three. We structure the deal before the term sheet hardens.\"",
        "What changed: the reader's situation replaced the firm's self-description, an outcome replaced a service list, and a concrete claim (\"before the term sheet hardens\") replaced an unverifiable one (\"deep expertise\")."
      ]
    },
    {
      heading: "The Play",
      paragraphs: [
        "Rebuild one page on the client-first skeleton (Materials below): lead with the client's challenge, focus on outcomes, show proof through recent matters, name the experts, keep it fresh, and end with a low-commitment next step. Prove the bounce rate moves on one page, then roll the pattern across the practice."
      ],
      pullQuote: "Stop letting your practice area pages put clients to sleep. Shift the focus to their problems, show real results, and make the content worth reading."
    },
    {
      heading: "Failure Modes",
      bullets: [
        "The laundry list — twenty bullet services tell the client you do everything and specialize in nothing.",
        "The invisible expert — a headshot and a title convey nothing; one line on what the person has actually done conveys everything.",
        "The static page — a practice page untouched since launch quietly claims the firm hasn't done anything lately.",
        "Firm-first ordering — accolades before the client's problem reads as insecurity, not strength."
      ]
    },
    {
      paragraphs: [
        "Practice pages are where intent meets your website. They should read like the beginning of the engagement, not the back of a brochure."
      ]
    }
  ]
};
