---
name: Mobile Supabase auth + data layer
description: How the mobile app authenticates and fetches live audit data from the edge functions
---

# Mobile Supabase auth + live data

## Auth mechanism
- `@supabase/supabase-js` installed in `artifacts/legalos-mobile`
- Email OTP via `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`
- OTP verification via `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- Session persisted in AsyncStorage; restored on app launch via `supabase.auth.getSession()`
- `AuthProvider` in `context/AuthContext.tsx` wraps the entire app; `DataProvider` nests inside it

## Calling edge functions from mobile
Edge functions go through `requireAccess` in `_shared/access.ts`. A global bypass constant that
let every call through once existed; **it is gone** — see
[access-control-model.md](access-control-model.md) for the tiers that replaced it.

Consequence for mobile: the session JWT must be sent as the **`x-user-token` header**, not only
in the body. Body `accessToken` still resolves *which firm* you are, but it is invisible to the
middleware (which cannot read the body), so a call without the header is treated as anonymous
and anything off the demo allowlist lands as a 401.

**Mobile has shipped this bug twice** — the app has more than one edge-call helper, and fixing
only the one you are looking at leaves the others broken. When touching auth headers, grep for
every `functions/v1/` fetch in the app, not just the obvious helper.

Standard call pattern from mobile:
```
POST /functions/v1/<name>
Authorization: Bearer <SUPABASE_ANON_KEY>
apikey: <SUPABASE_ANON_KEY>
x-user-token: <session.access_token>
Content-Type: application/json

{ "clientId": "<user.id>", "accessToken": "<session.access_token>" }
```

The server's `resolveClientId()` uses the Supabase JWT in `accessToken` to find the real firm,
ignoring the client-asserted `clientId` (which is still required to be non-empty).

## Data flow
1. `useAuth()` session changes → `DataProvider` calls `refresh()`
2. `refresh()` calls `visibility-audit-get` with user.id + access_token
3. Response: `{ audits: [...], history: [...], corrections: [...] }`
4. `audits[0]` = most recent audit; mapped to `Firm` type
5. `history` (from `market_visibility_audit_history`) = array mapped to `AuditHistoryEntry[]`
6. If unauthenticated or fetch fails → stays on DEMO_FIRM (graceful fallback)

## Key column names from `market_visibility_audits`
`total_score`, `performance_score`, `social_score`, `seo_authority_score`,
`thought_leadership_score`, `reputation_score`, `firm_name`, `firm_domain`
`percentile` and `peer_count` added by the edge function's `computePercentile()` call.

**Why:** `firm_domain` in audits vs `audited_domain` in history table — always use both with fallback.

## Demo mode
`isDemo: boolean` in DataContext is `true` when no authenticated user or API fails.
App works fully in demo mode with `DEMO_FIRM` static data — so the mobile app is still usable
without signing in, but now because the fetch is *refused* and falls back, not because access
control was bypassed. Keep that fallback graceful: a 401 is now an expected, normal path.
