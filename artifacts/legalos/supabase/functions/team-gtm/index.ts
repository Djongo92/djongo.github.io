// Team-only go-to-market plan. Two actions on one endpoint:
//   login  { password }  -> short-lived team token (TEAM_PASSWORD secret)
//   plan   { token }     -> the plan document from the gtm_plan table
// Authorization is entirely local: it does NOT use requireAccess, because
// that grants any signed-in customer or demo visitor, and this content (real
// firms as sales targets, pricing strategy) must reach the team only. The
// plan itself lives only in the database, never in the repository.
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { clientIpFrom, checkPublicFormRateLimit } from "../_shared/rateLimit.ts";
import { signTeamToken, verifyTeamToken, safePasswordEqual, TEAM_TOKEN_TTL_MS } from "../_shared/teamToken.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...ACCESS_CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: ACCESS_CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("ACCESS_TOKEN_SECRET");
  const teamPassword = Deno.env.get("TEAM_PASSWORD");
  if (!secret || !teamPassword) return json({ error: "Team access isn't configured." }, 503);

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const body = await req.json().catch(() => null) as { action?: unknown; password?: unknown; token?: unknown } | null;

  if (body?.action === "login") {
    // Every attempt counts, right or wrong, so a lucky last guess after a
    // burst of wrong ones still lands in the same window.
    const { allowed } = await checkPublicFormRateLimit(serviceClient, "team-gtm", clientIpFrom(req), 8, 10 * 60_000);
    if (!allowed) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);
    const password = typeof body.password === "string" ? body.password : "";
    if (!password || password.length > 200) return json({ error: "Password required." }, 400);
    if (!(await safePasswordEqual(password, teamPassword))) {
      await new Promise((r) => setTimeout(r, 400));
      return json({ error: "Incorrect password." }, 401);
    }
    return json({ token: await signTeamToken(secret), ttlMs: TEAM_TOKEN_TTL_MS });
  }

  if (body?.action === "plan") {
    if (!(await verifyTeamToken(secret, body.token))) return json({ error: "Sign in again." }, 401);
    const { data, error } = await serviceClient.from("gtm_plan").select("content, updated_at").eq("id", "current").maybeSingle();
    if (error) {
      console.error("team-gtm read error:", error.message);
      return json({ error: "Couldn't load the plan." }, 500);
    }
    if (!data) return json({ error: "No plan has been published yet." }, 404);
    return json({ plan: data.content, updatedAt: data.updated_at });
  }

  return json({ error: "Unknown action." }, 400);
});
