-- One-off correction after the census classifier's dead-code network-list fix:
-- two international network firms were ingested as local (firm_type 'L').
--
-- Decision record (task: re-check network firms typed 'local'):
--   * act legal (actlegal.com)        — RETYPE L -> I. The census row is the
--     network's own global domain; the fixed classifier now types it 'I'.
--     It was ranking as the #1 "local" firm (55.1), skewing local benchmarks.
--   * Grata International (gratanet.com) — RETYPE L -> I. Global network
--     (HQ Almaty, 20+ countries); the Belgrade office is a branch of an
--     unambiguous international brand. The original conservative 'local'
--     call is reversed; 'grata' is also added to INTL_NETWORK_KEYS in
--     scripts/census/censusLib.mjs so future ingests classify it correctly.
--
-- Both the directory row and the census audits' frozen peer_group are
-- corrected so peer benchmarks recompute like-with-like.

UPDATE public.market_directory_data
SET firm_type = 'I'
WHERE market = 'serbia'
  AND firm_domain IN ('actlegal.com', 'gratanet.com')
  AND firm_type = 'L';

UPDATE public.market_visibility_audits
SET peer_group = 'international'
WHERE audited_domain IN ('actlegal.com', 'gratanet.com')
  AND market = 'serbia'
  AND peer_group = 'local';
