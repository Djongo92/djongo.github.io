import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFindPlaceUrl, fetchGbpSignalWithKey } from "./googlePlacesFetcher";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// A minimal mock fetch that returns preset responses in order.
function makeFetch(...responses: Response[]): typeof fetch {
  let i = 0;
  return vi.fn(async () => responses[i++]) as unknown as typeof fetch;
}

const TEST_KEY = "test-api-key";
const FIRM_NAME = "Wolf Theiss Rechtsanwälte";
const FIRM_DOMAIN = "wolftiss.rs";
const PLACE_ID = "ChIJplaceid123";

const OK_FIND = { status: "OK", candidates: [{ place_id: PLACE_ID, name: FIRM_NAME }] };
const ZERO_FIND = { status: "ZERO_RESULTS" };
const DENIED_FIND = { status: "REQUEST_DENIED" };
const INVALID_FIND = { status: "INVALID_REQUEST" };

const OK_DETAILS = {
  status: "OK",
  result: {
    business_status: "OPERATIONAL",
    rating: 4.8,
    user_ratings_total: 30,
    website: `https://${FIRM_DOMAIN}`,
    formatted_phone_number: "+381 11 123 456",
    opening_hours: { periods: [{}] },
    photos: [{}],
  },
};

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

describe("buildFindPlaceUrl", () => {
  it("uses a valid coordinate-based locationbias (not country:xx)", () => {
    const url = buildFindPlaceUrl(FIRM_NAME, TEST_KEY);
    const parsed = new URL(url);
    const bias = parsed.searchParams.get("locationbias") ?? "";
    // Must be one of: ipbias | point:... | circle:... | rectangle:...
    expect(bias).toMatch(/^(ipbias|point:|circle:|rectangle:)/);
    // Must NOT use the unsupported country: format
    expect(bias).not.toMatch(/^country:/);
  });

  it("includes the firm name and API key", () => {
    const url = buildFindPlaceUrl(FIRM_NAME, TEST_KEY);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("input")).toBe(FIRM_NAME);
    expect(parsed.searchParams.get("key")).toBe(TEST_KEY);
    expect(parsed.searchParams.get("inputtype")).toBe("textquery");
  });

  it("targets the findplacefromtext endpoint", () => {
    const url = buildFindPlaceUrl(FIRM_NAME, TEST_KEY);
    expect(url).toContain("/place/findplacefromtext/json");
  });
});

// ---------------------------------------------------------------------------
// Response classification
// ---------------------------------------------------------------------------

describe("fetchGbpSignalWithKey — ZERO_RESULTS", () => {
  it("returns is_unverifiable=true and no details when no listing is found", async () => {
    const fetchFn = makeFetch(makeJsonResponse(ZERO_FIND));
    const result = await fetchGbpSignalWithKey(FIRM_NAME, FIRM_DOMAIN, TEST_KEY, fetchFn);
    expect(result.is_unverifiable).toBe(true);
    expect(result.details?.placeId).toBeNull();
  });
});

describe("fetchGbpSignalWithKey — API errors", () => {
  it("returns is_unverifiable=true for REQUEST_DENIED (not treated as no listing)", async () => {
    const fetchFn = makeFetch(makeJsonResponse(DENIED_FIND));
    const result = await fetchGbpSignalWithKey(FIRM_NAME, FIRM_DOMAIN, TEST_KEY, fetchFn);
    expect(result.is_unverifiable).toBe(true);
    // Raw should contain error info, not a ZERO_RESULTS marker
    expect(result.raw).not.toMatchObject({ status: "ZERO_RESULTS" });
  });

  it("returns is_unverifiable=true for INVALID_REQUEST", async () => {
    const fetchFn = makeFetch(makeJsonResponse(INVALID_FIND));
    const result = await fetchGbpSignalWithKey(FIRM_NAME, FIRM_DOMAIN, TEST_KEY, fetchFn);
    expect(result.is_unverifiable).toBe(true);
  });

  it("returns is_unverifiable=true when findplacefromtext returns HTTP 403", async () => {
    const fetchFn = makeFetch(makeJsonResponse({}, 403));
    const result = await fetchGbpSignalWithKey(FIRM_NAME, FIRM_DOMAIN, TEST_KEY, fetchFn);
    expect(result.is_unverifiable).toBe(true);
  });
});

describe("fetchGbpSignalWithKey — success path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns parsed GbpDetails on a full OK response", async () => {
    const fetchFn = makeFetch(
      makeJsonResponse(OK_FIND),
      makeJsonResponse(OK_DETAILS),
    );
    const result = await fetchGbpSignalWithKey(FIRM_NAME, FIRM_DOMAIN, TEST_KEY, fetchFn);
    expect(result.is_unverifiable).toBe(false);
    expect(result.details?.placeId).toBe(PLACE_ID);
    expect(result.details?.businessStatus).toBe("OPERATIONAL");
    expect(result.details?.rating).toBe(4.8);
    expect(result.details?.reviewCount).toBe(30);
    expect(result.details?.hasWebsite).toBe(true);
    expect(result.details?.hasPhone).toBe(true);
    expect(result.details?.hasHours).toBe(true);
    expect(result.details?.hasPhotos).toBe(true);
  });

  it("calls findplacefromtext with the correct locationbias before fetching details", async () => {
    const fetchFn = makeFetch(
      makeJsonResponse(OK_FIND),
      makeJsonResponse(OK_DETAILS),
    ) as ReturnType<typeof vi.fn>;
    await fetchGbpSignalWithKey(FIRM_NAME, FIRM_DOMAIN, TEST_KEY, fetchFn);

    const firstUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = new URL(firstUrl);
    const bias = parsed.searchParams.get("locationbias") ?? "";
    expect(bias).toMatch(/^(circle|rectangle|point):/);
  });

  it("includes the place_id when calling place/details", async () => {
    const fetchFn = makeFetch(
      makeJsonResponse(OK_FIND),
      makeJsonResponse(OK_DETAILS),
    ) as ReturnType<typeof vi.fn>;
    await fetchGbpSignalWithKey(FIRM_NAME, FIRM_DOMAIN, TEST_KEY, fetchFn);

    const secondUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[1][0] as string;
    expect(secondUrl).toContain(`place_id=${PLACE_ID}`);
    expect(secondUrl).toContain("/place/details/json");
  });
});
