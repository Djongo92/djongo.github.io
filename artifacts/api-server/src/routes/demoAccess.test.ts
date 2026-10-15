import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

vi.mock("@workspace/db", () => ({
  db: { insert: vi.fn() },
  reportLeadsTable: { email: "email" },
}));

const { default: app } = await import("../app");
const { _resetRateLimit, parseDemoCodes, matchDemoCode } = await import("./demoAccess");

const post = (body: object, xff?: string) => {
  const req = request(app).post("/api/demo-access").set("Content-Type", "application/json");
  if (xff) req.set("X-Forwarded-For", xff);
  return req.send(body);
};

describe("parseDemoCodes", () => {
  it("returns nothing when unset or blank", () => {
    expect(parseDemoCodes(undefined)).toEqual([]);
    expect(parseDemoCodes("")).toEqual([]);
    expect(parseDemoCodes("  , ,  ")).toEqual([]);
  });

  it("reads bare codes and code:label pairs, trimming whitespace", () => {
    expect(parseDemoCodes(" ALPHA , BRAVO : Acme & Partners ,CHARLIE")).toEqual([
      { code: "ALPHA" },
      { code: "BRAVO", label: "Acme & Partners" },
      { code: "CHARLIE" },
    ]);
  });

  it("keeps a label containing a colon", () => {
    expect(parseDemoCodes("DELTA:Acme: the sequel")).toEqual([
      { code: "DELTA", label: "Acme: the sequel" },
    ]);
  });

  it("drops an entry with an empty code", () => {
    expect(parseDemoCodes(":Orphan label,ECHO")).toEqual([{ code: "ECHO" }]);
  });
});

describe("matchDemoCode", () => {
  const codes = [{ code: "ALPHA" }, { code: "BRAVO", label: "Acme" }];

  it("matches regardless of case and surrounding whitespace", () => {
    expect(matchDemoCode(codes, "  bravo ")?.label).toBe("Acme");
  });

  it("rejects an unknown code", () => {
    expect(matchDemoCode(codes, "ZULU")).toBeNull();
  });

  it("rejects a prefix of a real code", () => {
    expect(matchDemoCode(codes, "ALPH")).toBeNull();
  });

  it("has nothing to match when no codes are configured", () => {
    expect(matchDemoCode([], "ALPHA")).toBeNull();
  });
});

describe("POST /api/demo-access", () => {
  beforeEach(() => {
    _resetRateLimit();
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.DEMO_ACCESS_CODES;
  });

  // The important one: a server nobody configured must be shut, not open.
  it("fails closed with 503 when no codes are configured", async () => {
    delete process.env.DEMO_ACCESS_CODES;
    const res = await post({ code: "anything" });
    expect(res.status).toBe(503);
  });

  it("accepts a configured code and returns who it was issued to", async () => {
    process.env.DEMO_ACCESS_CODES = "ALPHA:Acme & Partners";
    const res = await post({ code: "alpha" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, label: "Acme & Partners" });
  });

  it("accepts a code with no label", async () => {
    process.env.DEMO_ACCESS_CODES = "ALPHA";
    const res = await post({ code: "ALPHA" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("rejects a wrong code with 401", async () => {
    process.env.DEMO_ACCESS_CODES = "ALPHA";
    const res = await post({ code: "BRAVO" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBeTruthy();
  });

  it("rejects a malformed body with 401 rather than leaking a validation error", async () => {
    process.env.DEMO_ACCESS_CODES = "ALPHA";
    expect((await post({})).status).toBe(401);
    expect((await post({ code: 42 })).status).toBe(401);
  });

  it("throttles guessing after ten attempts", async () => {
    process.env.DEMO_ACCESS_CODES = "ALPHA";
    for (let i = 0; i < 10; i++) {
      expect((await post({ code: `guess-${i}` })).status).toBe(401);
    }
    const limited = await post({ code: "guess-11" });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);

    vi.advanceTimersByTime(10 * 60_000 + 1_000);
    expect((await post({ code: "ALPHA" })).status).toBe(200);
  });
});
