// Domain ownership verification, required before an audit can be published
// to the public ranking (see visibility-audit-publish). Anyone can run an
// audit against any domain; without this, the public ranking would have no
// guarantee the publisher actually controls the domain they're claiming a
// score for. Uses a DNS TXT challenge rather than email — this project has
// no SMTP configured (Batch A note) — checked via Cloudflare's DNS-over-
// HTTPS API (no API key needed, a plain fetch from the edge function).
//
// action "start": generates a token, stores it on the audit row, returns
// instructions for the TXT record to add.
// action "check": looks up the domain's TXT records; if the challenge
// value is present, stamps verified_at.
//
// Ownership is always re-verified server-side against client_id (resolved
// from a real access token when present, same as every other audit
// endpoint) — a client can never verify or publish someone else's audit.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { normalizeUrl } from "../_shared/safeFetch.ts";
import { randomToken, challengeRecordValue, parseTxtAnswers, matchesChallenge } from "../_shared/domainVerification.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

async function lookupTxtRecords(domain: string): Promise<string[]> {
  const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=TXT`, {
    headers: { Accept: "application/dns-json" },
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return parseTxtAnswers(data?.Answer ?? []);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, auditId, action } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!auditId || typeof auditId !== "string") {
      return new Response(JSON.stringify({ error: "auditId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action !== "start" && action !== "check") {
      return new Response(JSON.stringify({ error: "action must be 'start' or 'check'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    const { data: row, error: rowError } = await serviceClient
      .from("market_visibility_audits")
      .select("id, audited_domain, verification_token, verified_at")
      .eq("id", auditId)
      .eq("client_id", clientId) // ownership check — never trust a bare id from the client
      .maybeSingle();

    if (rowError) {
      console.error("visibility-audit-verify-domain lookup error:", rowError);
      return new Response(JSON.stringify({ error: "Couldn't load the audit" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!row) {
      return new Response(JSON.stringify({ error: "Audit not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "start") {
      if (row.verified_at) {
        return new Response(JSON.stringify({ verified: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = row.verification_token || randomToken();
      if (!row.verification_token) {
        await serviceClient.from("market_visibility_audits").update({ verification_token: token }).eq("id", auditId);
      }
      return new Response(JSON.stringify({
        verified: false,
        recordType: "TXT",
        recordHost: row.audited_domain,
        recordValue: challengeRecordValue(token),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action === "check"
    if (row.verified_at) {
      return new Response(JSON.stringify({ verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!row.verification_token) {
      return new Response(JSON.stringify({ error: "Start verification first" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hostname = new URL(normalizeUrl(row.audited_domain)).hostname;
    const records = await lookupTxtRecords(hostname);
    const found = matchesChallenge(records, row.verification_token);

    if (!found) {
      return new Response(JSON.stringify({ verified: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await serviceClient
      .from("market_visibility_audits")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", auditId);
    if (updateError) console.error("visibility-audit-verify-domain update error:", updateError);

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-verify-domain error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
