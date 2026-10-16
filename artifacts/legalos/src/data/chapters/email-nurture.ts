import type { Chapter } from "./types";

// NEW CHAPTER (Phase 3) — the owned channel between content and conversion.
// Signature treatment: SEQUENCE DESIGN — the welcome series and the flagship
// newsletter as templates.
export const emailNurture: Chapter = {
  id: "email-nurture",
  number: 18,
  title: "Email Nurture",
  subtitle: "The owned channel between attention and engagement",
  hook: "Social rents the audience. Email owns it.",
  categories: ["social", "thoughtLeadership"],
  proofMetric: "Social and Thought Leadership category scores at the next audit — plus list health: subscriber growth month over month, and reply rate on the flagship briefing (replies, not opens, are the trust metric).",
  actionItems: [
    { text: "Draft the 3-email welcome sequence (Materials below) this week — every new subscriber currently gets silence", priority: "quick-win" },
    { text: "Launch the flagship monthly briefing (format in Materials) — one insight, one practical tool, one proof point — and protect the send date", priority: "strategic" },
    { text: "Integrate the list with intake: every non-converting consult and every event contact joins a segment with a relevant sequence", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "template",
      title: "The Welcome Sequence — 3 Emails",
      body: `Every new subscriber gets these over ten days. Written from a named partner, plain text style — no banner, no brochure.

EMAIL 1 (immediately): \"You joined because of [the guide/article they downloaded]. Here it is again [link] — and here's the one idea in it most firms miss: [two sentences]. Next week I'll send how we see clients actually apply it. — [Partner name]\"
EMAIL 2 (day 4): The application email — one short anonymized case where the idea changed an outcome. End with a question: \"What's the situation on your desk right now? Replies come straight to me.\"
EMAIL 3 (day 10): The orientation — what the monthly briefing covers, when it arrives, and the standing invitation: \"Thirty minutes, no pitch, whenever [the topic] lands on your desk.\"

Then they join the flagship cadence. No sequence email sells the firm; each sells the next email.`
    },
    {
      type: "template",
      title: "The Flagship Monthly Briefing — Format",
      body: `Subject: [The insight, stated plainly — \"The clause that's stalling CEE deals this quarter\"]

1. THE INSIGHT (150 words) — one development, what it means for the reader's business, what to do about it. Written to be forwardable.
2. THE TOOL (50 words + link) — one practical artifact: a checklist, a template, a two-question self-test. Useful even to people who never hire you.
3. THE PROOF (30 words) — one line of evidence the firm practices this: a matter, a talk, a result. Restrained, factual.

Footer: who to reply to (a named partner), one-line unsubscribe, no legal disclaimer longer than the briefing itself.

Cadence: monthly, same week, same sender. Twelve issues a year, no exceptions — the cadence IS the message.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Every other channel in this book rents its audience. LinkedIn can throttle reach, Google can change an algorithm, an event ends on Sunday. An email list is the one audience the firm owns outright.",
        "Between the article that got attention and the matter that pays, there is a long middle where most firms go silent. Nurture is what fills it."
      ]
    },
    {
      heading: "The Doctrine",
      numbered: [
        "Email is a trust channel, not a broadcast channel. The metric that matters is replies — a reader who writes back is a relationship; an open rate is a weather report.",
        "Cadence outranks brilliance. A good briefing every month for a year outperforms a brilliant one sent whenever inspiration strikes — the schedule is the promise.",
        "Segmentation is respect. A GC who downloaded your ESG guide should not receive the employment-law briefing; relevance is the whole product."
      ],
      pullQuote: "The goal is not a newsletter people tolerate. It's a briefing they'd notice missing."
    },
    {
      heading: "The Play",
      paragraphs: [
        "Launch the welcome sequence (Materials below) so no subscriber ever meets silence. Establish the flagship monthly briefing with its fixed format — insight, tool, proof — and protect the send date like a court deadline. Then wire the list into intake: every non-converting consult and every event contact joins a relevant segment, and the funnel's middle finally has a floor."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "The firm-news newsletter — 'we attended, we were ranked, we hired' is a memo to yourselves; readers subscribe for their problems, not your announcements.",
        "The design-first email — heavy templates signal 'marketing blast'; a partner's plain, well-written note signals correspondence.",
        "Buying or scraping lists — beyond the GDPR exposure, a list that didn't ask for you converts at zero and damages the domain's deliverability.",
        "The disappearing act — three issues then silence is worse than never starting; it demonstrates exactly the inconsistency the channel exists to disprove."
      ],
      callout: {
        type: "mistake",
        content: "If your briefing could be sent by any firm in your market, it will be read by no one. The insight must come from your practice, your region, your matters — specificity is the subscription."
      }
    },
    {
      paragraphs: [
        "Build the list and the list builds the pipeline. It is the slowest channel in this book to start and the hardest for a competitor to take away."
      ]
    }
  ]
};
