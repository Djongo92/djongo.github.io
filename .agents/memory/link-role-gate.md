---
name: Bearer-link role gate
description: How to gate link-minting endpoints on firm role — scoped to the resolved firm, fail-closed, with the personal-identity exemption.
---

Any edge function that mints bearer-token links (or otherwise gates on firm role) must use `supabase/functions/_shared/firmRoleGate.ts`, not an inline `firm_members` lookup.

**Why:** Two review-caught holes in the hand-rolled versions: (1) a user-only `maybeSingle()` on `firm_members` errors for multi-firm users and — because the check only denied when a role row was found — silently *authorized* them; (2) wrapping the gate in `if (userData?.user)` fails open on a transient `auth.getUser` error and mints the link anyway.

**How to apply:**
- Scope the membership query to BOTH `user_id` and the resolver-returned `firm_id`.
- Fail closed on query error (500) and on a missing row (403) — EXCEPT when `firmId === userId`: `resolveForUser` in `_shared/verifiedClientId.ts` returns the user's own id for single-member "firms", which have no `firm_members` row at all. Denying that case breaks every solo account (the smoke account is one).
- Make the gate unconditional after client resolution — `resolveVerifiedClientId` already failed closed, so a second `getUser` must 401 if it can't re-verify, not skip.
- `tests/link-gate-guard.test.ts` pins this wiring by source; extend it when adding a new link-minting function.
