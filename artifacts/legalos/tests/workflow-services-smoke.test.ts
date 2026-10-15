// @vitest-environment node
// Runs the live workflow-services smoke (the six once-dormant edge functions)
// as part of the normal test workflow, so a future undeploy, expired deploy,
// or service regression fails the suite loudly instead of sitting invisible
// until someone runs smoke:workflow by hand — the exact gap that let the six
// services sit undeployed for weeks with zero signal.
// (Node environment: these are server-to-server calls against the live
// deployment, not browser behavior under test — same convention as the
// firm-pinning wrapper.)
// Skips cleanly when the smoke account secrets aren't configured (forked
// Repls shouldn't hard-fail).
import { describe, it, expect } from "vitest";
// @ts-expect-error — plain .mjs module without type declarations
import { runWorkflowServicesSmoke } from "./workflow-services-smoke.mjs";

const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SMOKE_EMAIL, SMOKE_PASSWORD } = process.env;
const HAS_LIVE_ENV = !!(VITE_SUPABASE_URL && VITE_SUPABASE_PUBLISHABLE_KEY && SMOKE_EMAIL && SMOKE_PASSWORD);

describe.skipIf(!HAS_LIVE_ENV)("workflow-services live smoke (six deployed functions)", () => {
  // ~10 sequential edge calls including a dispute-driven audit recompute —
  // generous timeout, well above the observed ~20s happy path.
  it("proves each service is live and performs its primary action against the real account", { timeout: 180_000 }, async () => {
    const { results } = await runWorkflowServicesSmoke();
    const failures = results.filter((r: { ok: boolean }) => !r.ok);
    expect(
      failures,
      failures.map((f: { message: string }) => f.message).join("\n"),
    ).toEqual([]);
  });
});
