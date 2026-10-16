---
name: LegalOS brand typography and mark
description: Why labels are wide-tracked caps rather than monospace, what deliberately keeps monospace, and what the logo mark means
---

## Labels are wide-tracked uppercase sans, never monospace

Section headers, badges and micro-labels use the shared `.eyebrow` treatment,
defined in both web artifacts. It owns case, tracking and weight *together*,
and is deliberately unlayered so a stray utility can't half-override it — so
don't pair it with case / tracking / weight utilities. Figures get
`tabular-nums`.

**Why:** the product is sold to law-firm managing partners who expect to see
their firm listed beside Chambers and Legal 500. A monospace stack read as
"developer tool", and worse, it rendered real brand names (IFLR1000, Google
PageSpeed, Google Business Profile) as if they were terminal output.

**How to apply:** any new label on either web artifact.

## What deliberately KEEPS monospace

Genuine technical values, where character-level legibility is the actual job
rather than a costume: DNS TXT records shown during domain verification,
generated invite and share URLs, ops rate-limit keys, and `kbd` shortcut hints.

Don't "finish the job" by sweeping these — removing mono there is a regression,
not a cleanup.

## The mark

An "L" enclosed by a ring, where the ring is the product's own score dial. The
mark therefore depicts what the product measures rather than decorating the
wordmark, and the "L" gets to sit inside an "O". Chosen by the user over gauge,
notch, ascent and crosshair alternatives.

Drawn with `currentColor` so one component serves every context — don't
hard-code the gold. It is duplicated per artifact rather than shared; if it
ever gains behaviour, promote it to a workspace package instead of letting the
copies drift.
