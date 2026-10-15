// Orchestration-level provenance gate test: an UNATTRIBUTED directory
// LinkedIn row (anything without attribution="confirmed_company_page") must
// never leak into a firm's score. lookupDirectoryLinkedIn's gate mirrors the
// linkedin_shape_chk DB constraint, but a future refactor could drop it —
// this test runs the FULL runVisibilityAudit path with a poisoned
// market_directory_data row and proves:
//   1. social provenance falls through to homepage detection ("detected")
//      or "missing" — never "directory";
//   2. the persisted raw_metrics carry NO numeric followers/posts30d, so the
//      peer pool (peerStatsFor reads raw_metrics of published audits) can
//      never observe the unattributed numerics (unknown ≠ zero — see
//      .agents/memory/peer-pool-provenance.md);
//   3. as a positive control, a confirmed_company_page row DOES score as
//      "directory" — so if the stubbing here were wrong, the control fails
//      instead of the gate tests passing vacuously.
//
// Runs under the Deno test gate (`pnpm --filter @workspace/legalos run
// test:deno`, registered as the `test-deno` validation): runVisibilityAudit
// transitively imports cache.ts/firmSignals.ts which pull supabase-js from
// esm.sh and read Deno.env at import time, so this file is excluded from the
// Node vitest run and written as native Deno.test.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Env must be set before the module graph loads: cache.ts snapshots
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY at import time. PAGESPEED /
// ANTHROPIC / SEO-provider keys stay UNSET so those legs report
// not_configured/missing without network calls.
Deno.env.set("SUPABASE_URL", "https://stub.supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-service-role-key");
Deno.env.delete("PAGESPEED_API_KEY");
Deno.env.delete("ANTHROPIC_API_KEY");

const { runVisibilityAudit } = await import("./runVisibilityAudit.ts");

const AUDITED_DOMAIN = "unattributed-test-firm.com";
const MARKET = "belgrade";
// Sentinel numerics: if either ever shows up in a persisted payload, the
// unattributed row leaked.
const LEAK_FOLLOWERS = 43217;
const LEAK_POSTS = 917;

// ── fetch router ─────────────────────────────────────────────────────────
// Everything the audit's non-serviceClient legs touch goes through fetch:
// cache.ts / firmSignals.ts REST calls hit the stubbed SUPABASE_URL, and the
// homepage fetches (social presence detection, site health, thought
// leadership) hit the audited domain. Anything else fails like a dead host.
const realFetch = globalThis.fetch;

const noRows = () =>
  new Response(
    JSON.stringify({ code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "JSON object requested, multiple (or no) rows returned" }),
    { status: 406, headers: { "Content-Type": "application/json" } },
  );

const HOMEPAGE_HTML = `<html><body>
  <a href="https://www.linkedin.com/company/unattributed-test-firm">LinkedIn</a>
  <a href="/contact">Contact</a>
  <footer>© 2026 Unattributed Test Firm</footer>
</body></html>`;

