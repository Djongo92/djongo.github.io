import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { safeFetch, normalizeUrl, SafeFetchError } from "../_shared/safeFetch.ts";
import { getCached, setCached } from "../_shared/cache.ts";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { url, firmContext } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const normalizedUrl = normalizeUrl(url);

    // 24h URL cache: same URL → same roast (no re-fetch, no AI spend)
    const cached = await getCached("roast-homepage", normalizedUrl);
    if (cached.hit) {
      return new Response(JSON.stringify({ ...(cached.hit as object), cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch page HTML
    let pageText = "";
    let pageTitle = "";
    let metaDescription = "";
    try {
      const siteRes = await safeFetch(normalizedUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LegalGuidebook/1.0)" }, signal: AbortSignal.timeout(15000), });
      if (!siteRes.ok) throw new Error(`HTTP ${siteRes.status}`);
      const html = await siteRes.text();
      pageTitle = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").trim();
      metaDescription = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] || "").trim();
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 9000);
    } catch (e) {
      console.error("fetch site failed:", e);
      return new Response(
        JSON.stringify({ error: "Could not load that website. Check the URL and try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firmBlock = firmContext
      ? `\n\nThe reader's firm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}. Tailor specific suggestions to a firm of this profile.`
      : "";

    const systemPrompt = `You are the most ruthlessly honest law firm marketing critic alive — think the David Ogilvy of legal websites. You don't sugarcoat. You don't hedge. You call out generic positioning, weak headlines, missing CTAs, and lawyer-speak that drives clients away.

But you are FAIR. If something genuinely works, you say so plainly. Your goal is to make the reader actually fix their site, not feel attacked.${firmBlock}

You're roasting this homepage on these dimensions:
- HEADLINE: Does it answer "what do you do, for whom, and why should I care?" in seconds?
- POSITIONING: Is it differentiated, or could any firm say the same thing?
- TRUST SIGNALS: Are there real proof points (results, names, logos, testimonials) or just stock claims?
- CTA: Is there ONE obvious next step? Or 5 confused options?
- COPY: Is it written for the client, or for the partners' egos?
- DESIGN VIBE: Modern and intentional, or 2014 template-grade?

Be specific, quote what's actually on the page, and tell them what to write instead.`;

    const userPrompt = `Roast this law firm homepage.

URL: ${normalizedUrl}
Page title: ${pageTitle || "(none found)"}
Meta description: ${metaDescription || "(none found)"}

Page content (excerpted, may include nav/footer noise):
${pageText}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "roast_homepage",
            description: "Return a brutal but constructive critique of the homepage",
            parameters: {
              type: "object",
              properties: {
                verdict: {
                  type: "string",
                  description: "One-sentence verdict — punchy and quotable. Example: 'A law firm allergic to specifics.'",
                },
                grade: {
                  type: "string",
                  enum: ["A", "B", "C", "D", "F"],
                  description: "School-style letter grade. Most firms get C or D.",
                },
                burn: {
                  type: "string",
                  description: "The headline roast — 2-3 sentences of brutally honest, but witty, criticism. The line they'll quote to their team.",
                },
                annotations: {
                  type: "array",
                  description: "5-7 specific elements on the page with critique and rewrite",
                  items: {
                    type: "object",
                    properties: {
                      element: {
                        type: "string",
                        enum: ["headline", "subhead", "CTA", "about", "services", "trust", "design", "copy"],
                      },
                      whatYouSaid: { type: "string", description: "Quote or describe what's actually on the page" },
                      whatItSounds: { type: "string", description: "What this actually communicates to a prospect — be brutal" },
                      rewrite: { type: "string", description: "A specific, better version they could use today" },
                    },
                    required: ["element", "whatYouSaid", "whatItSounds", "rewrite"],
                  },
                },
                topThreeFixes: {
                  type: "array",
                  description: "The 3 highest-impact changes ranked by what would move the needle most",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 3,
                },
                redemption: {
                  type: "string",
                  description: "1-2 things the site genuinely does WELL. Be honest — if there's nothing, say so.",
                },
              },
              required: ["verdict", "grade", "burn", "annotations", "topThreeFixes", "redemption"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "roast_homepage" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      console.error("AI error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No roast result");
    const result = JSON.parse(args);

    // Build a screenshot URL via a free public service so the client can show
    // an annotated preview alongside the critique. (Microlink offers a generous
    // free tier with no key required and CORS-friendly responses.)
    const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(normalizedUrl)}&screenshot=true&meta=false&embed=screenshot.url&waitUntil=networkidle0&type=png&viewport.width=1280&viewport.height=900&fullPage=false`;

    const out = { ...result, url: normalizedUrl, pageTitle, screenshotUrl };
    await setCached(cached.key, "roast-homepage", normalizedUrl, out);
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("roast-homepage error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});