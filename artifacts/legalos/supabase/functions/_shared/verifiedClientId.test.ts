import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveVerifiedClientId, resolveVerifiedClientIdSet, resolveClientIdGuarded, headerSessionToken } from "./verifiedClientId";

type GetUserResult = { data: { user: { id: string } | null }; error: Error | null };

// UUID-shaped ids: the ownership probe short-circuits non-UUID ids (account
// ids are always UUIDs), so claimed-id tests must use real shapes.
const VICTIM_USER = "11111111-2222-3333-4444-555555555555";
const VICTIM_FIRM = "99999999-8888-7777-6666-555555555555";
const PRE_PROVISIONING_USER = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const UNCLAIMED_UUID = "00000000-1111-2222-3333-444444444444";

function makeMockClient(opts: {
  getUserResult: GetUserResult;
  userFirms?: string[];
  memberCounts?: Record<string, number>;
  expiresAt?: Record<string, string>;
  /** ids with a firm_members row (post-provisioning accounts). */
  accountUserIds?: string[];
  /** firm ids that exist (account-owned shared identities). */
  firmIds?: string[];
  /** ids auth.admin.getUserById finds (the complete account registry). */
  adminUsers?: string[];
  /** simulate the auth admin API failing (non-404). */
  adminLookupFails?: boolean;
  /** simulate the firm_members membership select failing (e.g. a missing column). */
  membershipFails?: boolean;
  /** simulate the per-firm member count query failing. */
  countFails?: boolean;
}) {
  const {
    getUserResult,
    userFirms = [],
    memberCounts = {},
    expiresAt = {},
    accountUserIds = [],
    firmIds = [],
    adminUsers = [],
    adminLookupFails = false,
    membershipFails = false,
    countFails = false,
  } = opts;
  const getUser = vi.fn().mockResolvedValue(getUserResult);
  const getUserById = vi.fn((id: string) => {
    if (adminLookupFails) {
      return Promise.resolve({ data: { user: null }, error: Object.assign(new Error("admin api down"), { status: 500 }) });
    }
    if (adminUsers.includes(id)) {
      return Promise.resolve({ data: { user: { id } }, error: null });
    }
    return Promise.resolve({ data: { user: null }, error: Object.assign(new Error("User not found"), { status: 404 }) });
  });

  const from = vi.fn((table: string) => {
    if (table !== "firm_members" && table !== "firms") throw new Error(`unexpected table ${table}`);
    return {
      select: (_cols: string, selectOpts?: { count?: string; head?: boolean }) => ({
        eq: (column: string, value: string) => {
          // Account-ownership probes (isAccountOwnedId's claimed check).
          if (selectOpts?.count && table === "firm_members" && column === "user_id") {
            return Promise.resolve({ count: accountUserIds.includes(value) ? 1 : 0 });
          }
          if (selectOpts?.count && table === "firms" && column === "id") {
            return Promise.resolve({ count: firmIds.includes(value) ? 1 : 0 });
          }
          // Membership resolution (resolveForUser).
          if (table === "firm_members" && column === "user_id") {
            if (membershipFails) {
              return Promise.resolve({ data: null, error: new Error("column firm_members.access_expires_at does not exist") });
            }
            return Promise.resolve({ data: userFirms.map((firm_id) => ({ firm_id, access_expires_at: expiresAt[firm_id] ?? null })) });
          }
          if (table === "firm_members" && column === "firm_id" && selectOpts?.count) {
            if (countFails) {
              return Promise.resolve({ count: null, error: new Error("db unavailable") });
            }
            return Promise.resolve({ count: memberCounts[value] ?? 0 });
          }
          return Promise.resolve({ data: [] });
        },
      }),
    };
  });

  const client = { auth: { getUser, admin: { getUserById } }, from };
  return { client, getUser, getUserById, from };
}

const validUser = (id: string): GetUserResult => ({ data: { user: { id } }, error: null });
const invalidToken: GetUserResult = { data: { user: null }, error: new Error("invalid token") };

afterEach(() => {
  // deno-lint-ignore no-explicit-any
  delete (globalThis as any).Deno;
  vi.restoreAllMocks();
});