function installFetchRouter(opts: { homepageUp: boolean }) {
  globalThis.fetch = ((input: Request | URL | string, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith("https://stub.supabase.local/")) {
      // url_cache / firm_signals REST reads: empty. Writes: accepted.
      if (url.includes("/rest/v1/")) {
        return Promise.resolve(url.includes("select=") ? noRows() : new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    }
    if (url.includes(AUDITED_DOMAIN)) {
      if (!opts.homepageUp) return Promise.reject(new TypeError("connection refused (stub)"));
      return Promise.resolve(new Response(HOMEPAGE_HTML, { status: 200, headers: { "Content-Type": "text/html" } }));
    }
    // Press-mention search, PSI, anything else: dead.
    return Promise.reject(new TypeError("network disabled in test (stub)"));
  }) as typeof fetch;
}

// ── fake supabase service client ─────────────────────────────────────────
// runVisibilityAudit takes serviceClient as a parameter, so the directory
// row, peer-pool reads, and the audit upsert are all stubbed with a
// recording query builder — no module mocking needed.
type Recorded = { table: string; method: "upsert" | "insert"; payload: Record<string, unknown> };

function makeServiceClient(directoryLinkedIn: Record<string, unknown> | null) {
  const writes: Recorded[] = [];
  const peerPoolReads: string[] = [];

  // deno-lint-ignore no-explicit-any
  function builder(table: string): any {
    let write: Recorded | null = null;
    const listResult = () => {
      if (table === "market_visibility_audits") peerPoolReads.push(table);
      return { data: [], error: null };
    };
    // deno-lint-ignore no-explicit-any
    const b: any = {
      select: () => b,
      eq: () => b,
      neq: () => b,
      order: () => b,
      limit: () => b,
      in: () => b,
      upsert(payload: Record<string, unknown>) {
        write = { table, method: "upsert", payload };
        writes.push(write);
        return b;
      },
      insert(payload: Record<string, unknown>) {
        write = { table, method: "insert", payload };
        writes.push(write);
        return b;
      },
      maybeSingle() {
        if (table === "market_directory_data") {
          return Promise.resolve({ data: directoryLinkedIn ? { linkedin: directoryLinkedIn } : null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      single() {
        if (write?.table === "market_visibility_audits") {
          return Promise.resolve({ data: { id: "audit-test-id", total_score: 42, is_public: true }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      // deno-lint-ignore no-explicit-any
      then(resolve: (v: any) => void, reject?: (e: unknown) => void) {
        return Promise.resolve(write ? { data: null, error: null } : listResult()).then(resolve, reject);
      },
    };
    return b;
  }

  return { client: { from: (table: string) => builder(table) }, writes, peerPoolReads };
}

function runParams() {
  return {
    clientId: "client-test-id",
    auditedDomain: AUDITED_DOMAIN,
    displayName: "Unattributed Test Firm",
    market: MARKET,
    peerGroup: "local",
    gbpListed: false,
    // No self-reported social — forces the directory → detection ladder.
    social: undefined,
    skipRateLimit: true,
  };
}

function assertNoLeak(writes: Recorded[]) {
  // The peer pool reads followers/posts30d out of raw_metrics.social on
  // PUBLISHED audits — so the persisted rows are exactly the leak surface.
  const persisted = writes.filter((w) => w.table === "market_visibility_audits" || w.table === "market_visibility_audit_history");
  assert(persisted.length >= 1, "expected the audit row to be persisted");
  for (const w of persisted) {
    const social = (w.payload.raw_metrics as Record<string, Record<string, unknown>>).social;
    assert(social.followers === undefined, `${w.table}: raw_metrics.social.followers must be absent, got ${social.followers}`);
    assert(social.posts30d === undefined, `${w.table}: raw_metrics.social.posts30d must be absent, got ${social.posts30d}`);
    const provenance = w.payload.provenance as Record<string, string>;
    assert(provenance.social !== "directory", `${w.table}: provenance.social must never be "directory" for an unattributed row`);
    // Belt and braces: the sentinel numerics appear nowhere in the payload.
    const flat = JSON.stringify(w.payload);
    assert(!flat.includes(String(LEAK_FOLLOWERS)), `${w.table}: unattributed follower count leaked into persisted payload`);
    assert(!flat.includes(String(LEAK_POSTS)), `${w.table}: unattributed posts30d leaked into persisted payload`);
  }
}

// sanitizeOps/Resources are off: firmSignals.ts lazily creates a real
// supabase-js client whose auth auto-refresh interval outlives the test —
// it belongs to the module graph, not to anything this test starts.
Deno.test({ name: "unattributed directory row falls through to homepage detection — never 'directory'", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  installFetchRouter({ homepageUp: true });
  try {
    const { client, writes } = makeServiceClient({
      followers: LEAK_FOLLOWERS,
      posts30d: LEAK_POSTS,
      attribution: "estimated_from_directory", // NOT confirmed_company_page
    });
    const result = await runVisibilityAudit(client, runParams());
    assert(result.ok, `audit should complete, got ${result.status} ${result.error}`);
    assertEquals(result.payload!.categories.social.provenance, "detected");
    assertNoLeak(writes);
  } finally {
    globalThis.fetch = realFetch;
  }
}});

Deno.test({ name: "unattributed row with missing attribution field is equally rejected; unfetchable homepage → 'missing'", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  installFetchRouter({ homepageUp: false });
  try {
    const { client, writes } = makeServiceClient({
      followers: LEAK_FOLLOWERS,
      posts30d: LEAK_POSTS,
      // no attribution key at all
    });
    const result = await runVisibilityAudit(client, runParams());
    assert(result.ok, `audit should complete, got ${result.status} ${result.error}`);
    assertEquals(result.payload!.categories.social.provenance, "missing");
    assertNoLeak(writes);
  } finally {
    globalThis.fetch = realFetch;
  }
}});

Deno.test({ name: "positive control: confirmed_company_page row scores as 'directory' with its numerics", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  installFetchRouter({ homepageUp: true });
  try {
    const { client, writes, peerPoolReads } = makeServiceClient({
      followers: 1200,
      posts30d: 8,
      attribution: "confirmed_company_page",
    });
    const result = await runVisibilityAudit(client, runParams());
    assert(result.ok, `audit should complete, got ${result.status} ${result.error}`);
    assertEquals(result.payload!.categories.social.provenance, "directory");
    const upsert = writes.find((w) => w.table === "market_visibility_audits");
    const social = (upsert!.payload.raw_metrics as Record<string, Record<string, unknown>>).social;
    assertEquals(social.followers, 1200);
    assertEquals(social.posts30d, 8);
    // Confirmed numerics DO run the live peer comparison.
    assert(peerPoolReads.length > 0, "confirmed directory numerics should query the peer pool");
  } finally {
    globalThis.fetch = realFetch;
  }
}});

// ── Fresh-serve cooldown (24h per client+domain) ─────────────────────────
// The pure decision behind the spend guard: a fresh existing audit is
// served unchanged instead of re-burning PSI / DataForSEO / Gemini budget.
const { freshAuditPayload, AUDIT_REFRESH_COOLDOWN_MS } = await import("./runVisibilityAudit.ts");

const EXISTING_ROW = {
  id: "audit-1",
  is_public: true,
  total_score: 98.86,
  performance_score: 14.8,
  social_score: 9.5,
  seo_authority_score: 18.56,
  thought_leadership_score: 22,
  reputation_score: 34,
  provenance: {
    performance: "api",
    social: "self_reported",
    seoAuthority: "api",
    thoughtLeadership: "ai_classified",
    reputation: "api",
  },
  raw_metrics: { seoAuthority: { provider: "dataforseo" } },
  updated_at: "2026-08-16T10:00:00.000Z",
};
const NOW = new Date("2026-08-16T12:00:00.000Z"); // 2h after the row

Deno.test("freshAuditPayload serves a fresh row unchanged (no re-measurement)", () => {
  const payload = freshAuditPayload(EXISTING_ROW, NOW);
  assert(payload !== null);
  assertEquals(payload.servedFresh, true);
  assertEquals(payload.measuredAt, EXISTING_ROW.updated_at);
  assertEquals(payload.totalScore, EXISTING_ROW.total_score);
  assertEquals(payload.categories.seoAuthority, { score: 18.56, provenance: "api" });
  assertEquals(payload.rawMetrics, EXISTING_ROW.raw_metrics);
});

Deno.test("freshAuditPayload re-runs once the cooldown has passed", () => {
  const stale = new Date(new Date(EXISTING_ROW.updated_at).getTime() + AUDIT_REFRESH_COOLDOWN_MS + 1000);
  assertEquals(freshAuditPayload(EXISTING_ROW, stale), null);
});

Deno.test("freshAuditPayload: no row, bad timestamp, or future-dated row all re-run", () => {
  assertEquals(freshAuditPayload(null, NOW), null);
  assertEquals(freshAuditPayload({ ...EXISTING_ROW, updated_at: "not-a-date" }, NOW), null);
  assertEquals(freshAuditPayload(EXISTING_ROW, new Date("2026-08-15T00:00:00.000Z")), null);
});

Deno.test("freshAuditPayload falls back to missing provenance per category", () => {
  const payload = freshAuditPayload({ ...EXISTING_ROW, provenance: null }, NOW);
  assert(payload !== null);
  assertEquals(payload.categories.performance.provenance, "missing");
});

// ── Lease-based refresh reservation ──────────────────────────────────────
// Refreshes are guarded by the claim_audit_refresh / release_audit_refresh
// RPCs (audit_refresh_leases table), NOT by bumping updated_at: the audits
// table has a BEFORE UPDATE trigger forcing updated_at = now(), so a
// timestamp-based claim could never be rolled back after a failed run.
// These tests exercise the TS orchestration against an in-memory lease
// store that models the RPC contract (atomic take-or-steal with TTL expiry);
// the SQL itself is verified live after the migration is applied.

const FRESH_ROW = {
  id: "audit-fresh",
  is_public: true,
  total_score: 98.86,
  performance_score: 14.8,
  social_score: 9.5,
  seo_authority_score: 18.56,
  thought_leadership_score: 22,
  reputation_score: 34,
  provenance: { performance: "api", social: "self_reported", seoAuthority: "api", thoughtLeadership: "ai_classified", reputation: "api" },
  raw_metrics: { seoAuthority: { provider: "dataforseo" } },
  updated_at: new Date().toISOString(),
};

// In-memory model of the claim_audit_refresh contract. `rowFresh` mirrors the
// cooldown check; the lease map mirrors atomic take-or-steal with expiry.
function makeLeaseStore(opts: { rowFresh: boolean; failUpsert?: boolean }) {
  const leases = new Map<string, number>(); // key → expires_at epoch ms
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  const LEASE_TTL_MS = 15 * 60 * 1000;
  const keyOf = (a: Record<string, unknown>) => `${a.p_client_id}|${a.p_audited_domain}|${a.p_market}`;
  const client = {
    rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });
      if (fn === "claim_audit_refresh") {
        if (opts.rowFresh) return Promise.resolve({ data: "serve_fresh", error: null });
        const key = keyOf(args);
        const held = leases.get(key);
        if (held !== undefined && held > Date.now()) return Promise.resolve({ data: "held", error: null });
        leases.set(key, Date.now() + LEASE_TTL_MS);
        return Promise.resolve({ data: "claimed", error: null });
      }
      if (fn === "release_audit_refresh") {
        leases.delete(keyOf(args));
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    from: (table: string) => {
      let wrote = false;
      // deno-lint-ignore no-explicit-any
      const b: any = {
        select: () => b, update: () => b,
        eq: () => b, neq: () => b, lt: () => b, order: () => b, limit: () => b, in: () => b,
        upsert: () => { wrote = true; return b; },
        insert: () => { wrote = true; return b; },
        maybeSingle: () => {
          if (table === "market_visibility_audits" && opts.rowFresh) return Promise.resolve({ data: FRESH_ROW, error: null });
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (wrote && table === "market_visibility_audits") {
            if (opts.failUpsert) return Promise.resolve({ data: null, error: { message: "stub upsert failure" } });
            return Promise.resolve({ data: { id: "audit-test-id", total_score: 42, is_public: true }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        // deno-lint-ignore no-explicit-any
        then(resolve: (v: any) => void, reject?: (e: unknown) => void) {
          return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        },
      };
      return b;
    },
  };
  return { client, leases, rpcCalls, keyOf, LEASE_TTL_MS };
}

Deno.test({ name: "serve_fresh claim → serves the fresh row with zero provider calls and no lease taken", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  installFetchRouter({ homepageUp: true });
  // Count anything that ISN'T a stubbed Supabase REST call — on the
  // fresh-serve path no homepage/PSI/provider fetch may happen at all.
  let externalFetches = 0;
  const routerFetch = globalThis.fetch;
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith("https://stub.supabase.local/")) externalFetches++;
    return routerFetch(input, init);
  }) as typeof fetch;
  try {
    const { client, leases } = makeLeaseStore({ rowFresh: true });
    const result = await runVisibilityAudit(client, { ...runParams(), skipRateLimit: false });
    assert(result.ok, `expected fresh-serve, got ${result.status} ${result.error}`);
    assertEquals(result.payload!.servedFresh, true);
    assertEquals(result.payload!.totalScore, 98.86);
    assertEquals(externalFetches, 0);
    assertEquals(leases.size, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
}});

Deno.test({ name: "held lease → 409 with zero provider calls (covers parallel first-ever audits)", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  installFetchRouter({ homepageUp: true });
  let externalFetches = 0;
  const routerFetch = globalThis.fetch;
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith("https://stub.supabase.local/")) externalFetches++;
    return routerFetch(input, init);
  }) as typeof fetch;
  try {
    const store = makeLeaseStore({ rowFresh: false });
    // Another isolate holds a live lease for this exact key (first-ever
    // audit: no audits row exists at all).
    const p = runParams();
    store.leases.set(`client-test-id|${p.auditedDomain}|${p.market}`, Date.now() + 60_000);
    const result = await runVisibilityAudit(store.client, { ...p, skipRateLimit: false });
    assertEquals(result.ok, false);
    assertEquals(result.status, 409);
    assertEquals(externalFetches, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
}});

Deno.test({ name: "expired lease is stolen → the refresh runs (crash self-heal at TTL)", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  installFetchRouter({ homepageUp: true });
  try {
    const store = makeLeaseStore({ rowFresh: false });
    // A crashed run left a lease behind whose TTL has passed.
    const p = runParams();
    const key = `client-test-id|${p.auditedDomain}|${p.market}`;
    store.leases.set(key, Date.now() - 1000);
    const result = await runVisibilityAudit(store.client, { ...p, skipRateLimit: false });
    assert(result.ok, `expected the refresh to run, got ${result.status} ${result.error}`);
    // The lease was released after the successful run.
    assertEquals(store.leases.has(key), false);
  } finally {
    globalThis.fetch = realFetch;
  }
}});

Deno.test({ name: "failed run releases the lease — the firm can retry immediately, no 24h lockout", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  installFetchRouter({ homepageUp: true });
  try {
    const store = makeLeaseStore({ rowFresh: false, failUpsert: true });
    const p = { ...runParams(), skipRateLimit: false };
    const failed = await runVisibilityAudit(store.client, p);
    assertEquals(failed.ok, false);
    assertEquals(failed.status, 500);
    // The release RPC ran and the lease is gone…
    assert(store.rpcCalls.some((c) => c.fn === "release_audit_refresh"), "failed run must release its lease");
    assertEquals(store.leases.size, 0);
    // …so an immediate retry claims again instead of being held or served
    // stale data for 24h.
    const retryStore = store; // same lease state
    const retry = await runVisibilityAudit(retryStore.client, p);
    assertEquals(retry.status === 409, false, "retry after a failed run must not be locked out");
    const claims = store.rpcCalls.filter((c) => c.fn === "claim_audit_refresh");
    assertEquals(claims.length, 2);
  } finally {
    globalThis.fetch = realFetch;
  }
}});
