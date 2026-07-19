import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { roast, firmContext } = await req.json();
    if (!roast || typeof roast !== "object") {
      return new Response(JSON.stringify({ error: "Roast result is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const firmBlock = firmContext
      ? `\n\nFirm profile: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You are a world-class direct-response copywriter who has rewritten homepages for Am Law 100 firms. You write like Joanna Wiebe meets Harry Dry — punchy, specific, client-centric. You never use "trusted advisors", "results-driven", "passionate", or any other empty law-firm cliché.${firmBlock}

You will be given a brutal critique of a firm's current homepage. Generate a complete rewrite they could ship today.

Rules:
- Hero headline must answer "what, for whom, why us" in <12 words
- Subhead must do the work the headline can't (specific outcome or proof)
- One primary CTA only
- Three sections, each with: heading, 1-2 sentence body, optional 3-bullet list
- One social-proof block (specific result format — % / $ / count)
- Contrast every section against what the original site did wrong`;

    const userPrompt = `The current site got grade ${roast.grade}. Verdict: "${roast.verdict}".

Critique highlights:
${(roast.annotations || []).map((a: any) => `- [${a.element}] said: "${a.whatYouSaid}" → sounded like: ${a.whatItSounds}`).join("\n")}

Top 3 fixes:
${(roast.topThreeFixes || []).map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}

Now generate the rewrite.`;

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
            name: "rewrite_homepage",
            description: "Return a complete homepage rewrite",
            parameters: {
              type: "object",
              properties: {
                hero: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    subhead: { type: "string" },
                    primaryCta: { type: "string" },
                    secondaryCta: { type: "string" },
                  },
                  required: ["headline", "subhead", "primaryCta"],
                },
                sections: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      body: { type: "string" },
                      bullets: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
                    },
                    required: ["heading", "body", "bullets"],
                  },
                },
                socialProof: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    stats: {
                      type: "array",
                      minItems: 3,
                      maxItems: 3,
                      items: {
                        type: "object",
                        properties: {
                          value: { type: "string" },
                          label: { type: "string" },
                        },
                        required: ["value", "label"],
                      },
                    },
                  },
                  required: ["headline", "stats"],
                },
                finalCta: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    button: { type: "string" },
                  },
                  required: ["headline", "button"],
                },
                whyItWorks: {
                  type: "string",
                  description: "1-paragraph explanation of why this rewrite outperforms the original",
                },
              },
              required: ["hero", "sections", "socialProof", "finalCta", "whyItWorks"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "rewrite_homepage" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached." }), {
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
    if (!args) throw new Error("No rewrite returned");
    const result = JSON.parse(args);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("steal-homepage error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});