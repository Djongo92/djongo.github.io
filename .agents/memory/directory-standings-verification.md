---
name: Directory standings verification & backfill
description: How to verify/backfill Chambers/Legal500/IFLR1000 standings and make them surface on the leaderboard
---

All three directories' Serbia tables are fetchable as markdown (chambers.com `legal-rankings/*-serbia-*`, legal500.com `/c/serbia/<practice>/`, iflr.com `/serbia`) — verify a cohort against the full public tables in a handful of fetches instead of per-firm searches.

Key facts learned:
- IFLR1000 Serbia has exactly 2 tables — FC (Financial and corporate) and PD (Project development) — and runs **5 tiers**; the market config's iflr deepestTier was 3 and had to be fixed to 5 or tier-4/5 entries produce negative inverted averages.
- Backfilling `market_directory_data` alone does NOT change audited firms' leaderboard Reputation: `market_visibility_audits` scores are frozen and the merge suppresses directory rows that match an audit domain. A companion migration must patch `raw_metrics.reputation.<dir>RankedTables` + sub-score and bump `reputation_score`, mirroring metricCorrections.ts semantics (no quality bonus when frozen peer stats are null — count-only points).
- `market_visibility_audits.total_score` is a **generated column** — never UPDATE it; it follows reputation_score.
- Standings jsonb updates in migrations are invisible to the census replay parser (it only tracks firm_name/domain/type), so they're replay-safe.
- Data-verification UPDATEs still go in a migration file + Management API apply + schema_migrations ledger row, so the record survives and `check:schema-drift` stays green.

**Why:** task 178 found 48 census rows with `{}` standings scoring as confirmed-unranked; 9 were actually IFLR-ranked, and their audit rows needed the companion recompute to surface it.
**How to apply:** any future census refresh or new-market standings verification.
