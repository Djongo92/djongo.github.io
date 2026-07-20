import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
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

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: userPrompt,
        tool: {
          name: "rewrite_homepage",
          description: "Return a complete homepage rewrite",
          input_schema: {
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
