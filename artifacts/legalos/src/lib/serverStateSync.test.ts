// §11 regression: for a consultant who belongs to several client firms, a
// user-state read and the writes that follow it must provably target the
// same firm — before this, each call auto-resolved independently and a push
// could land in a different firm than the pull (caught in review).
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./currentUser", () => ({
  getCurrentUser: () => ({ userId: "u1", accessToken: "tok" }),
}));
vi.mock("./edgeAuth", () => ({ edgeHeaders: () => ({ "Content-Type": "application/json" }) }));

import { noteResolvedClientId, pullServerState, pushServerState } from "./serverStateSync";

const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

const bodies = () =>
  fetchSpy.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));

beforeEach(() => {
  fetchSpy.mockReset();
  fetchSpy.mockResolvedValue({ json: () => Promise.resolve({ state: {} }) });
  noteResolvedClientId(null);
  localStorage.clear();
});

describe("serverStateSync firm pinning", () => {
  it("pins a push to the firm the preceding pull resolved to", async () => {
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve({ state: {}, resolvedClientId: "firm-1" }),
    });
    await pullServerState("reading_progress");
    pushServerState("reading_progress", { readChapters: [] });

    const [pullBody, pushBody] = bodies();
    expect(pullBody.activeFirmId).toBeUndefined();
    expect(pushBody.activeFirmId).toBe("firm-1");
  });

  it("prefers the explicitly chosen workspace on both pull and push", async () => {
    localStorage.setItem("legalos_active_workspace", "firm-9");
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve({ state: {}, resolvedClientId: "firm-9" }),
    });
    await pullServerState("k");
    pushServerState("k", 1);

    const [pullBody, pushBody] = bodies();
    expect(pullBody.activeFirmId).toBe("firm-9");
    expect(pushBody.activeFirmId).toBe("firm-9");
  });

  it("sends no pin when neither a workspace nor a resolved identity exists", () => {
    pushServerState("k", 1);
    expect(bodies()[0]).not.toHaveProperty("activeFirmId");
  });
});
