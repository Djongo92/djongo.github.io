// Tests for the desktop-first PSI fallback in computePerformanceScore:
// host variants, single-strategy substitution, and advisory handling of
// is_unverifiable firm_signals rows (see .agents/memory/advisory-negative-cache.md).
// The fallback matrix itself lives in the shared _shared/psiFetchWithFallback.ts
// (also used by firm-signals-refresh); this file exercises it through the
// live-audit call site.
//
// Runs under the Deno test gate (`pnpm --filter @workspace/legalos run
// test:deno`, registered as the `test-deno` validation command):
// performanceScore.ts transitively imports cache.ts/firmSignals.ts, which pull
// supabase-js from esm.sh and read Deno.env at import time — so this file is
// excluded from the Node vitest run in vitest.config.ts and written as native
// `Deno.test` instead.
//
// Everything computePerformanceScore touches goes through fetch (Supabase REST
// for firm_signals/url_cache, googleapis for PSI), so the whole matrix is
// exercised with a fetch router — no module mocking needed.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Env must be set before the module graph loads: cache.ts snapshots
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY at import time.
Deno.env.set("SUPABASE_URL", "https://stub.supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-service-role-key");
Deno.env.set("PAGESPEED_API_KEY", "stub-psi-key");

const { computePerformanceScore } = await import("./performanceScore.ts");

// ── fetch router ─────────────────────────────────────────────────────────
// PostgREST "0 rows" response for a maybeSingle() request.
const noRows = () =>
  new Response(
    JSON.stringify({ code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "JSON object requested, multiple (or no) rows returned" }),
    { status: 406, headers: { "Content-Type": "application/json" } },
  );

const jsonOk = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const psiBody = (perf: number, access: number, seo: number) => ({
  lighthouseResult: {
    categories: {
      performance: { score: perf },
      accessibility: { score: access },
      seo: { score: seo },
    },
  },
});

/** Per-test routing state. */
let firmSignalRow: { payload: Record<string, unknown>; is_unverifiable: boolean } | null = null;
/** Maps `${strategy} ${url}` → categories; unrouted attempts fail (HTTP 500). */
let psiRoutes: Record<string, { perf: number; access: number; seo: number }> = {};
/** Every PSI attempt, in order, as `${strategy} ${url}` — asserts attempt ordering. */
let psiAttempts: string[] = [];

function resetRoutes() {
  firmSignalRow = null;
  psiRoutes = {};
  psiAttempts = [];
}

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes("/rest/v1/firm_signals")) {
    return Promise.resolve(firmSignalRow ? jsonOk(firmSignalRow) : noRows());
  }
  if (url.includes("/rest/v1/url_cache")) {
    // Reads miss; writes are swallowed. Any PostgREST error here is also fine
    // for the code under test — cache.ts treats errors as a miss.
    const method = (init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET")).toUpperCase();
    return Promise.resolve(method === "GET" ? noRows() : jsonOk([]));
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

Deno.test({ name: "an is_unverifiable firm_signals row is advisory: falls through to live PSI instead of returning missing", sanitizeOps: false, sanitizeResources: false }, async () => {
  resetRoutes();
  // The weekly job froze a failure into the negative cache — but the live
  // path must still try PSI instead of short-circuiting to "missing".
  firmSignalRow = { payload: {}, is_unverifiable: true };
  psiRoutes = {
    "desktop https://negcache.example": { perf: 0.9, access: 0.8, seo: 0.7 },
    "mobile https://negcache.example": { perf: 0.5, access: 0.6, seo: 0.7 },
  };

  const result = await computePerformanceScore("https://negcache.example");

  assert(psiAttempts.length > 0, "live PSI must be attempted despite the negative row");
  assertEquals(result.provenance, "api");
  // 10*(70/100) + 5*(70/100) + 5*(70/100) = 14
  assertEquals(result.score, 14);
  assert(!("source" in result.raw), "live result, not a firm_signals payload");
});

Deno.test({ name: "desktop succeeds while mobile is blocked: scored from desktop with the mobileFromDesktop flag", sanitizeOps: false, sanitizeResources: false }, async () => {
  resetRoutes();
  psiRoutes = {
    "desktop https://desktoponly.example": { perf: 0.9, access: 0.8, seo: 0.7 },
    // both mobile variants blocked (bot protection rejects the mobile UA)
  };

  const result = await computePerformanceScore("https://desktoponly.example");

  assertEquals(result.provenance, "api");
  assertEquals(result.raw.mobileFromDesktop, true);
  assert(!("desktopFromMobile" in result.raw));
  // mobile categories substituted from desktop, so averages equal desktop
  assertEquals(result.raw.mobile, { performance: 90, accessibility: 80, seo: 70 });
  assertEquals((result.raw.hosts as Record<string, string>).desktop, "https://desktoponly.example");
  assertEquals((result.raw.hosts as Record<string, string>).mobile, undefined);
  // 10*0.9 + 5*0.8 + 5*0.7 = 16.5
  assertEquals(result.score, 16.5);
});

Deno.test({ name: "www-only host: scored from the www variant with the actual hosts recorded in raw", sanitizeOps: false, sanitizeResources: false }, async () => {
  resetRoutes();
  // Site answers only on www — the bare host fails for both strategies.
  psiRoutes = {
    "desktop https://www.wwwonly.example": { perf: 0.8, access: 0.8, seo: 0.8 },
    "mobile https://www.wwwonly.example": { perf: 0.6, access: 0.8, seo: 0.8 },
  };

  const result = await computePerformanceScore("https://wwwonly.example");

  assertEquals(result.provenance, "api");
  assertEquals(result.raw.hosts, {
    desktop: "https://www.wwwonly.example",
    mobile: "https://www.wwwonly.example",
  });
  // Desktop-first ordering: bare desktop tried (and failed) before www desktop.
  assertEquals(psiAttempts.slice(0, 2), [
    "desktop https://wwwonly.example",
    "desktop https://www.wwwonly.example",
  ]);
  assert(!("mobileFromDesktop" in result.raw));
  assert(!("desktopFromMobile" in result.raw));
  // 10*0.7 + 5*0.8 + 5*0.8 = 15
  assertEquals(result.score, 15);
});

Deno.test({ name: "all four attempts (2 hosts × 2 strategies) fail: provenance missing, score 0", sanitizeOps: false, sanitizeResources: false }, async () => {
  resetRoutes();
  // every attempt blocked

  const result = await computePerformanceScore("https://blocked.example");

  assertEquals(psiAttempts, [
    "desktop https://blocked.example",
    "desktop https://www.blocked.example",
    "mobile https://blocked.example",
    "mobile https://www.blocked.example",
  ]);
  assertEquals(result.provenance, "missing");
  assertEquals(result.score, 0);
  assertEquals(result.raw, {});
});
