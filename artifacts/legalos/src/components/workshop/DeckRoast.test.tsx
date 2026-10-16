// Task #151 — a firm that shared a brutal roast with the wrong partner can
// kill the link before its 7-day expiry: the DeckRoast surface lists active
// share links (signed-in only) and revokes them inline.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DeckRoast from "./DeckRoast";

const mocks = { auth: { user: { id: "u1" } } as { user: { id: string } | null } };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/hooks/useFirmContext", () => ({ useFirmContext: () => ({ context: {} }) }));

const LINK = {
  id: "link-1",
  fileName: "q3-pitch.pdf",
  recipientLabel: "Partner review",
  expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  mocks.auth = { user: { id: "u1" } };
});
afterEach(() => vi.unstubAllGlobals());

describe("DeckRoast share-link management (task #151)", () => {
  it("lists active links and revokes one inline", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ links: [LINK] }) }) // list on mount
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });     // revoke
    vi.stubGlobal("fetch", fetchMock);

    render(<DeckRoast />);
    await waitFor(() => expect(screen.getByText("Active share links")).toBeTruthy());
    expect(screen.getByText(/Partner review/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Revoke/ }));

    await waitFor(() => expect(screen.queryByText("Active share links")).toBeNull());
    const revokeBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(revokeBody).toMatchObject({ action: "revoke", linkId: "link-1" });
  });

  it("keeps the link listed when the revoke call fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ links: [LINK] }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: "Couldn't revoke the share link" }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<DeckRoast />);
    await waitFor(() => expect(screen.getByText(/Partner review/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Revoke/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    // Still listed — a failed revoke must not pretend the link is dead.
    expect(screen.getByText(/Partner review/)).toBeTruthy();
  });

  it("never loads or shows links when signed out", async () => {
    mocks.auth = { user: null };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<DeckRoast />);
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Active share links")).toBeNull();
  });
});
