import type { Chapter } from "./types";

// Signature treatment: WORKED EXAMPLE — the doctrine is taught against a
// realistic query table, walked line by line, and the artifact is the monthly
// review routine itself.
export const googleSearchConsole: Chapter = {
  id: "google-search-console",
  number: 2,
  title: "Google Search Console 101",
  subtitle: "Data-driven content planning for law firms",
  hook: "Your audience is already telling you what to write about",
  categories: ["seoAuthority"],
  proofMetric: "Search Authority category score at the next audit — and the count of near-miss queries (positions 7–20) your firm has published targeted articles for this quarter.",
  actionItems: [
    { text: "Log into Google Search Console today and export your top 50 queries — circle every term with high impressions and low clicks", priority: "quick-win" },
    { text: "Run the monthly GSC review (Materials below) and commit the three best near-miss topics to the editorial calendar", priority: "strategic" },
    { text: "Make GSC review a fixed monthly routine owned by marketing, with near-miss movement reported to leadership quarterly", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "checklist",
      title: "The Monthly GSC Review — 30 Minutes",
      body: `1. Performance report → sort by Queries, impressions descending.
2. Flag every query with high impressions and a click-through rate under 2% — your snippet is losing the click (rewrite the title tag and meta description first).
3. Filter by Pages for your five most-visited pages; note the exact phrasing clients use (\"remote work rules in Poland\", not \"cross-border labor compliance\") — that language goes into your headlines.
4. List every query ranking in positions 7–20 with meaningful impressions — the near-miss list.
5. Pick the three near-misses closest to your practice focus; each gets one focused article answering the query in plain English.
6. Log positions for last month's picks. Movement into the top 5 is the proof loop; no movement after 90 days means the article needs depth, not patience.

Rule: decisions leave the room, not observations. Every review ends with three committed topics and one snippet rewrite.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Writing client-relevant content doesn't have to be a guessing game. The data is already there. All you need to do is log in.",
        "Google Search Console (GSC) is a free tool full of actionable insight: what users typed before landing on your site, how often your pages appear, how many people actually click, and which pages carry your visibility."
      ],
      stat: {
        value: "91%",
        label: "of pages get no organic traffic from Google at all — the firms that plan from data are the other 9%",
        source: "Ahrefs content study, 2020"
      }
    },
    {
      heading: "A Worked Example",
      paragraphs: [
        "Open a typical mid-size firm's Performance report and three patterns appear within minutes:"
      ],
      numbered: [
        "\"remote work policy employer obligations\" — 1,400 impressions, position 11, zero clicks. A near-miss: one focused, plain-English article answering that exact question has a realistic path to page one.",
        "\"cross-border labor compliance CEE\" — 60 impressions, position 3, strong click-through. Your language, low volume. Keep the page, but do not build the calendar around it.",
        "\"[firm name] + careers\" — hundreds of impressions. Reputation traffic, not content demand. Exclude it from topic planning."
      ]
    },
    {
      paragraphs: [
        "Three rows, three decisions: invest, maintain, ignore. That is the entire discipline — repeated monthly."
      ],
      callout: {
        type: "pro-tip",
        content: "Filter by 'Queries' and sort by impressions descending. Terms with high impressions but low clicks are your biggest missed opportunities — the headline or snippet is failing, not the page."
      }
    },
    {
      heading: "From Insights to Editorial Calendar",
      paragraphs: [
        "Once a month, export your top 20–50 queries and look for patterns. Recurring themes emerge quickly — a spike in searches about remote work clauses, growing interest in ESG disclosures. These are ready-made topics that reflect what your audience is actively thinking about, validated before you write a word."
      ],
      pullQuote: "GSC is not an SEO professional's toy. It is a window into your target audience's intent — and it is free."
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Reading GSC quarterly or never — search behavior moves monthly; stale data produces stale topics.",
        "Chasing position-40 vanity terms — a near-miss at position 12 converts with one article; a vanity term at position 40 converts with a year.",
        "Writing for the firm's vocabulary instead of the client's — the query list is the client's vocabulary, verbatim.",
        "Ending the review with observations instead of commitments — three topics and one snippet rewrite, every month."
      ]
    },
    {
      paragraphs: [
        "The firms that win search are not the ones with the biggest content budgets. They are the ones that let the audience set the agenda — and GSC is where the audience speaks."
      ]
    }
  ]
};
