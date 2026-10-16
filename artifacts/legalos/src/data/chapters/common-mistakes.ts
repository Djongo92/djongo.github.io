import type { Chapter } from "./types";

// Signature treatment: SCORED SELF-ASSESSMENT — the ten mistakes become a
// timed sweep; the artifact is the sweep checklist with fix times.
export const commonMistakes: Chapter = {
  id: "common-mistakes",
  number: 14,
  title: "Common Website Mistakes",
  subtitle: "Small oversights that chip away at credibility",
  hook: "10 mistakes that silently hurt your firm's reputation",
  categories: ["performance", "reputation"],
  proofMetric: "Website Experience and Recognition category scores at the next audit — plus a standing zero on the ten-point sweep, re-run monthly; the sweep should take under an hour once the fixes are done.",
  actionItems: [
    { text: "Run the ten-point sweep (Materials below) right now — the footer year and dead social icons take under 30 minutes combined", priority: "quick-win" },
    { text: "Fix every failing item with a named owner this week; escalate anything touching templates to your web vendor with a deadline", priority: "strategic" },
    { text: "Put the sweep on a monthly recurring calendar invite — these mistakes return quietly after every site update", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "checklist",
      title: "The Ten-Point Sweep — Under an Hour",
      body: `Run monthly, in order. Fix time in brackets.
[ ] 1. Footer copyright year is current [2 min]
[ ] 2. No expandable sections that open to nothing [10 min to find, delete or fill]
[ ] 3. Every social icon links to a live, active profile — or is removed [10 min]
[ ] 4. Internal links open in the same tab; only true external references open new ones [15 min spot-check]
[ ] 5. Footer carries contacts, offices, and regulatory details — it's prime real estate [15 min]
[ ] 6. Every testimonial is named — anonymous praise reads as invented praise [5 min to check]
[ ] 7. Maps widget loads and points at the right office [5 min]
[ ] 8. No hamburger menu on desktop — full navigation visible on large screens [check; template fix if failing]
[ ] 9. No \"Published by Admin\" or stray dates on About / Team / Practice pages [10 min]
[ ] 10. Hover states make buttons clearer, never invisible [5 min spot-check]

Any zero found two months running isn't a mistake — it's a process gap. Assign the page an owner.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Law firms can claim to be next-generation, world-class, or strategic all day long. None of it matters if clarity and proof are nowhere to be found — and nothing contradicts a claim of excellence faster than a copyright notice from three years ago."
      ]
    },
    {
      heading: "The Doctrine",
      paragraphs: [
        "Credibility is lost by accumulation. No single stale footer or dead icon loses a mandate — but clients read a firm's website the way lawyers read contracts: the small details are the evidence of how the big work gets done. Ten small oversights, taken together, answer the visitor's real question: does this firm sweat details, or just say it does?"
      ],
      callout: {
        type: "quick-win",
        content: "Most of these fixes take less than 30 minutes each. Start with the footer copyright year and broken social links — the fastest credibility repair available anywhere in marketing."
      }
    },
    {
      heading: "The Play — Sweep Monthly, Fix Immediately",
      paragraphs: [
        "The ten-point sweep is in the Materials below, ordered by check time. The whole pass takes under an hour; most fixes take minutes. The discipline is the cadence: these mistakes don't arrive once, they return with every site update, every departed employee's profile, every plugin that quietly stops working."
      ]
    },
    {
      heading: "What's Working Well",
      paragraphs: [
        "Some firms in the region are getting it right — the patterns worth copying:"
      ],
      bullets: [
        "Dedicated notable-clients pages with linked case details",
        "Rankings and recognition sections kept genuinely current",
        "Active newsrooms covering legal developments, not just firm news",
        "Client tools: courses, apps, benchmarking resources",
        "Downloadable guide libraries on practical topics",
        "Clearly defined service packages that set expectations",
        "Consistent LinkedIn presence with updates embedded on the homepage",
        "Expert profiles highlighting the key deals each lawyer has led"
      ],
      pullQuote: "Sometimes it's not a full overhaul. It's doing a few important things well — and then not letting them decay."
    },
    {
      heading: "Failure Modes",
      bullets: [
        "The one-time sweep — fixing everything in January and watching it rot by June; cadence is the system.",
        "\"The vendor will notice\" — vendors build; nobody inspects. The sweep needs an owner inside the firm.",
        "Fixing forward only — new pages get the standard while old pages keep the mistakes; the sweep covers the whole site.",
        "Dismissing the small stuff — every item on the list is a detail a detail-oriented client will absolutely find."
      ]
    }
  ]
};
