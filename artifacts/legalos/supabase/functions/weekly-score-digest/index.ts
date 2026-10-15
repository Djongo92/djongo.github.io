// Task #165 — weekly "your score moved" digest. The Monday 07:00 UTC cron
// wrapper (migration 20260812000000) calls this with the Vault-backed
// x-cron-secret; for every firm with a real week-over-week movement in
// market_visibility_audit_history it files a notification (the bell in the
// app shell). No SMTP exists in this codebase — same posture as
// executive-report-monthly: the notification body IS the email copy, ready
// for a provider the day one is wired up.
//
// Deploy: npx -y supabase@latest functions deploy weekly-score-digest \
//   --project-ref <ref> --no-verify-jwt --use-api   (see functions/README.md)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { computeDigestMovements, digestNotification, type HistoryPoint } from "../_shared/scoreDigest.ts";
import { sendCronAlert, withCronAlert } from "../_shared/cronAlert.ts";

// 16 days of history guarantees a ≥6-day-old baseline exists for any firm
// audited at least twice in the window.
const HISTORY_WINDOW_DAYS = 16;

// Task #219: withCronAlert covers the hard-failure path (5xx); per-client
// claim failures are aggregated into ONE direct alert below.
Deno.serve(withCronAlert("weekly-score-digest", async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  // Cron-only surface — there is no user-facing entry mode (unlike
  // firm-signals-refresh, nothing here is triggered from the browser).
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const now = new Date();
  const since = new Date(now.getTime() - HISTORY_WINDOW_DAYS * 864e5).toISOString();
  const { data: rows, error } = await serviceClient
    .from("market_visibility_audit_history")
    .select("client_id,audited_domain,market,total_score,performance_score,social_score,seo_authority_score,thought_leadership_score,reputation_score,recorded_at")
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true });
  if (error) {
    console.error("weekly-score-digest history query failed:", error);
    return json({ error: "history query failed" }, 500);
  }

  const movements = computeDigestMovements((rows ?? []) as HistoryPoint[], now);

  // Durable exactly-once claim (code review, task #165): claim_score_digest
  // is a single transaction — it inserts the (client, latest-audit) claim
  // AND the notification together. A conflict returns false (already
  // digested, or a concurrent run won); a notification failure rolls the
  // claim back so the next run retries instead of losing the digest forever.
  let sent = 0;
  let skipped = 0;
  let claimFailures = 0;
  for (const m of movements) {
    const note = digestNotification(m);
    const { data: won, error: claimError } = await serviceClient.rpc("claim_score_digest", {
      p_client_id: m.clientId,
      p_latest_recorded_at: m.latestRecordedAt,
      p_title: note.title,
      p_body: note.body,
    });
    if (claimError) {
      console.error(`weekly-score-digest claim failed for client ${m.clientId}:`, claimError);
      claimFailures++;
      continue;
    }
    if (won === true) sent++;
    else skipped++;
  }

  // One aggregate alert per failing run (task #219) — never one per row.
  // The response stays 200: successful claims are durable, and the failed
  // ones retry naturally on the next scheduled run.
  if (claimFailures > 0) {
    await sendCronAlert("weekly-score-digest", {
      message: `${claimFailures} of ${movements.length} digest claim(s) failed`,
      detail: { sent, skipped, claimFailures },
    });
  }

  console.log(`weekly-score-digest: ${movements.length} qualifying movement(s), ${sent} notification(s) filed, ${skipped} already digested`);
  return json({ ok: true, movements: movements.length, sent, skipped, claimFailures });
}));
