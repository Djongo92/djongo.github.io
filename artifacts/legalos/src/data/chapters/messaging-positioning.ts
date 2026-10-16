import type { Chapter } from "./types";

// Signature treatment: DOCTRINE + WORKSHOP TOOLS — the positioning statement
// template and the banned-phrases list make the argument operational.
export const messagingPositioning: Chapter = {
  id: "messaging-positioning",
  number: 10,
  title: "Messaging & Positioning",
  subtitle: "Skip the buzzwords. Say something real.",
  hook: "Stand out in a sea of 'trusted advisors'",
  categories: ["reputation", "thoughtLeadership"],
  proofMetric: "Recognition category score at the next audit — plus the interchangeability test: your homepage headline should fail word-for-word the moment a competitor's name replaces yours.",
  actionItems: [
    { text: "Run the interchangeability test: paste a competitor's name into your homepage headline — if it still works, start the positioning statement (Materials below) this week", priority: "quick-win" },
    { text: "Rewrite the homepage headline and practice-page ledes from the finished positioning statement", priority: "strategic" },
    { text: "Adopt the banned-phrases list (Materials below) into the house style guide and enforce it at the editing gate", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "template",
      title: "The Positioning Statement — Five Lines",
      body: `Fill in every line. If a line could describe a competitor, it isn't finished.

1. We exist for: [the specific client — industry, size, situation. \"Mid-market manufacturers facing their first cross-border dispute,\" not \"businesses\"]
2. Who come to us when: [the triggering moment — the event that makes them call]
3. We are the firm that: [the one thing you do differently — approach, model, or focus]
4. Which means: [the outcome the client gets, in their terms]
5. And we can prove it by: [deals, data, named results]

Test: read line 3 aloud with a competitor's name. If it still sounds true, sharpen it until it doesn't.`
    },
    {
      type: "checklist",
      title: "The Banned-Phrases Starter List",
      body: `Banned on sight — each claims everything and communicates nothing:
[ ] \"Leading law firm\"
[ ] \"Trusted advisor(s)\"
[ ] \"Your reliable partner\"
[ ] \"First-class / world-class services\"
[ ] \"Full-service\"
[ ] \"Tailored solutions\" (unqualified — tailored to what?)
[ ] \"Client-focused approach\"
[ ] \"Excellence\" as a standalone claim
[ ] Stock handshake / skyline photography

Replacement rule: every banned phrase must be swapped for something verifiable — a number, a named matter type, a deadline you keep, a client situation you recognize. \"Responsive\" becomes \"calls returned within four working hours.\"`
    }
  ],
  content: [
    {
      paragraphs: [
        "\"Leading law firm.\" \"Trusted advisors.\" \"Your reliable partner.\" \"First-class services.\" Add a corporate stock photo of a handshake and the set is complete.",
        "When did the profession agree to say exactly the same thing?"
      ],
      pullQuote: "Saying you're premier on repeat doesn't convince a single prospect that you are.",
      callout: {
        type: "mistake",
        content: "If you replaced your firm's name with a competitor's on your homepage and the messaging still works — your positioning needs work."
      }
    },
    {
      heading: "The Doctrine",
      paragraphs: [
        "Firms study their competitors and unconsciously fit the mold, producing a sea of sameness with no personality behind the brand. The mold feels safe. It is the most expensive choice available: interchangeable messaging forces every pitch to compete on price and proximity, because nothing else distinguishes you."
      ]
    },
    {
      heading: "Boutique vs. Large Firms",
      paragraphs: [
        "Large firms can survive generic messages — they have the name, the history, the headcount. Smaller firms don't have that luxury, and they don't need it.",
        "What boutique firms have is deep focus, tailored solutions, direct access to senior experts, and speed. Those are the foundations to compete on — and unlike 'excellence,' each one is checkable by the client within a single engagement."
      ]
    },
    {
      heading: "Firms That Stand Out",
      bullets: [
        "\"We are problem solvers\" — Isikal Law Office",
        "\"From legal complexity to business clarity\" — AMB Legal Group",
        "\"Tell us your target\" — Pekin & Pekin"
      ],
      pullQuote: "The firms that stand out aren't necessarily the biggest. They're the ones that know who they are, what they're good at, and who they're here to help."
    },
    {
      heading: "The Play",
      paragraphs: [
        "Write the five-line positioning statement (Materials below) in one partner meeting, sharpen line three until it fails under a competitor's name, then propagate it: homepage headline, practice-page ledes, pitch decks, proposal covers. Positioning that lives in a workshop document and not on the website is a conversation, not a decision."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Positioning by committee — every partner adds a constituency until the statement describes everyone and no one.",
        "The unverifiable superlative — 'premier,' 'leading,' and 'trusted' are claims; a client can only verify proof.",
        "Messaging that stops at the homepage — the pitch deck, the proposals, and the email signatures are where positioning actually gets read.",
        "Rewriting annually, deploying never — a positioning statement that doesn't change the website within a month was an offsite exercise."
      ]
    }
  ]
};
