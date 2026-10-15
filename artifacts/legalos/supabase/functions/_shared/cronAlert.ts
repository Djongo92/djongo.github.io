// Task #219 — shared failure alerting for cron edge functions. Every
// scheduled job used to report failure the same invisible way: HTTP 500 into
// cron.job_run_details plus console.error that nobody watches. This module is
// the single alerting path all cron functions share:
//
//   1. Wrap the Deno.serve handler in `withCronAlert("job-name", handler)` —
//      any thrown error or 5xx response on a genuine cron invocation (correct
//      x-cron-secret) sends exactly ONE alert naming the job and the failure.
//   2. For failures that don't surface as a 5xx (background sweeps, per-row
//      partial failures aggregated into a 200), call `sendCronAlert(...)`
//      directly ONCE per run with the aggregate.
//
// Delivery is a webhook POST to CRON_ALERT_WEBHOOK_URL (a Supabase function
// secret: `supabase secrets set CRON_ALERT_WEBHOOK_URL=...`). The payload
// carries a Slack/Discord-compatible `text`/`content` field plus structured
// `job`/`message`/`detail` fields for generic receivers. If the secret is
// unset the alert is loudly logged instead — alerting must never be the
// thing that breaks a job, so nothing in here ever throws.

const WEBHOOK_ENV = "CRON_ALERT_WEBHOOK_URL";
const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_DETAIL_CHARS = 1_500;

export interface CronFailure {
  /** One-line human summary, e.g. `HTTP 500` or `3 of 12 reruns failed`. */
  message: string;
  /** Optional structured context (response body preview, error, counts). */
  detail?: unknown;
}

export interface CronAlertPayload {
  text: string; // Slack-compatible
  content: string; // Discord-compatible (same text)
  job: string;
  message: string;
  detail: string | null;
}

export function truncateDetail(detail: unknown): string | null {
  if (detail === undefined || detail === null) return null;
  let s: string;
  if (typeof detail === "string") s = detail;
  else {
    try {
      s = JSON.stringify(detail);
    } catch {
      s = String(detail);
    }
  }
  if (s.length > MAX_DETAIL_CHARS) s = s.slice(0, MAX_DETAIL_CHARS) + "… [truncated]";
  return s;
}

export function buildCronAlertPayload(job: string, failure: CronFailure): CronAlertPayload {
  const detail = truncateDetail(failure.detail);
  const text = `🔴 Scheduled job "${job}" failed: ${failure.message}` +
    (detail ? `\n${detail}` : "");
  return { text, content: text, job, message: failure.message, detail };
}

export type AlertResult = { delivered: boolean; reason?: string };

/**
 * Sends one alert for a failing cron run. Never throws — a broken alerting
 * channel must not take the job down with it. When CRON_ALERT_WEBHOOK_URL is
 * not configured the alert is logged loudly and reported as undelivered.
 */
export async function sendCronAlert(
  job: string,
  failure: CronFailure,
  fetchImpl: typeof fetch = fetch,
): Promise<AlertResult> {
  const payload = buildCronAlertPayload(job, failure);
  const url = Deno.env.get(WEBHOOK_ENV);
  if (!url) {
    console.error(
      `[cron-alert] ${WEBHOOK_ENV} is not configured — alert NOT delivered. ` +
        `Set it with: supabase secrets set ${WEBHOOK_ENV}=<webhook url>. Alert was: ${payload.text}`,
    );
    return { delivered: false, reason: "unconfigured" };
  }
  // Include x-cron-secret when posting to the internal inbox so it can
  // authenticate the source. External receivers (Slack, Discord, etc.) ignore
  // unknown headers — this is harmless for them.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeaders: Record<string, string> = cronSecret ? { "x-cron-secret": cronSecret } : {};
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[cron-alert] webhook returned HTTP ${res.status} for job "${job}"`);
      return { delivered: false, reason: `http ${res.status}` };
    }
    return { delivered: true };
  } catch (err) {
    console.error(`[cron-alert] webhook delivery failed for job "${job}":`, err);
    return { delivered: false, reason: "fetch failed" };
  }
}

type Handler = (req: Request) => Promise<Response> | Response;

/** True when the request is a genuine scheduled invocation (correct secret). */
export function isCronRequest(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  return Boolean(cronSecret) && req.headers.get("x-cron-secret") === cronSecret;
}

async function bodyPreview(res: Response): Promise<string | null> {
  try {
    return truncateDetail(await res.clone().text());
  } catch {
    return null;
  }
}

/**
 * Wraps a Deno.serve handler so a failing CRON run (thrown error or 5xx
 * response on a request carrying the correct x-cron-secret) sends exactly one
 * alert. User-facing traffic through the same function never alerts — cron
 * alerting is for scheduled runs, not a general error tracker.
 */
export function withCronAlert(
  job: string,
  handler: Handler,
  send: typeof sendCronAlert = sendCronAlert,
): Handler {
  return async (req: Request): Promise<Response> => {
    const cronRun = isCronRequest(req);
    let res: Response;
    try {
      res = await handler(req);
    } catch (err) {
      if (cronRun) {
        await send(job, {
          message: err instanceof Error ? err.message : String(err),
          detail: err instanceof Error ? err.stack : undefined,
        });
      }
      throw err;
    }
    if (cronRun && res.status >= 500) {
      await send(job, { message: `HTTP ${res.status}`, detail: await bodyPreview(res) });
    }
    return res;
  };
}
