-- Domain enrichment pass for market_directory_data (market = 'serbia').
--
-- The original harvest (see 20260719150000_...sql) did not capture
-- firm_domain, so market_directory_data rows were keyed on firm_name only.
-- This migration fills in firm_domain for the firms whose official website
-- could be identified with reasonable confidence via web search performed
-- on 2026-07-21. It is a desk-research pass based on search-result
-- titles/snippets (firm's own site, Legal 500 / Chambers / IFLR1000 profile
-- pages, LinkedIn, etc.) — it was NOT scraped or verified live against each
-- firm's own site, and domains were not fabricated to fill gaps.
--
-- Firms intentionally left without firm_domain (name too ambiguous to
-- confidently identify a single official site, or no clear official site
-- found) should continue to rely on fuzzy name-matching in
-- visibility-audit-reputation until a further pass can verify them.
--
-- Note on multi-country/global brands (Wolf Theiss, CMS, Deloitte Legal):
-- the domain recorded is the firm's official global/group domain, since
-- that is the domain a client would actually operate under and enter when
-- running an audit — these firms' Serbian offices are "in cooperation
-- with" the international brand rather than separately branded.
--
-- A 5-entry independent spot-check (Gecić Law, Kinstellar/SOG, Zunić Law,
-- Drašković Popović & Partners, CWB) came back confirmed, with three
-- naming nuances worth flagging rather than blocking on: SOG now operates
-- as "SOG in cooperation with Kinstellar" post-2023 tie-up (domain sog.rs
-- still correct); Drašković Popović & Partners was "Bojović Drašković
-- Popović & Partners" until the Bojović departure (domain d2plaw.com still
-- correct, matches the seed's post-rebrand name); CWB's Serbian office
-- operates locally as PETOŠEVIĆ, a CWB Group brand post-2023 merger — same
-- corporate group/office, domain cwbip.com is directionally correct but
-- not the name a Serbian client would recognize locally.

