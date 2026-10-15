---
name: Vitest 4 mockReset + mockRejectedValue false failure
description: In vitest 4, a mock reset/clear in beforeEach makes a caught mockRejectedValue rejection fail the test as "unhandled" — avoid resets in mock-heavy test files
---

In the legalos-mobile suite (vitest ^4.1.10), a test that catches a rejected mock promise still fails if the mock was reset (`mockReset()` or `mockClear()`) in a `beforeEach` hook — vitest reports the mock's rejection as an unhandled error *for that test* even though `try/catch` demonstrably caught it (verified by instrumented bisection: catch fired, assertion data was correct, test still failed).

**Why:** vitest 4's rejection tracking attributes the rejected promise created by `mockRejectedValue` to the test when a reset hook ran first; without any reset hook the identical code passes.

**How to apply:** in mobile (or any vitest-4) test files that mock modules, skip `beforeEach` reset/clear entirely — have every test set its own `mockResolvedValue`/`mockRejectedValue` and write call-history assertions with `toHaveBeenCalledWith` (tolerates accumulated history). Working example: `artifacts/legalos-mobile/lib/notifications.test.ts`.
