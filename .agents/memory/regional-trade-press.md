---
name: Regional trade-press sourcing strategies
description: How each regional legal trade outlet must be queried for press mentions — direct feeds vs site-scoped Google News; which are fetch-blocked.
---

Plain quoted Google News queries badly undercount regional legal trade press;
per-outlet structured strategies fix it (see regionalTradePressFormula.ts):

- **CEE Legal Matters**: Cloudflare-challenges ALL server-side fetches (403
  even with browser UA, even Googlebot UA) — direct RSS/search is impossible.
- **SeeNews**: Next.js client-rendered; no public search feed, /feed serves HTML.
- **bizlife.rs**: WordPress; `?s="<phrase>"&feed=rss2` IS phrase-exact
  (verified: nonsense phrase returns 0 items — WP's usual OR-matching doesn't
  apply here).
- **novaekonomija.rs**: WordPress; search RSS phrase-exact (nonsense AND
  scrambled-real-word controls return 0).
- **danas.rs**: WordPress; apex 301s to www (fetch follows); www search RSS
  phrase-exact with the same controls.
- **ekapija.com**: Cloudflare-challenges non-browser fetches (403 "Just a
  moment…") — site-scoped Google News only.

**Why:** a site-scoped Google News query (`"firm" site:<domain>`) returns the
recent items the plain unscoped query misses — Google indexes these outlets, it
just doesn't rank them into unscoped results.
**How to apply:** when adding a new regional outlet, probe in this order:
outlet's own search RSS with a nonsense-phrase control (must return 0), else
site-scoped Google News RSS. Bump the press-mentions cache namespace whenever
coverage changes, or 7-day-stale undercounts get served.
