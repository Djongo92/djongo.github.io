// The shared roast page is a partner's first touch of the product — it must
// render the stored roast and fail honestly on expired/unknown links.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RoastShare from "./RoastShare";
import type { DeckRoastResult } from "@/lib/roastMarkdown";

const mountAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/roast-share/:linkId" element={<RoastShare />} />
      </Routes>
    </MemoryRouter>,
  );

const ROAST: DeckRoastResult = {
  verdict: "This deck pitches the firm, not the client's problem.",
  grade: "C",
  burn: "Slide 3 opens with your founding year. Nobody's matter ever started there.",
  slideNotes: [{ slideNumber: 3, issue: "Firm-first opener", fix: "Lead with the client's trigger event" }],
  topThreeFixes: ["Reorder the first three slides", "Cut the jargon wall on slide 7", "End on a next step, not a logo"],
  redemption: "The case-study slide is genuinely strong — more of that.",
  slideCount: 12,
  mode: "text",
};

const viewResponse = {
  payload: ROAST,
  fileName: "q3-pitch.pptx",
  recipientLabel: "Managing Partner",
  expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
};

const stubFetch = (impl: () => Promise<Partial<Response>>) =>
  vi.stubGlobal("fetch", vi.fn().mockImplementation(impl));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RoastShare", () => {
  it("renders the stored roast from the view action", async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => viewResponse }));
    mountAt("/roast-share/some-token");

    await waitFor(() => expect(screen.getByText(/pitches the firm, not the client's problem/)).toBeTruthy());
    expect(screen.getByText(/Prepared for Managing Partner/)).toBeTruthy();
    expect(screen.getByText(/Grade: C/)).toBeTruthy();
    // The fetch must be the view action against the share-link function.
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("/functions/v1/roast-share-link");
    expect(JSON.parse(String(init?.body))).toEqual({ action: "view", linkId: "some-token" });
  });

  it("shows an honest error when the link is expired", async () => {
    stubFetch(async () => ({ ok: false, status: 410, json: async () => ({ error: "This share link has expired" }) }));
    mountAt("/roast-share/old-token");

    await waitFor(() => expect(screen.getByText("Couldn't open this link")).toBeTruthy());
    expect(screen.getByText(/has expired/)).toBeTruthy();
  });

  // Task #166 — the shared page is a recipient's first touch: it must route
  // them back into the teaser funnel with a measurable utm tag.
  it("closes the growth loop with a measurable 'score your own firm' CTA", async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => viewResponse }));
    mountAt("/roast-share/some-token");

    await waitFor(() => expect(screen.getByText(/pitches the firm/)).toBeTruthy());
    const cta = screen.getByRole("link", { name: /Get your firm's free roast/ });
    expect(cta.getAttribute("href")).toBe("/?utm_source=share&utm_medium=roast-share");
  });
});
