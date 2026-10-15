// Pins the consultant-workspace contract: every generation request must
// carry the active workspace (legalos_active_workspace) so the server
// resolves THIS firm's style memory and context profile — without the pin
// a consultant with several client firms gets the first shared firm the
// resolver finds, leaking one client's context into another client's AI
// response (caught in the §119 code review).
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/clientId", () => ({ getOrCreateClientId: () => "anon-browser-id" }));
vi.mock("@/lib/currentUser", () => ({ getCurrentUser: () => ({ userId: "user-1", accessToken: "token-1" }) }));
vi.mock("@/components/workshop/shared", () => ({ fnUrl: (s: string) => s, authHeaders: () => ({}) }));

import { styleMemoryIdentity } from "./styleFeedback";

describe("styleMemoryIdentity", () => {
  beforeEach(() => localStorage.clear());

  it("includes the active workspace pin when one is selected", () => {
    localStorage.setItem("legalos_active_workspace", "firm-B");
    const id = styleMemoryIdentity();
    expect(id).toEqual({ clientId: "user-1", accessToken: "token-1", activeFirmId: "firm-B" });
  });

  it("omits the pin when no workspace is selected (server auto-detects)", () => {
    const id = styleMemoryIdentity();
    expect(id.clientId).toBe("user-1");
    expect(id.activeFirmId).toBeUndefined();
  });

  it("uses the signed-in user id as clientId (anonymous fallback is getOrCreateClientId, covered by the mock boundary)", () => {
    localStorage.setItem("legalos_active_workspace", "firm-B");
    const id = styleMemoryIdentity();
    expect(id.clientId).toBe("user-1");
    expect(id.activeFirmId).toBe("firm-B");
  });
});
