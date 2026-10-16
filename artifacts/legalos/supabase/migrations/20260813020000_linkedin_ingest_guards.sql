-- Code-review follow-up to 20260813010000_directory_linkedin_ingest.sql.
--
-- 1) Two rows the source sheet marked as unclaimed/unattributable pages
--    (Joksović, Stojanović & Partners; Isailović & Partners) were ingested as
--    {followers:0, posts30d:0}. An unclaimed page means the followership is
--    NOT reliably attributable to the firm — unknown, not zero. The peer
--    pool reads these numerics from frozen audits, so the rows are cleared.
--    Their census audits are re-run after this migration (progress reset),
--    re-freezing social from homepage presence detection.
UPDATE public.market_directory_data SET linkedin = '{}'::jsonb
WHERE market = 'serbia' AND firm_domain IN ('jsplaw.co.rs', 'advokatskakancelarija.com');

-- 2) Shape guard: a linkedin record is either empty or a complete,
--    attributable observation — non-negative numerics plus a LinkedIn
--    company-page URL. Blocks any future ingest from recording an unknown
--    as a numeric zero or pointing at a non-company page.
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
    )
  );
