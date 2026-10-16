import { describe, it, expect } from "vitest";
import { clientIpFrom, UNVERIFIED_IP_KEY, checkVerifyAccessRateLimit } from "./rateLimit";

function makeReq(headers: Record<string, string>): Request {
  return new Request("https://qeopoiumlnzqwaqzwqcj.supabase.co/functions/v1/verify-access", { headers });
}

describe("clientIpFrom", () => {
  it("trusts cf-connecting-ip", () => {
    expect(clientIpFrom(makeReq({ "cf-connecting-ip": "203.0.113.5" }))).toBe("203.0.113.5");
  });

  it("does not trust a caller-suppliable x-forwarded-for when cf-connecting-ip is absent", () => {
    expect(clientIpFrom(makeReq({ "x-forwarded-for": "1.2.3.4" }))).toBe(UNVERIFIED_IP_KEY);
  });

  it("does not trust x-real-ip either", () => {
    expect(clientIpFrom(makeReq({ "x-real-ip": "9.9.9.9" }))).toBe(UNVERIFIED_IP_KEY);
  });

  it("folds every spoofed x-forwarded-for value into the same shared bucket key", () => {
    const a = clientIpFrom(makeReq({ "x-forwarded-for": "1.1.1.1" }));
    const b = clientIpFrom(makeReq({ "x-forwarded-for": "2.2.2.2, 9.9.9.9" }));
    expect(a).toBe(UNVERIFIED_IP_KEY);
    expect(a).toBe(b);
  });

  it("falls back to the shared bucket key with no headers at all", () => {
    expect(clientIpFrom(makeReq({}))).toBe(UNVERIFIED_IP_KEY);
  });

  it("prefers cf-connecting-ip even when a spoofed x-forwarded-for rides along on the same request", () => {
    expect(
      clientIpFrom(makeReq({ "cf-connecting-ip": "203.0.113.5", "x-forwarded-for": "1.2.3.4" })),
    ).toBe("203.0.113.5");
  });
});

// Minimal in-memory stand-in for the `consume_verify_access_attempt` RPC.
// Mirrors the SQL function's row-locking shape: the whole read-check-write is
// one uninterrupted synchronous block (no `await` between reading and writing
// the count), the same guarantee `FOR UPDATE` gives in Postgres. That makes a
// batch of "concurrent" calls issued via Promise.all here exercise the same
// serialization property the real migration relies on, instead of coincidentally
// passing just because nothing in this fake ever actually races.
function makeFakeRpcClient(opts?: { forceError?: boolean }) {
  const rows = new Map<string, { window_start: number; request_count: number }>();
  return {
    async rpc(fn: string, args: { p_key: string; p_limit: number; p_window_ms: number }) {
      if (fn !== "consume_verify_access_attempt") throw new Error(`unexpected rpc: ${fn}`);
      if (opts?.forceError) return { data: null, error: { message: "connection refused" } };

      const now = Date.now();
      const existing = rows.get(args.p_key);
      let { window_start: windowStart, request_count: count } = existing ?? { window_start: now, request_count: 0 };
      if (now - windowStart > args.p_window_ms) {
        windowStart = now;
        count = 0;
      }

      if (count + 1 > args.p_limit) {
        return { data: [{ allowed: false, remaining: 0 }], error: null };
      }

      count += 1;
      rows.set(args.p_key, { window_start: windowStart, request_count: count });
      return { data: [{ allowed: true, remaining: Math.max(0, args.p_limit - count) }], error: null };
    },
  };
}

describe("checkVerifyAccessRateLimit", () => {
  it("allows attempts under the limit and locks out once it's reached", async () => {
    const client = makeFakeRpcClient();
    const ip = clientIpFrom(makeReq({ "cf-connecting-ip": "203.0.113.9" }));

    for (let i = 0; i < 10; i++) {
      const result = await checkVerifyAccessRateLimit(client as never, ip, 10, 10 * 60 * 1000);
      expect(result.allowed).toBe(true);
    }

    const locked = await checkVerifyAccessRateLimit(client as never, ip, 10, 10 * 60 * 1000);
    expect(locked.allowed).toBe(false);
    expect(locked.remaining).toBe(0);
  });

  it("never allows more than the limit through a burst of concurrent requests for the same IP", async () => {
    const client = makeFakeRpcClient();
    const ip = clientIpFrom(makeReq({ "cf-connecting-ip": "203.0.113.10" }));

    // 25 simultaneous guesses against a limit of 10 — the old read-then-upsert
    // helper would let every one of these through, since they'd all read the
    // same pre-increment count before any of them wrote it back.
    const results = await Promise.all(
      Array.from({ length: 25 }, () => checkVerifyAccessRateLimit(client as never, ip, 10, 10 * 60 * 1000)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(10);
    expect(results.filter((r) => !r.allowed)).toHaveLength(15);
  });

  it("fails closed (denies) when the rate-limit RPC errors, rather than letting the attempt through", async () => {
    const client = makeFakeRpcClient({ forceError: true });
    const ip = clientIpFrom(makeReq({ "cf-connecting-ip": "203.0.113.11" }));

    const result = await checkVerifyAccessRateLimit(client as never, ip, 10, 10 * 60 * 1000);
    expect(result.allowed).toBe(false);
  });

  it("rotating a spoofed x-forwarded-for does not reset the count, since it never changes the bucket key", async () => {
    const client = makeFakeRpcClient();

    for (let i = 0; i < 10; i++) {
      const ip = clientIpFrom(makeReq({ "x-forwarded-for": `10.0.0.${i}` }));
      await checkVerifyAccessRateLimit(client as never, ip, 10, 10 * 60 * 1000);
    }

    // A brand-new spoofed value maps to the exact same exhausted shared bucket.
    const freshSpoof = clientIpFrom(makeReq({ "x-forwarded-for": "10.0.0.99" }));
    const result = await checkVerifyAccessRateLimit(client as never, freshSpoof, 10, 10 * 60 * 1000);
    expect(result.allowed).toBe(false);
  });

  it("keeps two distinct Cloudflare-verified callers on independent buckets", async () => {
    const client = makeFakeRpcClient();
    const ipA = clientIpFrom(makeReq({ "cf-connecting-ip": "1.1.1.1" }));
    const ipB = clientIpFrom(makeReq({ "cf-connecting-ip": "2.2.2.2" }));

    for (let i = 0; i < 10; i++) {
      await checkVerifyAccessRateLimit(client as never, ipA, 10, 10 * 60 * 1000);
    }
    expect((await checkVerifyAccessRateLimit(client as never, ipA, 10, 10 * 60 * 1000)).allowed).toBe(false);
    expect((await checkVerifyAccessRateLimit(client as never, ipB, 10, 10 * 60 * 1000)).allowed).toBe(true);
  });
});
