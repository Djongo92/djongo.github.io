---
name: Mobile demo-data gating
description: How to decide demo vs real-account data on mobile without leaking demo facts into signed-in runs
---

Rule: anything that feeds a real account's server-bound request (e.g. workshop firmContext) must be gated on *auth identity*, never on `DataContext.isDemo` or data availability.

**Why:** `isDemo` starts true and only flips after a visibility-audit round-trip, and `AuthContext.isLoading` is true during session restoration — both windows let a signed-in user submit the demo firm's facts. Two completion reviews rejected exactly this before the auth-gated version passed.

**How to apply:** while `isLoading` or an authenticated fetch is in flight, expose `null` (functions omit the block honestly); show demo values only after auth restoration completes signed out; clear stale values synchronously before awaiting, with a generation guard so late replies from a previous account never commit.
