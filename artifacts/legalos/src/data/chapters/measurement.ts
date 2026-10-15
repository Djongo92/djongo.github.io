import type { Chapter } from "./types";

// NEW CHAPTER (Phase 3) — closes the loop: how to know any of this worked.
// Signature treatment: OPERATING CADENCE — the monthly one-page scorecard and
// the KPI tree.
export const measurement: Chapter = {
  id: "measurement",
  number: 21,
  title: "Measurement for Skeptics",
  subtitle: "Prove marketing works with numbers partners respect",
  hook: "The question isn't whether marketing works. It's whether you can show it.",
  categories: ["performance"],
  proofMetric: "Performance category score at the next audit — plus the monthly scorecard itself: twelve consecutive months of one-page reviews is the metric that proves the measurement system works.",
  actionItems: [
    { text: "Build the one-page scorecard (Materials below) with current baselines this week — honest zeros included", priority: "quick-win" },
    { text: "Run the first monthly scorecard review with the managing partner — thirty minutes, decisions only", priority: "strategic" },
    { text: "After three months of baselines, set 12-month targets per KPI and review quarterly against them", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "template",
      title: "The Monthly One-Page Scorecard",
      body: `One page, five numbers, reviewed monthly with leadership. Each line: current month / rolling 3-month trend / 12-month target (set after baseline).

1. VISIBILITY — qualified website sessions (filter out careers-page and bot traffic; direction matters more than precision)
2. AUTHORITY — pieces published (articles, briefings) and AI/search presence: positions on your tracked near-miss queries
3. REPUTATION — new reviews this month, average rating, referral share of new matters (from intake logging)
4. PIPELINE — marketing-influenced inquiries: new conversations where the prospect had read, seen, or attended something first
5. ECONOMICS — cost per qualified inquiry: total marketing spend ÷ qualified inquiries

Rules: every number has a named owner. A number that worsens two months running gets an action, not an apology. Anything that can't be traced to a decision gets cut from the page — the scorecard's power is its size.`
    },
    {
      type: "checklist",
      title: "The KPI Tree — From Activity to Revenue",
      body: `Map every marketing activity to the number it actually moves. If it moves nothing, stop funding it.

ACTIVITIES (inputs you control):
[ ] Articles published → feeds AUTHORITY
[ ] Review asks at matter closing → feeds REPUTATION
[ ] Event calendar (T-21 system) → feeds VISIBILITY + PIPELINE
[ ] Newsletter cadence → feeds PIPELINE (replies, reactivations)
[ ] Intake SLA + follow-up sequence → feeds ECONOMICS (conversion)

LAGGING OUTCOMES (what partners care about):
[ ] Qualified inquiries per month
[ ] Matters won where marketing touched the journey
[ ] Revenue per marketing euro (annual view only — monthly is noise)

The tree's discipline: report activities monthly, outcomes quarterly, revenue annually. Each has a natural frequency; forcing them onto one timeline manufactures panic.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Every managing partner eventually asks the question: what did we get for that? Marketing that can't answer in numbers gets its budget cut in the next downturn — a pattern as predictable as any in this book.",
        "The failure is usually not results but instrumentation: the firm was doing the right things and measuring nothing that could prove it."
      ],
      callout: {
        type: "insight",
        content: "Vanity metrics (impressions, likes, follower counts) don't just fail to persuade partners — they actively teach leadership that marketing is decoration. Measure money-adjacent numbers or don't present numbers at all."
      }
    },
    {
      heading: "The Doctrine",
      numbered: [
        "Baseline before targets. Three months of honest measurement beats a year of aspirational KPIs; a target without a baseline is a wish with a deadline.",
        "Report at each number's natural frequency. Activities monthly, outcomes quarterly, revenue annually — forcing everything onto one dashboard manufactures either panic or complacency.",
        "Attribution belongs at intake, not in software. The single highest-value measurement act in this book is asking every new inquiry how they found you and writing down the name.",
        "The scorecard is a decision tool. Every number on it exists to trigger a specific action when it moves; a metric that changes nothing is decoration."
      ]
    },
    {
      heading: "The Play",
      paragraphs: [
        "Build the one-page scorecard (Materials below), baseline it for a quarter, then set twelve-month targets. Map every funded activity onto the KPI tree — anything that connects to no number gets defunded without ceremony. Within two quarters the budget conversation changes from 'why do we spend this' to 'what would doubling it buy.'"
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "The data theater — a 30-metric dashboard no one reads; five numbers with owners outperform fifty without.",
        "Precision theater — agonizing over exact session counts while the direction is obvious; measurement exists to make decisions, not to be right.",
        "Monthly revenue attribution — legal sales cycles run months; judging marketing on this month's revenue punishes exactly the investments that pay next year.",
        "Measuring to defend, not to decide — a scorecard built to justify last year's budget will never find the thing that isn't working."
      ]
    },
    {
      paragraphs: [
        "Twenty chapters of doctrine end here, in five numbers on one page. The firms that measure don't just prove their marketing works — they're the only ones who actually know whether it does."
      ],
      pullQuote: "You don't need more metrics. You need five numbers, an owner for each, and the discipline to look at them every month."
    }
  ]
};
