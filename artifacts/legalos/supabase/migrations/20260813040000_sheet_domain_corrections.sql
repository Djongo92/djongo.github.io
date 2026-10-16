-- Sheet-verified domain corrections (user's LinkedIn research spreadsheet is
-- ground truth for firm websites).
--
-- 1. Aleksić & Associates: lawofficealeksicbg.rs -> lawofficealeksic.rs.
--    Both domains serve the identical firm ("Advokatska Kancelarija Aleksić");
--    the sheet's domain is the user-verified canonical one.
--
-- 2. Law Office Kosic: kfadvokati.com -> kosiclawoffice.com.
--    kfadvokati.com is a DIFFERENT firm ("K&F Advokati") — the row pointed at
--    the wrong site entirely. kosiclawoffice.com serves "Advokatska
--    kancelarija Košić – Bojan Košić sa saradnicima" (verified live, 200).
--
-- Deliberately NOT changed: Harrisons stays harrison-solicitors.com — the
-- sheet's harrisonsllp.com is a Welsh namesake (Newtown & Welshpool), not the
-- Serbian firm. Kinstellar stays sog.rs (Serbia office site) — the sheet's
-- kinstellar.com is the global site.

UPDATE market_directory_data
SET firm_domain = 'lawofficealeksic.rs', last_verified_at = now()
WHERE market = 'serbia' AND firm_domain = 'lawofficealeksicbg.rs';

UPDATE market_directory_data
SET firm_domain = 'kosiclawoffice.com', last_verified_at = now()
WHERE market = 'serbia' AND firm_name = 'Law Office Kosic';
