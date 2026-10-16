// Checks an invitation code for the gated product showcase. Codes live only
// in the DEMO_ACCESS_CODES secret — the browser ships the question, never the
// answer. Fails closed: with no codes configured, nobody gets in.
//
// What the gate buys (and doesn't): the app is a client-side bundle, so a
// determined visitor can still poke at the UI; the gate keeps the showcase
// from being casually browsable or linkable, and lets each recipient's code
// be revoked on its own.
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { clientIpFrom, checkPublicFormRateLimit } from "../_shared/rateLimit.ts";
import { matchDemoCode, parseDemoCodes } from "../_shared/showcaseCodes.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...ACCESS_CORS_HEADERS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: ACCESS_CORS_HEADERS });
  if (req.method !== "POST") return json({ message: "Method not allowed" }, 405);

  const codes = parseDemoCodes(Deno.env.get("DEMO_ACCESS_CODES"));
  if (codes.length === 0) return json({ message: "The showcase isn't open right now." }, 503);

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  // Codes are short and human-typed, so guessing is the realistic attack.
  const { allowed } = await checkPublicFormRateLimit(serviceClient, "showcase-access", clientIpFrom(req), 10, 10 * 60_000);
  if (!allowed) return json({ message: "Too many attempts. Please try again shortly." }, 429);

  const body = await req.json().catch(() => null) as { code?: unknown } | null;
  const supplied = typeof body?.code === "string" ? body.code : "";
  if (!supplied.trim() || supplied.length > 200) return json({ message: "That code isn't valid." }, 401);

  const match = await matchDemoCode(codes, supplied);
  // Never log the attempted code: it is a credential, and a typo is often a near-miss of a real one.
  if (!match) return json({ message: "That code isn't valid." }, 401);

  return json(match.label ? { ok: true, label: match.label } : { ok: true });
});
