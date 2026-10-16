// Google Places API fetcher for Google Business Profile data.
// Two-step per firm: findplacefromtext → place/details.
// Returns structured GbpDetails that calculateGbpScore() can score.
//
// GOOGLE_PLACES_API_KEY must be set in Supabase secrets — if absent,
// this module returns is_unverifiable=false, score=0 (missing, not penalised).
//
// Response classification:
//   ZERO_RESULTS      — no listing found; is_unverifiable=true, no penalty
//   REQUEST_DENIED /
//   INVALID_REQUEST   — API configuration error; throws so caller marks unverifiable
//   OK                — success; parse and score the listing
//
// Domain cross-reference: we send the firm name as the search query
// (more reliable than domain search for Serbian firms that may not have
// the domain indexed). If the returned listing's website field does NOT
// share a hostname with the firm's known domain, we still use the result
// but log a warning — name uniqueness among Serbian law firms is high
// enough that false positives are rare.
import type { GbpDetails } from "./gbpScoreFormula.ts";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const DETAIL_FIELDS = "rating,user_ratings_total,business_status,website,formatted_phone_number,opening_hours,photos";

// Serbia bounding box (valid 'circle' location bias for Find Place endpoint).
// Centered on Belgrade with a 400 km radius — covers all of Serbia and
// close neighbours, sufficient to prefer Serbian results without excluding
// legitimate multi-office firms.
const SERBIA_LOCATION_BIAS = "circle:400000@44.8,20.5";

export interface GbpFetchResult {
  details: GbpDetails | null;
  /** True when the API call itself failed (timeout, 403, etc.) OR when no
   *  listing was found — distinct from "listing found but low-scoring". */
  is_unverifiable: boolean;
  raw: Record<string, unknown>;
}

// Exported for testing: builds the Find Place URL so tests can assert on
// the request structure without making a live API call.
export function buildFindPlaceUrl(firmName: string, apiKey: string): string {
  const params = new URLSearchParams({
    input: firmName,
    inputtype: "textquery",
    fields: "place_id,name",
    locationbias: SERBIA_LOCATION_BIAS,
    key: apiKey,
  });
  return `${PLACES_BASE}/findplacefromtext/json?${params}`;
}

async function findPlaceId(
  firmName: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const url = buildFindPlaceUrl(firmName, apiKey);
  const resp = await fetchFn(url, { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error(`findplacefromtext HTTP ${resp.status}`);
  const data = await resp.json() as { status: string; candidates?: { place_id: string }[] };

  if (data.status === "OK") {
    return data.candidates?.[0]?.place_id ?? null;
  }
  if (data.status === "ZERO_RESULTS") {
    return null; // Genuine no-listing, caller handles as unverifiable
  }
  // REQUEST_DENIED, INVALID_REQUEST, OVER_QUERY_LIMIT, UNKNOWN_ERROR:
  // these are API-level failures distinct from "no listing" — throw so the
  // caller marks the result as unverifiable and logs the problem.
  throw new Error(`findplacefromtext status: ${data.status}`);
}

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ place_id: placeId, fields: DETAIL_FIELDS, key: apiKey });
  const resp = await fetchFn(`${PLACES_BASE}/details/json?${params}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) throw new Error(`place/details HTTP ${resp.status}`);
  const data = await resp.json() as { status: string; result?: Record<string, unknown> };
  if (data.status !== "OK") throw new Error(`place/details status: ${data.status}`);
  return data.result ?? {};
}

/** Checks whether a Places listing website and our known firm domain overlap. */
function domainsOverlap(listingWebsite: string | null | undefined, firmDomain: string): boolean {
  if (!listingWebsite || !firmDomain) return false;
  const stripHost = (u: string) =>
    u.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const a = stripHost(listingWebsite);
  const b = stripHost(firmDomain);
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Fetches GBP data for a firm from Google Places.
 * @param firmName   The canonical firm name (used as the search query).
 * @param firmDomain The firm's known domain (used for cross-reference logging).
 * @param _fetchFn   Injected fetch function — use only in tests.
 */
export async function fetchGbpSignal(
  firmName: string,
  firmDomain: string,
  _fetchFn?: typeof fetch,
): Promise<GbpFetchResult> {
  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!apiKey) {
    console.warn("[googlePlacesFetcher] GOOGLE_PLACES_API_KEY not configured — skipping GBP fetch");
    return { details: null, is_unverifiable: false, raw: {} };
  }
  return fetchGbpSignalWithKey(firmName, firmDomain, apiKey, _fetchFn);
}

/**
 * Core implementation — accepts an explicit API key so it can be called from
 * tests without the Deno.env dependency.
 */
export async function fetchGbpSignalWithKey(
  firmName: string,
  firmDomain: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<GbpFetchResult> {
  try {
    const placeId = await findPlaceId(firmName, apiKey, fetchFn);
    if (!placeId) {
      return {
        details: { placeId: null },
        is_unverifiable: true,
        raw: { searchQuery: firmName, status: "ZERO_RESULTS" },
      };
    }

    const result = await fetchPlaceDetails(placeId, apiKey, fetchFn);
    const listingWebsite = result.website as string | null | undefined;

    if (!domainsOverlap(listingWebsite, firmDomain)) {
      console.warn(
        `[googlePlacesFetcher] domain mismatch for "${firmName}": listed=${listingWebsite}, known=${firmDomain}`,
      );
    }

    const openingHours = result.opening_hours as { periods?: unknown[] } | null | undefined;
    const photos = result.photos as unknown[] | null | undefined;

    const details: GbpDetails = {
      placeId,
      businessStatus: result.business_status as string | null ?? null,
      rating: result.rating as number | null ?? null,
      reviewCount: result.user_ratings_total as number | null ?? null,
      hasWebsite: typeof listingWebsite === "string" && listingWebsite.length > 0,
      hasPhone:
        typeof result.formatted_phone_number === "string" &&
        (result.formatted_phone_number as string).length > 0,
      hasHours: Array.isArray(openingHours?.periods) && openingHours!.periods!.length > 0,
      hasPhotos: Array.isArray(photos) && photos.length > 0,
    };

    return {
      details,
      is_unverifiable: false,
      raw: {
        placeId,
        businessStatus: details.businessStatus,
        rating: details.rating,
        reviewCount: details.reviewCount,
        listingWebsite,
        firmDomain,
        hasWebsite: details.hasWebsite,
        hasPhone: details.hasPhone,
        hasHours: details.hasHours,
        hasPhotos: details.hasPhotos,
      },
    };
  } catch (e) {
    console.error(`[googlePlacesFetcher] fetch failed for "${firmName}":`, e);
    return {
      details: null,
      is_unverifiable: true,
      raw: { error: e instanceof Error ? e.message : String(e) },
    };
  }
}
