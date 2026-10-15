// Regression fixture for the task-#136 review finding: the link-minting role
// check must scope firm_members by BOTH user_id and firm_id, and fail closed
// on errors/missing rows — a user-only maybeSingle silently authorized
// multi-firm users with disallowed roles.
import { describe, it, expect, vi } from "vitest";
import { resolveLinkManagerRole } from "./firmRoleGate";

interface QueryRecord { filters: [string, string][]; }

/** Chainable mock of the supabase-js query builder, recording .eq filters. */
const mockClient = (result: { data?: { role: string } | null; error?: unknown }) => {
  const record: QueryRecord = { filters: [] };
  const client = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: (k: string, v: string) => {
          record.filters.push([k, v]);
          return {
            eq: (k2: string, v2: string) => {
              record.filters.push([k2, v2]);
              return { maybeSingle: async () => ({ data: result.data ?? null, error: result.error ?? null }) };
            },
            // Covers a single-.eq call path — must NOT be treated as success.
            maybeSingle: async () => ({ data: result.data ?? null, error: result.error ?? null }),
          };
        },
      }),
    }),
  };
  return { client, record };
};

describe("resolveLinkManagerRole", () => {
  it("scopes the membership query to both the user AND the firm", async () => {
    const { client, record } = mockClient({ data: { role: "marketing" } });
    await resolveLinkManagerRole(client, "user-1", "firm-9");
    expect(record.filters).toContainEqual(["user_id", "user-1"]);
    expect(record.filters).toContainEqual(["firm_id", "firm-9"]);
  });

  it("allows a member role in the active firm", async () => {
    const { client } = mockClient({ data: { role: "member" } });
    expect(await resolveLinkManagerRole(client, "u", "f")).toEqual({ allowed: true });
  });

  it("denies a disallowed role in the active firm", async () => {
    const { client } = mockClient({ data: { role: "executive" } });
    const gate = await resolveLinkManagerRole(client, "u", "f");
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) expect(gate.status).toBe(403);
  });

  it("allows the personal identity: single-member firms resolve to the user's own id with no membership row", async () => {
    const { client } = mockClient({ data: null });
    // resolveForUser returns userId for single-member firms (verifiedClientId.ts).
    expect(await resolveLinkManagerRole(client, "u", "u")).toEqual({ allowed: true });
  });

  it("fails closed when no membership row exists for a firm that isn't the user's own identity", async () => {
    const { client } = mockClient({ data: null });
    const gate = await resolveLinkManagerRole(client, "u", "f");
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) expect(gate.status).toBe(403);
  });

  it("fails closed on a query error (the multi-firm maybeSingle case)", async () => {
    const { client } = mockClient({ error: { message: "multiple rows" } });
    const gate = await resolveLinkManagerRole(client, "u", "f");
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) expect(gate.status).toBe(500);
  });
});
