---
name: Negative cache entries must be advisory
description: Warm-cache "unverifiable/failed" rows must never hard-block the live fallback path — transient outages otherwise turn into week-long measured-data blackouts
---

Cached *failures* (e.g. `is_unverifiable` rows in `firm_signals`) must be treated as advisory: the reader should attempt the live path anyway and only report "missing" if the live attempt also fails. Never `return` early on a cached failure.

**Why:** A transient upstream outage (Google PSI hiccup, site WAF rule change) gets frozen into a TTL-length negative row; every consumer then reports "not measured" for days even after the site/API recovers. This actually happened: 33 firms carried week-long "unverifiable" PageSpeed rows that hid the fact that desktop-strategy runs would have succeeded.

**How to apply:** In any warm-cache + live-fallback pattern, success rows short-circuit, failure rows log-and-fall-through. Keep negative TTLs short. When a live path gains new fallback logic (host variants, alternate strategy), apply the same logic to the cache writer too, or the cache keeps recording failures the live path would have recovered from.
