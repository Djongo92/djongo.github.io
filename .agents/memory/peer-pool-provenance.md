---
name: Peer pool must never see estimated numerics
description: The social/TL peer benchmarks are computed from every published audit's persisted metrics — estimated values stored as numbers silently shift everyone's scores
---

Peer benchmarking reads persisted per-metric numerics from **all published audits** in a market/peer group, regardless of how those numbers were obtained.

**Why:** Unknown is not zero. A self-reported 0 is a measurement; an auto-detected or estimated 0 is a guess. If a "detected"/"estimated" provenance path persists sentinel numbers, a wave of them drags the median/p90 thresholds and distorts every other firm's relative score.

**How to apply:** Any provenance path that lacks a real numeric value must omit the metric from persisted raw metrics entirely (the peer-stats reader skips absent keys). Before adding a new metric source, trace what the peer benchmark can read back out of it.

**Substituted paired signals (keep-and-mark policy):** when a scorer measures one side of a paired signal and copies it to the other (e.g. PSI single-strategy fallback flags `mobileFromDesktop`/`desktopFromMobile`), the copy stays in the firm's own raw_metrics for honesty, and its own score is computed from the sole real measurement (reweighting can't recover missing data). But the peer-stats reader skips any category carrying a substitution flag, so estimates never enter anyone else's benchmark. New substitution paths must reuse these flag names or extend the reader's skip list.
