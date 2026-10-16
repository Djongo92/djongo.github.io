---
name: Gated product showcase
description: Why the demo must never be forked into a mocked copy, and what an access gate on a client-side app can honestly claim.
---

# Never fork the demo

The recurring request is a separate mocked "house of glass and mirrors" so the
demo can be prettier, safer, or show unbuilt features. Refuse it, and say why.

**Why:** the demo is cheap *because* it is the real app pointed at fixtures —
it inherits the entire UI plus a large body of server-side scoring and AI logic
that a mock cannot reproduce. A second copy also drifts silently: the product
changes, the mock doesn't, and nothing fails until a prospect is looking at a
screen that no longer exists. No tooling keeps a hand-written mock tracking a
real app; the only sync guarantee is not having a second copy.

**How to apply:** when someone wants demo-only behaviour, put a conditional
inside the real component tree. It cannot drift, because deleting the
surrounding feature breaks it at compile time. Deviate in presentation, never
in substance — reframe a number, don't invent one, and anything shown that the
product can't actually do must say so on its face.

For *interactive* demo surfaces, the conditional drops one level lower: the
real hook swaps its server calls for a local store when demo mode is on, so
the unmodified UI is fully usable. Anything a local demo genuinely can't do
renders as an explicitly labelled sample — never a fake that silently fails.

# What a gate on a client-side app can claim

The bundle is public, so the UI itself can never be secret. Don't pretend
otherwise, don't build elaborate protection on that assumption, and say so
plainly when asked.

What a gate does buy, and it is enough for a sales tool: not casually
browsable, not linkable, revocable per recipient.

**Why the codes still live server-side:** a password compiled into the bundle
is published, not secret. Server-held codes are the whole difference between a
gate and a speed bump with a sign on it.

**Gate access at the single function every entry point funnels through**, not
at each call site. Call-site gating rots — the next "just want to see it
populated?" button inherits a central check but silently reopens a per-call-site
one. Related trap: fixtures in localStorage outlive the tab while a grant in
sessionStorage doesn't, so without an explicit revoke-on-boot, "granted once"
quietly becomes "granted forever on this browser".

# The gate is also a funnel fork

Most people who reach it have no code. That page must route them to the free
personalized audit, which is what actually converts a stranger (see the
demo-vs-teaser note). A gate that only says "no" wastes the traffic. Marketing
links say "by invitation" up front — a wall you were warned about reads very
differently from one you walk into.
