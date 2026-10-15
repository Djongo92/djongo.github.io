-- Firm classification corrections (owner-confirmed, 2026-10-15):
--   BDK Advokati   → regional (offices across the region, not a local firm)
--   JPM & Partners → regional
--   CWB            → international
-- Applied to both the directory reference row (firm_type) and every audit
-- row's peer_group, so percentiles compare each firm with its real peers.
-- Scores themselves don't change here; peer statistics are refreshed by the
-- next recompute from stored raw_metrics.
UPDATE public.market_directory_data SET firm_type = 'R'
 WHERE market = 'serbia' AND firm_name IN ('BDK Advokati', 'JPM & Partners');
UPDATE public.market_directory_data SET firm_type = 'I'
 WHERE market = 'serbia' AND firm_name = 'CWB';

UPDATE public.market_visibility_audits SET peer_group = 'regional'
 WHERE market = 'serbia' AND lower(audited_domain) IN ('bdkadvokati.com', 'jpm.law', 'www.jpm.law');
UPDATE public.market_visibility_audits SET peer_group = 'international'
 WHERE market = 'serbia' AND lower(audited_domain) IN ('cwbip.com', 'www.cwbip.com');

-- History rows written by a methodology re-score (scripts/census/recompute-v3.mjs)
-- are neither a fresh run nor a manual correction — tag them honestly.
ALTER TABLE public.market_visibility_audit_history
DROP CONSTRAINT market_visibility_audit_history_source_check;
ALTER TABLE public.market_visibility_audit_history
ADD CONSTRAINT market_visibility_audit_history_source_check
CHECK (source IN ('run', 'correction', 'refresh', 'rescore'));
