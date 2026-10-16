import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const seedDemoData = vi.fn();
const clearDemoData = vi.fn();
vi.mock("@/data/demoData", () => ({ seedDemoData, clearDemoData }));

const setSessionMode = vi.fn();
const clearSession = vi.fn();
vi.mock("@/lib/session", () => ({ setSessionMode, clearSession }));

const goToMarketingHome = vi.fn();
vi.mock("@/lib/marketingSite", () => ({ goToMarketingHome, MARKETING_HOME: "/" }));

const {
  primeDemoMode,
  isDemoMode,
  enableDemoMode,
  revokeUngrantedDemo,
  primeDemoFromLocation,
  disableDemoMode,
  SHOWCASE_GATE_PATH,
} = await import("@/lib/demoMode");
const {
  storeShowcaseGrant,
  clearShowcaseGrant,
  readShowcaseGrant,
  hasShowcaseGrant,
  codeFromSearch,
  verifyShowcaseCode,
} = await import("@/lib/demoAccess");

const DEMO_KEY = "legalos_demo_mode";

let assign: ReturnType<typeof vi.fn>;
let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
  assign = vi.fn();
  reload = vi.fn();
  vi.spyOn(window.location, "assign").mockImplementation(assign);
  vi.spyOn(window.location, "reload").mockImplementation(reload);
});

afterEach(() => vi.restoreAllMocks());

describe("the showcase fails closed without a grant", () => {
  // The bug this guards: gating only the /demo route leaves every in-app
  // "load demo data" affordance as an open side door.
  it("primeDemoMode refuses and writes nothing", () => {
    expect(primeDemoMode()).toBe(false);
    expect(isDemoMode()).toBe(false);
    expect(seedDemoData).not.toHaveBeenCalled();
    expect(setSessionMode).not.toHaveBeenCalled();
  });

  it("an in-app demo button sends the visitor to the gate instead of the showcase", () => {
    enableDemoMode();
    expect(isDemoMode()).toBe(false);
    expect(seedDemoData).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith(SHOWCASE_GATE_PATH);
    expect(reload).not.toHaveBeenCalled();
  });

  it("the /demo deep link leaves the URL alone so the gate can render", () => {
    window.history.replaceState(null, "", "/demo");
    expect(primeDemoFromLocation()).toBe(false);
    expect(window.location.pathname).toBe("/demo");
    expect(isDemoMode()).toBe(false);
  });
});