UPDATE public.market_directory_data SET firm_domain = 'schoenherr.rs' WHERE market = 'serbia' AND firm_name = 'Schoenherr (Moravčević Vojnović and Partners)';
UPDATE public.market_directory_data SET firm_domain = 'karanovicpartners.com' WHERE market = 'serbia' AND firm_name = 'Karanović & Partners';
UPDATE public.market_directory_data SET firm_domain = 'bdkadvokati.com' WHERE market = 'serbia' AND firm_name = 'BDK Advokati';
UPDATE public.market_directory_data SET firm_domain = 'wolftheiss.com' WHERE market = 'serbia' AND firm_name = 'Wolf Theiss (Law Office Miroslav Stojanović)';
UPDATE public.market_directory_data SET firm_domain = 'cms.law' WHERE market = 'serbia' AND firm_name = 'CMS (Petrikić & Partneri AOD)';
UPDATE public.market_directory_data SET firm_domain = 'jpm.law' WHERE market = 'serbia' AND firm_name = 'JPM & Partners';
UPDATE public.market_directory_data SET firm_domain = 'sog.rs' WHERE market = 'serbia' AND firm_name = 'Kinstellar (SOG)';
UPDATE public.market_directory_data SET firm_domain = 'geciclaw.com' WHERE market = 'serbia' AND firm_name = 'Gecić Law';
UPDATE public.market_directory_data SET firm_domain = 'd2plaw.com' WHERE market = 'serbia' AND firm_name = 'Drašković Popović & Partners';
UPDATE public.market_directory_data SET firm_domain = 'doklestic.law' WHERE market = 'serbia' AND firm_name = 'Doklestić Repić & Gajin';
UPDATE public.market_directory_data SET firm_domain = 'nstlaw.rs' WHERE market = 'serbia' AND firm_name = 'Stanković & Partners (NSTLAW)';
UPDATE public.market_directory_data SET firm_domain = 'nko-law.com' WHERE market = 'serbia' AND firm_name = 'NKO Partners';
UPDATE public.market_directory_data SET firm_domain = 'mjb.rs' WHERE market = 'serbia' AND firm_name = 'Mikijelj Janković & Bogdanović';
UPDATE public.market_directory_data SET firm_domain = 'rspartners.rs' WHERE market = 'serbia' AND firm_name = 'Radovanović Stojanović & Partners';
UPDATE public.market_directory_data SET firm_domain = 'harrison-solicitors.com' WHERE market = 'serbia' AND firm_name = 'Harrisons Solicitors';
UPDATE public.market_directory_data SET firm_domain = 'jsplaw.co.rs' WHERE market = 'serbia' AND firm_name = 'Joksović, Stojanović & Partners';
UPDATE public.market_directory_data SET firm_domain = 'mvj.rs' WHERE market = 'serbia' AND firm_name = 'MVJ Marković Vukotić Jovković';
UPDATE public.market_directory_data SET firm_domain = 'bopa.rs' WHERE market = 'serbia' AND firm_name = 'BOPA Bojanović & Partners';
UPDATE public.market_directory_data SET firm_domain = 'mmd-associates.com' WHERE market = 'serbia' AND firm_name = 'MMD Advokati';
UPDATE public.market_directory_data SET firm_domain = 'mim-law.com' WHERE market = 'serbia' AND firm_name = 'Mihaj, Ilić & Milanović';
UPDATE public.market_directory_data SET firm_domain = 'cwbip.com' WHERE market = 'serbia' AND firm_name = 'CWB';
UPDATE public.market_directory_data SET firm_domain = 'msa-iplaw.com' WHERE market = 'serbia' AND firm_name = 'MSA IP (Milojević Sekulić & Associates)';
UPDATE public.market_directory_data SET firm_domain = 'zmp.eu' WHERE market = 'serbia' AND firm_name = 'Živko Mijatović & Partners';
UPDATE public.market_directory_data SET firm_domain = 'pricapartners.com' WHERE market = 'serbia' AND firm_name = 'Prica & Partners';
UPDATE public.market_directory_data SET firm_domain = 'zslaw.rs' WHERE market = 'serbia' AND firm_name = 'Živković Samardžić';
UPDATE public.market_directory_data SET firm_domain = 'nkp.rs' WHERE market = 'serbia' AND firm_name = 'Nikčević Kapor';
UPDATE public.market_directory_data SET firm_domain = 'zsp-legal.com' WHERE market = 'serbia' AND firm_name = 'ZSP Advokati';
UPDATE public.market_directory_data SET firm_domain = 'vujinovicpartners.rs' WHERE market = 'serbia' AND firm_name = 'Vujinović & Partners';
UPDATE public.market_directory_data SET firm_domain = 'bit-law.com' WHERE market = 'serbia' AND firm_name = 'BIT Law Office';
UPDATE public.market_directory_data SET firm_domain = 'djokicpartners.rs' WHERE market = 'serbia' AND firm_name = 'Djokić + Partners';
UPDATE public.market_directory_data SET firm_domain = 'vp.rs' WHERE market = 'serbia' AND firm_name = 'Vuković & Partners (act legal Serbia)';
UPDATE public.market_directory_data SET firm_domain = 'zuniclaw.com' WHERE market = 'serbia' AND firm_name = 'Zunić Law';
UPDATE public.market_directory_data SET firm_domain = 'atanaskovic-bozovic.com' WHERE market = 'serbia' AND firm_name = 'Atanasković Božović';
UPDATE public.market_directory_data SET firm_domain = 'bnb.law' WHERE market = 'serbia' AND firm_name = 'BnB Law Firm';
UPDATE public.market_directory_data SET firm_domain = 'avs.legal' WHERE market = 'serbia' AND firm_name = 'AVS Legal';
UPDATE public.market_directory_data SET firm_domain = 'jplaw.rs' WHERE market = 'serbia' AND firm_name = 'Jusufović & Partners';
UPDATE public.market_directory_data SET firm_domain = 'prlegal.rs' WHERE market = 'serbia' AND firm_name = 'PR Legal';
UPDATE public.market_directory_data SET firm_domain = 'ctlegal.rs' WHERE market = 'serbia' AND firm_name = 'CT Legal (Caković Tomić)';
UPDATE public.market_directory_data SET firm_domain = 'ppsp.rs' WHERE market = 'serbia' AND firm_name = 'Popović, Popović & Partners';
UPDATE public.market_directory_data SET firm_domain = 'deloitte.com' WHERE market = 'serbia' AND firm_name = 'Deloitte Legal Serbia';
UPDATE public.market_directory_data SET firm_domain = 'psg.rs' WHERE market = 'serbia' AND firm_name = 'PSG Legal';
UPDATE public.market_directory_data SET firm_domain = 'cplaw.rs' WHERE market = 'serbia' AND firm_name = 'Cvetković Skoko & Jovičić';
UPDATE public.market_directory_data SET firm_domain = 'gsm.legal' WHERE market = 'serbia' AND firm_name = 'Golubović Simić & Marinković';
UPDATE public.market_directory_data SET firm_domain = 'vuliclaw.com' WHERE market = 'serbia' AND firm_name = 'Vulić Law';
