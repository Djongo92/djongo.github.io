// Sends uncaught browser errors to the client-error-report edge function,
// which records them in the ops alert inbox (public.cron_alerts). A daily
// GitHub workflow (monitor.yml) fails when anything new lands there, so a
// crash in production stops being invisible. No third-party service.
//
// Reporting must never make things worse: it is off outside production
// builds, capped per page load, deduplicated, filtered for browser noise and
// fully fire-and-forget (no retries, every failure swallowed).

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/client-error-report`;

/** Most reports one page load will send, however much goes wrong. */
export const MAX_REPORTS_PER_PAGE = 5;

export type ErrorSource = "boundary" | "error" | "unhandledrejection";

export interface ErrorReport {
  message: string;
  stack?: string;
  source: ErrorSource;
  route: string;
  release: string;
}

// Errors that say nothing about our code: browser quirks, extensions,
// cross-origin scripts with hidden details, and requests cut off by the
// user navigating away.
const IGNORED_MESSAGES = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Non-Error promise rejection captured/i,
  /^AbortError\b/i,
  /The (user|operation) aborted/i,
  /^Load failed$/i, // Safari: fetch cancelled by navigation
];
const EXTENSION_FRAMES = /(chrome|moz|safari(-web)?)-extension:\/\//;

export function shouldIgnore(message: string, stack?: string): boolean {
  if (!message.trim()) return true;
  if (IGNORED_MESSAGES.some((re) => re.test(message))) return true;
  return Boolean(stack && EXTENSION_FRAMES.test(stack));
}

/** Normalises anything thrown into a message + optional stack. */
export function describeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: `${err.name}: ${err.message}`, stack: err.stack };
  if (typeof err === "string") return { message: err };
  try {
    return { message: JSON.stringify(err) ?? String(err) };
  } catch {
    return { message: String(err) };
  }
}

const release = (): string =>
  typeof __APP_RELEASE__ !== "undefined" ? __APP_RELEASE__ : "unknown";

/**
 * Builds a reporter with its own per-page budget. Exported for tests; the
 * app uses the shared `reportError` below.
 */
export function createReporter(send: (report: ErrorReport) => void, enabled: boolean) {
  const seen = new Set<string>();
  return (err: unknown, source: ErrorSource): void => {
    if (!enabled || seen.size >= MAX_REPORTS_PER_PAGE) return;
    const { message, stack } = describeError(err);
    if (shouldIgnore(message, stack)) return;
    const key = `${source}|${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    try {
      send({ message, stack, source, route: window.location.pathname, release: release() });
    } catch {
      /* never let reporting throw */
    }
  };
}

function postReport(report: ErrorReport): void {
  void fetch(ENDPOINT, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", ...(SUPABASE_KEY ? { apikey: SUPABASE_KEY } : {}) },
    body: JSON.stringify(report),
  }).catch(() => {});
}

export const reportError = createReporter(
  postReport,
  import.meta.env.PROD && Boolean(SUPABASE_URL),
);

/** Installs the window-level handlers once, before the first render. */
export function installGlobalErrorReporting(): void {
  window.addEventListener("error", (e) => reportError(e.error ?? e.message, "error"));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason, "unhandledrejection"));
}
