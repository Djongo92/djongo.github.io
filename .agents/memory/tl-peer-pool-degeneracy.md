---
name: TL measurement rule & peer-pool degeneracy
description: Thought Leadership counts own-site output by SOURCE not classifier label; and a percentile-normalized category reads 0 for everyone while its peer pool is mostly zeros — measurement fixes don't move scores until the pool is refilled
---

Two lessons from the "BDK shows empty Thought Leadership" incident (Aug 2026):

1. **Source decides the axis.** Every item scraped from a firm's own site counts as own output (`postsCount`), whether the LLM types it "blog" or "news" — own-newsroom announcements typed "news" used to vanish from ALL counts (not "blog" → not posts; self-scraped → not external press). 67/92 census firms showed empty TL because of this. The press axis stays external-only (Google News RSS, own domain excluded) as the anti-inflation rule.

2. **A degenerate peer pool zeroes a whole category.** `p90Ratio` returns 0 when the pool's p90 is 0 — and when most firms have zero counts (because of a measurement bug), p90 IS 0, so even correctly-measured firms score 0. **Fixing the measurement does not move scores until the pool is refilled** via a mass re-audit; early re-audits in that sweep still score against the half-degenerate pool, so firms that matter should be re-audited LAST (or twice).

**Why:** percentile normalization makes category scores pool-dependent, unlike fixed-denominator categories; the stored `postsStats`/`newsStats` in raw_metrics show the pool state (`p90Threshold: 0` is the tell).

**How to apply:** after any change that raises measured counts for a category (new source, classification fix, cache bust), plan a full re-audit sweep of the zero-scored firms, ordered least-important-first; verify with `p90Threshold > 0` before trusting the resulting scores. Also: Google News is edition-partitioned — query the market-local edition (`newsEdition` in marketVisibilityConfig, e.g. RS for Serbia) or regional trade press is invisible; CEE Legal Matters et al. are barely indexed even there.
