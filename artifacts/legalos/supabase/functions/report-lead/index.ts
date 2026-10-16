// Marketing-site report sign-up → report_leads. Same posture as
// demo-request: IP-rate-limited, honeypot-guarded, idempotent per email.
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { clientIpFrom, checkPublicFormRateLimit } from "../_shared/rateLimit.ts";
import { isHoneypotFilled, normalizeEmail } from "../_shared/showcaseCodes.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...ACCESS_CORS_HEADERS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: ACCESS_CORS_HEADERS });
  if (req.method !== "POST") return json({ message: "Method not allowed" }, 405);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (isHoneypotFilled(body)) return json({ ok: true }, 201);

  const email = normalizeEmail(body?.email);
  if (!email) return json({ message: "Enter a valid email address" }, 400);

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { allowed } = await checkPublicFormRateLimit(serviceClient, "report-lead", clientIpFrom(req), 5, 60_000);
  if (!allowed) return json({ message: "Too many requests. Please try again in a minute." }, 429);

  const { error } = await serviceClient
    .from("report_leads")
    .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
  if (error) {
    console.error("report-lead insert error:", error.message);
    return json({ message: "Failed to store email" }, 500);
  }
  return json({ ok: true }, 201);
});
