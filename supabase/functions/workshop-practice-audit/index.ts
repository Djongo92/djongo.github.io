import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { safeFetch, normalizeUrl, SafeFetchError } from "../_shared/safeFetch.ts";
import { getCached, setCached } from "../_shared/cache.ts";

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
    const { url, pastedContent, practiceArea, idealClient, firmContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let pageBlock = "";
    let meta: Record<string, unknown> = {};
    let cacheKey: string | null = null;
    if (pastedContent && pastedContent.trim().length > 50) {
      pageBlock = `Page content (pasted):\n${pastedContent.slice(0, 8000)}`;
      meta = { source: "pasted" };
    } else if (url) {
      const cached = await getCached("workshop-practice-audit", url);
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
      pageBlock = `URL: ${snap.url}\nTitle: ${snap.title || "(none)"}\nMeta: ${snap.metaDescription || "(none)"}\nH1: ${snap.h1 || "(none)"}\n\nContent:\n${snap.text}`;
      meta = { source: "url", url: snap.url, title: snap.title };
    } else {
      return new Response(JSON.stringify({ error: "Provide a URL or paste content." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = [
      practiceArea && `Practice area: ${practiceArea}`,
      idealClient && `Ideal client: ${idealClient}`,
      firmContext && `Firm: ${firmContext.practiceArea}, ${firmContext.firmSize}, goal: ${firmContext.primaryGoal}`,
    ].filter(Boolean).join("\n");

    const systemPrompt = `You audit law-firm practice-area pages against the "Revitalizing Practice Area Pages" framework: clear positioning, specific ideal client signaling, real expertise proof, narrative structure, scannability, CTA strength, and search optimization. Cite phrases from the page.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${ctx ? ctx + "\n\n" : ""}${pageBlock}\n\nAudit this practice area page.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "audit",
            parameters: {
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
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "audit" } },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) {
      console.error("AI error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No result");
    const parsed = JSON.parse(args);
    const out = { ...parsed, meta };
    if (cacheKey && url) await setCached(cacheKey, "workshop-practice-audit", url, out);
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("workshop-practice-audit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});