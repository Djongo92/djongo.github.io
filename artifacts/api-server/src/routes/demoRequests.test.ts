import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

const insertValues = vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) });
vi.mock("@workspace/db", () => ({
  db: { insert: vi.fn(() => ({ values: insertValues })) },
  demoRequestsTable: { email: "email" },
  // reportLeads is imported by the sibling router module under test's app.
  reportLeadsTable: { email: "email" },
}));

const { default: app } = await import("../app");
const { _resetRateLimit } = await import("./demoRequests");

const post = (body: object) =>
  request(app).post("/api/demo-requests").set("Content-Type", "application/json").send(body);

describe("POST /api/demo-requests", () => {
  beforeEach(() => {
    _resetRateLimit();
    insertValues.mockClear();
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("persists a legitimate request with optional firm name", async () => {
    const res = await post({ email: "Partner@Example.rs", firmName: "  Example Law  " });
    expect(res.status).toBe(201);
    expect(insertValues).toHaveBeenCalledWith({ email: "partner@example.rs", firmName: "Example Law" });
  });

  it("stores null firm name when omitted", async () => {
    const res = await post({ email: "solo@example.rs" });
    expect(res.status).toBe(201);
    expect(insertValues).toHaveBeenCalledWith({ email: "solo@example.rs", firmName: null });
  });

  it("silently accepts honeypot submissions without persisting them", async () => {
    const res = await post({ email: "bot@example.com", website: "http://spam.com" });
    expect(res.status).toBe(201);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("rejects malformed emails", async () => {
    expect((await post({ email: "not-an-email" })).status).toBe(400);
  });

  it("accepts five requests then rejects the sixth with 429", async () => {
    for (let i = 1; i <= 5; i++) {
      expect((await post({ email: `u${i}@example.com` })).status).toBe(201);
    }
    expect((await post({ email: "u6@example.com" })).status).toBe(429);
  });
});
