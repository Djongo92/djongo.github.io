// Tests for the weekly warm-cache PSI refresh (refreshPsiSignal) — the
// writer-side twin of _shared/performanceScore.test.ts. The fallback matrix
// itself lives in the shared _shared/psiFetchWithFallback.ts; this file
// exercises it through the refresh call site and asserts what gets persisted.
//
// Runs under the Deno test gate (`pnpm --filter @workspace/legalos run
// test:deno`): the helper transitively imports firmSignals.ts, which pulls
// supabase-js from esm.sh — excluded from the Node vitest run in
// vitest.config.ts.
//
// Like the live-path tests, everything is exercised through a fetch router:
// googleapis for PSI, PostgREST for the firm_signals upsert (the upserted
// row body is captured and asserted on directly).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Env must be set before the module graph loads: firmSignals.ts snapshots
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY at import time.
Deno.env.set("SUPABASE_URL", "https://stub.supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-service-role-key");

const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
const { refreshPsiSignal } = await import("./psiSignalRefresh.ts");

const jsonOk = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const psiBody = (perf: number, access: number, seo: number) => ({
  lighthouseResult: {
    categories: {
      performance: { score: perf },
      accessibility: { score: access },
      seo: { score: seo },
    },
  },
});

/** Maps `${strategy} ${url}` → categories; unrouted attempts fail (HTTP 500). */
let psiRoutes: Record<string, { perf: number; access: number; seo: number }> = {};
/** Every PSI attempt, in order, as `${strategy} ${url}`. */
let psiAttempts: string[] = [];
/** The row body from the most recent firm_signals upsert. */
let upsertedRow: Record<string, unknown> | null = null;

function resetRoutes() {
  psiRoutes = {};
  psiAttempts = [];
  upsertedRow = null;
}

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes("/rest/v1/firm_signals")) {
    upsertedRow = JSON.parse(typeof init?.body === "string" ? init.body : "{}");
    return Promise.resolve(jsonOk([], 201));
  }
  if (url.includes("googleapis.com/pagespeedonline")) {
    const parsed = new URL(url);
    const key = `${parsed.searchParams.get("strategy")} ${parsed.searchParams.get("url")}`;
    psiAttempts.push(key);
    const route = psiRoutes[key];
    if (!route) return Promise.resolve(new Response("Lighthouse was blocked", { status: 500 }));
    return Promise.resolve(jsonOk(psiBody(route.perf, route.access, route.seo)));
  }
  return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
}) as typeof fetch;

const client = () => createClient("https://stub.supabase.local", "stub-service-role-key", { auth: { persistSession: false } });

Deno.test({ name: "desktop succeeds while mobile is blocked: ok, mobileFromDesktop flag and hosts persisted in the upserted payload", sanitizeOps: false, sanitizeResources: false }, async () => {
  resetRoutes();
  psiRoutes = {
    "desktop https://desktoponly.example": { perf: 0.9, access: 0.8, seo: 0.7 },
    // both mobile variants blocked (bot protection rejects the mobile UA)
  };

  const result = await refreshPsiSignal(client(), "desktoponly.example", "https://desktoponly.example", "stub-key");

  assertEquals(result, "ok");
  assertEquals(upsertedRow?.is_unverifiable, false);
  const payload = upsertedRow?.payload as Record<string, unknown>;
  assertEquals(payload.mobileFromDesktop, true);
  assert(!("desktopFromMobile" in payload));
  assertEquals(payload.hosts, { desktop: "https://desktoponly.example" });
  // mobile categories substituted from desktop
  assertEquals(payload.mobile, { performance: 90, accessibility: 80, seo: 70 });
  // 10*0.9 + 5*0.8 + 5*0.7 = 16.5
  assertEquals(payload.score, 16.5);
});

Deno.test({ name: "www-only host: both strategies recorded from the www variant, no fallback flags", sanitizeOps: false, sanitizeResources: false }, async () => {
  resetRoutes();
  psiRoutes = {
    "desktop https://www.wwwonly.example": { perf: 0.8, access: 0.8, seo: 0.8 },
    "mobile https://www.wwwonly.example": { perf: 0.6, access: 0.8, seo: 0.8 },
  };

  const result = await refreshPsiSignal(client(), "wwwonly.example", "https://wwwonly.example", "stub-key");

  assertEquals(result, "ok");
  const payload = upsertedRow?.payload as Record<string, unknown>;
  assertEquals(payload.hosts, {
    desktop: "https://www.wwwonly.example",
    mobile: "https://www.wwwonly.example",
  });
  assert(!("mobileFromDesktop" in payload));
  assert(!("desktopFromMobile" in payload));
  // Desktop-first ordering: bare desktop tried (and failed) before www desktop.
  assertEquals(psiAttempts.slice(0, 2), [
    "desktop https://wwwonly.example",
    "desktop https://www.wwwonly.example",
  ]);
});

Deno.test({ name: "all four attempts (2 hosts × 2 strategies) fail: failed, advisory is_unverifiable upsert with empty payload", sanitizeOps: false, sanitizeResources: false }, async () => {
  resetRoutes();
  // every attempt blocked

  const result = await refreshPsiSignal(client(), "blocked.example", "https://blocked.example", "stub-key");

  assertEquals(result, "failed");
  assertEquals(psiAttempts, [
    "desktop https://blocked.example",
    "desktop https://www.blocked.example",
    "mobile https://blocked.example",
    "mobile https://www.blocked.example",
  ]);
  assertEquals(upsertedRow?.is_unverifiable, true);
  assertEquals(upsertedRow?.payload, {});
});
