import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

const insertValues = vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) });
vi.mock("@workspace/db", () => ({
  db: { insert: vi.fn(() => ({ values: insertValues })) },
  reportLeadsTable: { email: "email" },
}));

const { default: app } = await import("../app");
const { _resetRateLimit } = await import("./reportLeads");

const post = (body: object, xff?: string) => {
  const req = request(app).post("/api/report-leads").set("Content-Type", "application/json");
  if (xff) req.set("X-Forwarded-For", xff);
  return req.send(body);
};

describe("POST /api/report-leads", () => {
  beforeEach(() => {
    _resetRateLimit();
    insertValues.mockClear();
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("accepts five requests then rejects the sixth with 429 + Retry-After", async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await post({ email: `user${i}@example.com` });
      expect(res.status).toBe(201);
    }
    const res = await post({ email: "user6@example.com" });
    expect(res.status).toBe(429);
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("allows requests again after the window expires", async () => {
    for (let i = 1; i <= 6; i++) await post({ email: `w${i}@example.com` });
    expect((await post({ email: "still@example.com" })).status).toBe(429);
    vi.advanceTimersByTime(61_000);
    expect((await post({ email: "fresh@example.com" })).status).toBe(201);
  });

  it("silently accepts honeypot submissions without persisting them", async () => {
    const res = await post({ email: "bot@example.com", website: "http://spam.com" });
    expect(res.status).toBe(201);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("persists legitimate submissions", async () => {
    const res = await post({ email: "real@example.com", website: "" });
    expect(res.status).toBe(201);
    expect(insertValues).toHaveBeenCalledWith({ email: "real@example.com" });
  });

  it("rejects malformed emails", async () => {
    expect((await post({ email: "not-an-email" })).status).toBe(400);
  });

  it("ignores client-spoofed X-Forwarded-For prefixes (trust proxy = 1 hop)", async () => {
    // With one trusted hop, only the LAST XFF entry (appended by the real proxy)
    // determines req.ip. Varying the spoofed prefix must NOT create fresh buckets.
    for (let i = 1; i <= 5; i++) {
      const res = await post({ email: `s${i}@example.com` }, `10.0.0.${i}, 203.0.113.7`);
      expect(res.status).toBe(201);
    }
    const res = await post({ email: "s6@example.com" }, "10.9.9.9, 203.0.113.7");
    expect(res.status).toBe(429);
  });
});
