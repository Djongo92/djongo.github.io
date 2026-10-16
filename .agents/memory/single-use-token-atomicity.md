---
name: Single-use token atomicity
description: Any single-use redemption (invites, review links) must be claimed atomically — read-then-write is a race
---

Single-use token redemption must claim the token with a conditional atomic UPDATE (`... WHERE token = X AND used_at IS NULL AND expires_at > now()` with `.select().maybeSingle()`) BEFORE granting the resource, never read-check-then-write. Roll back the claim (scoped to the claimant) if the grant fails so a transient error doesn't burn the token. Make same-user re-redemption idempotent (return the success payload when `used_by === userId`) so client remounts/double-taps don't error.

**Why:** code review (2026-08-15) caught firm-invite's read-then-write letting two concurrent redeems both join a firm with the granted role.
**How to apply:** any new expiring/single-use link flow (invites, partner-review, share links) in `artifacts/legalos/supabase/functions/` — the pattern lives in `firm-invite/index.ts`.
