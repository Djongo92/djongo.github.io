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
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").replace(/<[^>]+>/g, "").trim();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 7000);
    return { url, title, metaDescription, h1, text };
  } catch (e) {
    return { url, title: "", metaDescription: "", h1: "", text: "", error: e instanceof Error ? e.message : "fetch failed" };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { url, pastedContent, practiceArea, idealClient, firmContext, clientId: rawClientId, accessToken, activeFirmId } = await req.json();

    let firmContextBlock = "";
    let profileJurisdictions: string[] = [];
    let resolvedClientId: string | null = null;
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      resolvedClientId = await resolveClientIdGuarded(serviceClient, rawClientId, identityToken, typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined);
      if (resolvedClientId) firmContextBlock = await buildFirmContext(serviceClient, resolvedClientId).then((ctx) => { profileJurisdictions = ctx.jurisdictions; return ctx.block; });
    }

    let pageBlock = "";
    let meta: Record<string, unknown> = {};
    let cacheKey: string | null = null;
    // Fetched OR pasted page copy is adversary-controlled (task #154):
    // either way it enters the prompt only inside the untrusted boundary.
    if (pastedContent && pastedContent.trim().length > 50) {
      pageBlock = `Page content (pasted):\n${wrapPageCopy(pastedContent.slice(0, 8000))}`;
      meta = { source: "pasted" };
    } else if (url) {
      // Cache scoped by verified firm — audit output embeds the
      // requester's context profile, so a bare-URL key would leak one
      // firm's context-derived audit to any other firm.
      const cached = await getCached("workshop-practice-audit", `${url}::${resolvedClientId ?? "anon"}`);
      cacheKey = cached.key;
      if (cached.hit) {
        return new Response(JSON.stringify({ ...(cached.hit as object), cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const snap = await fetchSite(url);
      if (snap.error || !snap.text) {
        return new Response(JSON.stringify({ error: `Couldn't load ${snap.url}. Paste the content instead.` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      pageBlock = `URL: ${snap.url}\n\n${wrapPageCopy(`Title: ${snap.title || "(none)"}\nMeta: ${snap.metaDescription || "(none)"}\nH1: ${snap.h1 || "(none)"}\n\n${snap.text}`)}`;
      meta = { source: "url", url: snap.url, title: snap.title };
    } else {
      return new Response(JSON.stringify({ error: "Provide a URL or paste content." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = [
      practiceArea && `Practice area: ${practiceArea}`,
      idealClient && `Ideal client: ${idealClient}`,
      firmContextLine(firmContext, profileJurisdictions),
    ].filter(Boolean).join("\n");

    const systemPrompt = `You audit law-firm practice-area pages against the "Revitalizing Practice Area Pages" framework: clear positioning, specific ideal client signaling, real expertise proof, narrative structure, scannability, CTA strength, and search optimization. Cite phrases from the page.${firmContextBlock}
${JURISDICTION_RULE}
${UNTRUSTED_COPY_RULE}`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: `${ctx ? ctx + "\n\n" : ""}${pageBlock}\n\nAudit this practice area page.`,
        tool: {
          name: "audit",
          description: "Return a structured practice-area page audit.",
          input_schema: {
            type: "object",
            properties: {
              overallGrade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
              overallScore: { type: "number", description: "0-100" },
              verdict: { type: "string", description: "1-2 sentence honest take." },
              criteria: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", enum: ["Positioning Clarity", "Ideal-Client Signal", "Proof of Expertise", "Narrative Structure", "Scannability", "Call to Action", "SEO & Search Intent"] },
                    score: { type: "number", description: "0-10" },
                    finding: { type: "string", description: "What the page does or doesn't do, citing the page." },
                  },
                  required: ["name", "score", "finding"],
                },
                minItems: 7, maxItems: 7,
              },
              quickWins: { type: "array", items: { type: "string" }, description: "3-5 fixes doable today." },
              strategicFixes: { type: "array", items: { type: "string" }, description: "2-4 deeper rewrites." },
              suggestedHeadline: { type: "string", description: "A drop-in replacement H1." },
              suggestedSubhead: { type: "string", description: "A drop-in supporting subhead." },
            },
            required: ["overallGrade", "overallScore", "verdict", "criteria", "quickWins", "strategicFixes", "suggestedHeadline", "suggestedSubhead"],
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
    if (cacheKey && url) await setCached(cacheKey, "workshop-practice-audit", url, out);
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("workshop-practice-audit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});