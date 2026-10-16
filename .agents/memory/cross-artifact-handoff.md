---
name: Marketing site → app handoff
description: Why crossing between the marketing artifact and the app artifact needs pre-render state priming and a duplicated loading veil, and where "home" is for a demo visitor.
---

# Crossing the marketing → app seam

The marketing site and the app are separate artifacts on one origin, path-routed
(site at the root, app under a sub-path). Any link between them is a **full
document load of a different application**, not a client-side route change.
Three consequences worth remembering.

## 1. Never route-then-redirect across the seam

The tempting shape for a deep link like `/demo` is: give the app a `/demo`
route, have it seed state in an effect, then redirect to the real entry point.
That makes the visitor boot the entire app **twice** for one click, and on the
marketing→demo hop that double boot is most of the perceived wait.

**Rule:** seed the state in the entry module *before* `createRoot().render()`,
then `history.replaceState` to the destination URL so the router mounts once,
already pointed at the right place.

**Why replaceState, not pushState:** the visitor came from the marketing site.
Replacing the entry keeps Back pointed at where they came from instead of
bouncing them through the entry point again.

**How to apply:** the pre-render predicate gates a side effect that overwrites
localStorage, so it must be an *exact* match against the configured base path
plus the segment — never a "path ends with /demo" suffix test, which fires on
unrelated routes. Keep the predicate pure and unit-test its boundaries.

## 2. Duplicate the loading veil on both sides, with hard-coded colours

The browser shows nothing during a cross-document navigation; the old page just
sits there. So the departing side must paint a full-screen veil on click, and
the arriving side must paint an identical one — the veil survives the network
wait and is still there when the new document boots, so there is no seam.

**Why hard-coded colours instead of theme tokens:** the two artifacts have
separate token sets and use different Tailwind majors, and their background and
accent values genuinely differ by a few percent lightness. A half-shade jump
mid-transition reads as breakage, not loading. This is the one place where
duplicated literal colour values are correct.

Also warm the target document with `rel=prefetch` on hover/focus of the link —
the visitor spends real time deciding, and that's free lead time.

## 3. "Home" for a demo visitor is the marketing site, not the dashboard

A demo visitor has no account. Ending the demo with a page reload strands them
on the app's sign-in wall, which is a dead end. Exiting demo mode — and the app
wordmark while demo mode is active — must leave the app entirely and return to
the origin root. For a real signed-in user, the same wordmark means the
dashboard.

**How to apply:** use a root-relative URL so it survives the dev preview, deploy
previews, and the published domain unchanged.
