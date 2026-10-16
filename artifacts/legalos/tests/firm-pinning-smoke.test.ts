// @vitest-environment node
// Runs the live firm-pinning smoke against the deployed user-state-get /
// user-state-set functions as part of the normal test workflow.
// (Node environment: the default happy-dom fetch emulates browser CORS and
// blocks the cross-origin Management API call this smoke's fixtures need —
// these are server-to-server calls, not browser behavior under test.) The contract
// (get returns resolvedClientId → clients echo it as requestedFirmId → set
// honors it only for live member firms) had only mocked unit coverage of
// resolveForUser before this; the three behaviors below are what the review
// asked to see proven end to end:
//   1. a valid multi-member firm pin targets exactly that firm,
//   2. an expired membership falls back to auto-detection,
//   3. a foreign requestedFirmId never widens access.
// Skips cleanly when the live environment isn't configured (no Supabase env
// or no Management API token for fixture SQL).
import { describe, it, expect } from "vitest";
// @ts-expect-error — plain .mjs module without type declarations
import { runFirmPinningSmoke } from "./firm-pinning-smoke.mjs";

const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_ACCESS_TOKEN } = process.env;
const HAS_LIVE_ENV = !!(VITE_SUPABASE_URL && VITE_SUPABASE_PUBLISHABLE_KEY && SUPABASE_ACCESS_TOKEN);

describe.skipIf(!HAS_LIVE_ENV)("firm-pinning live smoke (user-state-get/set)", () => {
  it("proves pin targeting, expired-membership fallback, and foreign-pin isolation against the live functions", { timeout: 120_000 }, async () => {
    // Fixture cleanup (state rows, auth users, auto-provisioned firms) runs
    // inside the smoke's own finally, even when setup or an assertion throws.
    const { results } = await runFirmPinningSmoke({
      supabaseUrl: VITE_SUPABASE_URL!,
      anonKey: VITE_SUPABASE_PUBLISHABLE_KEY!,
      accessToken: SUPABASE_ACCESS_TOKEN!,
    });
    const failures = results.filter((r: { ok: boolean }) => !r.ok);
    expect(
      failures,
      failures.map((f: { message: string }) => f.message).join("\n"),
    ).toEqual([]);
    expect(results.length).toBe(7);
  });
});
