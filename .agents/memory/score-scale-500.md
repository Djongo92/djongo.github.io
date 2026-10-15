---
name: 500-point display scale
description: Internal scoring stays 0–200; every user-facing total renders on the 500 scale (×2.5) at the display layer only
---

Internal scoring stays on the 200-point category rules (20/20/60/45/55); every user-facing *total* renders on the public 500-point scale.

**Why:** The user wanted a 500-point methodology for granularity feel and headroom for future signals (e.g. a DataForSEO-powered SEO category), without migrating ~90 stored audits or changing ranks. Display-layer rescale was chosen over re-weighting categories (shifts importance silently) or multiplying stored scores (migration + stale exports).

**How to apply:**
- Totals: always via the shared label/scale helpers in each app's measuredScore module; never hardcode a denominator. Partial audits rescale against the measured max and keep the "measured" qualifier.
- Categories: render via `categoryScoreLabel500`/`categoryScore500` (web `visibilityCategories.ts`; caps 50/50/150/112/138, a down/up rounded pair summing to exactly 500) or as percentages of category potential — never raw "14 / 20" fractions, which users confuse with the 500 total. Point deltas are ×2.5. Goal inputs display % but store raw points.
- AI prompts that produce user-facing copy must receive 500-scale totals and percentage category lines. Edge functions need redeploy for prompt changes, and any prompt-semantics change must bump the response cache key or stale old-scale narratives get served.
- Web and mobile measuredScore modules must stay in parity (tests assert identical outputs). Tier thresholds, arcs, percentiles, and milestone logic stay on the internal 200 scale; the shared web ScoreRing is also used for task counts, so scale at call sites, not inside the component.
- Decision: rendered copy must never carry a raw "/ 200"-style denominator; a static scale-guard test in both ports enforces this at CI, while internal arithmetic on the 200 scale stays legal.
