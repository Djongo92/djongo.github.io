---
name: Mobile per-account state must be identity-owned at render
description: Any mobile state derived from a signed-in account must store its owner identity and only render when owner === current user — effect-based cleanup leaks one frame
---

For any mobile state fetched for a specific signed-in account (notifications, firm context, etc.), store the owner identity *with* the data (`{ owner, ...data }`, set atomically) and expose it only when `owner === currentUserId` **during render**. Also guard in-flight fetches with an identity ref before committing.

**Why:** `useEffect` cleanup runs *after* the identity-change render commits, so effect-based clearing still paints one frame of account A's data for account B — a cross-account privacy leak. Code review caught this in the notifications inbox; `useFirmContext` already followed the same rule for stale server responses.

**How to apply:** any new hook/component that caches account-scoped server data in legalos-mobile. Regression pattern: `hooks/useNotifications.test.tsx` (jsdom + renderHook; assert empty synchronously after identity-change rerender, and that a late response for the previous account is discarded).
