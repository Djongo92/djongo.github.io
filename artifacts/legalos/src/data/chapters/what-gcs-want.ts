import type { Chapter } from "./types";

// The program's gold-standard pilot (Phase 1) — moved verbatim from the
// original chapters.ts into its own module. Signature treatment: ORAL
// HISTORY — quote-led doctrine from the interview series.
export const whatGcsWant: Chapter = {
  id: "what-gcs-want",
  number: 13,
  title: "What General Counsel Really Want",
  subtitle: "Insights from 130+ in-house interviews",
  hook: "Direct insights from the people who hire law firms",
  categories: ["reputation", "thoughtLeadership"],
  proofMetric: "Reputation and Thought Leadership category scores at your next quarterly audit — plus the share of new inquiries that arrive via recommendation, which should grow quarter over quarter.",
  actionItems: [
    { text: "Score your current pitch deck with the 7-priority self-audit (Materials below) — fix anything scoring 0 before the next pitch goes out", priority: "quick-win" },
    { text: "Run the 8-question listening survey with your top 10 clients this quarter — the managing partner makes the call, not the marketing team", priority: "strategic" },
    { text: "Stand up a quarterly one-page ideas memo to each key client — one proactive, business-first insight, no billable hook attached", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "script",
      title: "The Annual GC Listening Survey — 8 Questions",
      body: `Send to your top 10 clients once a year. Fifteen minutes, by phone if you can — the follow-up questions are where the value lives.

1. Which firms are in your inner circle right now — and what put them there?
2. When you last dropped or replaced a firm, what triggered it?
3. Where does outside counsel most often waste your time or budget?
4. What is one thing you wish your firms would tell you BEFORE you had to ask?
5. How do you actually discover and vet a new firm? (Push past "rankings" — who do you ask?)
6. What does a genuinely useful alert or briefing from a firm look like to you?
7. On a 1–10, how likely are you to recommend us — and what one change would raise the score?
8. Who else in your network should we be talking to?

The rules: the managing partner makes the call, never the marketing team. Never pitch on a survey call. Log every answer verbatim — that language becomes your messaging (see the Messaging & Positioning chapter). Ask the same questions every year; identical questions are what turn anecdotes into trend data.`
    },
    {
      type: "scorecard",
      title: "Pitch Deck Self-Audit — the 7 GC Priorities",
      body: `Score each priority 0 (absent), 1 (claimed), or 2 (proven with evidence a GC could verify). Total out of 14.

1. Expertise & specialization — does the deck prove depth in a niche, or list everything you do?
2. Business understanding — is the client's industry problem named before your services appear?
3. Trust & reputation — are there named references, rankings, or deals a GC can check?
4. Responsiveness — is there a concrete commitment (who answers, how fast), not just "available"?
5. Cost & efficiency — is there a pricing model or fee logic, not just "competitive rates"?
6. Long-term partnership — does the deck show what month 12 looks like, not just the first matter?
7. Proactive advice — does it contain one idea the client didn't ask for?

11–14: send it. 7–10: fix the zeros first. Below 7: the deck is about you, not them — start over from priority 2.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Drawn from more than 130 interviews with general counsel across CEE — conducted by our founder over years of covering the in-house legal market — these are the fundamental factors that shape how GCs choose a law firm.",
        "What follows is the doctrine those interviews handed us — seven priorities, in their words — and then the part most firms skip: how to operationalize them into a listening program, a pitch that survives scrutiny, and a rhythm of proactive advice that compounds."
      ],
      stat: {
        value: "130+",
        label: "in-house counsel interviewed across Central & Eastern Europe",
        source: "interviews conducted by our founder"
      }
    },
    {
      heading: "1. Expertise and Specialization",
      paragraphs: [
        "General counsel engage law firms that showcase deep levels of expertise. They look for firms with a proven track record in a specialized area — not a practice list that reads like a department store directory."
      ],
      pullQuote: "One GC's checklist for a strategic partner: a wide scope of expertise, strong technical knowledge, the social intelligence to follow the client's needs, and a responsive team."
    },
    {
      heading: "2. Understanding the Business",
      paragraphs: [
        "GCs want advisors who understand their business, not just the law. External counsel becomes a long-term partner when they go beyond handling individual matters.",
        "This is testable, and they test it: read the client's annual report before the pitch and reference their margin pressure, their regulator, their expansion market — not \"the market\" in general. A GC can smell a recycled pitch in the first five minutes."
      ]
    },
    {
      heading: "3. Trust and Reputation",
      paragraphs: [
        "GCs pay close attention to reputation. Trust is integral to long-term partnership."
      ],
      pullQuote: "The consistent verdict: reputation matters most — but not from top-tier rankings. GCs rely on recommendations from other in-house lawyers."
    },
    {
      heading: "4. Responsiveness and Speed",
      paragraphs: [
        "Law firms that make their experts available and easy to communicate with are more likely to turn into long-term partners.",
        "\"Available\" claimed is noise. \"Your call is returned within four working hours, and you always know who holds your file\" is a commitment — put it in the proposal and then keep it. Responsiveness is the one priority a firm can fix this week with zero budget."
      ]
    },
    {
      heading: "5. Cost and Efficiency",
      paragraphs: [
        "Cost inevitably plays an important role, but GCs don't want it to come at the expense of quality."
      ],
      pullQuote: "The consistent ask: tailored, relevant advice — not dozens of pages of boilerplate content."
    },
    {
      heading: "6. Long-Term Partnership",
      paragraphs: [
        "In-house teams value consistency. They want firms that can become strategic partners in the long run — which means the pitch should show what month twelve looks like: the review cadence, the knowledge-sharing, the second matter — not just the first engagement."
      ]
    },
    {
      heading: "7. Proactive, Solution-Oriented Advice",
      paragraphs: [
        "GCs favor proactive over reactive advisors. They want firms that anticipate challenges and provide grounded advice."
      ],
      pullQuote: "The consistent message: nobody wants a firm that merely answers the questionnaire — they want ideas brought to the table. Experience matters, but mindset decides."
    },
    {
      heading: "The Play — From Interview Insight to Operating Rhythm",
      numbered: [
        "Listen on a schedule. Run the 8-question listening survey (Materials below) with your top 10 clients once a year — same questions every time, so anecdotes become trend data.",
        "Re-cut the pitch. Score your current deck with the 7-priority self-audit (Materials below); anything at 0 or 1 gets rewritten before the deck goes out again.",
        "Make responsiveness a promise. Name a person and a response commitment in every proposal. It costs nothing and it is the priority GCs feel first.",
        "Institutionalize proactive advice. A quarterly one-page ideas memo per key client: one regulatory or business development, why it matters to them specifically, one suggested move. No billable hook attached — the hook is that you sent it.",
        "Close the loop into messaging. Feed the survey's verbatim language back into your positioning (see Messaging & Positioning). GC phrasing beats agency copy every time."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Surveying clients, then changing nothing — a listening program with no follow-through is worse than none; it teaches clients you collect opinions you ignore.",
        "Treating \"we understand your business\" as a tagline instead of evidence — GCs test the claim in the first meeting.",
        "Chasing rankings while neglecting recommendations — the interviews were explicit: GCs rely on other in-house lawyers, not league tables.",
        "Sending legal updates instead of business insight — in the interviews, multi-page boilerplate briefings were described as the first thing that gets deleted unread."
      ],
      callout: {
        type: "mistake",
        content: "The most expensive misread: hearing these seven priorities as marketing themes. They are operating standards. A GC discovers which one you chose within a single matter."
      }
    },
    {
      paragraphs: [
        "None of this requires a rebrand or a budget line. It requires listening on a schedule, pitching against the evidence, and showing up with ideas before you're asked. The firms that do it stop competing on price and start getting recommended — which, the interviews make clear, is how the decision actually gets made."
      ],
      pullQuote: "Experience matters, but mindset decides."
    }
  ]
};
