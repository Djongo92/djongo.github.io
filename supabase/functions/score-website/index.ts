import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { safeFetch, normalizeUrl, SafeFetchError } from "../_shared/safeFetch.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { url, guidebookSummary } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the website
    const normalizedUrl = normalizeUrl(url);

    let pageText = "";
    let pageTitle = "";
    try {
      const siteRes = await safeFetch(normalizedUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LegalGuidebook/1.0)" }, signal: AbortSignal.timeout(15000), });
      if (!siteRes.ok) throw new Error(`HTTP ${siteRes.status}`);
      const html = await siteRes.text();
      pageTitle = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").trim();
      // Strip scripts/styles/tags, keep text
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
    } catch (e) {
      console.error("fetch site failed:", e);
      return new Response(JSON.stringify({ error: "Could not load that website. Check the URL and try again." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a senior law firm marketing strategist grading a law firm's website against the principles in this guidebook:

${guidebookSummary}

Be specific, tactical, and honest. Reference what's actually on the page. Give a score 0-100 and 5 prioritized fixes.`;

    const userPrompt = `Grade this law firm's website.

URL: ${normalizedUrl}
Title: ${pageTitle}

Page content (excerpted):
${pageText}`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: userPrompt,
        tool: {
          name: "grade_website",
          description: "Return a graded analysis of the website",
          input_schema: {
            type: "object",
            properties: {
              score: { type: "number", description: "Overall score 0-100" },
              headline: { type: "string", description: "One-sentence summary verdict" },
              strengths: { type: "array", items: { type: "string" }, description: "2-4 things they're doing right" },
              fixes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    detail: { type: "string" },
                    impact: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["title", "detail", "impact"],
                },
                description: "5 prioritized fixes with rationale",
              },
            },
            required: ["score", "headline", "strengths", "fixes"],
          },
        },
      });
    } catch (e) {
      if (e instanceof ClaudeApiError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    return new Response(JSON.stringify({ ...result, url: normalizedUrl, pageTitle }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-website error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
