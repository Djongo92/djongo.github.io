import type { Chapter } from "./types";

// Signature treatment: DOCTRINE + AUDIT — the three pillars, with the
// credibility audit that scores a firm's current state against them.
export const buildingCredibility: Chapter = {
  id: "building-credibility",
  number: 12,
  title: "Building Credibility",
  subtitle: "Three pillars for smaller firms",
  hook: "Build trust from zero with three proven pillars",
  categories: ["reputation", "performance"],
  proofMetric: "Reputation category score at the next audit — plus the credibility audit score (Materials below), re-run after each quarter of pillar work.",
  actionItems: [
    { text: "Write your firm's origin story in plain, human language — one page, no corporate register", priority: "quick-win" },
    { text: "Run the credibility audit (Materials below) and fix the cheapest zero first", priority: "strategic" },
    { text: "Launch a monthly insight series in your niche and protect the cadence for four consecutive quarters", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "scorecard",
      title: "The Credibility Audit — 9 Checks Across 3 Pillars",
      body: `Score each 1 (in place) or 0 (missing/stale). Group by pillar.

AUTHENTIC MESSAGING
[ ] The homepage names who you serve and what changes for them
[ ] The origin story exists on the site, written like a human
[ ] No headline survives a competitor's name pasted over it

THE WEBSITE
[ ] Loads fast on a phone connection
[ ] No broken links, empty sections, or dead social icons
[ ] Profiles show real matters and current photos

THOUGHT LEADERSHIP
[ ] A named-author article published within the last 30 days
[ ] The niche is narrow enough that a GC would say \"that's their topic\"
[ ] Every article ends in a next step

7–9: credible — protect the cadence. 4–6: credible in places; fix the empty pillar first. 0–3: every claim you make is unsubstantiated; start with messaging, it's free.`
    }
  ],
  content: [
    {
      paragraphs: [
        "In the legal industry, trust and credibility are foundational. Smaller firms without name recognition have to build both from the ground up.",
        "The hard part is having real expertise. Once the firm has that, projecting credibility is a craft — three pillars, maintained on a cadence."
      ]
    },
    {
      heading: "1. Authentic Messaging",
      paragraphs: [
        "Projecting credibility isn't about sounding grandiose. Focus on what genuinely sets the firm apart — who you serve, what problems you solve, your specific strengths.",
        "Develop a voice for the brand. Professional doesn't mean impersonal; the target is the balance between polished and genuine — and it starts with the origin story, told like it happened, not like it was approved."
      ]
    },
    {
      heading: "2. A Website That Doesn't Argue Against You",
      paragraphs: [
        "Your website is often the first touchpoint. Polish here means mobile responsiveness, accessibility, fast loading, easy navigation, clean structure.",
        "A website won't win clients by itself. But broken links, clunky layout, and dated profiles create barriers that your expertise then has to climb over."
      ]
    },
    {
      heading: "3. Thought Leadership in a Niche",
      paragraphs: [
        "Thought leadership isn't about being the loudest. It's consistently sharing valuable insight in a niche narrow enough to own — until a GC describes the topic by your firm's name."
      ],
      pullQuote: "Credibility can't be conjured out of thin air. It's built brick by brick — in how your firm shows up, communicates, and differentiates itself."
    },
    {
      heading: "The Play",
      paragraphs: [
        "Run the nine-check audit (Materials below), fix the empty pillar first — messaging is free and fast, the website is cheap and measurable, thought leadership is slow and compounding. Sequence them in that order and the credibility account starts accruing this month."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Borrowed grandeur — writing like a global firm when you're a twelve-person boutique reads as costume, not confidence.",
        "The one-quarter cadence — an insight series that dies after three issues is worse than none; it proves the firm starts things it doesn't finish.",
        "Polish without proof — a beautiful site with no named matters or recent writing is a wrapper with nothing inside.",
        "Spreading across niches — credible in five areas is credible in none; own one, expand from strength."
      ]
    }
  ]
};
