---
name: Scored pool vs tracked directory — cohort invariant
description: The marketing site's counts and benchmark claims must come from the published (scored) pool, never the tracked directory.
---

Invariant: the tracked-firm directory may be a strict superset of the
published (scored) audit pool, but every user-facing count, percentile, or
"benchmarked" claim must quote the scored pool only, and a tracked firm
without a published audit must be explicitly allowlisted with a reason and
never described as scored/benchmarked (the firm checker has a distinct
"in the directory, not scored yet" state).

**Why:** the two pools silently diverged — one firm was audited and published
via a mis-assigned domain without ever being tracked, another tracked firm has
no website and no audit — so copy counts and percentile math were fed by
different denominators.

**How to apply:** a build-time cohort check reconciles the two sets and fails
on any drift. When a sweep publishes a new firm, add it to the directory
migrations (apply live + record in the ledger) in the same change; when a
tracked firm can't be audited yet, allowlist it instead of letting counts
drift. Copy wording: "scored" firms, not "tracked".
