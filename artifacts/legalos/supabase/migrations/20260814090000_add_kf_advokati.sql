-- Reconcile the tracked-firm directory with the published audit pool (task:
-- cohort reconciliation). "K&F Advokati" (kfadvokati.com) has a published
-- Serbia audit — the domain was originally mis-assigned to Law Office Kosic
-- (see 20260813040000_sheet_domain_corrections.sql), the census audited it,
-- and the audit is a legitimate score for a real firm. Adding the firm to
-- market_directory_data makes the directory (the marketing site's
-- generate:firms source of truth) a superset of the published pool again.
INSERT INTO public.market_directory_data (market, firm_name, firm_domain, firm_type)
VALUES ('serbia', 'K&F Advokati', 'kfadvokati.com', 'L')
ON CONFLICT DO NOTHING;
