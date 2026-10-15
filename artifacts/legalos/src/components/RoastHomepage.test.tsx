// Task #141 — the paste-your-copy fallback is the whole point of the change:
// a bot-blocked site must produce an inline, cause-naming error with a paste
// path that resubmits with pastedCopy (not a dead-end toast).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RoastHomepage from "./RoastHomepage";

const ROAST = {
  verdict: "All sizzle, no steak.",
  grade: "C",
  burn: "burn",
  annotations: [],
  topThreeFixes: [],
  redemption: "redemption",
  url: "https://dlapiper.com",
};

const openModal = () => {
  render(<RoastHomepage />);
  fireEvent.click(screen.getByRole("button", { name: /Roast My Homepage/ }));
  fireEvent.change(screen.getByPlaceholderText("yourlawfirm.com"), { target: { value: "dlapiper.com" } });
};

afterEach(() => vi.unstubAllGlobals());

describe("RoastHomepage paste fallback", () => {
  it("offers paste inline when the site blocks automated readers, then roasts the pasted copy", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false, status: 400,
        json: async () => ({ error: "That website blocks automated readers (bot protection). Paste the page copy below and you'll get the same analysis.", code: "BLOCKED_BY_SITE" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ROAST });
    vi.stubGlobal("fetch", fetchMock);

    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Roast it" }));

    // The error names the cause and the fallback appears inline — no toast dead-end.
    await waitFor(() => expect(screen.getByText(/blocks automated readers/)).toBeTruthy());
    const textarea = screen.getByPlaceholderText(/Select the text on your homepage/);
    expect(textarea).toBeTruthy();

    const copy = "Homepage copy ".repeat(10); // > 100 chars
    fireEvent.change(textarea, { target: { value: copy } });
    fireEvent.click(screen.getByRole("button", { name: "Roast the pasted copy" }));

    await waitFor(() => expect(screen.getByText(/All sizzle, no steak/)).toBeTruthy());
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(secondBody.pastedCopy).toBe(copy.trim()); // the component trims before sending
    expect(secondBody.url).toBe("dlapiper.com");
  });

  it("clears the fallback (and its pasted copy) when the URL is edited — pasted text must never be analyzed under a new URL's label", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false, status: 400,
      json: async () => ({ error: "That website blocks automated readers. Paste the page copy below and you'll get the same analysis.", code: "BLOCKED_BY_SITE" }),
    }));

    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Roast it" }));
    await waitFor(() => expect(screen.getByText(/blocks automated readers/)).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText(/Select the text on your homepage/), { target: { value: "A".repeat(120) } });
    fireEvent.change(screen.getByPlaceholderText("yourlawfirm.com"), { target: { value: "otherfirm.com" } });

    expect(screen.queryByText(/blocks automated readers/)).toBeNull();
    expect(screen.queryByPlaceholderText(/Select the text on your homepage/)).toBeNull();
  });

  it("keeps the paste button disabled until the copy is substantial", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false, status: 400,
      json: async () => ({ error: "Couldn't load that website. Check the URL(s) — or paste the page copy below instead.", code: "SITE_UNREACHABLE" }),
    }));

    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Roast it" }));

    await waitFor(() => expect(screen.getByText(/Couldn't load that website/)).toBeTruthy());
    const btn = screen.getByRole("button", { name: "Roast the pasted copy" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Select the text on your homepage/), { target: { value: "short" } });
    expect(btn.disabled).toBe(true);
  });
});
