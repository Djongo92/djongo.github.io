// Task #219 — internal webhook receiver for cron failure alerts. The six
// scheduled edge functions all POST to CRON_ALERT_WEBHOOK_URL (a Supabase
// function secret) when a run fails; that secret is set to this function's
// own URL so alerts land durably in public.cron_alerts — no external service
// required. The payload is the Slack/Discord-compatible JSON emitted by
// sendCronAlert in _shared/cronAlert.ts:
//   { job, message, detail, text, content }
//
// Deploy: npx -y supabase@latest functions deploy cron-alert-inbox \
//   --project-ref qeopoiumlnzqwaqzwqcj --no-verify-jwt --use-api
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RETENTION_DAYS = 90;

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  // Validate the shared cron secret so arbitrary callers cannot forge alert
  // records and obscure operational signal. sendCronAlert in _shared/cronAlert.ts
  // always includes x-cron-secret in its POST request.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const job = typeof payload.job === "string" ? payload.job : null;
  const message = typeof payload.message === "string" ? payload.message : null;
  if (!job || !message) return json({ error: "Missing job or message" }, 400);

  const detail =
    typeof payload.detail === "string"
      ? payload.detail
      : payload.detail != null
        ? JSON.stringify(payload.detail)
        : null;

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await serviceClient.from("cron_alerts").insert({ job, message, detail });
  if (error) {
    console.error("cron-alert-inbox: insert failed:", error);
    return json({ error: "insert failed" }, 500);
  }

  // Prune rows older than RETENTION_DAYS in the background — keeps the
  // table from growing indefinitely at current alert volumes without
  // needing a separate cleanup job.
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  serviceClient
    .from("cron_alerts")
    .delete()
    .lt("received_at", cutoff)
    .then(({ error: e }) => {
      if (e) console.error("cron-alert-inbox: prune failed:", e);
    });

  console.log(`cron-alert-inbox: recorded alert from "${job}": ${message}`);
  return json({ ok: true });
});
