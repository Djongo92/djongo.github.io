// @vitest-environment node
// Opt-in live AI stress gate: SMOKE_AI_STRESS=1 pnpm --filter @workspace/legalos test
// Runs tests/ai-tools-stress.mjs — 9 AI edge functions called with realistic
// payloads as the signed-in smoke account — so a broken model key, revoked
// integration secret, or prompt/contract regression fails a check someone
// watches instead of surfacing first for users. Opt-in (same convention as
// SMOKE_FULL_TEASER in entry-paths-smoke) because one full pass makes 9 live
// LLM calls, costs real tokens, and can take several minutes — too heavy for
// the default legalos-test run.
// (Node environment: server-to-server calls against the live deployment —
// happy-dom's fetch emulates browser CORS and would block them.)
// Skips cleanly when not opted in or when the smoke account secrets aren't
// configured (forked Repls shouldn't hard-fail).
import { describe, it, expect } from "vitest";
// @ts-expect-error — plain .mjs module without type declarations
import { runAiToolsStress, TOOL_COUNT } from "./ai-tools-stress.mjs";

const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SMOKE_EMAIL, SMOKE_PASSWORD } = process.env;
const HAS_LIVE_ENV = !!(VITE_SUPABASE_URL && VITE_SUPABASE_PUBLISHABLE_KEY && SMOKE_EMAIL && SMOKE_PASSWORD);
const OPTED_IN = process.env.SMOKE_AI_STRESS === "1";

describe.skipIf(!OPTED_IN || !HAS_LIVE_ENV)("AI tools live stress gate (opt-in: SMOKE_AI_STRESS=1)", () => {
  // 9 sequential LLM calls, each individually capped at 170s inside the
  // harness; the observed full pass is a few minutes, so allow the worst case.
  it("proves every AI tool returns a successful response for a realistic signed-in payload", { timeout: 1_800_000 }, async () => {
    const { results } = await runAiToolsStress(["all"]);
    const failures = results.filter((r: { ok: boolean }) => !r.ok);
    expect(
      failures.map((f: { name: string; message: string }) => `${f.name}: ${f.message}`),
      failures.map((f: { name: string; message: string }) => `${f.name}: ${f.message}`).join("\n"),
    ).toEqual([]);
    // Derived from the harness tool set so a new leg (e.g. the task-#162
    // injection canary) can't break the gate with a stale hardcoded count.
    expect(results.length).toBe(TOOL_COUNT);
  });
});
