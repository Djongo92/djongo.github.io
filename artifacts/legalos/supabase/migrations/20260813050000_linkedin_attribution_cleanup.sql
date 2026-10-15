-- Third code-review follow-up to the LinkedIn ingest (20260813010000,
-- 20260813020000, 20260813030000): the attribution guard stamped EVERY
-- non-empty Serbia linkedin record as confirmed_company_page, but the ingest
-- itself documents three rows the researcher explicitly did NOT confirm as
-- the firm's own claimed company page:
--   * arcliffe.com          — "Global linkedin ... question of it being
--                              applicable or not": the page may not describe
--                              the Serbian practice at all.
--   * advokatskakancelarija.com — "UNCLAIMED PAGE": numbers observed on an
--                              unclaimed auto-generated page are unknowns,
--                              never a firm's own 0/0 (peer-pool-provenance
--                              rule).
--   * jsplaw.co.rs          — "THIS IS AN UNCLAIMED PAGE": same.
--
-- Blanket-stamping those rows falsely confirmed them, letting their numerics
-- pass both the linkedin_shape_chk constraint and the runtime
-- lookupDirectoryLinkedIn gate. Clear them back to the empty object — the
-- audit path then falls through to homepage presence detection, exactly as
-- for any other firm with no verified directory numbers. A future re-ingest
-- may restore them only with attribution evidence recorded row-by-row.
--
-- tests/linkedin-attribution-audit.test.ts regression-guards this: every
-- ingest row whose recorded URL carries an annotation (anything beyond a
-- bare URL) must be cleared here, and no future blanket-stamp migration may
-- reintroduce them.

UPDATE public.market_directory_data
SET linkedin = '{}'::jsonb
WHERE market = 'serbia'
  AND firm_domain IN ('arcliffe.com', 'advokatskakancelarija.com', 'jsplaw.co.rs');

-- d2plaw.com's annotation ("distinct spinoff from BD2P") is AFFIRMING — it
-- clarifies the page is this firm's own, not BD2P's — so the row stays
-- confirmed. But annotations do not belong inside the url field (that's how
-- the three rows above slipped past the blanket stamp): move the note into
-- its own key and keep the url bare, so "bare url" remains a checkable
-- invariant for every attributed row.
UPDATE public.market_directory_data
SET linkedin = '{"followers": 1435, "posts30d": 5, "url": "https://www.linkedin.com/company/d2plaw/posts/?feedView=all", "note": "distinct spinoff from BD2P", "verifiedAt": "2026-08-13", "attribution": "confirmed_company_page"}'::jsonb
WHERE market = 'serbia' AND firm_domain = 'd2plaw.com';
