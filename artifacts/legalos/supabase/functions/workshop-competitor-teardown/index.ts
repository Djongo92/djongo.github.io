import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { safeFetch, normalizeUrl, SafeFetchError } from "../_shared/safeFetch.ts";
import { getCached, setCached } from "../_shared/cache.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
import { buildFirmContext } from "../_shared/firmContextProfile.ts";
import { firmContextLine, JURISDICTION_RULE } from "../_shared/firmContextLine.ts";
import { UNTRUSTED_COPY_RULE, wrapPageCopy } from "../_shared/siteCopyInput.ts";
import { resolveClientIdGuarded, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

const fetchSite = async (rawUrl: string) => {
  const url = normalizeUrl(rawUrl);
  try {
    const res = await safeFetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LegalGuidebook/1.0)" }, signal: AbortSignal.timeout(12000), });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").trim();
    const metaDescription = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] || "").trim();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 7000);
    return { url, title, metaDescription, text };
  } catch (e) {
    return { url, title: "", metaDescription: "", text: "", error: e instanceof Error ? e.message : "fetch failed" };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { competitorUrl, pastedContent, ourAngle, firmContext, peer, clientId: rawClientId, accessToken, activeFirmId } = await req.json();

    // Optional: a named peer picked from the visibility list, with its measured
    // category scores (% of potential) so the teardown is anchored to real data.
    const peerLine = (() => {
      if (!peer || typeof peer !== "object") return "";
      const name = typeof peer.name === "string" ? peer.name.slice(0, 120) : "";
      const scores = peer.scores && typeof peer.scores === "object" ? Object.entries(peer.scores as Record<string, unknown>) : [];
      const parts = scores
        .filter(([k, v]) => typeof k === "string" && k.length < 40 && typeof v === "number" && v >= 0 && v <= 100)
        .map(([k, v]) => `${k.slice(0, 40)} ${Math.round(v as number)}%`);
      if (!name || !parts.length) return "";
      return `The competitor is ${name}, a firm on the public visibility list. Their measured scores (% of potential): ${parts.join(", ")}. Anchor the teardown to this: where they outscore our firm, say what is visibly behind it on their site; where we outscore them, that is a lead to press.`;
    })();

    let firmContextBlock = "";
    let profileJurisdictions: string[] = [];
    let resolvedClientId: string | null = null;
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      resolvedClientId = await resolveClientIdGuarded(serviceClient, rawClientId, identityToken, typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined);
      if (resolvedClientId) firmContextBlock = await buildFirmContext(serviceClient, resolvedClientId).then((ctx) => { profileJurisdictions = ctx.jurisdictions; return ctx.block; });
    }

    let block = "";
    let meta: Record<string, unknown> = {};
    let cacheKey: string | null = null;
    // Fetched OR pasted competitor copy is adversary-controlled (task #154):
    // either way it enters the prompt only inside the untrusted boundary.
    if (pastedContent && pastedContent.trim().length > 50) {
      block = `Competitor content (pasted):\n${wrapPageCopy(pastedContent.slice(0, 8000))}`;
      meta = { source: "pasted" };
    } else if (competitorUrl) {
      // Cache scoped by verified firm — teardown output embeds the
      // requester's context profile, so a bare-URL key would leak one
      // firm's context-derived analysis to any other firm.
      const cached = await getCached("workshop-competitor-teardown", `${competitorUrl}::${resolvedClientId ?? "anon"}::${peerLine ? peerLine.length + peerLine.slice(0, 80) : ""}`);
      cacheKey = cached.key;
      if (cached.hit) {
        return new Response(JSON.stringify({ ...(cached.hit as object), cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const snap = await fetchSite(competitorUrl);
      if (snap.error || !snap.text) {
        return new Response(JSON.stringify({ error: `Couldn't load ${snap.url}. Paste the content instead.` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      block = `Competitor: ${snap.url}\n\n${wrapPageCopy(`Title: ${snap.title}\nMeta: ${snap.metaDescription}\n\n${snap.text}`)}`;
      meta = { source: "url", url: snap.url };
    } else {
      return new Response(JSON.stringify({ error: "Provide a competitor URL or paste their content." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = [
      ourAngle && `Our preferred angle / current position: ${ourAngle}`,
      peerLine,
      firmContextLine(firmContext, profileJurisdictions),
    ].filter(Boolean).join("\n");

    // Cross-tool awareness (task #121): the firm context block carries the
    // firm's own latest audit scores — findings must be framed relative to
    // the firm's position, not the competitor in isolation.
    const systemPrompt = `You are a senior law-firm positioning strategist. Tear down a single competitor: their actual positioning, the proof they lean on, the audience they're hunting, and — most importantly — the gaps and angles we can credibly own that they can't. Reference their actual copy. When the firm context below includes our firm's own audit scores, frame every finding relative to our position: where we already lead, say so plainly; where we trail, that gap is the angle to own.${firmContextBlock}
${JURISDICTION_RULE}
${UNTRUSTED_COPY_RULE}`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: `${ctx ? ctx + "\n\n" : ""}${block}`,
        tool: {
          name: "teardown",
          description: "Return a structured competitor teardown",
          input_schema: {
            type: "object",
            properties: {
              positioning: { type: "string", description: "1-sentence summary of how they position themselves." },
              idealClient: { type: "string", description: "Who they appear to be hunting." },
              proofTactics: { type: "array", items: { type: "string" }, description: "2-4 specific credibility moves they use." },
              strongMoves: { type: "array", items: { type: "string" }, description: "2-4 things they do well." },
              weakSpots: { type: "array", items: { type: "string" }, description: "2-4 weaknesses or generic plays." },
              gaps: { type: "array", items: { type: "string" }, description: "3-5 unclaimed positions we could own." },
              differentiationAngles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    angle: { type: "string" },
                    proofWeWouldNeed: { type: "string" },
                  },
                  required: ["angle", "proofWeWouldNeed"],
                },
                description: "3 sharp ways to differentiate, with the proof needed.",
              },
              ifIWereThem: { type: "string", description: "What this competitor would do next if they were smart — so we get there first." },
            },
            required: ["positioning", "idealClient", "proofTactics", "strongMoves", "weakSpots", "gaps", "differentiationAngles", "ifIWereThem"],
          },
        },
      });
    } catch (e) {
      if (e instanceof ClaudeApiError) {
        return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw e;
    }
    const out = { ...result, meta };
    if (cacheKey && competitorUrl) await setCached(cacheKey, "workshop-competitor-teardown", competitorUrl, out);
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("workshop-competitor-teardown error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});