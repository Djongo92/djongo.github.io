// @vitest-environment node
// Live authorization + rate-limiter tests for firm-signals-refresh's
// on-demand GBP refresh mode (#28). The browser-facing path is paid Google
// Places spend, so the endpoint must refuse anyone reaching for an audit
// they don't own — before any limiter bucket or external call — and the
// one-refresh-per-24h limiter must hold atomically.
//
// Ownership is auditId-targeted: the client sends the audit id, the server
// derives the domain from the audit row itself. That matters because audits
// store audited_domain as the user entered it (sometimes a full URL), so
// request-string matching would miss legitimately-owned audits.
//
// These run against the DEPLOYED function and the live DB (same convention
// as the auth-smoke guard). Skip-clean when the smoke credentials or the
// Management API token aren't present, so forked Repls don't hard-fail.
import { describe, expect, it } from "vitest";

const BASE = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const REF = BASE ? new URL(BASE).hostname.split(".")[0] : "";
const PROJECT_REF = REF === "127" ? "qeopoiumlnzqwaqzwqcj" : REF;

const hasCreds = !!(BASE && ANON && EMAIL && PASSWORD);
const hasMgmt = !!(hasCreds && MGMT_TOKEN);

const postRefresh = (body: Record<string, unknown>, token?: string) =>
  fetch(`${BASE}/functions/v1/firm-signals-refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON!,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const signIn = async (): Promise<{ token: string; userId: string }> => {
  const resp = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON! },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const json = await resp.json();
  if (!resp.ok || !json.access_token) throw new Error(`smoke sign-in failed: HTTP ${resp.status}`);
  const payload = JSON.parse(Buffer.from(json.access_token.split(".")[1], "base64").toString());
  return { token: json.access_token, userId: payload.sub };
};

const runMgmtSql = async (query: string) => {
  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MGMT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!resp.ok) throw new Error(`Management API query failed: HTTP ${resp.status} — ${await resp.text()}`);
  return resp.json();
};

// Seeds a minimal audit owned by `ownerId`, inheriting market/peer_group
// from an existing row so CHECK constraints are satisfied whatever they are.
const seedAudit = async (ownerId: string, auditedDomain: string): Promise<string> => {
  const rows = await runMgmtSql(
    `INSERT INTO public.market_visibility_audits (client_id, audited_domain, display_name, market, peer_group)
     SELECT '${ownerId}', '${auditedDomain}', 'GBP Refresh Test Firm', market, peer_group
     FROM public.market_visibility_audits LIMIT 1
     RETURNING id`,
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("seed audit insert returned no id");
  return id;
};

const deleteAudit = (id: string) =>
  runMgmtSql(`DELETE FROM public.market_visibility_audits WHERE id = '${id}'`);

describe.runIf(hasCreds)("firm-signals-refresh on-demand authorization", () => {
  it("rejects a request with no session at all", async () => {
    const resp = await postRefresh({ clientId: "x", auditId: "00000000-0000-0000-0000-000000000000" });
    expect([401, 403]).toContain(resp.status);
  });

  it.runIf(hasMgmt)("rejects an audit owned by a different account (cross-account)", async () => {
    const { token } = await signIn();
    const foreignId = await seedAudit("00000000-0000-0000-0000-000000000000", "cross-account-test.example.com");
    try {
      const resp = await postRefresh({ clientId: "x", accessToken: token, auditId: foreignId }, token);
      expect(resp.status).toBe(404);
    } finally {
      await deleteAudit(foreignId);
    }
  }, 30_000);

  it.runIf(hasMgmt)("accepts an audit keyed to the user's firm id (shared-firm identity, not the user-keyed legacy form)", async () => {
    const { token, userId } = await signIn();
    // The smoke account's provisioned firm: audits can be keyed to the firm
    // (shared identity) rather than the user's own id, and ownership must
    // match either — resolveVerifiedClientId's single implicit pick would
    // 404 one of the two forms.
    const firmRows = await runMgmtSql(`SELECT firm_id FROM public.firm_members WHERE user_id = '${userId}' LIMIT 1`);
    const firmId = firmRows[0]?.firm_id;
    expect(firmId).toBeTruthy();
    const auditId = await seedAudit(firmId, "gbp-firm-keyed-test.example.com");
    try {
      const resp = await postRefresh({ clientId: "x", accessToken: token, auditId }, token);
      // Ownership passed ⇔ NOT 401/403/404 (see the URL-form test for why
      // 200/429/503 are all acceptable onward states).
      expect(resp.status).not.toBe(404);
      expect([200, 429, 503]).toContain(resp.status);
    } finally {
      await deleteAudit(auditId);
      await runMgmtSql(`DELETE FROM public.firm_signals WHERE firm_domain = 'gbp-firm-keyed-test.example.com'`);
      await runMgmtSql(`DELETE FROM public.gbp_refresh_rate_limit WHERE domain = 'gbp-firm-keyed-test.example.com'`);
    }
  }, 30_000);

  it.runIf(hasMgmt)("accepts an owned audit whose domain is stored as a full URL — gate passes before any spend", async () => {
    const { token, userId } = await signIn();
    // URL form is how audits actually store user-entered domains; ownership
    // matching must normalize server-side rather than compare strings.
    const auditId = await seedAudit(userId, "https://www.gbp-refresh-test.example.com/");
    try {
      const resp = await postRefresh({ clientId: "x", accessToken: token, auditId }, token);
      // Ownership passed ⇔ NOT 401/403/404. Where it lands next depends on
      // environment: 503 while GOOGLE_PLACES_API_KEY is unconfigured (the
      // honest "not configured" signal), 200 on a successful refresh once
      // the key lands, 429 if a previous run consumed today's bucket. Any
      // of them proves the URL-form stored domain matched server-side.
      expect(resp.status).not.toBe(404);
      expect([200, 429, 503]).toContain(resp.status);
    } finally {
      await deleteAudit(auditId);
      await runMgmtSql(`DELETE FROM public.firm_signals WHERE firm_domain = 'gbp-refresh-test.example.com'`);
      await runMgmtSql(`DELETE FROM public.gbp_refresh_rate_limit WHERE domain = 'gbp-refresh-test.example.com'`);
    }
  }, 30_000);
});

describe.runIf(!!MGMT_TOKEN)("consume_gbp_refresh atomic limiter", () => {
  const TEST_DOMAIN = "gbp-refresh-limiter-test.example.com";

  it("allows the first refresh and denies the second within 24h", async () => {
    try {
      const first = await runMgmtSql(
        `SELECT * FROM public.consume_gbp_refresh('${TEST_DOMAIN}', 1, 86400000)`,
      );
      expect(first[0]?.allowed).toBe(true);

      const second = await runMgmtSql(
        `SELECT * FROM public.consume_gbp_refresh('${TEST_DOMAIN}', 1, 86400000)`,
      );
      expect(second[0]?.allowed).toBe(false);
      expect(Number(second[0]?.remaining)).toBe(0);

    } finally {
      await runMgmtSql(`DELETE FROM public.gbp_refresh_rate_limit WHERE domain = '${TEST_DOMAIN}'`);
    }
  }, 30_000);

  it("allows exactly one of two simultaneous refreshes (true concurrency)", async () => {
    // Two HTTP requests in flight at once → two separate DB connections
    // racing the same bucket row. The FOR UPDATE lock must serialize them
    // so exactly one consumes. (Sequential denial alone can't prove this —
    // it's the race the old read-then-upsert helper lost.)
    const CONCURRENT_DOMAIN = "gbp-refresh-concurrent-test.example.com";
    try {
      const [a, b] = await Promise.all([
        runMgmtSql(`SELECT * FROM public.consume_gbp_refresh('${CONCURRENT_DOMAIN}', 1, 86400000)`),
        runMgmtSql(`SELECT * FROM public.consume_gbp_refresh('${CONCURRENT_DOMAIN}', 1, 86400000)`),
      ]);
      expect([a[0]?.allowed, b[0]?.allowed].filter(Boolean)).toHaveLength(1);
    } finally {
      await runMgmtSql(`DELETE FROM public.gbp_refresh_rate_limit WHERE domain = '${CONCURRENT_DOMAIN}'`);
    }
  }, 30_000);

  it("is not callable as anon (service-role only)", async () => {
    const resp = await fetch(`${BASE}/rest/v1/rpc/consume_gbp_refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON! },
      body: JSON.stringify({ p_domain: "anon-test.example.com", p_limit: 1, p_window_ms: 86400000 }),
    });
    // Belt and suspenders: the PUBLIC/anon grant is revoked (→ 401/403/404)
    // and the function itself raises for non-service_role JWT callers
    // (→ 400). What must never happen is a 200 that consumed a bucket.
    expect([400, 401, 403, 404]).toContain(resp.status);
    if (resp.status === 200) {
      const json = await resp.json();
      expect(json?.[0]?.allowed).not.toBe(true);
    }
  });
});
