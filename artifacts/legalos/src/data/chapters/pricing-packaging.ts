import type { Chapter } from "./types";

// NEW CHAPTER (Phase 3) — the taboo topic, treated as marketing. Signature
// treatment: COMMUNICATION PLAYBOOK — packaging template + fee-conversation
// script.
export const pricingPackaging: Chapter = {
  id: "pricing-packaging",
  number: 20,
  title: "Pricing & Packaging Communication",
  subtitle: "The page nobody publishes, the question everybody asks",
  hook: "Clients don't expect cheap. They expect legible.",
  categories: ["reputation"],
  proofMetric: "Reputation category score at the next audit — plus consult-to-engagement conversion before and after adding pricing legibility (a model, a range, a packaged offer) to proposals and the site.",
  actionItems: [
    { text: "Publish your fee model in one honest paragraph on the website — not numbers, the logic (how you price, what drives cost, how clients control it)", priority: "quick-win" },
    { text: "Package your three most repeatable matters into named, scoped offers (template in Materials below) with a price or price logic", priority: "strategic" },
    { text: "Train every partner who pitches on the fee-conversation script (Materials below) — pricing raised early, framed around control", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "template",
      title: "The Packaged Offer One-Pager",
      body: `[NAME THE OFFER — the client's job-to-be-done, not the legal category]
\"Series-Ready\" — the funding round legal package
not \"Corporate / VC services\"

[THE SITUATION — 2 sentences]
Who it's for and the moment it matters.

[WHAT'S INCLUDED — 5–7 scoped bullets]
Specific deliverables, drafted documents, number of review rounds, the call cadence.

[WHAT'S NOT INCLUDED — 2–3 honest lines]
The exclusions that prevent the awkward month-two conversation.

[THE PRICE — one of:]
• Fixed fee: EUR X
• Range with drivers: EUR X–Y, depending on [the two real variables]
• Logic: priced at Z% of a full engagement, credited if you proceed

[THE TIMELINE] — weeks, with client responsibilities noted.

[NEXT STEP] — the 30-minute scoping call.

A packaged offer doesn't discount your work — it makes buying it feel as professional as doing it.`
    },
    {
      type: "script",
      title: "The Fee Conversation — Raised First",
      body: `From the partner, in the first substantive call, before the client asks:

\"Before we go further, let me tell you how the money works, because nobody enjoys asking. For a matter like yours we [charge a fixed fee of X / work at hourly rates that typically total between X and Y]. The two things that move it are [variable 1] and [variable 2] — and both are largely within your control: [one sentence each on how]. You'll see the full scope in writing before anything starts, and if it changes, you'll hear it from me before you see it on an invoice.\"

Three commitments inside that paragraph: legibility (they know the shape of the cost), control (they know what moves it), and no surprises (changes are conversations, not invoice line items). That paragraph wins more engagements than any credential slide.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Visit a hundred law firm websites and count how many say anything about price. The number is close to zero — in a profession where the first question in every buyer's head is \"what will this cost me?\"",
        "The silence is usually defended as sophistication (\"every matter is unique\"). Clients experience it as risk: they can't budget you, so they delay calling you."
      ],
      pullQuote: "Pricing opacity doesn't protect your rates. It protects your competitors' phones from ringing less."
    },
    {
      heading: "The Doctrine",
      numbered: [
        "Legibility beats cheapness. General counsel are consistent on this: they don't want low cost at the expense of quality — they want tailored advice and no boilerplate. A clear pricing model signals exactly that: you know your work well enough to scope it.",
        "Packaging is positioning. A named, scoped offer (\"the funding round package\") says more about your expertise than any practice-list bullet — firms that can package a matter have clearly run it dozens of times.",
        "The firm that raises fees first controls the conversation. Bringing up cost before the client asks converts pricing from an objection into a demonstration of how you'll behave during the engagement."
      ]
    },
    {
      heading: "The Play",
      paragraphs: [
        "Start with the one honest paragraph — the fee model, the cost drivers, how clients control them. Then package the three most repeatable matters using the one-pager in Materials. Then drill the fee-conversation script until raising price first feels like what it is: a competitive advantage hiding in plain sight."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "\"Contact us for pricing\" as the whole policy — the visitor reads 'expensive and evasive' and leaves.",
        "Packaging the bespoke — offers built on matters that vary wildly produce scope fights; package only what you've repeated enough to scope honestly.",
        "The hidden variable — a fixed fee with exclusions the client discovers later converts one honest paragraph into a breach of trust.",
        "Race-to-the-bottom packaging — the point of a package is clarity, not discount; a cheap-looking offer undercuts the expertise it was meant to prove."
      ],
      callout: {
        type: "pro-tip",
        content: "Test one packaged offer on the practice page where inquiries already arrive. Measure consult bookings for a quarter. The data usually ends the internal pricing debate."
      }
    },
    {
      paragraphs: [
        "Every other profession learned this decade ago: clarity about cost is a trust signal, not a concession. The first firm in a market to speak plainly about pricing doesn't just win price shoppers — it wins everyone who was afraid to ask."
      ]
    }
  ]
};
