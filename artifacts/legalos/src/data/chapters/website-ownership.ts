import type { Chapter } from "./types";

// Signature treatment: DOCTRINE + DECISION ARTIFACTS — the argument for
// in-house control, with the audit checklist and CMS scorecard to act on it.
export const websiteOwnership: Chapter = {
  id: "website-ownership",
  number: 9,
  title: "Own Your Website",
  subtitle: "Why in-house management is a strategic imperative",
  hook: "Stop outsourcing your most important digital asset",
  categories: ["performance"],
  proofMetric: "Performance category score at the next audit — plus update latency: the time from 'this change is approved' to 'it's live,' which should fall from days to minutes.",
  actionItems: [
    { text: "Run the agency dependency audit (Materials below): list every change you cannot make without your vendor, and what each costs in days", priority: "quick-win" },
    { text: "Train the marketing team to CMS independence for the ten most common updates (news, profiles, articles, practice pages)", priority: "strategic" },
    { text: "If you're on a proprietary platform, plan the migration to a widely-supported CMS with full export — before the next invoice cycle, not during a crisis", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "checklist",
      title: "The Agency Dependency Audit",
      body: `For each item, note whether you can do it in-house today — and if not, the vendor's typical turnaround and cost:
[ ] Publish a new article or insight
[ ] Update a lawyer's profile (photo, deals, bio)
[ ] Change homepage copy or imagery
[ ] Add or edit a practice area page
[ ] Fix a broken link or form
[ ] Read your own analytics and export the data
[ ] Export your full site content (text, images, structure) in a portable format
[ ] Add a landing page for a campaign
[ ] Update the footer (year, offices, regulatory details)
[ ] Restore the site from a backup you control

Scoring: 8–10 in-house = healthy. 4–7 = dependent; fix the top three gaps this quarter. 0–3 = dependent to the point of risk; the migration conversation starts now.`
    },
    {
      type: "scorecard",
      title: "The CMS Selection Scorecard",
      body: `Score any candidate platform 0–2 per line (0 = no, 1 = with effort, 2 = out of the box). Walk away below 12/16.

1. A non-developer can publish and edit content
2. Full content export in standard formats — no lock-in
3. Large third-party support market (you can hire help anywhere)
4. You own hosting and domain outright
5. Security updates are routine and documented
6. Forms, landing pages, and analytics without vendor tickets
7. Multilingual support (CEE reality)
8. Transparent pricing — no per-change fees

The tell during any agency pitch: ask them to show you, live, how you would make the ten most common updates yourself. The answer is the relationship.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Many law firms treat their website as a project to hand to an external agency. Outsourcing all website management is a strategic — and usually financial — mistake."
      ]
    },
    {
      heading: "The Doctrine — Four Reasons",
      numbered: [
        "Your website is an extension of your firm. The strongest firm sites reflect the firm's identity authentically; a site managed entirely by a third party drifts out of sync with reality within months.",
        "Agility matters. New deals, regulatory updates, and industry events arrive weekly. Someone in-house can respond the same day; a vendor queue responds the same week — if you're lucky.",
        "Control costs. With modest training, your marketers implement changes in minutes. What an agency bills as a week of work is often twenty minutes in a CMS.",
        "Avoid vendor lock-in. Proprietary platforms make leaving painful by design. A widely-supported CMS keeps your website a business asset you own rather than a service you rent."
      ],
      pullQuote: "Your website should be an asset you control — not a service you rent at someone else's pace."
    },
    {
      heading: "The Play",
      paragraphs: [
        "Start with the dependency audit (Materials below) — it converts a vague discomfort into a priced list. Then close the top gaps with training, and let the agency relationship shrink to what agencies are actually for: design systems, complex builds, and specialist work. If the audit reveals a proprietary platform, the CMS scorecard is how you evaluate the way out."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "The big-agency look — a glossy build your team can't update trades control for aesthetics, and the bill repeats monthly.",
        "Overpaying for permanence — you are not building the next Facebook; a clean, well-structured site goes live in weeks.",
        "Accepting jargon — any agency that can't show you how you'll make changes yourself is describing the lock-in, politely.",
        "Migrating in a crisis — platform exits forced by a vendor failure cost triple; plan them in calm quarters."
      ]
    },
    {
      paragraphs: [
        "A good website is a tool for connecting with clients. Own the tool."
      ]
    }
  ]
};
