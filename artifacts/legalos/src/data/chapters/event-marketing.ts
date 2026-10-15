import type { Chapter } from "./types";

// Signature treatment: CALENDAR PLAYBOOK — the doctrine is organized as a
// T-minus/T-plus timeline, and the artifact is the calendar itself.
export const eventMarketing: Chapter = {
  id: "event-marketing",
  number: 1,
  title: "Maximizing Event Participation",
  subtitle: "Turn every conference into months of marketing value",
  hook: "Squeeze 10x the value from every conference",
  categories: ["social", "thoughtLeadership"],
  proofMetric: "Social and Thought Leadership category scores at the next audit — and a concrete count: content pieces generated per event, which should move from 2–3 to 12+.",
  actionItems: [
    { text: "Adopt the T-minus-21 event calendar (Materials below) for your firm's next confirmed event — assign an owner today", priority: "quick-win" },
    { text: "Build the post-event article series into your editorial calendar as a standing slot, not an afterthought", priority: "strategic" },
    { text: "Establish a quarterly speaker-interview program: every event your firm touches produces at least one published interview", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "template",
      title: "The Event Content Calendar — T-21 to T+30",
      body: `T-21 days: Publish the speaker/panelist interview on your site and LinkedIn. Announce participation with the session topic, not just the logo.
T-14: Publish the agenda-highlight piece — the three sessions your firm cares about and why.
T-7: Insight article linking a market trend to your firm's presentation topic.
T-0 (during): One team member owns capture — photos of your people, short takeaways from key panels, two real-time posts per day.
T+3: Recap article with your firm's point of view on the headline themes.
T+10: First article in the post-event series (one per presentation you gave or panel that mattered).
T+20: Second series article; bundle both into a one-page event report for your client mailing list.
T+30: Follow-up interviews with the two most valuable contacts met on site — published or private, either way the relationship continues.

Owner rule: one named person is accountable for the whole calendar. Shared ownership is how events produce two photos and nothing else.`
    },
    {
      type: "script",
      title: "The Post-Event Contact Interview — 5 Questions",
      body: `Fifteen minutes, by phone. For general counsel and key contacts met at the event.

1. What was the one session or idea at the event that changed how you'll work this quarter?
2. What's the hardest issue on your desk right now that nobody at the event addressed?
3. How does your team evaluate outside counsel on [the topic your firm presented]?
4. If a firm sent you one short briefing a month on that issue, what would make it worth opening?
5. Who else in your network is thinking about this?

Then: ask permission to quote them (named or anonymized), and send the published piece before you share it publicly. The interview is the relationship; the article is the excuse.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Law firms spend significant resources on event participation — money, time, strategic planning, and preparation of presentations. Most firms do the basics: a short write-up announcing their participation, a few images on social media shared post-event, and perhaps a quick recap on their blog.",
        "These steps are helpful. They also capture a fraction of what the event was worth."
      ],
      callout: {
        type: "insight",
        content: "A single conference can generate 15-20 pieces of unique content when approached strategically — that's what the calendar in the Materials below yields. Most firms produce 2-3."
      }
    },
    {
      heading: "The Doctrine",
      paragraphs: [
        "An event is not a date in the calendar. It is three distinct marketing windows — before, during, and after — and most firms only show up for the middle one. Each window has its own audience: the people deciding whether to attend your session, the people generating the buzz you can ride, and the far larger audience that never attended at all."
      ]
    },
    {
      heading: "The Play — Run the Three Windows on a Timeline",
      numbered: [
        "T-minus-21 to T-minus-7 (before): publish the speaker interview, the agenda-highlight piece, and one insight article tying a market trend to your topic. Pre-event content is what turns attendance into appointments.",
        "T-0 (during): assign one person to capture — photos of your team, short takeaways from key panels, real-time posts while the conversation is loudest.",
        "T-plus-3 to T-plus-30 (after): the article series, the bundled event report for your mailing list, and direct follow-up interviews with the key contacts you met. The follow-up window is where relationships convert — and where most firms go silent.",
        "Repurpose your own presentation: a standalone article, a downloadable resource, a LinkedIn carousel. You already did the research; the content cost is sunk."
      ],
      pullQuote: "The full calendar is in the Materials below. Print it, assign it, and the next conference stops being an expense line and starts being a quarter of content."
    },
    {
      heading: "Failure Modes",
      bullets: [
        "The logo announcement — \"we're attending\" tells nobody why they should care; lead with the topic and the takeaway.",
        "Shared ownership — when everyone owns the event coverage, nobody does; assign one name.",
        "The vanishing act — publishing during the event and disappearing after; the post-event window is the longest and least contested.",
        "Capturing nothing — a presentation nobody wrote down is content you paid for and threw away."
      ],
      callout: {
        type: "mistake",
        content: "The most common waste: spending partner-hours on a 45-minute panel, then letting the entire output be three photos posted a week late."
      }
    },
    {
      paragraphs: [
        "Events are an investment. Run them on a calendar and they compound: visibility, relationships, and a pipeline of material that outlives the venue by months."
      ],
      pullQuote: "A conference should not be a date in the calendar — it should be a platform for visibility, relationships, and business development."
    }
  ]
};
