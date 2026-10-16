import type { Chapter } from "./types";

// Signature treatment: CALENDAR PLAYBOOK (seasonal) — doctrine organized as a
// summer sprint schedule with a before/after contrast.
export const summerMarketing: Chapter = {
  id: "summer-marketing",
  number: 3,
  title: "The Summer Advantage",
  subtitle: "Why smart firms never slow down",
  hook: "While competitors pause, your content has the stage",
  categories: ["social", "thoughtLeadership"],
  proofMetric: "Social and Thought Leadership category scores at the autumn audit — plus September pipeline: conversations started in September that trace back to summer content.",
  actionItems: [
    { text: "Publish two finished-but-unreleased articles in the next two weeks — the queue exists, use it", priority: "quick-win" },
    { text: "Map the September–December editorial calendar before August (Materials below)", priority: "strategic" },
    { text: "Make the summer sprint a standing annual program with a named owner, reviewed every June", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "template",
      title: "The Summer Sprint Calendar — 8 Weeks",
      body: `Week 1: Publish the strongest unreleased article in the queue. Update the three highest-traffic pages on the site.
Week 2: LinkedIn series begins — one lighter-format post per week per active partner (a single idea, a short case lesson, a contrarian take).
Week 3: Reconnect week — ten direct notes to dormant clients and contacts. No pitch; a useful article and a question.
Week 4: Publish article two. Refresh expert profile pages: new deals, new photos, current matters.
Week 5: Draft the September–December editorial calendar from the GSC near-miss list (see Google Search Console 101).
Week 6: Repurpose the year's best-performing piece into a second format — carousel, short guide, or checklist.
Week 7: Publish article three. Book autumn event/speaking slots while competitors are away.
Week 8: September launch review — calendar locked, first September piece drafted, pipeline notes from the reconnect week routed to partners.

Constraint: every week ships something public. Momentum is the strategy.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Every summer, law firms go quiet. Content slows, newsletters pause, and the assumption sets in that July and August are dead months for marketing.",
        "That assumption is the opportunity. The audience does not disappear in summer — the competition does."
      ],
      comparison: {
        before: { title: "What Most Firms Do", items: ["Pause newsletters in July-August", "Delay campaigns until September", "Assume nobody's reading", "Let social media go quiet"] },
        after: { title: "What Smart Firms Do", items: ["Publish while competition is low", "Build September pipeline now", "Reconnect during downtime", "Dominate a quieter news feed"] }
      }
    },
    {
      heading: "The Doctrine",
      paragraphs: [
        "Decision-makers operate at a different pace in summer — fewer meetings, more reading, more headroom. Content published in a quiet feed earns attention that September content has to fight for. And the work done in July is the pipeline that exists in October: editorial calendars, refreshed profiles, reconnected contacts, booked speaking slots."
      ],
      pullQuote: "Everyone waits for September to ramp up again. The firms that win September never slowed down to begin with."
    },
    {
      heading: "The Play — An Eight-Week Sprint",
      paragraphs: [
        "The full schedule is in the Materials below. The shape: publish the backlog in weeks one and four, run the reconnect campaign in week three, build the autumn calendar in week five, and ship something public every single week. The sprint works because it is bounded — eight weeks, one owner, visible output."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Treating the sprint as optional — a summer program that dies the first busy week was never a program; give it an owner and a weekly shipped artifact.",
        "Saving the best material for September — publish the strong pieces when the feed is empty; September has its own calendar.",
        "Reconnecting with a pitch — the summer note works because it asks for nothing; lead with something useful.",
        "Measuring likes instead of pipeline — the metric that matters is October conversations that trace back to July work."
      ]
    },
    {
      paragraphs: [
        "Summer is the one season where consistency is a differentiator rather than table stakes. Use it once and you will not give it back."
      ]
    }
  ]
};
