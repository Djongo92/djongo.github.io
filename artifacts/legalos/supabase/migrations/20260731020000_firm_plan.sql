-- Plan/entitlement seam — schema only, nothing reads this yet.
--
-- Today there is no notion of a plan or tier anywhere: every signed-in user
-- gets full, unmetered access (see requireAccess in
-- supabase/functions/_shared/access.ts), and the marketing site's pricing
-- section is purely presentational ("€0 during early access"). This column
-- gives a firm somewhere to carry a plan so that when pricing turns on,
-- wiring it in is a change to hasEntitlement's body
-- (supabase/functions/_shared/entitlements.ts), not a schema migration plus
-- a retrofit of every access-control call site.
--
-- 'early_access' matches current reality (see marketing copy above) and is
-- deliberately not constrained to a fixed set of values — the real tiers
-- and their boundaries are future product decisions, not something this
-- migration should pre-guess or lock in with a CHECK constraint.
ALTER TABLE public.firms
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'early_access';
