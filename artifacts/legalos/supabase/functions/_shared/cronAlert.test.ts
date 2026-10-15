// Deno-native tests for the shared cron alerting path (task #219). Run via
// `pnpm --filter @workspace/uvid run test:deno` — this module reads Deno.env
// and is excluded from vitest (deno-test-gate memory: an excluded file
// without a runner is dead coverage).
import {
  buildCronAlertPayload,
  sendCronAlert,
  truncateDetail,
  withCronAlert,
  type CronFailure,
} from "./cronAlert.ts";

const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(msg);
};

Deno.test("buildCronAlertPayload names the job and failure in all fields", () => {
  const p = buildCronAlertPayload("press-outlets-health", {
    message: "HTTP 500",
    detail: { failed: ["ceelm"] },
  });
  assert(p.job === "press-outlets-health", "job field");
  assert(p.message === "HTTP 500", "message field");
  assert(p.text.includes('"press-outlets-health"'), "text names the job");
  assert(p.text.includes("HTTP 500"), "text carries the failure");
  assert(p.text.includes("ceelm"), "text carries the detail");
  assert(p.content === p.text, "discord-compatible content mirrors text");
});

Deno.test("truncateDetail caps oversized detail and handles null", () => {
  assert(truncateDetail(null) === null, "null detail");
  assert(truncateDetail(undefined) === null, "undefined detail");
  const long = truncateDetail("x".repeat(10_000))!;
  assert(long.length < 2_000, "truncated");
  assert(long.endsWith("[truncated]"), "marked as truncated");
});

Deno.test("sendCronAlert is undelivered-but-silent when webhook is unconfigured", async () => {
  Deno.env.delete("CRON_ALERT_WEBHOOK_URL");
  const result = await sendCronAlert("weekly-score-digest", { message: "boom" });
  assert(result.delivered === false, "not delivered");
  assert(result.reason === "unconfigured", "reason is unconfigured");
});

Deno.test("sendCronAlert posts the payload to the configured webhook", async () => {
  Deno.env.set("CRON_ALERT_WEBHOOK_URL", "https://hooks.example.invalid/alert");
  const calls: { url: string; body: string; headers: Record<string, string> }[] = [];
  const fakeFetch = ((url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: String(init?.body),
      headers: Object.fromEntries(Object.entries(init?.headers ?? {})),
    });
    return Promise.resolve(new Response("ok", { status: 200 }));
  }) as typeof fetch;
  const result = await sendCronAlert("network-insights", { message: "batch cut short" }, fakeFetch);
  Deno.env.delete("CRON_ALERT_WEBHOOK_URL");
  assert(result.delivered === true, "delivered");
  assert(calls.length === 1, "exactly one webhook POST");
  const payload = JSON.parse(calls[0].body);
  assert(payload.job === "network-insights", "payload job");
  assert(payload.text.includes("batch cut short"), "payload text");
});

Deno.test("sendCronAlert includes x-cron-secret header when CRON_SECRET is set", async () => {
  Deno.env.set("CRON_ALERT_WEBHOOK_URL", "https://hooks.example.invalid/alert");
  Deno.env.set("CRON_SECRET", "test-secret-123");
  const calls: { headers: Record<string, string> }[] = [];
  const fakeFetch = ((_, init?: RequestInit) => {
    calls.push({ headers: Object.fromEntries(Object.entries(init?.headers ?? {})) });
    return Promise.resolve(new Response("ok", { status: 200 }));
  }) as typeof fetch;
  await sendCronAlert("job", { message: "x" }, fakeFetch);
  Deno.env.delete("CRON_ALERT_WEBHOOK_URL");
  Deno.env.delete("CRON_SECRET");
  assert(calls.length === 1, "one POST");
  assert(calls[0].headers["x-cron-secret"] === "test-secret-123", "x-cron-secret header sent");
});

Deno.test("sendCronAlert never throws when the webhook itself fails", async () => {
  Deno.env.set("CRON_ALERT_WEBHOOK_URL", "https://hooks.example.invalid/alert");
  const fakeFetch = (() => Promise.reject(new Error("network down"))) as typeof fetch;
  const result = await sendCronAlert("job", { message: "x" }, fakeFetch);
  Deno.env.delete("CRON_ALERT_WEBHOOK_URL");
  assert(result.delivered === false, "undelivered");
});

function makeSpySender() {
  const alerts: { job: string; failure: CronFailure }[] = [];
  const send = (job: string, failure: CronFailure) => {
    alerts.push({ job, failure });
    return Promise.resolve({ delivered: true });
  };
  return { alerts, send: send as typeof sendCronAlert };
}

const cronReq = () =>
  new Request("https://x.invalid/", { headers: { "x-cron-secret": "s3cret" } });

Deno.test("withCronAlert sends exactly one alert for a 5xx cron run", async () => {
  Deno.env.set("CRON_SECRET", "s3cret");
  const { alerts, send } = makeSpySender();
  const handler = withCronAlert("press-outlets-health", () =>
    new Response(JSON.stringify({ failed: ["bizlife"] }), { status: 500 }), send);
  const res = await handler(cronReq());
  Deno.env.delete("CRON_SECRET");
  assert(res.status === 500, "response passes through");
  assert(alerts.length === 1, "exactly one alert");
  assert(alerts[0].job === "press-outlets-health", "alert names the job");
  assert(String(alerts[0].failure.detail).includes("bizlife"), "alert carries body preview");
});

Deno.test("withCronAlert alerts on a thrown error and rethrows", async () => {
  Deno.env.set("CRON_SECRET", "s3cret");
  const { alerts, send } = makeSpySender();
  const handler = withCronAlert("competitor-alerts-check", () => {
    throw new Error("db unreachable");
  }, send);
  let threw = false;
  try {
    await handler(cronReq());
  } catch {
    threw = true;
  }
  Deno.env.delete("CRON_SECRET");
  assert(threw, "rethrows");
  assert(alerts.length === 1, "one alert");
  assert(alerts[0].failure.message === "db unreachable", "failure message");
});

Deno.test("withCronAlert stays silent for successful runs and non-cron traffic", async () => {
  Deno.env.set("CRON_SECRET", "s3cret");
  const { alerts, send } = makeSpySender();
  const ok = withCronAlert("job", () => new Response("{}", { status: 200 }), send);
  await ok(cronReq());
  // 500 on user-facing (non-cron) traffic must not alert.
  const userErr = withCronAlert("job", () => new Response("{}", { status: 500 }), send);
  await userErr(new Request("https://x.invalid/"));
  // Wrong secret is not a cron run either.
  await userErr(new Request("https://x.invalid/", { headers: { "x-cron-secret": "wrong" } }));
  Deno.env.delete("CRON_SECRET");
  assert(alerts.length === 0, "no alerts for ok runs or non-cron traffic");
});
