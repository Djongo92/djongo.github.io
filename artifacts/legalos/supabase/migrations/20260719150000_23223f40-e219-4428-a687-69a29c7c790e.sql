-- ===========================================================================
-- Market Visibility Score: data model (LegalOS Batch A)
--
-- Adds a sixth, externally-sourced analysis surface distinct from the
-- existing single-shot LLM tools (score-website, roast-homepage,
-- competitor-analysis, firm-maturity-plan): a peer-group-normalized,
-- cross-session-comparable score persisted centrally.
--
-- Security posture is deliberately NOT copied from firm_benchmarks'
-- original "anyone can read/write" precedent (tightened once already by
-- migration 20260427075723 + 20260607132519). A specific firm's real
-- directory standing is more sensitive than anonymous reading-engagement
-- stats, so market_visibility_audits ships tightened from day one:
--   - SELECT: only published (is_public = true) rows are publicly
--     readable. There is no identity-scoped read policy, because there is
--     no real session/JWT to scope one to (verify_jwt = false throughout,
--     no Supabase Auth users) — "see your own unpublished result" goes
--     through a service-role edge function (visibility-audit-get) scoped
--     by client_id server-side, the same pattern already used for
--     url_cache and shared_artifacts writes.
--   - INSERT/UPDATE: explicit-deny for anon/authenticated. All writes go
--     through visibility-audit-run / visibility-audit-publish
--     (service_role only). A client never sets is_public directly.
-- market_directory_data and directory_lookup_requests are reference/queue
-- tables with no anon/authenticated access at all — mirrors url_cache.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- market_visibility_audits
-- ---------------------------------------------------------------------------
CREATE TABLE public.market_visibility_audits (
  id                        UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                 UUID NOT NULL,               -- same anonymous-identity pattern as firm_benchmarks
  audited_domain            TEXT NOT NULL,                -- firm-identity key; comparisons are domain-to-domain
  display_name              TEXT,
  market                    TEXT NOT NULL,
  peer_group                TEXT NOT NULL CHECK (peer_group IN ('international', 'regional', 'local', 'localized_page', 'consultancy')),

  performance_score         NUMERIC NOT NULL DEFAULT 0,    -- / 20
  social_score               NUMERIC NOT NULL DEFAULT 0,    -- / 20
  seo_authority_score        NUMERIC NOT NULL DEFAULT 0,    -- / 60
  thought_leadership_score   NUMERIC NOT NULL DEFAULT 0,    -- / 45
  reputation_score           NUMERIC NOT NULL DEFAULT 0,    -- / 55
  total_score                NUMERIC GENERATED ALWAYS AS (
                               performance_score + social_score + seo_authority_score
                               + thought_leadership_score + reputation_score
                             ) STORED,                      -- / 200

  raw_metrics               JSONB NOT NULL DEFAULT '{}'::jsonb,   -- every input value — re-normalizing later never requires re-fetching
  provenance                JSONB NOT NULL DEFAULT '{}'::jsonb,   -- per-metric: 'api' | 'ai_classified' | 'self_reported' | 'missing'

  is_public                 BOOLEAN NOT NULL DEFAULT false,
  published_at              TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (client_id, audited_domain, market)
);

CREATE INDEX idx_market_visibility_audits_public_ranking
  ON public.market_visibility_audits (market, peer_group, total_score DESC)
  WHERE is_public = true;

CREATE INDEX idx_market_visibility_audits_client
  ON public.market_visibility_audits (client_id);

CREATE OR REPLACE FUNCTION public.update_market_visibility_audits_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_market_visibility_audits_updated_at
BEFORE UPDATE ON public.market_visibility_audits
FOR EACH ROW EXECUTE FUNCTION public.update_market_visibility_audits_updated_at();

-- Grants: public rows are readable by anyone; every write goes through a
-- service_role edge function.
GRANT SELECT ON public.market_visibility_audits TO anon;
GRANT SELECT ON public.market_visibility_audits TO authenticated;
GRANT ALL    ON public.market_visibility_audits TO service_role;

ALTER TABLE public.market_visibility_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published audits"
ON public.market_visibility_audits
FOR SELECT
USING (is_public = true);

CREATE POLICY "writes via service role only"
ON public.market_visibility_audits
FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "updates via service role only"
ON public.market_visibility_audits
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "deletes via service role only"
ON public.market_visibility_audits
FOR DELETE
TO public
USING (false);

-- ---------------------------------------------------------------------------
-- market_directory_data — reference data, reviewed quarterly, not
-- scraped live per request. service_role only, no anon/authenticated
-- access at all (mirrors url_cache).
-- ---------------------------------------------------------------------------
CREATE TABLE public.market_directory_data (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market           TEXT NOT NULL,
  firm_name        TEXT NOT NULL,
  firm_domain      TEXT,                    -- nullable — not yet captured for the Serbia harvest
  firm_type        TEXT,                    -- 'R' regional | 'I' international | 'L' local | 'C' consultancy, as harvested
  chambers         JSONB NOT NULL DEFAULT '{}'::jsonb,
  legal500         JSONB NOT NULL DEFAULT '{}'::jsonb,
  iflr1000         JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (market, firm_name)
);

