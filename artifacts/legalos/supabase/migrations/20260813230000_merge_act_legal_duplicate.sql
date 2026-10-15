-- Merge the duplicate act legal census entries: one firm, one row.
--
-- The Serbia census listed act legal twice:
--   * actlegal.com ("act legal") — the international network's European
--     site; its homepage genuinely links no social profiles (social 0 is a
--     true measured zero, not a pipeline bug).
--   * vp.rs ("Vuković & Partners (act legal Serbia)") — the actual Serbian
--     firm, holding the real local data (directory social ingest etc).
-- Canonical entry: vp.rs. The network row's boutique_2_10 size came from a
-- western-balkans-wide professionals listing, so nothing is carried over.

-- 1. Drop the network-site row from the directory seed data. The marketing
--    tracked-firms generator replays these statements chronologically, so
--    this DELETE removes the duplicate from the marketing list as well.
DELETE FROM public.market_directory_data
WHERE market = 'serbia' AND firm_name = 'act legal';

-- 2. Retire the duplicate's published audit so the public index shows one
--    act legal. The history row is kept, just unpublished (idempotent with
--    the manual retirement already applied on 2026-08-13).
UPDATE public.market_visibility_audits
SET is_public = false, updated_at = now()
WHERE market = 'serbia' AND audited_domain = 'actlegal.com';
