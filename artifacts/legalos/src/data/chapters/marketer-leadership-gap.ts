import type { Chapter } from "./types";

// Signature treatment: BOARD MEMO — written so a marketing lead can forward
// it to the managing partner unchanged. The artifact is the meeting that
// operationalizes it.
export const marketerLeadershipGap: Chapter = {
  id: "marketer-leadership-gap",
  number: 4,
  title: "Bridging the Gap",
  subtitle: "The disconnect between marketers and managing partners",
  hook: "Why your best marketing hire might be underperforming",
  categories: ["thoughtLeadership"],
  proofMetric: "Content output per month (target: a steady 8–15 pieces) and Thought Leadership category score at the next audit — output volume is the visible symptom of the alignment gap closing.",
  actionItems: [
    { text: "Send this chapter to your managing partner with one question attached: what have we said no to lately, and was it for the right reason?", priority: "quick-win" },
    { text: "Institute the monthly alignment meeting (agenda in Materials below) and grant marketing editorial sign-off on routine content", priority: "strategic" },
    { text: "Establish the one-article-per-month-per-partner commitment as a standing firm expectation, reviewed quarterly", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "template",
      title: "The Monthly Alignment Meeting — 45 Minutes",
      body: `Standing agenda, marketing lead + managing partner (or the partner sponsor):

1. Scoreboard (10 min) — pieces published, pipeline conversations touched, one metric that moved and one that did not. No vanity metrics.
2. The ask (10 min) — the one thing marketing needs from leadership this month: a partner byline, a decision, a budget line. One ask, not a list.
3. The blockers (10 min) — what is stuck in review, what is waiting on a partner, what is about to miss its window.
4. Delegation check (10 min) — what routine decision is leadership still holding that marketing could own? Move one per month.
5. Commitments (5 min) — each side leaves with a dated deliverable.

Rules: decisions are made in the room or explicitly delegated. Nothing carries twice. The meeting exists to remove friction, not to perform alignment.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Law firms across CEE are investing more in marketing than ever before. Yet inside many firms, marketers still operate without the authority, tools, or backing the role requires.",
        "This is rarely incompetence or malice. It is a misalignment of priorities — and it is expensive."
      ],
      callout: {
        type: "insight",
        content: "The gap between marketers and partners isn't about skill — it's about empowerment. Firms that bridge it publish several times more content with the same team."
      }
    },
    {
      heading: "The Doctrine — Three Fault Lines",
      numbered: [
        "Marketers want manageable websites; partners want standout designs. A site the marketing team cannot update without an agency ticket trades control for aesthetics — and the trade compounds every week a change waits.",
        "Marketers want content; partners don't see it as essential. Content is how a firm demonstrates expertise before the first call. If each legal professional committed to one article per month, marketing would have a pipeline of around fifteen pieces to publish, share, and repurpose.",
        "Marketers want responsiveness; partners want perfection. A solid campaign launched this week beats a flawless one launched next quarter. Every round of internal edits has a price measured in missed moments."
      ],
      pullQuote: "A brand that moves slowly loses visibility. Progress beats perfection."
    },
    {
      heading: "The Play",
      paragraphs: [
        "Close the gap structurally, not rhetorically: a monthly alignment meeting with a fixed agenda (Materials below), editorial sign-off delegated to marketing for routine content, and a standing per-partner content commitment. None of this requires new budget. All of it requires leadership to decide what it will stop holding."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Alignment as a slogan — without a standing meeting and dated commitments, 'we support marketing' dissolves by Thursday.",
        "The perfection veto — partners reviewing routine posts rewrite them into their own voice and teach marketing to stop trying.",
        "Delegation without authority — giving marketing responsibility for output while withholding sign-off power guarantees the bottleneck persists.",
        "Hiring experience, assigning errands — a senior marketer given a task list will leave; the firm will conclude 'marketing doesn't work here.'"
      ],
      callout: {
        type: "mistake",
        content: "If you're on the leadership team, the diagnostic is one question: what have you said no to lately — and was it for the right reason?"
      }
    },
    {
      paragraphs: [
        "Marketers and managing partners want the same thing: a strong reputation, a visible brand, a growing firm. The firms that get there are the ones where the people hired to make it happen are given the tools, the backing, and the freedom to do the job."
      ]
    }
  ]
};
