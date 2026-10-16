// Task #156 — the market picker's saved firm_context.market must converge
// into firm_profiles.jurisdictions (as the primary/first entry) instead of
// forking forever behind the #147 prompt-time precedence rule.
import { describe, it, expect } from "vitest";
import { mergeMarketIntoJurisdictions, syncMarketToFirmProfile } from "./marketProfileSync";

describe("mergeMarketIntoJurisdictions", () => {
  it("prepends the picked market when the profile has none", () => {
    expect(mergeMarketIntoJurisdictions("Czechia", [])).toEqual(["Czechia"]);
    expect(mergeMarketIntoJurisdictions("Czechia", null)).toEqual(["Czechia"]);
  });

  it("moves the picked market to the front, keeping secondary jurisdictions", () => {
    expect(mergeMarketIntoJurisdictions("Czechia", ["Poland", "Czechia", "Germany"]))
      .toEqual(["Czechia", "Poland", "Germany"]);
  });

  it("replaces the primary while preserving the rest of a multi-jurisdiction firm", () => {
    expect(mergeMarketIntoJurisdictions("Czechia", ["Poland", "Germany"]))
      .toEqual(["Czechia", "Poland", "Germany"]);
  });

  it("is a no-op when the picked market is already the primary jurisdiction", () => {
    expect(mergeMarketIntoJurisdictions("Poland", ["Poland", "Germany"])).toBeNull();
    expect(mergeMarketIntoJurisdictions("poland", ["Poland"])).toBeNull(); // case-insensitive
    expect(mergeMarketIntoJurisdictions(" Poland ", ["Poland"])).toBeNull(); // whitespace
  });

  it("ignores blank entries when finding the current primary", () => {
    expect(mergeMarketIntoJurisdictions("Poland", ["", "  ", "Poland"])).toBeNull();
  });

  it("is a no-op for a blank or missing market (picker cleared / never set)", () => {
    expect(mergeMarketIntoJurisdictions("", ["Poland"])).toBeNull();
    expect(mergeMarketIntoJurisdictions("   ", [])).toBeNull();
    expect(mergeMarketIntoJurisdictions(null, ["Poland"])).toBeNull();
    expect(mergeMarketIntoJurisdictions(undefined, null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// syncMarketToFirmProfile against a scripted mock service client.

type Scenario = {
  user?: { id: string } | null;
  memberships?: Array<{ firm_id: string; role: string; access_expires_at?: string | null }>;
  profile?: { jurisdictions: string[] } | null;
};

function mockClient(s: Scenario) {
  const upserts: Array<Record<string, unknown>> = [];
  const client = {
    auth: {
      getUser: async () => (s.user ? { data: { user: s.user }, error: null } : { data: { user: null }, error: { message: "bad token" } }),
    },
    from(table: string) {
      if (table === "firm_members") {
        return {
          select: () => ({
            eq: async () => ({ data: s.memberships ?? [], error: null }),
          }),
        };
      }
      if (table === "firm_profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: s.profile ?? null, error: null }),
            }),
          }),
          upsert: async (row: Record<string, unknown>) => {
            upserts.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return { client, upserts };
}

const OWNER = { firm_id: "firm-1", role: "owner" };

describe("syncMarketToFirmProfile", () => {
  it("writes the picked market as the primary jurisdiction for an editing member", async () => {
    const { client, upserts } = mockClient({
      user: { id: "user-1" },
      memberships: [OWNER],
      profile: { jurisdictions: ["Poland", "Germany"] },
    });
    await syncMarketToFirmProfile(client, "token", "Czechia");
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({
      firm_id: "firm-1",
      jurisdictions: ["Czechia", "Poland", "Germany"],
      updated_by: "user-1",
    });
  });

  it("creates the profile row when the firm has none yet", async () => {
    const { client, upserts } = mockClient({ user: { id: "user-1" }, memberships: [OWNER], profile: null });
    await syncMarketToFirmProfile(client, "token", "Poland");
    expect(upserts).toHaveLength(1);
    expect(upserts[0].jurisdictions).toEqual(["Poland"]);
  });

  it("skips when already converged", async () => {
    const { client, upserts } = mockClient({
      user: { id: "user-1" }, memberships: [OWNER], profile: { jurisdictions: ["Poland"] },
    });
    await syncMarketToFirmProfile(client, "token", "Poland");
    expect(upserts).toHaveLength(0);
  });

  it("skips anonymous callers (no/invalid token) — teaser keeps localStorage-only market", async () => {
    const { client, upserts } = mockClient({ user: null });
    await syncMarketToFirmProfile(client, undefined, "Poland");
    await syncMarketToFirmProfile(client, "bad-token", "Poland");
    expect(upserts).toHaveLength(0);
  });

  it("skips users with no firm membership (solo/legacy identity)", async () => {
    const { client, upserts } = mockClient({ user: { id: "user-1" }, memberships: [] });
    await syncMarketToFirmProfile(client, "token", "Poland");
    expect(upserts).toHaveLength(0);
  });

  it("skips roles that cannot edit the firm profile (read-only executive)", async () => {
    const { client, upserts } = mockClient({
      user: { id: "user-1" },
      memberships: [{ firm_id: "firm-1", role: "executive" }],
      profile: { jurisdictions: ["Poland"] },
    });
    await syncMarketToFirmProfile(client, "token", "Czechia");
    expect(upserts).toHaveLength(0);
  });

  it("skips expired memberships (consultant whose access lapsed)", async () => {
    const { client, upserts } = mockClient({
      user: { id: "user-1" },
      memberships: [{ firm_id: "firm-1", role: "consultant", access_expires_at: "2020-01-01T00:00:00Z" }],
    });
    await syncMarketToFirmProfile(client, "token", "Czechia");
    expect(upserts).toHaveLength(0);
  });

  it("honors the firm pin for multi-firm consultants", async () => {
    const { client, upserts } = mockClient({
      user: { id: "user-1" },
      memberships: [
        { firm_id: "firm-1", role: "consultant" },
        { firm_id: "firm-2", role: "consultant" },
      ],
      profile: { jurisdictions: [] },
    });
    await syncMarketToFirmProfile(client, "token", "Czechia", "firm-2");
    expect(upserts).toHaveLength(1);
    expect(upserts[0].firm_id).toBe("firm-2");
  });

  it("never throws — a scripted failure is swallowed and logged", async () => {
    const broken = {
      auth: { getUser: async () => { throw new Error("network down"); } },
    };
    await expect(syncMarketToFirmProfile(broken, "token", "Poland")).resolves.toBeUndefined();
  });
});
