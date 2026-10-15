import type { Chapter } from "./types";

// NEW CHAPTER (Phase 3) — the channel GCs themselves named first, finally with
// a playbook. Signature treatment: SYSTEM DESIGN — two networks (referrers,
// alumni) as standing programs with scripts.
export const referralsAlumni: Chapter = {
  id: "referrals-alumni",
  number: 16,
  title: "Referrals & Alumni Systems",
  subtitle: "The channel everyone names, almost nobody runs",
  hook: "Your best source of work is a system, not a hope",
  categories: ["reputation", "social"],
  proofMetric: "Recognition and Social Presence category scores at the next audit — plus referral attribution: the share of new matters traceable to a named referrer or alumnus, logged at intake. Baseline it this quarter; grow it every quarter after.",
  actionItems: [
    { text: "Add 'how did you hear about us?' to every intake conversation and log the answer by name — you cannot grow a channel you don't measure", priority: "quick-win" },
    { text: "List your top 20 referrers and 20 most-placed alumni; schedule a substantive touch with five of each this quarter (script in Materials)", priority: "strategic" },
    { text: "Stand up the alumni program — quarterly bulletin, annual event, matter-alumni congratulations — as a owned, budgeted line, not a sentiment", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "script",
      title: "The Referrer Touch — Quarterly",
      body: `For clients, other professionals (accountants, bankers, consultants), and past GCs who send work your way.

The touch is value-first, never a reminder invoice:
\"Saw [regulatory development / market event] and thought of your situation at [company] — one paragraph on what it means for you: [insight]. No action needed; flag it if it lands.\"

Quarterly rhythm per referrer: one value touch, one thank-you (prompt, specific, private) for any referral sent, one personal note (promotion, deal, their firm's news). Twice a year: a face-to-face — coffee, event invitation, site visit.

The ask, used sparingly (once a year at most):
\"If someone in your network mentions [the problem you solve], we'd be glad to be the call you make. Here's the two-line description of what we do that makes referring us easy: [lines].\"`
    },
    {
      type: "checklist",
      title: "The Alumni Program — Minimum Viable",
      body: `Every lawyer who leaves in good standing is a future client, referrer, or boomerang hire. Minimum viable program:
[ ] A maintained alumni list with current roles (reviewed twice a year)
[ ] A quarterly alumni bulletin — firm developments written for insiders, not a client newsletter forwarded
[ ] Congratulations on every move: promotion, in-house transition, new venture — personal note from their former supervising partner
[ ] One alumni event per year — substantive content plus the partners they'll refer to
[ ] A \"welcome back\" path — alumni returning laterally is the cheapest senior hire in the profession
[ ] Alumni who land in-house get the GC treatment from day one (see What GCs Really Want)

Cost: a few hours a quarter. Return: the profession's most trusted referral channel.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Ask any managing partner where the best work comes from and the answer is instant: referrals. Ask what the firm systematically does to earn them and the answer is usually silence.",
        "Ask general counsel how they choose firms and the answer is consistent: recommendations from other in-house lawyers. The most important channel in legal business development is also the least managed."
      ],
      pullQuote: "A referral is a transfer of trust. Trust is built in a system or left to chance — there is no third option."
    },
    {
      heading: "The Doctrine — Two Networks",
      paragraphs: [
        "The referral machine has two networks. The first is active referrers: clients, adjacent professionals, and past GCs who already send work. The second is alumni: every lawyer who ever left in good standing, now scattered across in-house teams, other firms, regulators, and startups — the profession's most underpriced asset.",
        "Both networks run on the same fuel: being genuinely useful on a cadence, and being remembered at the moment of need. Neither happens by accident."
      ]
    },
    {
      heading: "The Play",
      numbered: [
        "Measure first: add referral attribution to intake this week — a named source for every new matter.",
        "Run the referrer rhythm (script in Materials): quarterly value touches, prompt private thanks, an annual face-to-face.",
        "Stand up the minimum viable alumni program (checklist in Materials): the list, the quarterly bulletin, the congratulations, one annual event.",
        "Make referring easy: give every referrer two sentences that describe exactly what you do and for whom — referrals die when the referrer can't explain you."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "Gratitude lag — a referral thanked a month later teaches the referrer not to repeat it; thank within 48 hours, privately and specifically.",
        "The pitch-y touch — every contact carrying an ask trains the network to avoid you; value touches outnumber asks ten to one.",
        "Alumni as nostalgia — a program that only sends holiday cards is a mailing list, not a channel; alumni want insider substance.",
        "The unlogged referral — without intake attribution, the firm's best channel is invisible in every planning meeting."
      ]
    },
    {
      paragraphs: [
        "Referrals feel like reputation's reward. Run properly, they're reputation's engine — the one channel where every unit of effort compounds through people who already trust you."
      ]
    }
  ]
};
