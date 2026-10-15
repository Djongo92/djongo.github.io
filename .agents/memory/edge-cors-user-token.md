---
name: Web session header vs deployed edge CORS
description: Why the web app must send the user session in Authorization, never x-user-token, to Supabase edge functions.
---

None of the currently deployed edge functions include `x-user-token` in their CORS `Access-Control-Allow-Headers` (verified against every deployed function on 2026-07-31) — a browser preflight carrying that header fails outright, so every authenticated web call using it reads as broken (audit restore, user-state sync, notifications).

**The rule:** in browser clients, the session JWT travels in `Authorization: Bearer <jwt>` (replacing the anon key); server-side `userJwtFrom` treats any non-anon-key bearer as the user session. `x-user-token` remains fine for mobile (no CORS preflight).

**Why:** local edits to `supabase/functions` are inert (no deploy CLI here — see the edge-deploy-gap note), so client code must fit the *deployed* CORS surface, not the local one.

**How to apply:** any new authed edge call from a web artifact goes through the shared header builder (which now defaults to Authorization). If auth calls suddenly fail with "header not allowed by Access-Control-Allow-Headers", suspect a custom header vs stale deployed CORS before suspecting app code. Also: `firm-profile` and `executive-report-schedule` are referenced by the client but return 404 — not deployed at all.