describe("resolveVerifiedClientId (strict — account-only endpoints)", () => {
  it("returns null when no access token is given, even for an unclaimed id", async () => {
    const { client, getUser } = makeMockClient({ getUserResult: validUser("real-user-id") });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientId(client as any, undefined)).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("returns null when the token is not a string", async () => {
    const { client } = makeMockClient({ getUserResult: validUser("real-user-id") });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientId(client as any, 12345)).toBeNull();
  });

  it("returns null when the token is invalid — never falls back to a caller-asserted id", async () => {
    const { client } = makeMockClient({ getUserResult: invalidToken });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientId(client as any, "garbage-token")).toBeNull();
  });

  it("resolves the verified user id when the user belongs to no firm", async () => {
    const { client } = makeMockClient({ getUserResult: validUser("real-user-id"), userFirms: [] });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientId(client as any, "valid-token")).toBe("real-user-id");
  });
});

describe("resolveVerifiedClientIdSet (ownership set — row-targeting endpoints)", () => {
  it("returns null when the token is invalid", async () => {
    const { client } = makeMockClient({ getUserResult: invalidToken });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientIdSet(client as any, "garbage-token")).toBeNull();
  });

  it("returns just the user id for a firm-less user", async () => {
    const { client } = makeMockClient({ getUserResult: validUser("solo-user"), userFirms: [] });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientIdSet(client as any, "valid-token")).toEqual(["solo-user"]);
  });

  it("includes every live firm membership — a consultant acting across several client firms", async () => {
    const { client } = makeMockClient({ getUserResult: validUser("consultant-user"), userFirms: ["firm-a", "firm-b"] });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientIdSet(client as any, "valid-token")).toEqual(["consultant-user", "firm-a", "firm-b"]);
  });

  it("excludes expired memberships — lapsed consultant access is not ownership", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("consultant-user"),
      userFirms: ["live-firm", "lapsed-firm"],
      expiresAt: { "lapsed-firm": "2020-01-01T00:00:00Z" },
    });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientIdSet(client as any, "valid-token")).toEqual(["consultant-user", "live-firm"]);
  });
});

describe("resolveClientIdGuarded (legacy-token + anonymous endpoints)", () => {
  it("trusts an unclaimed non-UUID browser id without probing account tables", async () => {
    const { client, getUser, getUserById, from } = makeMockClient({ getUserResult: validUser("real-user-id") });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, "anon-browser-id", undefined)).toBe("anon-browser-id");
    expect(getUser).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("rejects a claimed auth-user id when no token is given — the IDOR", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      accountUserIds: [VICTIM_USER],
    });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, VICTIM_USER, undefined)).toBeNull();
  });

  it("rejects a claimed firm id when no token is given", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      firmIds: [VICTIM_FIRM],
    });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, VICTIM_FIRM, undefined)).toBeNull();
  });

  it("rejects an account id that has no membership row (pre-provisioning account), via the auth registry", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      adminUsers: [PRE_PROVISIONING_USER],
    });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, PRE_PROVISIONING_USER, undefined)).toBeNull();
  });

  it("rejects a claimed id when the token is garbage — an invalid token is not a pass", async () => {
    const { client } = makeMockClient({
      getUserResult: invalidToken,
      accountUserIds: [VICTIM_USER],
    });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, VICTIM_USER, "garbage-token")).toBeNull();
  });

  it("trusts an unclaimed UUID only after every ownership probe comes up empty", async () => {
    const { client, getUserById } = makeMockClient({ getUserResult: validUser("real-user-id") });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, UNCLAIMED_UUID, undefined)).toBe(UNCLAIMED_UUID);
    expect(getUserById).toHaveBeenCalledWith(UNCLAIMED_UUID);
  });

  it("fails closed when the auth registry lookup errors — an outage must not read as unclaimed", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      adminLookupFails: true,
    });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, UNCLAIMED_UUID, undefined)).toBeNull();
  });

  it("a verified token wins over the asserted id, claimed or not", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      userFirms: [],
      accountUserIds: [VICTIM_USER],
    });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, VICTIM_USER, "valid-token")).toBe("real-user-id");
  });
});

