-- §5 — Firm profile: configure once, inherit everywhere. One row per firm
-- (not per user) — jurisdictions, offices, practice areas, tone of voice,
-- preferred terminology, competitor set, web/LinkedIn/directory profiles,
-- lawyer roster, brand rules, client restrictions, and previously approved
-- content. Every tool and audit should read from this instead of asking
-- again; repeated data entry is the most likely reason a marketing
-- director quietly stops using the product.
--
-- Deliberately jsonb-heavy rather than a wide normalized schema — this
-- data has no query pattern that needs SQL-level filtering (nothing joins
-- or aggregates across offices/lawyers/competitors across firms), and a
-- single jsonb blob per structured field means adding a new field to, say,
-- an office record is a frontend change, not a migration.
CREATE TABLE public.firm_profiles (
  firm_id                UUID NOT NULL PRIMARY KEY REFERENCES public.firms (id) ON DELETE CASCADE,
  jurisdictions          TEXT[] NOT NULL DEFAULT '{}',
  offices                JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ city, country, address? }]
  practice_areas         TEXT[] NOT NULL DEFAULT '{}',
  tone_of_voice          TEXT,
  preferred_terminology  JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { prefer: string[], avoid: string[] }
  competitor_set         JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ name, domain }]
  website                TEXT,
  linkedin_url           TEXT,
  directory_profiles     JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { chambers?, legal500?, iflr1000? } urls
  lawyer_roster          JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ name, title, practiceArea?, email? }]
  brand_rules            TEXT,
  client_restrictions    TEXT,
  approved_content       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ title, summary, approvedBy, approvedAt }]
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by             UUID REFERENCES auth.users (id)
);

GRANT SELECT ON public.firm_profiles TO authenticated;
GRANT ALL ON public.firm_profiles TO service_role;
REVOKE ALL ON public.firm_profiles FROM anon;

ALTER TABLE public.firm_profiles ENABLE ROW LEVEL SECURITY;

-- Same posture as firms/firm_members: any member of the firm can read it;
-- all writes go through the firm-profile edge function (service_role),
-- which enforces the canEditFirmProfile role check (src/lib/roles.ts) —
-- an RLS policy scoped to "your own firm" can't tell an executive from a
-- marketing user, only "am I a member at all".
CREATE POLICY "members can view their own firm's profile"
ON public.firm_profiles
FOR SELECT
TO authenticated
USING (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "writes via service role only"
ON public.firm_profiles
FOR INSERT TO public WITH CHECK (false);

CREATE POLICY "updates via service role only"
ON public.firm_profiles
FOR UPDATE TO public USING (false) WITH CHECK (false);

CREATE POLICY "deletes via service role only"
ON public.firm_profiles
FOR DELETE TO public USING (false);
