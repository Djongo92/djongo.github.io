import { describe, it, expect } from "vitest";
import { peerMaxFor } from "./peerMax";

function makeMockClient(rows: { raw_metrics: Record<string, unknown> }[], opts: { error?: boolean } = {}) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => Promise.resolve(opts.error ? { data: null, error: new Error("boom") } : { data: rows, error: null }),
          }),
        }),
      }),
    }),
  } as any;
}

describe("peerMaxFor", () => {
  it("returns the caller's own value when no peers exist yet (first audit in a peer group)", async () => {
    const client = makeMockClient([]);
    const max = await peerMaxFor(client, "serbia", "regional", "social", "followers", 500);
    expect(max).toBe(500);
  });

  it("returns the caller's own value when the query errors, rather than throwing", async () => {
    const client = makeMockClient([], { error: true });
    const max = await peerMaxFor(client, "serbia", "regional", "social", "followers", 500);
    expect(max).toBe(500);
  });

  it("picks the highest value across peers and the caller's own value", async () => {
    const client = makeMockClient([
      { raw_metrics: { social: { followers: 300 } } },
      { raw_metrics: { social: { followers: 900 } } },
    ]);
    const max = await peerMaxFor(client, "serbia", "regional", "social", "followers", 500);
    expect(max).toBe(900);
  });

  it("ignores rows missing the requested category or metric", async () => {
    const client = makeMockClient([
      { raw_metrics: {} },
      { raw_metrics: { social: {} } },
      { raw_metrics: { thoughtLeadership: { followers: 99999 } } }, // wrong category key
    ]);
    const max = await peerMaxFor(client, "serbia", "regional", "social", "followers", 42);
    expect(max).toBe(42);
  });

  it("never lets the caller's own value push the max below itself", async () => {
    const client = makeMockClient([{ raw_metrics: { social: { followers: 10 } } }]);
    const max = await peerMaxFor(client, "serbia", "regional", "social", "followers", 500);
    expect(max).toBe(500);
  });
});
