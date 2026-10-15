---
name: SEO provider billing lapse
description: DataForSEO balance exhaustion silently zeroes SEO & Authority market-wide; diagnose via balance endpoint, recover from audit history, keep --force deliberate.
---

The SEO & Authority category is fed by DataForSEO (prepaid). When the balance goes negative, calls return `40200 Payment Required` and the pipeline writes a score-0 stub — silently, because the degrade path treats vendor failure as "no data". A `--force` sweep then overwrites good live rows with zeros.

**Why:** a billing lapse is indistinguishable from "no data" at sweep time, and a `--force`-by-default workflow turned every casual trigger into a paid, destructive re-measurement.

**How to apply:**
- A whole category flatlining market-wide is a provider/billing event until proven otherwise — check the DataForSEO balance endpoint (`/v3/appendix/user_data`) before touching code. Creds live in both the Replit env and Supabase secrets; edge functions read the Supabase copies.
- Zero-spend recovery: `market_visibility_audit_history` keeps full per-run snapshots — restore the latest good category score per domain into `market_visibility_audits` (`total_score` is generated and self-heals), then regenerate the leaderboard via the standalone export script. Never re-run paid audits to "restore" data that history already holds.
- Prevention lives in the spend controls (see audit-spend-controls.md) — `--force` full sweeps are deliberate-only, quarterly.
