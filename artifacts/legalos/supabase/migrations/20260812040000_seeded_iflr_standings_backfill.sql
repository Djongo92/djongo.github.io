-- Task: give the originally-seeded Serbia rows their missing IFLR1000 credit.
-- The 2026-08-12 census verification (20260812020000) covered the 48
-- census-ingested rows; the 44 seeded rows still had iflr1000 = '{}' even
-- though many are IFLR1000 tier 1. Verified 2026-08-12 against the live 2026
-- tables at iflr.com/serbia: Financial and corporate (FC, 35 firms) and
-- Project development (PD, 26 firms; tiers 1-5, 1=best).
--
-- IFLR display names were matched to the seeded row spellings by hand; notable
-- mappings: "Law Office of Miroslav Stojanović cooperating law office of Wolf
-- Theiss" -> Wolf Theiss row; "Moravčević Vojnović i Partneri in cooperation
-- with Schoenherr" -> Schoenherr row; "Petrikić & Partneri AOD ... CMS" ->
-- CMS row; "SOG in cooperation with Kinstellar" -> Kinstellar (SOG);
-- "Bojanović & Partners" -> BOPA; "Harrisons" -> Harrisons Solicitors;
-- "Drašković Popović & Partners (D2P Law)" -> Drašković Popović & Partners;
-- "Nikolić Kokanović Otašević" -> NKO Partners; "Deloitte Legal" -> Deloitte
-- Legal Serbia; "Vuković & Partners" -> Vuković & Partners (act legal
-- Serbia); "Nikcevic & Kapor" -> Nikčević Kapor; "BIT Law" -> BIT Law Office;
-- "Mihaj Ilic & Milanovic Law Firm" -> Mihaj, Ilić & Milanović.
-- (The PD tier-5 block on the page carries trailing related-links duplicates
-- of higher-tier firms; first occurrence wins, which reproduces the stated
-- 26-firm PD table exactly.)
--
-- Replay-safe: only standings jsonb + last_verified_at are touched, which
-- scripts/census/censusLib.mjs deliberately ignores.

UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":1,"PD":1}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'BDK Advokati';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":1,"PD":1}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'JPM & Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":1,"PD":1}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Karanović & Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":1,"PD":1}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Schoenherr (Moravčević Vojnović and Partners)';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":1,"PD":2}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Wolf Theiss (Law Office Miroslav Stojanović)';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":2,"PD":2}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'BOPA Bojanović & Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":2,"PD":2}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'MVJ Marković Vukotić Jovković';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":2,"PD":2}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'CMS (Petrikić & Partneri AOD)';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":2}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Doklestić Repić & Gajin';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":2,"PD":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Harrisons Solicitors';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":2,"PD":3}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Kinstellar (SOG)';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":3,"PD":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Drašković Popović & Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":3,"PD":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'MMD Advokati';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":3,"PD":3}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Joksović, Stojanović & Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":3,"PD":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Prica & Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":3,"PD":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Stanković & Partners (NSTLAW)';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":4,"PD":3}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Deloitte Legal Serbia';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Djokić + Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'NKO Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":4,"PD":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Radovanović Stojanović & Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":4,"PD":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Vuković & Partners (act legal Serbia)';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":4,"PD":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'ZSP Advokati';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5,"PD":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'AVS Legal';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Živković Samardžić';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Vujinović & Partners';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"FC":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Vulić Law';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"PD":2}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Nikčević Kapor';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"PD":4}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'Mihaj, Ilić & Milanović';
UPDATE public.market_directory_data SET iflr1000 = '{"rankedTables":{"PD":5}}'::jsonb, last_verified_at = '2026-08-12'::timestamptz WHERE market = 'serbia' AND firm_name = 'BIT Law Office';

-- Every remaining Serbia row with empty IFLR standings was checked against
-- both 2026 tables above and is confirmed unranked; bump the verification
-- timestamp so the check is recorded.
UPDATE public.market_directory_data
SET last_verified_at = '2026-08-12'::timestamptz
WHERE market = 'serbia'
  AND iflr1000 = '{}'::jsonb;
