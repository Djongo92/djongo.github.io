-- Domain verification before an audit can be published to the public
-- ranking (LegalOS build brief item 13). Anyone can currently run an audit
-- against any domain; without this, the public ranking has no guarantee
-- the publisher actually controls the domain they're claiming a score for.
--
-- Verification is a DNS TXT challenge (see visibility-audit-verify-domain)
-- rather than email, since this project has no SMTP configured yet
-- (Batch A note). verification_token is service_role-only, same posture
-- as every other write path on this table — a client never sets
-- verified_at directly.
ALTER TABLE public.market_visibility_audits
  ADD COLUMN verification_token TEXT,
  ADD COLUMN verified_at TIMESTAMPTZ;
