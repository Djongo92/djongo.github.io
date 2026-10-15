// Tests for the aggregate-deadline budget in psiFetchWithFallback: a
// per-request timeout alone permits up to 4x timeoutMs of sequential PSI
// work, which can exceed the edge function / cron wall-clock budget. The
// deadline caps the aggregate — once the remaining budget can't fund a
// meaningful attempt, the rest of the host x strategy matrix is skipped.
//
// Runs under the Deno test gate (`pnpm --filter @workspace/legalos run
// test:deno`). The module itself is pure, but _shared tests run under Deno
// so the whole directory uses one runner.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const { psiFetchWithFallback } = await import("./psiFetchWithFallback.ts");

const psiBody = (perf: number) => ({
  lighthouseResult: {
    categories: {
      performance: { score: perf },
      accessibility: { score: 0.9 },
      seo: { score: 0.9 },
    },
  },
});

/** fetch stub that resolves after `ms` unless the caller's AbortSignal fires. */
const slowResponse = (ms: number, body: unknown, signal?: AbortSignal | null) =>
  new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ms,
    );
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

function stubFetch(handler: (url: string, signal?: AbortSignal | null) => Promise<Response>) {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    calls.push(String(input));
    return handler(String(input), init?.signal);
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

Deno.test("deadline caps the aggregate: after one slow timeout the remaining matrix is skipped", async () => {
  // Every PSI call would hang 10s; per-call timeout 1s. Attempt 1 aborts at
  // ~1s; the remaining budget (~4.5s) is below the 5s minimum-attempt floor,
  // so the other three attempts never fire.
  const stub = stubFetch((_url, signal) => slowResponse(10_000, psiBody(0.8), signal));
  try {
    const result = await psiFetchWithFallback("https://firm.rs", "key", {
      timeoutMs: 1000,
      deadlineMs: 5500,
    });
    assertEquals(result, null);
    assertEquals(stub.calls.length, 1);
  } finally {
    stub.restore();
  }
});

Deno.test("within budget, desktop-first ordering and substitution are preserved", async () => {
  const stub = stubFetch((_url, signal) => slowResponse(20, psiBody(0.8), signal));
  try {
    const result = await psiFetchWithFallback("https://firm.rs", "key", {
      timeoutMs: 200,
      deadlineMs: 30_000,
    });
    assert(result !== null);
    assertEquals(result.desktop.performance, 80);
    // desktop succeeds on the first host variant, mobile likewise → 2 calls.
    assertEquals(stub.calls.length, 2);
    assert(stub.calls[0].includes("strategy=desktop"));
    assert(stub.calls[1].includes("strategy=mobile"));
    // The fields mask is load-bearing: without it every response is a
    // multi-MB Lighthouse payload and concurrent buffering OOM-kills the
    // edge worker at scale. See runPsi's comment.
    assert(stub.calls.every((u) => u.includes(`fields=${encodeURIComponent("lighthouseResult/categories")}`)));
  } finally {
    stub.restore();
  }
});

Deno.test("no deadline: per-call timeout still bounds every attempt (legacy callers unchanged)", async () => {
  const stub = stubFetch((_url, signal) => slowResponse(10_000, psiBody(0.8), signal));
  try {
    const started = Date.now();
    const result = await psiFetchWithFallback("https://firm.rs", "key", { timeoutMs: 60 });
    assertEquals(result, null);
    // All four attempts fire (no deadline) but each aborts at 60ms.
    assertEquals(stub.calls.length, 4);
    assert(Date.now() - started < 2000);
  } finally {
    stub.restore();
  }
});
