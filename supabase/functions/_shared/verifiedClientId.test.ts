import { describe, it, expect, vi } from "vitest";
import { resolveClientId } from "./verifiedClientId";

type GetUserResult = { data: { user: { id: string } | null }; error: Error | null };

function makeMockClient(opts: {
  getUserResult: GetUserResult;
  userFirms?: string[];
  memberCounts?: Record<string, number>;
  expiresAt?: Record<string, string>;
}) {
  const { getUserResult, userFirms = [], memberCounts = {}, expiresAt = {} } = opts;
  const getUser = vi.fn().mockResolvedValue(getUserResult);

  const from = vi.fn((table: string) => {
    if (table !== "firm_members") throw new Error(`unexpected table ${table}`);
    return {
      select: (_cols: string, selectOpts?: { count?: string; head?: boolean }) => ({
        eq: (column: string, value: string) => {
          if (column === "user_id") {
            return Promise.resolve({ data: userFirms.map((firm_id) => ({ firm_id, access_expires_at: expiresAt[firm_id] ?? null })) });
          }
          if (column === "firm_id" && selectOpts?.count) {
            return Promise.resolve({ count: memberCounts[value] ?? 0 });
          }
          return Promise.resolve({ data: [] });
        },
      }),
    };
  });

  const client: { auth: { getUser: typeof getUser }; from: typeof from } = { auth: { getUser }, from };
  return { client, getUser, from };
}

describe("resolveClientId", () => {
  it("trusts the client-asserted clientId when no access token is given", async () => {
    const { client, getUser } = makeMockClient({ getUserResult: { data: { user: { id: "real-user-id" } }, error: null } });
    const result = await resolveClientId(client, "anon-browser-id", undefined);
    expect(result).toBe("anon-browser-id");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("trusts the client-asserted clientId when the access token is not a string", async () => {
    const { client } = makeMockClient({ getUserResult: { data: { user: { id: "real-user-id" } }, error: null } });
    const result = await resolveClientId(client, "anon-browser-id", 12345);
    expect(result).toBe("anon-browser-id");
  });

  it("falls back to the asserted clientId when the token is invalid", async () => {
    const { client } = makeMockClient({ getUserResult: { data: { user: null }, error: new Error("invalid token") } });
    const result = await resolveClientId(client, "anon-browser-id", "garbage-token");
    expect(result).toBe("anon-browser-id");
  });

  it("falls back to the asserted clientId when getUser returns no user but no error either", async () => {
    const { client } = makeMockClient({ getUserResult: { data: { user: null }, error: null } });
    const result = await resolveClientId(client, "anon-browser-id", "expired-token");
    expect(result).toBe("anon-browser-id");
  });

  it("uses the verified user id when the user belongs to no firm at all", async () => {
    const { client } = makeMockClient({
      getUserResult: { data: { user: { id: "real-user-id" } }, error: null },
      userFirms: [],
    });
    const result = await resolveClientId(client, "someone-elses-id", "valid-token");
    expect(result).toBe("real-user-id");
  });

  it("uses the verified user id when their only firm still has a single member", async () => {
    const { client } = makeMockClient({
      getUserResult: { data: { user: { id: "real-user-id" } }, error: null },
      userFirms: ["firm-solo"],
      memberCounts: { "firm-solo": 1 },
    });
    const result = await resolveClientId(client, "someone-elses-id", "valid-token");
    expect(result).toBe("real-user-id");
  });

  it("uses the shared firm id once that firm has more than one member", async () => {
    const { client } = makeMockClient({
      getUserResult: { data: { user: { id: "real-user-id" } }, error: null },
      userFirms: ["firm-shared"],
      memberCounts: { "firm-shared": 2 },
    });
    const result = await resolveClientId(client, "real-user-id", "valid-token");
    expect(result).toBe("firm-shared");
  });

  it("finds a multi-member firm even when it isn't the first one listed", async () => {
    const { client } = makeMockClient({
      getUserResult: { data: { user: { id: "real-user-id" } }, error: null },
      userFirms: ["firm-solo", "firm-shared"],
      memberCounts: { "firm-solo": 1, "firm-shared": 3 },
    });
    const result = await resolveClientId(client, "real-user-id", "valid-token");
    expect(result).toBe("firm-shared");
  });

  it("§11: honors an explicit requestedFirmId when the user has a live membership there", async () => {
    const { client } = makeMockClient({
      getUserResult: { data: { user: { id: "consultant-id" } }, error: null },
      userFirms: ["client-firm-a", "client-firm-b"],
      memberCounts: { "client-firm-a": 2, "client-firm-b": 2 },
    });
    const result = await resolveClientId(client, "consultant-id", "valid-token", "client-firm-b");
    expect(result).toBe("client-firm-b");
  });

  it("§11: ignores a requestedFirmId the caller isn't actually a member of", async () => {
    const { client } = makeMockClient({
      getUserResult: { data: { user: { id: "consultant-id" } }, error: null },
      userFirms: ["client-firm-a"],
      memberCounts: { "client-firm-a": 2 },
    });
    const result = await resolveClientId(client, "consultant-id", "valid-token", "someone-elses-firm");
    expect(result).toBe("client-firm-a");
  });

  it("§11: ignores a requestedFirmId whose membership has expired", async () => {
    const { client } = makeMockClient({
      getUserResult: { data: { user: { id: "consultant-id" } }, error: null },
      userFirms: ["client-firm-a"],
      memberCounts: { "client-firm-a": 2 },
      expiresAt: { "client-firm-a": "2020-01-01T00:00:00.000Z" },
    });
    const result = await resolveClientId(client, "consultant-id", "valid-token", "client-firm-a");
    expect(result).toBe("consultant-id");
  });

  it("§11: skips an expired membership entirely in the auto-detected fallback too", async () => {
    const { client } = makeMockClient({
      getUserResult: { data: { user: { id: "consultant-id" } }, error: null },
      userFirms: ["expired-firm", "active-firm"],
      memberCounts: { "expired-firm": 5, "active-firm": 2 },
      expiresAt: { "expired-firm": "2020-01-01T00:00:00.000Z" },
    });
    const result = await resolveClientId(client, "consultant-id", "valid-token");
    expect(result).toBe("active-firm");
  });
});
