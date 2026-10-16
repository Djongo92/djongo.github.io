---
name: Authenticated CORS smoke guard
description: How the web app's signed-in edge-call surface is regression-tested without real credentials.
---

Two-layer guard against reintroducing a custom session header the deployed edge functions' CORS rejects:

1. Unit level: an edgeAuth test asserts the session only ever travels in `Authorization`, plus a source scan failing on any quoted `x-user-token` literal under the web app's `src/` (comments may mention it — only string literals go on the wire).
2. Browser level: `tests/auth-smoke.mjs` in the web app (run via `smoke:auth`) drives nix Chromium through the signed-in bootstrap.

**Key trick:** you don't need real credentials to exercise the CORS preflight surface. Inject a fabricated (unsigned, far-future-expiry) session JSON into supabase-js's `sb-<ref>-auth-token` localStorage key; the app treats it as signed in and fires every authenticated edge call. The server 401s the token, but any HTTP response proves the preflight passed — a rejected preflight shows up as `net::ERR_FAILED` with no response at all. Set `SMOKE_EMAIL`/`SMOKE_PASSWORD` for the full real-sign-in mode.

**Gotcha:** preflights to *undeployed* functions (404) also fail CORS, so the smoke script allowlists known-dead client calls (`KNOWN_UNDEPLOYED`) — prune that list as dead calls are removed, or real regressions hide behind it.
