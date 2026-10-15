import type { Chapter } from "./types";

// NEW CHAPTER (Phase 3) — the funnel's neglected back half: what happens after
// the marketing works. Signature treatment: OPERATING PROCEDURE — response
// SLA, intake script, follow-up sequence.
export const intakeConversion: Chapter = {
  id: "intake-conversion",
  number: 17,
  title: "Intake & Conversion",
  subtitle: "The funnel's back half, where inquiries become engagements",
  hook: "All your marketing ends at one moment — the first response",
  categories: ["reputation"],
  proofMetric: "Reputation category score at the next audit — plus intake metrics logged per inquiry: response time, consult booked (y/n), and engagement won. Response time is the first number to move.",
  actionItems: [
    { text: "Set the response SLA today: every inquiry acknowledged within 4 working hours, by a human, with a named next step — publish it internally", priority: "quick-win" },
    { text: "Adopt the intake script (Materials below) for every new inquiry and log the answers — source, matter, stakes, timeline", priority: "strategic" },
    { text: "Build the 3-touch follow-up sequence (Materials below) into the intake process and review conversion monthly", priority: "long-term" },
  ],
  artifacts: [
    {
      type: "script",
      title: "The Intake Conversation — 6 Questions",
      body: `Every inquiry, every channel, same six questions — asked by whoever takes the call, logged immediately.

1. What's the situation? (Their words, uninterrupted — this language is marketing gold)
2. What happens if it's not resolved? (The stakes — qualifies urgency and budget)
3. What's the timeline? (Now / this quarter / exploring)
4. Who decides? (Them alone, a board, a GC plus CFO)
5. Have you worked with a firm on this before? (First-time buyers need education; switchers need reassurance)
6. How did you hear about us? (By name — this feeds the referral system)

Close every intake with: who does what by when. \"You'll have a short note from [partner] by Thursday with how we'd approach it and what it costs.\" Then keep the promise.`
    },
    {
      type: "template",
      title: "The Follow-Up Sequence — 3 Touches",
      body: `For consults that don't convert on the spot. Value-first, no pressure.

TOUCH 1 (next day): Thank-you + the one thing discussed that mattered most + a relevant article or guide. \"You mentioned [issue] — this is how we've seen it handled.\"
TOUCH 2 (one week): A short scoping note — how we'd approach their matter, in three bullets, with a fee range or model. Clarity is the differentiator.
TOUCH 3 (three weeks): The graceful close — \"If the timing's moved, no note needed; if it's still live, I'm happy to hold thirty minutes this month.\" Then stop.

Rule: three touches, then into the nurture list (see Email Nurture). Persistence past three reads as desperation — and desperation is the one message that converts in the wrong direction.`
    }
  ],
  content: [
    {
      paragraphs: [
        "Every chapter in this book — the positioning, the content, the reviews, the referrals — funnels into one moment: a prospective client reaches out. What happens next determines what all the marketing was worth.",
        "Most firms invest heavily in generating inquiries and almost nothing in receiving them. The result is a leaky funnel with an expensive top."
      ],
      callout: {
        type: "insight",
        content: "Responsiveness is the priority general counsel feel first — and it starts before they're clients. A firm that answers an inquiry in four hours has already demonstrated the one thing every pitch claims."
      }
    },
    {
      heading: "The Doctrine",
      numbered: [
        "Speed is substance. The first firm to respond substantively sets the frame every competitor is judged against — and in most markets, responding within hours (not days) is still rare enough to be a differentiator.",
        "Intake is diagnosis, not administration. The six questions (Materials below) qualify the matter, surface the stakes, and harvest the client's own language — which feeds messaging, content, and the proposal.",
        "Every inquiry gets a logged outcome. Consult booked or not, engaged or not, and why. A firm that can't say what happened to last month's inquiries is flying the funnel blind."
      ]
    },
    {
      heading: "The Play",
      paragraphs: [
        "Publish the response SLA internally and keep it. Run every inquiry through the intake script. Follow up consults with the three-touch sequence, then hand non-converters to the nurture list. Review the log monthly: response time, conversion rate, and loss reasons are the three numbers that run the back half of the funnel."
      ]
    },
    {
      heading: "Failure Modes",
      bullets: [
        "The shared inbox — inquiries owned by everyone are answered by no one; every inquiry gets a named owner the hour it arrives.",
        "The gatekeeper filter — screening for 'serious' clients before listening; some of the best matters arrive as vague questions.",
        "Quoting before diagnosing — a fee mentioned before the stakes are understood prices the wrong thing.",
        "The silent loss — consults that fade without follow-up are engagements donated to whichever firm followed up."
      ],
      callout: {
        type: "mistake",
        content: "The most expensive sentence in a law firm: 'I thought you were handling that inquiry.' The SLA and the owner rule exist to make it unsayable."
      }
    },
    {
      paragraphs: [
        "Marketing earns the inquiry. Intake earns the engagement. The firms that grow are the ones that refuse to let the second part be improvisational."
      ]
    }
  ]
};
