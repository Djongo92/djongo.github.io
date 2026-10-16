---
name: Demo vs teaser funnel positioning
description: Why the personalized teaser stays the primary CTA and the fictional-firm demo is deliberately secondary.
---

# Demo vs teaser positioning

Three front doors, three different jobs:

- **Teaser** — visitor types their own domain, gets a real score and peer rank.
  Sells *urgency*. **This is the primary CTA and must stay visually dominant.**
- **Demo** — fictional firm, every screen pre-populated, no input required.
  Sells *depth* and answers "is this real?". Deliberately **secondary**.
- **Full product** — requires an account.

**Why:** in a ~44-firm market where every managing partner knows every other
one, "you rank #23, this named competitor ranks #1" is the thing that converts.
A fictional firm's dashboard, however polished, is not. The demo's job is to
catch the skeptic who won't type their domain, and to show the depth a single
score can't convey — not to be the main entry point.

**How to apply:** when adding or restyling marketing CTAs, the domain input
keeps the filled primary button; demo links stay ghost/text-link weight. Don't
"improve" the demo link into a primary button — that inverts the funnel.

## Demo mode is richer than it looks

Demo state is entirely local (localStorage fixtures + a seeded coach-mark
tour), so it costs nothing to serve and can't touch a real account. But it is
*not* a blanket mock: several Workshop and Battle Plan tools still call the
real AI endpoints with seeded inputs, suppressing only persistence. That is
intentional — the output a prospect sees is genuine — and it is why anonymous
callers need a spend cap rather than just being let through.
