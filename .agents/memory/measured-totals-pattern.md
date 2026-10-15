---
name: Measured totals / denominator honesty
description: The canonical mechanism for showing a fair "N / M" total when a scoring category couldn't be measured, instead of counting it as an earned zero.
---

LegalOS's 200-point score is a sum of 5 categories. A category can be `provenance: "missing"` (audit couldn't measure it — no GBP match, no paid SEO data source, etc.). Silently keeping the denominator at 200 makes an unmeasured category read as a real, earned zero and unfairly tanks the displayed percentage.

**The fix:** `computeMeasuredTotals()` (web: `artifacts/legalos/src/lib/measuredScore.ts`, mobile: `artifacts/legalos-mobile/lib/measuredScore.ts` — same shape, kept in sync manually since the packages don't share code) takes per-category `{score, provenance}` and returns `{score, measuredMax, fullMax, isPartial, excludedLabels}`, excluding missing categories from the denominator. Paired helpers `measuredScoreLabel()` and `measuredExcludedNote()` produce the headline "N / M" string and the "X not yet scored — excluded, not counted as a zero" caption.

**Why:** An 80-point firm out of 140 measured points (57%) is a materially different message than 80/200 (40%) when the missing 60 points were never measurable in the first place, not earned-and-lost.

**How to apply:** Every surface that prints a category-derived total or per-category cell — score rings, dashboard cards, PDF/DOCX/PPTX exports, canvas-drawn share-card images, competitor comparisons, what-if simulators, sidebar labels, AI-prompt context strings — should build a `{score, provenance}` map per category and run it through this helper (or the paired `categoryScoreCell()` / `pickHighestLeverageCategory()` helpers) rather than hardcoding `/200` or drawing a missing category as `0 / max`. Also exclude `provenance === "missing"` categories before computing "biggest gap" / "next opportunity" / "highest-leverage focus" recommendations — an unmeasured category isn't an achievable or actionable gap. Known gaps left deliberately unfixed: `audit_snapshots` (before/after comparison has no provenance column at all) and historical trend lines (chart a raw total over time with no per-point measured/missing context) — both need a schema change, not just a rendering fix. When sweeping for this class of bug, grep isn't enough on its own: canvas-drawn PNG exports and LLM prompt-context strings compute their own literal "/200" text outside JSX and are easy to miss in a component-only review.

## Teaser display exception

The public two-category teaser deliberately shows its raw contribution against the full 500-point scale and labels it "Score so far", alongside "2 of 5 categories measured". It does not normalize the two measured categories to 500, because that makes a partial teaser read like a near-complete result. Full audits continue to use the measured-only denominator when categories are missing.

**Why:** A mathematically fair measured-only percentage can still be misleading when the visitor sees only two categories; the teaser must communicate progress toward the full score, not imply completeness.

**How to apply:** Keep this exception limited to the public teaser. Any full audit, report, history point, or category-derived recommendation should continue using the standard measured-totals helper.
