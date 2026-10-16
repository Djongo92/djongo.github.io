-- Second code-review follow-up to the LinkedIn ingest (20260813010000,
-- 20260813020000): the shape CHECK validated JSON structure and a company-URL
-- substring, but nothing marked a record as an ATTRIBUTABLE observation — a
-- future unclaimed company URL with 0/0 would have passed. Every ingested
-- row was live-confirmed on the firm's own company page by the researcher,
-- so stamp that explicitly and require it:
--   * linkedin.attribution = 'confirmed_company_page' on all current rows
--   * linkedin_shape_chk re-created to require the attribution flag
--   * lookupDirectoryLinkedIn in runVisibilityAudit.ts rejects records
--     without it, so an unattributable row can never reach the peer pool
--     even if the constraint is bypassed by a privileged writer.

UPDATE public.market_directory_data
SET linkedin = linkedin || '{"attribution":"confirmed_company_page"}'::jsonb
WHERE market = 'serbia' AND linkedin <> '{}'::jsonb;

ALTER TABLE public.market_directory_data DROP CONSTRAINT linkedin_shape_chk;

ALTER TABLE public.market_directory_data
  ADD CONSTRAINT linkedin_shape_chk CHECK (
    linkedin = '{}'::jsonb
    OR (
      jsonb_typeof(linkedin -> 'followers') = 'number'
      AND (linkedin ->> 'followers')::numeric >= 0
      AND jsonb_typeof(linkedin -> 'posts30d') = 'number'
      AND (linkedin ->> 'posts30d')::numeric >= 0
      AND jsonb_typeof(linkedin -> 'url') = 'string'
      AND linkedin ->> 'url' LIKE '%linkedin.com/company/%'
      AND linkedin ->> 'attribution' = 'confirmed_company_page'
    )
  );