describe("firm-aware resolution (shared by both resolvers via a verified token)", () => {
  const guarded = (client: unknown, token: string, requestedFirmId?: string) =>
    // deno-lint-ignore no-explicit-any
    resolveClientIdGuarded(client as any, "asserted-id", token, requestedFirmId);

  it("uses the verified user id when their only firm still has a single member", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      userFirms: ["firm-solo"],
      memberCounts: { "firm-solo": 1 },
    });
    expect(await guarded(client, "valid-token")).toBe("real-user-id");
  });

  it("uses the shared firm id once that firm has more than one member", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      userFirms: ["firm-shared"],
      memberCounts: { "firm-shared": 2 },
    });
    expect(await guarded(client, "valid-token")).toBe("firm-shared");
  });

  it("finds a multi-member firm even when it isn't the first one listed", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      userFirms: ["firm-solo", "firm-shared"],
      memberCounts: { "firm-solo": 1, "firm-shared": 3 },
    });
    expect(await guarded(client, "valid-token")).toBe("firm-shared");
  });

  it("§11: honors an explicit requestedFirmId when the user has a live membership there", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("consultant-id"),
      userFirms: ["client-firm-a", "client-firm-b"],
      memberCounts: { "client-firm-a": 2, "client-firm-b": 2 },
    });
    expect(await guarded(client, "valid-token", "client-firm-b")).toBe("client-firm-b");
  });

  it("§11: ignores a requestedFirmId the caller isn't actually a member of", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("consultant-id"),
      userFirms: ["client-firm-a"],
      memberCounts: { "client-firm-a": 2 },
    });
    expect(await guarded(client, "valid-token", "someone-elses-firm")).toBe("client-firm-a");
  });

  it("§11: ignores a requestedFirmId whose membership has expired", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("consultant-id"),
      userFirms: ["client-firm-a"],
      memberCounts: { "client-firm-a": 2 },
      expiresAt: { "client-firm-a": "2020-01-01T00:00:00.000Z" },
    });
    expect(await guarded(client, "valid-token", "client-firm-a")).toBe("consultant-id");
  });

  it("§11: skips an expired membership entirely in the auto-detected fallback too", async () => {
    const { client } = makeMockClient({
      getUserResult: validUser("consultant-id"),
      userFirms: ["expired-firm", "active-firm"],
      memberCounts: { "expired-firm": 5, "active-firm": 2 },
      expiresAt: { "expired-firm": "2020-01-01T00:00:00.000Z" },
    });
    expect(await guarded(client, "valid-token")).toBe("active-firm");
  });
});

describe("membership lookup failures (fail closed — never degrade to personal ids)", () => {
  // Regression: prod missing the access_expires_at column made this exact
  // query error; the old code read null data as "no memberships" and every
  // teammate silently fragmented onto personal ids with no error anywhere.
  it("strict resolver returns null when the firm_members query errors — and logs it", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = makeMockClient({ getUserResult: validUser("real-user-id"), membershipFails: true });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientId(client as any, "valid-token")).toBeNull();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("resolveForUser"), expect.anything());
  });

  it("guarded resolver (verified-token path) fails closed on the same error", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      userFirms: ["firm-shared"],
      memberCounts: { "firm-shared": 2 },
      membershipFails: true,
    });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, "asserted-id", "valid-token")).toBeNull();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("resolveForUser"), expect.anything());
  });

  it("fails closed when the per-firm member count errors — an errored count is not a single-member firm", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = makeMockClient({
      getUserResult: validUser("real-user-id"),
      userFirms: ["firm-shared"],
      countFails: true,
    });
    // deno-lint-ignore no-explicit-any
    expect(await resolveClientIdGuarded(client as any, "asserted-id", "valid-token")).toBeNull();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("resolveForUser"), expect.anything());
  });

  it("the ownership-set resolver returns null on the same error — never a personal-id-only set", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = makeMockClient({ getUserResult: validUser("teammate-id"), membershipFails: true });
    // deno-lint-ignore no-explicit-any
    expect(await resolveVerifiedClientIdSet(client as any, "valid-token")).toBeNull();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("resolveVerifiedClientIdSet"), expect.anything());
  });
});

describe("headerSessionToken", () => {
  const reqWith = (headers: Record<string, string>) => new Request("https://example.test/f", { headers });

  it("prefers an explicit x-user-token header", () => {
    expect(headerSessionToken(reqWith({ "x-user-token": "mobile-session-jwt" }))).toBe("mobile-session-jwt");
  });

  it("falls back to an Authorization bearer", () => {
    expect(headerSessionToken(reqWith({ authorization: "Bearer web-session-jwt" }))).toBe("web-session-jwt");
  });

  it("ignores an Authorization bearer that is the project anon key", () => {
    // deno-lint-ignore no-explicit-any
    (globalThis as any).Deno = { env: { get: (k: string) => (k === "SUPABASE_ANON_KEY" ? "the-anon-key" : undefined) } };
    expect(headerSessionToken(reqWith({ authorization: "Bearer the-anon-key" }))).toBeUndefined();
  });

  it("returns undefined when no session header is present", () => {
    expect(headerSessionToken(reqWith({}))).toBeUndefined();
  });
});
