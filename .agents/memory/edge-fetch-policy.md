---
name: Edge fetch budgets & user-agent policy
description: How edge-function outbound fetches identify themselves and how PSI/fetch timeouts are budgeted so batch jobs can't exceed wall-clock limits.
---

Two standing rules for edge-function outbound fetching (encoded in `_shared/safeFetch.ts` and `_shared/psiFetchWithFallback.ts`):

1. **User agents:** self-identify first (`SELF_IDENTIFYING_UA`, "LegalOS/1.0"), retry with `BROWSER_FALLBACK_UA` only on failure, and only for public marketing pages. Several firm sites 403 any non-browser UA (bot protection) while serving the identical page to browsers; the fallback recovers those measurements honestly.
   **Why:** without it, bot-protected firms read as "unreachable" and categories freeze as missing. Never use the fallback for authenticated or non-public resources.
   **How to apply:** any new homepage/content fetcher should loop `[SELF_IDENTIFYING_UA, BROWSER_FALLBACK_UA]` × `homepageVariants(url)` and return null only when everything fails.

2. **A 200 OK can still be a shell:** some firm sites (schoenherr.rs) serve the *same JS-app shell* for every path to self-identifying UAs, and real content only to browser UAs — so `res.ok` alone is not success. Detect via stripped-text identical to an already-fetched page from the same audit, then retry with the next UA; accept the shell only when every attempt is one. And when merging extracted items, a dated extraction must replace an undated twin (the thin homepage-shell mention claims the dedupe key first and the dated listing version gets dropped).
   **Why:** Schoenherr scored TL 0 despite a dated server-rendered newsroom — the shell passed every fetch check, and the undated shell mention blocked the dated extraction.
   **How to apply:** any new content fetcher loops UA × host variants on a *content-quality* signal, not just res.ok; extraction merges go through upsertContentItem (dated replaces undated).

3. **PSI budgets are two numbers, not one:** a per-request `timeoutMs` (live 25s; census 90s; weekly refresh 60s) AND an aggregate `deadlineMs` (batch paths 120s). A per-request timeout alone permits up to 4×timeoutMs of sequential work (2 hosts × 2 strategies) and can exceed the edge wall-clock budget.
   **Why:** code review caught that a 90s per-call timeout implied a 360s worst case. Slow-but-working firm sites answer Lighthouse in 45–65s, which is why batch budgets are raised at all; the live user-facing audit keeps 25s.
   **How to apply:** any new batch caller that raises `timeoutMs` must also pass `deadlineMs`; keep the aggregate meaningfully below the invocation's wall-clock limit so persistence/response work after PSI still fits.
