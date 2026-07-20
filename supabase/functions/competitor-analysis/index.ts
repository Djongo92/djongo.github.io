import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { safeFetch, normalizeUrl, SafeFetchError } from "../_shared/safeFetch.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

interface SiteSnapshot {
  url: string;
  title: string;
  metaDescription: string;
  text: string;
  error?: string;
}

const fetchSite = async (rawUrl: string): Promise<SiteSnapshot> => {
  const url = normalizeUrl(rawUrl);
  try {
    const res = await safeFetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LegalGuidebook/1.0)" }, signal: AbortSignal.timeout(12000), });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").trim();
    const metaDescription =
      (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] || "").trim();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
    return { url, title, metaDescription, text };
  } catch (e) {
    return { url, title: "", metaDescription: "", text: "", error: e instanceof Error ? e.message : "fetch failed" };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { yourUrl, competitorUrls, firmContext } = await req.json();

    if (!yourUrl || !Array.isArray(competitorUrls) || competitorUrls.length === 0) {
      return new Response(JSON.stringify({ error: "Your URL and at least one competitor URL are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all sites in parallel
    const allUrls = [yourUrl, ...competitorUrls.slice(0, 3)];
    const snapshots = await Promise.all(allUrls.map(fetchSite));
    const yours = snapshots[0];
    const competitors = snapshots.slice(1);

    if (yours.error || !yours.text) {
      return new Response(
        JSON.stringify({ error: `Couldn't load your site (${yours.url}). Check the URL and try again.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reachableCompetitors = competitors.filter((c) => !c.error && c.text);
    if (reachableCompetitors.length === 0) {
      return new Response(
        JSON.stringify({ error: "Couldn't load any of the competitor sites. Check the URLs and try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firmBlock = firmContext
      ? `Reader's firm context: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You are a senior law firm positioning strategist. You analyze a firm and 1-3 competitors side-by-side and identify the strategic gaps, opportunities, and exact moves the firm should make to win.

${firmBlock}

Be specific. Reference what each site actually says. No generic "improve your messaging" advice — explain WHAT to say and WHY it would beat competitors.`;

    const formatSite = (s: SiteSnapshot, label: string) => `
${label}: ${s.url}
Title: ${s.title || "(none)"}
Meta description: ${s.metaDescription || "(none)"}
Excerpted page content:
${s.text}
---`;

    const userPrompt = `Compare this firm's site against its competitors and produce a positioning gap analysis.

${formatSite(yours, "YOUR FIRM")}

${reachableCompetitors.map((c, i) => formatSite(c, `COMPETITOR ${i + 1}`)).join("\n")}

Focus on: positioning differentiation, audience targeting, proof points, content depth, calls-to-action, and the strategic narrative each firm tells.`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: userPrompt,
        tool: {
          name: "competitor_analysis",
          description: "Return a structured competitive positioning analysis",
          input_schema: {
            type: "object",
            properties: {
              executiveSummary: {
                type: "string",
                description: "2-3 sentence high-level take on the competitive landscape and where the firm sits.",
              },
              yourPositioning: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "How the reader's firm currently positions itself" },
                  strengths: { type: "array", items: { type: "string" }, description: "2-4 things working in the firm's favor" },
                  weaknesses: { type: "array", items: { type: "string" }, description: "2-4 specific positioning gaps" },
                },
                required: ["summary", "strengths", "weaknesses"],
              },
              competitors: {
                type: "array",
                description: "One entry per competitor analyzed",
                items: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    positioning: { type: "string", description: "How this competitor positions themselves in 1 sentence" },
                    doingBetter: { type: "array", items: { type: "string" }, description: "2-3 things they do better than the reader" },
                    doingWorse: { type: "array", items: { type: "string" }, description: "1-2 things they do worse" },
                  },
                  required: ["url", "positioning", "doingBetter", "doingWorse"],
                },
              },
              gaps: {
                type: "array",
                description: "3-5 specific positioning/content/proof gaps the reader should close",
                items: {
                  type: "object",
                  properties: {
                    gap: { type: "string" },
                    why: { type: "string", description: "Why this matters competitively" },
                  },
                  required: ["gap", "why"],
                },
              },
              opportunities: {
                type: "array",
                description: "2-4 unclaimed positioning angles the reader could own",
                items: { type: "string" },
              },
              recommendedMoves: {
                type: "array",
                description: "5 concrete, ordered moves the firm should make in the next 90 days",
                items: {
                  type: "object",
                  properties: {
                    move: { type: "string" },
                    impact: { type: "string", enum: ["high", "medium", "low"] },
                    effort: { type: "string", enum: ["low", "medium", "high"] },
                  },
                  required: ["move", "impact", "effort"],
                },
                minItems: 5,
                maxItems: 5,
              },
            },
            required: [
              "executiveSummary", "yourPositioning", "competitors",
              "gaps", "opportunities", "recommendedMoves",
            ],
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

    return new Response(
      JSON.stringify({
        ...result,
        meta: {
          yourUrl: yours.url,
          competitorUrls: reachableCompetitors.map((c) => c.url),
          unreachable: competitors.filter((c) => c.error).map((c) => c.url),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("competitor-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});