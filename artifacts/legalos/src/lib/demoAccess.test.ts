// The showcase grant is session-scoped by design (it dies with the tab), and
// a fresh grant is the signal that someone is being shown the product via an
// access code — which is what re-arms the demo welcome + tour for them.
import { describe, it, expect, beforeEach } from "vitest";
import { storeShowcaseGrant, readShowcaseGrant, codeFromSearch } from "./demoAccess";

const TOUR_KEY = "legalos_tour_progress";

describe("storeShowcaseGrant", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("remembers the grant for this tab only", () => {
    storeShowcaseGrant({ label: "Acme & Co" });
    expect(readShowcaseGrant()?.label).toBe("Acme & Co");
    expect(localStorage.getItem("legalos_showcase_grant")).toBeNull();
  });

  it("resets the demo tour so the welcome greets the new visitor", () => {
    localStorage.setItem(TOUR_KEY, JSON.stringify({ v: 3, status: "done", step: 0, variant: "demo" }));
    storeShowcaseGrant({});
    const stored = JSON.parse(localStorage.getItem(TOUR_KEY)!) as {
      demo: { status: string };
    };
    expect(stored.demo.status).toBe("idle");
  });

  // Regression (code review): an account holder who enters the showcase must
  // not lose their finished account tour — the reset is scoped to the demo
  // side, so returning to their real account doesn't re-offer onboarding.
  it("keeps a finished account tour finished across a fresh grant", () => {
    localStorage.setItem(TOUR_KEY, JSON.stringify({ v: 3, status: "done", step: 0, variant: "account" }));
    storeShowcaseGrant({});
    const stored = JSON.parse(localStorage.getItem(TOUR_KEY)!) as {
      demo: { status: string };
      account: { status: string };
    };
    expect(stored.account.status).toBe("done");
    expect(stored.demo.status).toBe("idle");
  });
});

describe("codeFromSearch", () => {
  it("reads key or code params and trims them", () => {
    expect(codeFromSearch("?key=ACME-7F3K")).toBe("ACME-7F3K");
    expect(codeFromSearch("?code= beta-1 ")).toBe("beta-1");
    expect(codeFromSearch("?other=x")).toBeNull();
    expect(codeFromSearch("?key=")).toBeNull();
  });
});