CREATE INDEX idx_market_directory_data_market ON public.market_directory_data (market);
CREATE INDEX idx_market_directory_data_domain ON public.market_directory_data (firm_domain) WHERE firm_domain IS NOT NULL;

GRANT ALL ON public.market_directory_data TO service_role;
REVOKE ALL ON public.market_directory_data FROM anon, authenticated;

ALTER TABLE public.market_directory_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.market_directory_data
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- directory_lookup_requests — tiny queue. visibility-audit-reputation
-- inserts here on a directory miss instead of failing the audit.
-- service_role only, no anon/authenticated access.
-- ---------------------------------------------------------------------------
CREATE TABLE public.directory_lookup_requests (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market               TEXT NOT NULL,
  firm_domain_or_name  TEXT NOT NULL,
  requested_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_directory_lookup_requests_market ON public.directory_lookup_requests (market, requested_at DESC);

GRANT ALL ON public.directory_lookup_requests TO service_role;
REVOKE ALL ON public.directory_lookup_requests FROM anon, authenticated;

ALTER TABLE public.directory_lookup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.directory_lookup_requests
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- Seed: Serbia, 44 firms — verified live against Chambers Europe 2026 +
-- Legal 500 EMEA 2026, 2026-07-19. Domains were not captured during
-- harvest; rows are keyed on firm_name until a follow-up enrichment pass
-- fills firm_domain in. Do not fabricate domains to fill the gap.
-- Chambers codes: BF Banking & Finance · CO Competition/Antitrust ·
-- CC Corporate/Commercial · DR Dispute Resolution · EM Employment ·
-- IP IP & TMT · PR Projects/Infrastructure/Energy (band, 1=best).
-- Legal 500 codes: BF Banking and Finance · CC Commercial/Corporate/M&A ·
-- CO Competition · DR Dispute Resolution · EM Employment ·
-- IP Intellectual Property · PE Projects and Energy ·
-- RE Real Estate and Construction (tier, 1=best).
-- ---------------------------------------------------------------------------
INSERT INTO public.market_directory_data (market, firm_name, firm_type, chambers, legal500, iflr1000, last_verified_at)
VALUES
  ('serbia', 'Schoenherr (Moravčević Vojnović and Partners)', 'R', '{"rankedTables":{"BF":1,"CO":1,"CC":1,"DR":1,"EM":1,"IP":2,"PR":1}}'::jsonb, '{"rankedTables":{"BF":1,"CC":1,"CO":1,"DR":1,"EM":1,"IP":2,"PE":1,"RE":1}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Karanović & Partners', 'R', '{"rankedTables":{"BF":1,"CO":2,"CC":1,"DR":1,"EM":1,"IP":2,"PR":1}}'::jsonb, '{"rankedTables":{"BF":1,"CC":1,"CO":1,"DR":1,"EM":1,"IP":2,"PE":1,"RE":1}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'BDK Advokati', 'L', '{"rankedTables":{"BF":2,"CO":3,"CC":3,"DR":3,"EM":2,"IP":2,"PR":1}}'::jsonb, '{"rankedTables":{"BF":2,"CC":2,"CO":2,"DR":2,"EM":2,"IP":3,"PE":1,"RE":1}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Wolf Theiss (Law Office Miroslav Stojanović)', 'R', '{"rankedTables":{"BF":2,"CO":3,"CC":2,"DR":4,"EM":3,"PR":3}}'::jsonb, '{"rankedTables":{"BF":1,"CC":1,"CO":3,"DR":2,"EM":2,"IP":3,"PE":2,"RE":2}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'CMS (Petrikić & Partneri AOD)', 'I', '{"rankedTables":{"BF":3,"CO":3,"CC":3,"DR":4,"EM":2,"PR":2}}'::jsonb, '{"rankedTables":{"BF":2,"CC":1,"CO":3,"DR":2,"EM":1,"PE":1,"RE":1}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'JPM & Partners', 'L', '{"rankedTables":{"CO":3,"CC":3,"DR":2,"IP":3,"PR":3}}'::jsonb, '{"rankedTables":{"BF":2,"CC":1,"CO":1,"DR":1,"EM":1,"IP":3,"PE":1,"RE":2}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Kinstellar (SOG)', 'R', '{"rankedTables":{"BF":2,"CC":2,"DR":4,"EM":3,"PR":3}}'::jsonb, '{"rankedTables":{"BF":1,"CC":3,"CO":3,"DR":3,"EM":3,"PE":3,"RE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Gecić Law', 'L', '{"rankedTables":{"BF":3,"CO":2,"DR":4,"PR":3}}'::jsonb, '{"rankedTables":{"BF":3,"CC":2,"CO":1,"DR":4,"PE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Drašković Popović & Partners', 'L', '{"rankedTables":{"CC":3,"EM":3}}'::jsonb, '{"rankedTables":{"BF":3,"CC":3,"CO":3,"DR":3,"EM":1,"PE":3,"RE":2}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Doklestić Repić & Gajin', 'L', '{"rankedTables":{"CO":3,"CC":4,"EM":3}}'::jsonb, '{"rankedTables":{"BF":3,"CC":3,"CO":2,"DR":3,"EM":2,"RE":2}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Stanković & Partners (NSTLAW)', 'L', '{"rankedTables":{"DR":3}}'::jsonb, '{"rankedTables":{"BF":3,"CC":3,"CO":3,"DR":2,"EM":3,"IP":3,"PE":3,"RE":4}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'NKO Partners', 'L', '{"rankedTables":{"CC":3,"DR":4,"EM":3}}'::jsonb, '{"rankedTables":{"CC":2,"CO":2,"DR":3,"EM":4,"RE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Mikijelj Janković & Bogdanović', 'L', '{"rankedTables":{"DR":2,"IP":1}}'::jsonb, '{"rankedTables":{"DR":2,"EM":2,"IP":1}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Radovanović Stojanović & Partners', 'L', '{"rankedTables":{"CO":3,"CC":4,"EM":3}}'::jsonb, '{"rankedTables":{"CC":4,"CO":1,"EM":3,"RE":4}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Harrisons Solicitors', 'L', '{"rankedTables":{"BF":2,"CC":4}}'::jsonb, '{"rankedTables":{"BF":2,"CC":4,"DR":4,"EM":3,"RE":4}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Joksović, Stojanović & Partners', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"BF":2,"CC":3,"CO":3,"DR":2,"EM":2,"IP":3,"PE":2,"RE":2}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'MVJ Marković Vukotić Jovković', 'L', '{"rankedTables":{"CC":4,"PR":3}}'::jsonb, '{"rankedTables":{"BF":3,"CC":2,"PE":2,"RE":2}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'BOPA Bojanović & Partners', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"BF":2,"CC":3,"CO":3,"DR":4,"EM":3,"IP":2,"PE":3,"RE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'MMD Advokati', 'L', '{"rankedTables":{"CC":4,"EM":3}}'::jsonb, '{"rankedTables":{"CC":3,"DR":3,"EM":3,"RE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Mihaj, Ilić & Milanović', 'L', '{"rankedTables":{"DR":2}}'::jsonb, '{"rankedTables":{"CC":4,"DR":1,"PE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'CWB', 'L', '{"rankedTables":{"IP":2}}'::jsonb, '{"rankedTables":{"IP":1}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'MSA IP (Milojević Sekulić & Associates)', 'L', '{"rankedTables":{"IP":1}}'::jsonb, '{"rankedTables":{"IP":2}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Živko Mijatović & Partners', 'R', '{"rankedTables":{"IP":2}}'::jsonb, '{"rankedTables":{"IP":1}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Prica & Partners', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"BF":3,"CC":2,"CO":2,"DR":3,"EM":2,"PE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Živković Samardžić', 'L', '{"rankedTables":{"DR":4}}'::jsonb, '{"rankedTables":{"CC":3,"DR":3,"EM":3,"RE":4}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Nikčević Kapor', 'L', '{"rankedTables":{"DR":3}}'::jsonb, '{"rankedTables":{"DR":4,"PE":2,"RE":4}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'ZSP Advokati', 'L', '{"rankedTables":{"BF":3,"CC":4}}'::jsonb, '{"rankedTables":{"BF":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Vujinović & Partners', 'L', '{"rankedTables":{"IP":3}}'::jsonb, '{"rankedTables":{"EM":4,"IP":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'BIT Law Office', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"CC":4,"DR":3,"EM":4,"PE":3,"RE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Djokić + Partners', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"BF":3,"DR":4,"IP":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Vuković & Partners (act legal Serbia)', 'R', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"CC":4,"EM":3,"RE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Zunić Law', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"EM":3,"IP":2}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Atanasković Božović', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"CC":4,"DR":4,"EM":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'BnB Law Firm', 'L', '{"rankedTables":{"CO":2}}'::jsonb, '{"rankedTables":{}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'AVS Legal', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"EM":3,"RE":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Jusufović & Partners', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"DR":2}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'PR Legal', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"EM":3,"IP":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'CT Legal (Caković Tomić)', 'L', '{"rankedTables":{"EM":3}}'::jsonb, '{"rankedTables":{}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Popović, Popović & Partners', 'L', '{"rankedTables":{"IP":3}}'::jsonb, '{"rankedTables":{}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Deloitte Legal Serbia', 'C', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"CC":3}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'PSG Legal', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"CC":4,"RE":4}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Cvetković Skoko & Jovičić', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"RE":4}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Golubović Simić & Marinković', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"DR":4}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Vulić Law', 'L', '{"rankedTables":{}}'::jsonb, '{"rankedTables":{"RE":4}}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz)
ON CONFLICT (market, firm_name) DO NOTHING;
