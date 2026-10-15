// Where the visitor came from before they reached the app.
//
// The marketing site and the app are separate artifacts, so a click between
// them is a full document load and the app has no in-process knowledge of the
// page that sent it. document.referrer is unreliable (stripped by some privacy
// settings, and useless for distinguishing two links on the *same* marketing
// page), so the site writes this record to sessionStorage on its way out —
// same origin, same tab, so the app can read it back.
//
// Kept deliberately small: the point is to let onboarding say something
// relevant to why the visitor came, not to build an analytics pipeline.
export interface Arrival {
  /** Which surface on the marketing site sent them, e.g. "hero" or "pricing". */
  from?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** Epoch ms, so a stale record from an earlier visit can be ignored. */
  at?: number;
}

const KEY = "legalos_arrival";
/** Beyond this the record is from an earlier journey and says nothing useful. */
const MAX_AGE_MS = 60 * 60 * 1000;

export function readArrival(): Arrival | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Arrival;
    if (typeof parsed !== "object" || parsed === null) return null;
    if (parsed.at && Date.now() - parsed.at > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    // Malformed or unavailable storage is not worth failing a page render over.
    return null;
  }
}
