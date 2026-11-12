// Receives error reports from the web app (src/lib/errorReporting.ts) and
// records them in public.cron_alerts under job "web-client", next to
// scheduled-job failures. .github/workflows/monitor.yml checks that table
// daily and fails (GitHub emails the owner) when anything new is there.
//
// Public by design: a crash can happen before sign-in, on the teaser or a
// share link. It calls no paid API, so it doesn't go through requireAccess;
// abuse is bounded instead by field limits, a per-message dedupe window and
// a global hourly cap (see _shared/clientErrorReport.ts). Always answers 202
// for a well-formed report, stored or not, so a failing browser never retries.
//
// Deploy: supabase functions deploy client-error-report \
//   --project-ref qeopoiumlnzqwaqzwqcj --no-verify-jwt --use-api
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import {
  CLIENT_ERROR_DEDUPE_MS,
  CLIENT_ERROR_HOURLY_CAP,
  CLIENT_ERROR_JOB,
  MAX_BODY_BYTES,
  parseClientErrorReport,
} from "../_shared/clientErrorReport.ts";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...ACCESS_CORS_HEADERS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: ACCESS_CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "Too large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const row = parseClientErrorReport(body);
  if (!row) return json({ error: "Missing message" }, 400);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const now = Date.now();
    const hourAgo = new Date(now - 3_600_000).toISOString();
    const { count: recent, error: countErr } = await db
      .from("cron_alerts")
      .select("id", { count: "exact", head: true })
      .eq("job", CLIENT_ERROR_JOB)
      .gte("received_at", hourAgo);
    if (countErr) throw countErr;
    if ((recent ?? 0) >= CLIENT_ERROR_HOURLY_CAP) return json({ stored: false, reason: "cap" }, 202);

    const { count: dupes, error: dupeErr } = await db
      .from("cron_alerts")
      .select("id", { count: "exact", head: true })
      .eq("job", CLIENT_ERROR_JOB)
      .eq("message", row.message)
      .gte("received_at", new Date(now - CLIENT_ERROR_DEDUPE_MS).toISOString());
    if (dupeErr) throw dupeErr;
    if ((dupes ?? 0) > 0) return json({ stored: false, reason: "duplicate" }, 202);

    const { error } = await db.from("cron_alerts").insert(row);
    if (error) throw error;
    console.log(`client-error-report: recorded ${row.message}`);
    return json({ stored: true }, 202);
  } catch (err) {
    console.error("client-error-report: could not record report:", err, row.message);
    return json({ stored: false, reason: "db" }, 202);
  }
});
