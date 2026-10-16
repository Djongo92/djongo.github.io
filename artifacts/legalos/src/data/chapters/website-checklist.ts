import type { Chapter } from "./types";

// Signature treatment: SCORED SELF-ASSESSMENT — the 16 essentials become a
// point-scored inspection; the artifact is the scorecard itself.
export const websiteChecklist: Chapter = {
  id: "website-checklist",
  number: 7,
  title: "The Website Checklist",
  subtitle: "16 essentials every law firm website needs",
  hook: "The definitive 16-point inspection for your firm's site",
  categories: ["performance", "seoAuthority"],
  proofMetric: "Website Experience and Search Authority category scores at the next audit — plus your checklist score out of 16, re-run quarterly until it holds at 15+.",
  actionItems: [
    { text: "Score your site against the 16-point scorecard (Materials below) today — every zero becomes a named fix with an owner", priority: "quick-win" },
    { text: "Fix the three highest-impact gaps first: positioning, mobile experience, and conversion points", priority: "strategic" },
    { text: "Put the checklist on a quarterly audit cadence so standards don't decay as the site evolves", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "scorecard",
      title: "The 16-Point Website Scorecard",
      body: `Score each item 1 (in place and current) or 0 (missing, stale, or untested). No half points — a broken conversion form is a zero.

1. Positioning — a first-time visitor can say why this firm over another within 10 seconds
2. Distinct voice — clear, direct language; not interchangeable with a competitor
3. Thought leadership section — publishing on a visible cadence
4. Navigation — simple menu; any page reachable in two clicks
5. Expert profiles — deals, client types, and current matters per lawyer
6. Practice area pages — front and center, one page per practice
7. Conversion points — at least one low-commitment step (newsletter, guide, call)
8. Social proof — named testimonials, deals, cases
9. Mobile experience — designed for phones, not merely shrunk
10. Load speed — key pages load fast on a phone connection
11. Local search — consistent name/address/phone across directories
12. Accessibility — readable fonts, contrast, alt text, keyboard navigation
13. Privacy policy and disclaimers — present and current
14. Analytics and consent — tracking with proper cookie consent (GDPR)
15. Security and backups — HTTPS, updates, tested restore
16. Visual polish — consistent typography and spacing; no clutter

14–16: strong — keep the cadence. 10–13: credible but leaking trust. Below 10: the site is actively costing you work; fix zeros in the order listed.`
    }
  ],
  content: [
    {
      paragraphs: [
        "When a potential client lands on your firm's website, do they instantly know what your firm does, what makes it different, and why they should trust your legal experts? Many firms, chasing the most impressive possible site, get distracted from the real purpose: building trust, fast."
      ],
      stat: {
        value: "75%",
        label: "of users judge a company's credibility from its website design",
        source: "Stanford Web Credibility Research"
      }
    },
    {
      heading: "The Doctrine",
      paragraphs: [
        "A law firm website is not a portfolio piece; it is a trust machine with sixteen moving parts. The sixteen essentials — positioning, voice, thought leadership, navigation, expert profiles, practice areas, conversion points, social proof, mobile experience, speed, local search, accessibility, privacy, analytics and consent, security, and polish — fail independently and compound positively. Each one is cheap to fix and expensive to lack."
      ],
      pullQuote: "Mobile devices now account for the majority of website traffic — a site designed desktop-first is designed for the minority of your visitors. (Statista, 2025)"
    },
    {
      heading: "The Play — Inspect, Don't Admire",
      paragraphs: [
        "Run the scorecard in the Materials below quarterly, in one sitting, with someone who didn't build the site. Score honestly — the point of the inspection is the zeros. Fix in the order that costs you trust fastest: positioning first (what you say), mobile and speed second (how it feels), conversion points third (what visitors can do next)."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Scoring with the agency in the room — the builder grades generously; inspect independently.",
        "Half-point thinking — 'the form mostly works' is a zero that loses inquiries every week.",
        "The launch-day mindset — every item on the list decays; quarterly re-inspection is the whole system.",
        "Chasing redesigns instead of zeros — a beautiful site with broken conversion points is an expensive brochure."
      ]
    },
    {
      paragraphs: [
        "Sixteen points, one quarterly hour, zero excuses. The firms with trustworthy websites aren't the ones with the biggest budgets — they're the ones still checking."
      ]
    }
  ]
};
