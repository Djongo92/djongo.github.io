import { describe, it, expect, vi } from "vitest";
import { resolveClientId } from "./verifiedClientId";

function makeMockClient(getUserResult: { data: { user: { id: string } | null }; error: Error | null }) {
  const getUser = vi.fn().mockResolvedValue(getUserResult);
  const client: { auth: { getUser: typeof getUser } } = { auth: { getUser } };
  return { client, getUser };
}

describe("resolveClientId", () => {
  it("trusts the client-asserted clientId when no access token is given", async () => {
    const { client, getUser } = makeMockClient({ data: { user: { id: "real-user-id" } }, error: null });
    const result = await resolveClientId(client, "anon-browser-id", undefined);
    expect(result).toBe("anon-browser-id");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("trusts the client-asserted clientId when the access token is not a string", async () => {
    const { client } = makeMockClient({ data: { user: { id: "real-user-id" } }, error: null });
    const result = await resolveClientId(client, "anon-browser-id", 12345);
    expect(result).toBe("anon-browser-id");
  });

  it("uses the verified user id from a valid access token, overriding the asserted clientId", async () => {
    const { client } = makeMockClient({ data: { user: { id: "real-user-id" } }, error: null });
    const result = await resolveClientId(client, "someone-elses-id", "valid-token");
    expect(result).toBe("real-user-id");
  });

  it("falls back to the asserted clientId when the token is invalid", async () => {
    const { client } = makeMockClient({ data: { user: null }, error: new Error("invalid token") });
    const result = await resolveClientId(client, "anon-browser-id", "garbage-token");
    expect(result).toBe("anon-browser-id");
  });

  it("falls back to the asserted clientId when getUser returns no user but no error either", async () => {
    const { client } = makeMockClient({ data: { user: null }, error: null });
    const result = await resolveClientId(client, "anon-browser-id", "expired-token");
    expect(result).toBe("anon-browser-id");
  });
});
