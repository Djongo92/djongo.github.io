import type { Chapter } from "./types";

// Signature treatment: DOCTRINE + ARTIFACTS — the six principles tighten into
// rules, and the materials are the author-page and article-footer standards.
export const thoughtLeadership: Chapter = {
  id: "thought-leadership",
  number: 5,
  title: "Thought Leadership Done Right",
  subtitle: "Showcase the experts behind the content",
  hook: "Turn your lawyers into recognized industry voices",
  categories: ["thoughtLeadership"],
  proofMetric: "Thought Leadership category score at the next audit — and the share of published articles carrying a named byline, linked profile, and next-step call to action (target: 100%).",
  actionItems: [
    { text: "Audit your five most recent articles against the byline standard (Materials below) — fix missing photos, profiles, and CTAs this week", priority: "quick-win" },
    { text: "Ship 'More by [Author]' modules and the standard article footer across the insights section", priority: "strategic" },
    { text: "Build a standing recognition file per expert — rankings, deals, media, talks — reviewed and refreshed quarterly", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "checklist",
      title: "The Byline Standard — Every Article, Every Time",
      body: `Before any article publishes, confirm:
[ ] Full author name and current title in the byline
[ ] Professional photo — recent, consistent in style with the rest of the firm
[ ] Byline links to the author's profile page
[ ] Profile page lists representative deals/matters and the clients' industries (with permission)
[ ] "More by [Author]" module at the foot of the article
[ ] One clear next step: contact the author, download the related guide, subscribe, or book an introductory call
[ ] Author's recognition visible somewhere on the profile: rankings, notable matters, media mentions, speaking

If a box can't be checked, the article waits. A faceless article builds the website's authority; a bylined one builds the firm's.`
    },
    {
      type: "template",
      title: "The Standard Article Footer",
      body: `[Author photo + name + title, linked to profile]
[Author] leads the firm's [practice] work and advises [types of clients] on [types of matters].

More by [Author]:
• [Related article 1 — linked]
• [Related article 2 — linked]

Next step: If [the issue in this article] is on your desk this quarter, [Author] is reachable at [email] — or subscribe to our [topic] briefing for monthly updates.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Most law firms have a thought leadership section on their website. Too often, it showcases content while hiding the people who wrote it — and people, not pages, are what clients hire."
      ]
    },
    {
      heading: "The Doctrine — Six Rules",
      numbered: [
        "Always include clear bylines. Full name and professional photo on every article. Readers remember experts, not institutions.",
        "Link to author profiles. A reader who finishes a useful article wants the author next. No link means that momentum dies at the footer.",
        "Recommend more by the same author. Recognition is built by a body of work, not a single piece — 'More by [Author]' turns one article into a portfolio.",
        "Give every piece a next step. Contact the author, download the guide, subscribe, book a call. An insight that ends nowhere converts no one.",
        "Offer social proof. Awards, rankings, notable deals, media mentions, speaking engagements — evidence the expert is recognized beyond your own website.",
        "Be consistent. Authority is the product of steady visibility over quarters, not one strong article."
      ],
      pullQuote: "Over time, steady visibility creates a reputation that no generic, faceless blog ever will."
    },
    {
      heading: "The Play",
      paragraphs: [
        "Adopt the Byline Standard (Materials below) as a publishing gate: nothing ships without byline, profile link, related-work module, and a next step. Then build the recognition file — a maintained document per expert that makes social proof a habit rather than a scramble before every directory submission."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "The institutional byline — 'Marketing Team' or no byline at all tells the reader the firm doesn't stand behind its own experts.",
        "The dead-end article — strong content with no next step is a conversation the firm started and then walked out of.",
        "The stale profile — a profile last updated three years ago quietly contradicts every claim of currency the articles make.",
        "Campaign thinking — three articles in one month, then silence; authority compounds on cadence, not bursts."
      ]
    },
    {
      paragraphs: [
        "Thought leadership is not a section of the website. It is the public record of your people's expertise — treat every article as evidence in that record."
      ]
    }
  ]
};