describe("the showcase opens with a grant", () => {
  beforeEach(() => storeShowcaseGrant({ label: "Acme & Partners" }));

  it("primeDemoMode seeds the fixtures", () => {
    expect(primeDemoMode()).toBe(true);
    expect(isDemoMode()).toBe(true);
    expect(seedDemoData).toHaveBeenCalled();
    expect(setSessionMode).toHaveBeenCalledWith("demo");
  });

  it("an in-app demo button enters the showcase directly", () => {
    enableDemoMode();
    expect(isDemoMode()).toBe(true);
    expect(reload).toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("the /demo deep link primes before render and rewrites the URL", () => {
    window.history.replaceState(null, "", "/demo");
    expect(primeDemoFromLocation()).toBe(true);
    expect(isDemoMode()).toBe(true);
    expect(window.location.pathname).toBe("/");
  });

  it("leaving revokes the grant, so re-entry needs the code again", () => {
    primeDemoMode();
    disableDemoMode();
    expect(isDemoMode()).toBe(false);
    expect(hasShowcaseGrant()).toBe(false);
    expect(goToMarketingHome).toHaveBeenCalled();
  });
});

describe("revokeUngrantedDemo", () => {
  // Fixtures live in localStorage and outlive the tab; the grant doesn't.
  // Without this, one grant would mean permanent access on that browser.
  it("ends a demo session whose grant died with its tab", () => {
    storeShowcaseGrant({});
    primeDemoMode();
    clearShowcaseGrant();

    expect(revokeUngrantedDemo()).toBe(true);
    expect(isDemoMode()).toBe(false);
    expect(clearDemoData).toHaveBeenCalled();
  });

  it("leaves a live showcase session alone", () => {
    storeShowcaseGrant({});
    primeDemoMode();
    expect(revokeUngrantedDemo()).toBe(false);
    expect(isDemoMode()).toBe(true);
  });

  it("does nothing to a real account", () => {
    expect(revokeUngrantedDemo()).toBe(false);
    expect(clearDemoData).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });
});

describe("grant storage", () => {
  it("round-trips the label", () => {
    storeShowcaseGrant({ label: "Acme" });
    expect(readShowcaseGrant()).toEqual({ label: "Acme" });
  });

  it("survives corrupted storage without throwing", () => {
    sessionStorage.setItem("legalos_showcase_grant", "{not json");
    expect(readShowcaseGrant()).toBeNull();
    expect(hasShowcaseGrant()).toBe(false);
  });

  it("treats a stored non-object as no grant", () => {
    sessionStorage.setItem("legalos_showcase_grant", "null");
    expect(hasShowcaseGrant()).toBe(false);
  });
});

describe("codeFromSearch", () => {
  it("reads either parameter name", () => {
    expect(codeFromSearch("?key=ABC")).toBe("ABC");
    expect(codeFromSearch("?code=ABC")).toBe("ABC");
  });

  it("trims and rejects empties", () => {
    expect(codeFromSearch("?key=%20ABC%20")).toBe("ABC");
    expect(codeFromSearch("?key=")).toBeNull();
    expect(codeFromSearch("")).toBeNull();
    expect(codeFromSearch("?other=1")).toBeNull();
  });
});

describe("verifyShowcaseCode", () => {
  // Real fetch Responses expose both json() and text(); the mock has to
  // mirror that so demoAccess's text()-then-JSON.parse approach (needed to
  // tell a malformed body apart from a legitimately empty one) works exactly
  // like it does against a real server.
  const mockFetch = (init: { ok: boolean; status?: number; body?: unknown; rawText?: string }) =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: init.ok,
        status: init.status ?? (init.ok ? 200 : 400),
        json: async () => init.body,
        text: async () => init.rawText ?? (init.body === undefined ? "" : JSON.stringify(init.body)),
      } as Response),
    );

  afterEach(() => vi.unstubAllGlobals());

  it("stores the grant on success", async () => {
    mockFetch({ ok: true, body: { ok: true, label: "Acme" } });
    const result = await verifyShowcaseCode("ALPHA");
    expect(result).toEqual({ ok: true, grant: { label: "Acme" } });
    expect(readShowcaseGrant()).toEqual({ label: "Acme" });
  });

  it("doesn't grant access on a 2xx response that isn't the real success payload", async () => {
    // e.g. a proxy/cache serving a stale or unrelated 200 body.
    mockFetch({ ok: true, rawText: "" });
    const result = await verifyShowcaseCode("ALPHA");
    expect(result.ok).toBe(false);
    expect(hasShowcaseGrant()).toBe(false);
  });

  it("doesn't grant access on a 2xx response with a malformed body", async () => {
    mockFetch({ ok: true, rawText: "<html>cached page</html>" });
    const result = await verifyShowcaseCode("ALPHA");
    expect(result.ok).toBe(false);
    expect(hasShowcaseGrant()).toBe(false);
  });

  it("surfaces the server's message and grants nothing on rejection", async () => {
    mockFetch({ ok: false, body: { message: "That code isn't valid." } });
    const result = await verifyShowcaseCode("NOPE");
    expect(result).toEqual({ ok: false, message: "That code isn't valid." });
    expect(hasShowcaseGrant()).toBe(false);
  });

  it("falls back to the generic rejection message when the server sends no body at all", async () => {
    mockFetch({ ok: false, rawText: "" });
    const result = await verifyShowcaseCode("NOPE");
    expect(result).toEqual({ ok: false, message: "That code isn't valid." });
  });

  it("doesn't blame the code when a non-JSON body (e.g. a gateway error page) can't be parsed", async () => {
    mockFetch({ ok: false, status: 502, rawText: "<html>502 Bad Gateway</html>" });
    const result = await verifyShowcaseCode("ALPHA");
    expect(result).toEqual({ ok: false, message: "Something went wrong (502). Try again." });
    expect(result).not.toEqual(expect.objectContaining({ message: "That code isn't valid." }));
  });

  it("rejects an empty code without calling the server", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await verifyShowcaseCode("   ");
    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("explains a network failure rather than reading as a bad code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await verifyShowcaseCode("ALPHA");
    expect(result.ok).toBe(false);
    expect(hasShowcaseGrant()).toBe(false);
  });
});
