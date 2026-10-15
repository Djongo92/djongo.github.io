// The showcase's sample partner-review link must never hit the workflow edge
// function — the page is server-backed in real accounts, so in demo it renders
// the local board instead (found in code review: it used to call the edge and
// land on the generic invalid-link error).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PartnerReview from "./PartnerReview";
import { seedDemoData } from "@/data/demoData";

const mountAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/partner-review/:linkId" element={<PartnerReview />} />
      </Routes>
    </MemoryRouter>,
  );

describe("PartnerReview with the demo sample link", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("legalos_demo_mode", "1");
    seedDemoData();
    // Any network attempt fails loudly — the demo path must make none.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network must not be touched")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the sample from the local board with zero edge requests", async () => {
    mountAt("/partner-review/demo-sample-link");

    await waitFor(() => expect(screen.getByText(/Sample review page/)).toBeTruthy());
    expect(screen.queryByText("Couldn't open this link")).toBeNull();
    expect(screen.getByText("Rewrite Corporate/M&A practice page")).toBeTruthy();
    // Internal notes never reach the partner view, even locally.
    expect(screen.queryByText(/Hold publication until/)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    // Task #166 — no growth CTA on the demo sample: that user already has
    // the product; the CTA is for real link recipients only.
    expect(screen.queryByRole("link", { name: /free roast/ })).toBeNull();
  });
});

// Task #166 — real recipients get the route back into the funnel.
describe("PartnerReview growth-loop CTA", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ recipientLabel: "a partner", items: [], comments: [] }),
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows the measurable 'score your own firm' CTA on a real link", async () => {
    mountAt("/partner-review/real-link-id");

    await waitFor(() => expect(screen.getByText(/For a partner/)).toBeTruthy());
    const cta = screen.getByRole("link", { name: /Get your firm's free roast/ });
    expect(cta.getAttribute("href")).toBe("/?utm_source=share&utm_medium=partner-review");
  });
});
