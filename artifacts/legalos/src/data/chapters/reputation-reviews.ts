import type { Chapter } from "./types";

// NEW CHAPTER (Phase 3) — the audit's Reputation category finally has
// doctrine. Signature treatment: OPERATING SYSTEM — three recurring machines
// (GBP, reviews, rankings), each with its artifact.
export const reputationReviews: Chapter = {
  id: "reputation-reviews",
  number: 15,
  title: "Reputation & Reviews",
  subtitle: "The proof layer: Google, reviews, and rankings",
  hook: "Your reputation already has a score — the only question is whether you manage it",
  categories: ["reputation"],
  proofMetric: "Recognition category score at the next audit — plus review count and average rating on Google (baseline today, target +1 review per matter closed), and at least one directory submission per cycle.",
  actionItems: [
    { text: "Claim and fully complete your Google Business Profile today — categories, services, photos, Q&A — and respond to every existing review", priority: "quick-win" },
    { text: "Adopt the review-ask script (Materials below) as a standing step in every matter-closing process", priority: "strategic" },
    { text: "Build the annual rankings calendar (Chambers, Legal500, local awards) with submission owners and deadlines — a missed cycle is a silent year", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "script",
      title: "The Review Ask — Matter Closing",
      body: `Timing: within 48 hours of a successful close, from the partner who ran the matter — never from marketing.

\"It's been a pleasure getting this across the line with you. We ask one thing of every client at this point: if the work earned it, would you leave us a short Google review? Two sentences about what we handled and how it went means more to a firm our size than any award — and it takes about two minutes. Here's the direct link: [link]\"

Rules: ask every client, not just the enthusiasts. Never script the content. Never incentivize. If the answer suggests hesitation, that's a service signal — follow up privately, not with a second ask.`
    },
    {
      type: "template",
      title: "The Rankings Calendar",
      body: `Annual cycle, one owner per submission. Miss nothing.

JANUARY: Review last year's results; note researcher feedback. Refresh the recognition file per lawyer (deals, rankings, media).
FEBRUARY–MARCH: Chambers submissions — referees briefed (they will be called), matter descriptions written in plain English, one per practice.
APRIL–MAY: Legal500 submissions — same matter base, re-cut to their format.
JUNE–AUGUST: Local and industry awards (regional CEE awards, practice-specific lists) — lower effort, high local visibility.
SEPTEMBER–OCTOBER: Interviews and referee follow-ups; correct factual errors in published research.
NOVEMBER–DECEMBER: Publish results across site, LinkedIn, proposals. Plan next year's referee list.

The compounding truth: rankings reward consistency. Firms that submit every cycle with real referees rise; firms that submit occasionally stay 'notable.'`
    }
  ],
  content: [
    {
      paragraphs: [
        "When a prospect hears your firm's name — from a referral, an event, a search result — the next thing they do is look you up. What they find in that sixty seconds is your reputation layer: the Google Business Profile, the reviews, the rankings, the directory listings.",
        "Most firms treat that layer as weather — something that happens to them. It is closer to a balance sheet: it accrues, it compounds, and it is auditable."
      ],
      callout: {
        type: "insight",
        content: "In interview after interview, general counsel said they rely on recommendations from other in-house lawyers more than on rankings. Reviews and rankings are where those recommendations become visible to everyone who didn't get the phone call."
      }
    },
    {
      heading: "The Doctrine — Three Machines",
      numbered: [
        "The Google Business Profile is your second homepage. For local and referred searches it is often the first thing seen — before your website. Incomplete profiles, stale photos, and unanswered reviews quietly tax every other marketing effort.",
        "Reviews are the referral made visible. A steady cadence of recent, specific, two-sentence reviews outperforms a handful of glowing ones from 2021 — recency is credibility.",
        "Rankings (Chambers, Legal500, regional awards) are slow-moving but decisive in formal procurement. They reward firms that submit every cycle with real referees — and skip firms that submit occasionally."
      ]
    },
    {
      heading: "The Play",
      paragraphs: [
        "Claim and complete the GBP this week. Wire the review ask into matter closings (script in Materials). Put the rankings calendar (Materials) on the same footing as tax deadlines — with named owners and no exceptions. None of this is creative work; it is operational, which is precisely why most firms never do it."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "The silent profile — an unclaimed or half-empty GBP signals a firm that doesn't manage details.",
        "The review drought — twelve reviews from three years ago read worse than none; stale proof is doubt.",
        "Arguing with reviewers — respond to every review once, professionally, briefly; the response is written for the next hundred readers, not the reviewer.",
        "Submission-year amnesia — rankings season arrives every year; firms without a calendar discover the deadline a week after it passes."
      ],
      callout: {
        type: "mistake",
        content: "Never buy, incentivize, or ghost-write reviews. Beyond the ethics rules most bar associations enforce, a pattern of fake reviews is the single fastest way to convert a reputation asset into a liability."
      }
    },
    {
      paragraphs: [
        "Reputation work is unglamorous and cumulative — exactly like compound interest. The firms that start now own the search results their competitors will be trying to rent in three years."
      ]
    }
  ]
};
