-- §4 (accounts and organizations): widen firm_members from a bare
-- owner/member split to five named roles a real firm actually has —
-- workspace admin, marketing user, partner contributor, external
-- consultant, and read-only executive — without touching the existing
-- shared-password access system (_shared/access.ts) at all, and without
-- breaking any already-provisioned firm/membership row.
--
-- 'owner' and 'member' are kept as valid values (existing rows, and the
-- handle_new_user_firm() trigger, both still write 'owner' on signup) —
-- 'owner' is treated as a permanent superset of 'admin' in application
-- code (src/lib/roles.ts), not replaced by it, since the trigger's
-- auto-provisioning behavior is out of scope for this change.
ALTER TABLE public.firm_members DROP CONSTRAINT firm_members_role_check;
ALTER TABLE public.firm_members ADD CONSTRAINT firm_members_role_check
  CHECK (role IN ('owner', 'admin', 'marketing', 'partner', 'consultant', 'executive', 'member'));

-- Time-bounded access — an external consultant or an executive given a
-- look-in for a specific engagement doesn't need standing access forever.
-- NULL means "no expiry" (the default for every existing/normal role).
ALTER TABLE public.firm_members ADD COLUMN access_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.firm_members.access_expires_at IS
  'Optional access expiry, primarily for consultant/executive roles. NULL = standing access.';

-- The invite link now carries which role the redeemer joins as (an admin
-- picks the role when creating the link) — previously every invite
-- silently granted 'member'.
ALTER TABLE public.firm_invites ADD COLUMN role TEXT NOT NULL DEFAULT 'marketing'
  CHECK (role IN ('admin', 'marketing', 'partner', 'consultant', 'executive'));

COMMENT ON COLUMN public.firm_invites.role IS
  'Role the redeemer joins as. Never owner/admin-by-default — an admin invite must be explicitly chosen.';
