// Pure validation + scrubbing for browser error reports (client-error-report).
// No Deno globals, so the vitest suite covers it directly.
//
// Reports land in public.cron_alerts under job CLIENT_ERROR_JOB, the same
// inbox scheduled-job failures use, so one daily check (tests/cron-alert-check.mjs,
// run by .github/workflows/monitor.yml) surfaces both. Anyone can POST here,
// so everything is bounded: field lengths, a per-message dedupe window and an
// hourly cap on new rows (enforced by the function).

export const CLIENT_ERROR_JOB = "web-client";
/** At most this many new client-error rows per hour, across all callers. */
export const CLIENT_ERROR_HOURLY_CAP = 30;
/** The same message is recorded at most once per this window. */
export const CLIENT_ERROR_DEDUPE_MS = 6 * 60 * 60 * 1000;
/** Bodies larger than this are rejected before parsing. */
export const MAX_BODY_BYTES = 8_192;

const MAX_MESSAGE = 300;
const MAX_STACK = 1_200;
const MAX_ROUTE = 200;
const MAX_RELEASE = 64;

const SOURCES = ["boundary", "error", "unhandledrejection"] as const;
export type ClientErrorSource = (typeof SOURCES)[number];

export interface ClientErrorRow {
  job: typeof CLIENT_ERROR_JOB;
  message: string;
  detail: string;
}

/**
 * Removes things that could identify a person or carry a credential before
 * the text is stored: email addresses, query strings and fragments of URLs
 * (share/join links carry tokens there), and long opaque token-like runs.
 */
export function scrub(text: string): string {
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    // Stops at ":" so a stack frame's ":line:col" after the URL survives.
    .replace(/(https?:\/\/[^\s?#"'()]+)[?#][^\s"'():]*/g, "$1")
    .replace(/\b(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{32,}\b/g, "[token]");
}

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "…" : s);

const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? clip(scrub(v.trim()), max) : null;

/**
 * Turns an untrusted request body into the row to store, or null when the
 * body isn't a usable report. Route is reduced to a pathname: ids in paths
 * (share links, join tokens) are replaced so they never reach the table.
 */
export function parseClientErrorReport(body: unknown): ClientErrorRow | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const message = str(b.message, MAX_MESSAGE);
  if (!message) return null;
  const source: ClientErrorSource = SOURCES.includes(b.source as ClientErrorSource)
    ? (b.source as ClientErrorSource)
    : "error";
  const route = typeof b.route === "string"
    ? clip(
      b.route.split(/[?#]/)[0].replace(/\/(share|join|partner-review|roast-share)\/[^/]+/g, "/$1/:id"),
      MAX_ROUTE,
    )
    : null;
  const detail = {
    source,
    route,
    release: str(b.release, MAX_RELEASE),
    stack: str(b.stack, MAX_STACK),
  };
  return { job: CLIENT_ERROR_JOB, message: `[${source}] ${message}`, detail: JSON.stringify(detail) };
}
