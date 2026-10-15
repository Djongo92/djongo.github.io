// Task #141 — Competitor Analysis gets the same inline paste fallback as
// Roast My Homepage: coded fetch failures surface the cause and per-site
// paste fields, and resubmission sends pastedCopies keyed by URL.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CompetitorAnalysis from "./CompetitorAnalysis";

const RESULT = {
  executiveSummary: "You are interchangeable with all three rivals.",
  yourPositioning: { summary: "s", strengths: [], weaknesses: [] },
  competitors: [],
  gaps: [],
  opportunities: [],
  recommendedMoves: [],
  meta: { yourUrl: "yourfirm.com", competitorUrls: ["rival.com"], unreachable: [] },
};

const openModal = () => {
  render(<CompetitorAnalysis />);
  fireEvent.click(screen.getByRole("button", { name: /Competitor Analysis/ }));
  fireEvent.change(screen.getByPlaceholderText("yourlawfirm.com"), { target: { value: "yourfirm.com" } });
  fireEvent.change(screen.getByPlaceholderText("competitor1.com"), { target: { value: "rival.com" } });
};

afterEach(() => vi.unstubAllGlobals());

describe("CompetitorAnalysis paste fallback", () => {
  it("offers per-site paste fields when a site blocks automated readers", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false, status: 400,
        json: async () => ({ error: "Your site (https://yourfirm.com) blocks automated readers (bot protection). Paste the page copy below and you'll get the same analysis.", code: "BLOCKED_BY_SITE" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => RESULT });
    vi.stubGlobal("fetch", fetchMock);

    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Run analysis" }));

    await waitFor(() => expect(screen.getByText(/blocks automated readers/)).toBeTruthy());
    // One paste field per entered URL.
    expect(screen.getByText("Copy from yourfirm.com")).toBeTruthy();
    expect(screen.getByText("Copy from rival.com")).toBeTruthy();

    const copy = "Firm homepage copy ".repeat(8);
    const textarea = screen.getByText("Copy from yourfirm.com").parentElement!.querySelector("textarea")!;
    fireEvent.change(textarea, { target: { value: copy } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze with pasted copy" }));

    await waitFor(() => expect(screen.getByText(/interchangeable/)).toBeTruthy());
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(secondBody.pastedCopies).toEqual({ "yourfirm.com": copy });
    expect(secondBody.competitorUrls).toEqual(["rival.com"]);
  });

  it("offers paste for a blocked competitor on the PARTIAL path (one loads, one blocks)", async () => {
    const blockedUrl = "https://blocked-rival.com";
    const partial = { ...RESULT, meta: { ...RESULT.meta, unreachable: [blockedUrl] } };
    const complete = { ...RESULT, executiveSummary: "Now with the blocked rival included.", meta: { ...RESULT.meta, unreachable: [] } };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => partial })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => complete });
    vi.stubGlobal("fetch", fetchMock);

    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Run analysis" }));

    // Partial success: the result renders AND the missing competitor gets a paste field.
    await waitFor(() => expect(screen.getByText(/interchangeable/)).toBeTruthy());
    expect(screen.getByText(/missing from this analysis/)).toBeTruthy();
    const label = screen.getByText(`Copy from ${blockedUrl}`);
    const copy = "Rival homepage copy ".repeat(8);
    fireEvent.change(label.parentElement!.querySelector("textarea")!, { target: { value: copy } });
    fireEvent.click(screen.getByRole("button", { name: "Re-run with pasted copy" }));

    // The old result stays visible until the complete analysis lands…
    expect(screen.getByText(/interchangeable/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Now with the blocked rival included/)).toBeTruthy());
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(secondBody.pastedCopies).toEqual({ [blockedUrl]: copy });
  });

  it("clears the fallback when any URL is edited — pasted copy belongs to the failed targets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false, status: 400,
      json: async () => ({ error: "Your site (https://yourfirm.com) blocks automated readers. Paste the page copy below and you'll get the same analysis.", code: "BLOCKED_BY_SITE" }),
    }));

    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Run analysis" }));
    await waitFor(() => expect(screen.getByText(/blocks automated readers/)).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText("competitor1.com"), { target: { value: "other-rival.com" } });
    expect(screen.queryByText(/blocks automated readers/)).toBeNull();
    expect(screen.queryByText("Copy from yourfirm.com")).toBeNull();
  });
});
