import type { Chapter } from "./types";

// Signature treatment: BOARD MEMO — the case for marketing as a strategic
// function, written to be forwarded to the partnership, with the one-page
// strategy and KPI set as the materials.
export const marketingAsStrategy: Chapter = {
  id: "marketing-as-strategy",
  number: 11,
  title: "Marketing as a Strategic Function",
  subtitle: "Give marketers a seat at the table",
  hook: "Marketing isn't a cost center — it's your growth engine",
  categories: ["thoughtLeadership"],
  proofMetric: "The existence and use of the three KPIs: marketing-influenced pipeline conversations, content-influenced inquiries, and cost per qualified inquiry — reviewed at partners' meetings quarterly.",
  actionItems: [
    { text: "Invite your marketing lead to the next partners' meeting with one agenda item: the growth plan for next quarter", priority: "quick-win" },
    { text: "Adopt the three-KPI scoreboard (Materials below) and review it at every quarterly partners' meeting", priority: "strategic" },
    { text: "Build the annual one-page marketing strategy (Materials below) aligned to the firm's growth objectives — reviewed, not shelved", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "template",
      title: "The One-Page Marketing Strategy",
      body: `Fits on one page. Reviewed quarterly, rewritten annually.

OBJECTIVE: The business goal marketing serves this year (e.g., \"three new retained clients in [practice]\"). One objective, not five.
AUDIENCE: The specific buyer (role, industry, situation) — from the positioning statement.
POSITION: The line-three differentiator from the positioning statement.
CHANNELS: The 2–3 channels that reach the audience (e.g., LinkedIn + one flagship newsletter + two industry events). Every channel has an owner and a cadence.
PROOF ASSETS: What we'll publish to demonstrate expertise (12 articles, 2 guides, quarterly GC briefing).
MEASUREMENT: The three KPIs below, with current baseline and 12-month target.
BUDGET & PEOPLE: Money, hours, and the name accountable.

If a tactic can't be traced to the objective, it doesn't get funded.`
    },
    {
      type: "checklist",
      title: "The Three-KPI Scoreboard",
      body: `Track monthly; review with partners quarterly. Each KPI ties to business development — no vanity metrics.

[ ] 1. Marketing-influenced pipeline — new conversations where the prospect had read, seen, or attended something before the first call (ask at intake; log it)
[ ] 2. Content-influenced inquiries — inbound inquiries citing an article, guide, or briefing
[ ] 3. Cost per qualified inquiry — total marketing spend ÷ qualified inquiries (a qualified inquiry fits the positioning statement's audience)

Baseline first, targets second: three months of honest baselining beats a year of aspirational targets. A KPI that can't be measured this month is a wish — simplify it until it can.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Marketing isn't an afterthought. It's a strategic function. Yet many law firms still sideline the very people they brought in to help them grow.",
        "Today's clients do their own homework — Googling your firm, checking individual lawyers, reading your articles, comparing you to competitors. All before the first call."
      ],
      stat: {
        value: "70%",
        label: "of the B2B buying journey is completed before a prospect ever contacts the firm",
        source: "Forrester buyer research"
      }
    },
    {
      heading: "The Doctrine — What Real Marketers Deliver",
      bullets: [
        "Crystallize your firm's positioning and tone of voice — no more generic buzzwords",
        "Align branding across all channels for consistent trust-building",
        "Unify metrics and analytics — measure what drives new business, not likes",
        "Evaluate and amplify thought leadership — make content more engaging and more visible"
      ],
      paragraphs: [
        "None of that is a task list. All of it is strategy — and strategy requires a seat where strategy is decided."
      ]
    },
    {
      heading: "Consistency Is Everything",
      paragraphs: [
        "One-off LinkedIn posts or occasional event participation won't build reputation. Marketing compounds on consistency: content calendars, dedicated resources, performance data, and long-term relationships with industry partners."
      ],
      pullQuote: "Good marketing gets visibility. Great marketing gets the right visibility."
    },
    {
      heading: "The Play",
      paragraphs: [
        "Put the marketing lead in the partners' meeting with a one-page strategy (Materials below) and a three-KPI scoreboard that ties spend to pipeline. The page forces choices — one objective, two or three channels, named owners — and the scoreboard makes the function accountable in the same language the firm uses for everything else it values."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Strategy as ceremony — an annual offsite deck that no one opens until the next offsite.",
        "Vanity dashboards — impressions and likes reported to partners teach leadership that marketing is decoration.",
        "The task-list hire — an experienced marketer handed errands will leave; the firm will conclude marketing doesn't work.",
        "Funding tactics, not objectives — a webinar here, a sponsorship there; without the one-page strategy, every yes is random."
      ]
    },
    {
      paragraphs: [
        "If you've hired a marketer with real experience, don't just hand them a list. Give them a seat at the table — and let them challenge the assumptions the firm stopped questioning."
      ]
    }
  ]
};
