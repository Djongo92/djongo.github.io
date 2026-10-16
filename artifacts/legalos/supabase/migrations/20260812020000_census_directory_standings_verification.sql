-- Task: verify empty directory standings mean 'unranked', not 'unchecked',
-- for the 48 census-ingested Serbia rows whose chambers/legal500/iflr1000
-- were created as '{}' by scripts/census/ingest-census.mjs.
--
-- Verified 2026-08-12 against the live public tables:
--   * Chambers Europe 2026 Serbia (Banking & Finance, Competition/Antitrust,
--     Corporate/Commercial, Dispute Resolution, Employment, IP & TMT,
--     Projects/Infrastructure/Energy) — chambers.com/legal-rankings/*-serbia-*
--   * Legal 500 EMEA 2026 Serbia (all 8 practice tables) — legal500.com/c/serbia/*
--   * IFLR1000 2026 Serbia (Financial and corporate — 35 firms; Project
--     development — 26 firms) — iflr.com/serbia
--
-- Outcome: 9 of the 48 ARE ranked — all in IFLR1000 only. IFLR codes:
--   FC Financial and corporate · PD Project development (tier, 1=best;
--   IFLR Serbia runs 5 tiers, hence the deepestTier 3 -> 5 config fix in
--   marketVisibilityConfig.ts shipped with this change).
-- The other 39 appear in none of the three directories: their empty
-- standings are confirmed 'unranked', and last_verified_at is bumped to
-- record the check. ("act legal" / actlegal.com is the network's own row;
-- its Serbian member firm's Legal 500 ranking is already carried by the
-- existing "Vuković & Partners (act legal Serbia)" row.)
--
-- NOTE for scripts/census/censusLib.mjs replay: these UPDATEs touch only
-- standings jsonb + last_verified_at, which the replay parser deliberately
-- ignores (it tracks firm_name/firm_domain/firm_type only).

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia' AND firm_name = 'AP Legal';

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":4,"PD":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia' AND firm_name = 'Aleksić & Associates';

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia' AND firm_name = 'Spasic & Partners';

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5,"PD":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia' AND firm_name = 'Andrejic & Partners';

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia' AND firm_name = 'Law Office Kosic';

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia' AND firm_name = 'Law Office Milosevic';

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia' AND firm_name = 'Marjanovic Law';

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5,"PD":3}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia' AND firm_name = 'tasic & partners';

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia' AND firm_name = 'T-S Legal – Simić Pajović Law Firm';

-- Remaining census rows still showing all-empty standings: verified against
-- all three 2026 tables above and confirmed unranked.
UPDATE public.market_directory_data
SET last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia'
  AND chambers = '{}'::jsonb
  AND legal500 = '{}'::jsonb
  AND iflr1000 = '{}'::jsonb;
