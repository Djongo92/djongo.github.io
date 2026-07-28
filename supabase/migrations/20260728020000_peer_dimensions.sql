-- §7 — Peer groups: the existing peer_group (international/regional/local/
-- localized_page/consultancy) stays the primary, always-required dimension
-- — it's what Reputation's static market_directory_data match keys off of
-- (via firm_type) and what every historical row already has. These five
-- new columns are optional refinements, self-reported at intake exactly
-- like gbpListed/social already are (no clean firm-size/office-count API
-- exists any more than a follower-count one does), letting Social and
-- Thought Leadership's LIVE peer comparison (peerStats.ts, which queries
-- other published audits — unlike Reputation's static directory match)
-- narrow further than peer_group alone when there's enough sample to do so
-- meaningfully. All nullable: a historical audit or a firm that skips this
-- step scores exactly as it did before — nothing here is required for a
-- complete, honest score.
--
-- Deliberately NOT the same thing as a firm's own chosen competitor set
-- (firm_profiles.competitor_set, §5) or a user's personal tracked-
-- competitors watchlist (useTrackedCompetitors) — those are "who do I want
-- to compare myself to"; peer_group and these refinement columns are "who
-- is statistically comparable for benchmarking," a different question with
-- a different owner (the audit, not the user's preferences).
ALTER TABLE public.market_visibility_audits
  ADD COLUMN firm_size TEXT CHECK (firm_size IN ('solo', 'boutique_2_10', 'mid_11_50', 'large_51_200', 'enterprise_200_plus')),
  ADD COLUMN office_count TEXT CHECK (office_count IN ('single', 'multi')),
  ADD COLUMN service_model TEXT CHECK (service_model IN ('full_service', 'boutique_specialist')),
  ADD COLUMN specialization TEXT,
  ADD COLUMN market_tier TEXT CHECK (market_tier IN ('tier1', 'tier2', 'tier3'));
