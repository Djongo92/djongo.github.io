---
name: Guided tour and onboarding sequencing
description: Rules for the LegalOS coach-mark tour — persistence shape, start triggers, and how onboarding surfaces take turns
---

## Onboarding surfaces are sequenced, never timed

Never schedule an onboarding interruption on a fixed `setTimeout`. Gate it on the
real DOM anchor it points at (a MutationObserver wait with a timeout ceiling),
and let the timeout *resolve* rather than reject so the flow still runs when the
anchor legitimately never renders.

When more than one surface wants the screen (a spotlight tour and a modal
wizard), one must own it first and the other must wait on an explicit "busy"
flag that covers both *queued* and *active* — not just active, or the modal
slips in during the gap before the tour paints.

**Why:** timers are a guess about someone else's machine. Two independent
guesses raced each other and both raced lazy-loaded chunks, so the tour would
spotlight empty space and the wizard would stack on top of it.

**How to apply:** any new first-run prompt, tooltip, or wizard in the app.

## Tour progress must be variant-scoped and bounds-checked

Persisted progress is `{v, status, step, variant}`, not a boolean. Three rules:

- **Version it and validate on read.** Reject anything that isn't the current
  schema with a known status, a known variant, and a non-negative integer step.
  A half-understood record is worse than no record.
- **Scope the step to the tour variant.** Demo and signed-in tours are
  different lengths, so a step index saved by one is meaningless to the other.
- **Clamp the resume index against the live step count**, in the hook *and* in
  the overlay.

**Why:** an out-of-range index makes the overlay render nothing while still
reporting itself active — invisible, undismissable, and permanently holding the
"busy" gate closed against everything queued behind it.

## A one-shot "seen" flag is a trap, not a guide

Write progress on *every* step, not at the end, or an interrupted tour is lost
forever. Treat "skip" and "finish" as *don't interrupt me again*, not *never
show me this* — always expose a replay affordance (command palette + sidebar).

## The tour is offered, not imposed

First-run guidance opens with a welcome that *asks* — take the tour, or explore
alone — instead of seizing the screen. Three constraints make that safe:

- **An unanswered offer is persisted state, exactly like step progress.** What
  raises it is a one-shot session flag, so without its own status a reload
  mid-decision leaves the visitor with neither welcome nor tour, and no idea
  they were offered anything.
- **Declining must stand down everything queued behind the tour.** Otherwise
  answering "don't guide me, let me look around" is immediately followed by the
  next queued modal — the exact interruption just declined. Scope that
  suppression to the session, not forever, and keep the surface reachable from
  Settings.
- **Peek at a one-shot trigger at decision time; consume it only at action
  time.** The decision is made before the DOM anchor resolves, so consuming
  early means an abort in between spends the flag without ever using it.

**Why:** the content was never the problem. An interruption nobody asked for
reads as a popup however good it is, and the fix is consent, not better copy.

**How to apply:** any first-run guidance. Note also that the framing has to
live in exactly one place — moving "this is a fictional firm" into the welcome
meant deleting the tour step that said the same thing, or it lands twice in a
row.

## Access-code entry always greets; reloads never do

A fresh access-code verification is a sales moment: the demo welcome + tour offer must fire on every fresh grant, even if the browser finished the tour before. Plain reloads and same-tab re-entry must not re-greet. Tour progress is per-variant — demo and account "seen" states are independent, so resetting the demo side never disturbs a finished account tour.

**Why:** the "seen" flag outlives the tab, the showcase grant doesn't — without a reset on grant issuance, every access-code visit after the first was silently ungreeted. Explicit product-owner requirement.

**How to apply:** any new showcase entry path must go through grant issuance; any new "seen"/progress concept must be variant-scoped from day one.

## The tour needs an ending, and the ending depends on who's watching

A walkthrough that closes on its last tooltip leaves the visitor holding
context and no next move. End on a hand-off: for a demo visitor, the free
personalized audit (never a signup wall — see the demo funnel note); for a real
account, the highest-leverage tool for their weakest category.

## Arrival context: only branch on what's reachable

Marketing → app hand-off passes a sessionStorage record (first-touch UTMs plus
which surface the link was clicked from). Only write copy branches for surfaces
that actually carry a link today; unreachable branches read as coverage but are
dead code. Re-check the call sites before adding a branch.
