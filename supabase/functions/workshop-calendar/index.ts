import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { practiceAreas, jurisdictions, knownEvents, slowSeasons, startMonth, firmContext } = await req.json();
    if (!practiceAreas || (typeof practiceAreas === "string" && !practiceAreas.trim())) {
      return new Response(JSON.stringify({ error: "Tell us at least one practice area." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const startIdx = Math.max(0, months.indexOf(startMonth || months[new Date().getMonth()]));
    const ordered = [...months.slice(startIdx), ...months.slice(0, startIdx)];

    const firmBlock = firmContext
      ? `Firm: ${firmContext.practiceArea}, ${firmContext.firmSize}, goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You build 12-month marketing calendars for law firms. Map every month to a campaign theme, content drops, and channel pushes that fit the firm's practice areas, jurisdictions, conferences, and slow seasons. Lean on the principle that smart firms publish hardest when competition goes quiet.

Use real-world rhythms: tax cycles, regulatory deadlines, M&A seasonality, court calendars, conference seasons for the named practice areas. Never invent named conferences unless the user provided them. If unsure of a specific event date, say "[verify date]".

${firmBlock}`;

    const userPrompt = `Practice areas: ${practiceAreas}
Jurisdictions: ${jurisdictions || "(not specified)"}
Known fixed events / launches: ${knownEvents || "(none listed)"}
Known slow seasons: ${slowSeasons || "(not specified)"}
Start month: ${ordered[0]}
Months in order: ${ordered.join(", ")}`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: userPrompt,
        maxTokens: 8192,
        tool: {
          name: "calendar",
          description: "Return a 12-month marketing calendar",
          input_schema: {
            type: "object",
            properties: {
              annualTheme: { type: "string", description: "One sentence narrative arc across the year." },
              pillars: { type: "array", items: { type: "string" }, description: "3-5 strategic content pillars to repeat." },
              months: {
                type: "array",
                minItems: 12, maxItems: 12,
                items: {
                  type: "object",
                  properties: {
                    month: { type: "string", description: "Month name." },
                    tempo: { type: "string", enum: ["push", "steady", "slow"], description: "Energy level — push hard, steady, or slow." },
                    theme: { type: "string", description: "Specific monthly theme tied to seasonality." },
                    flagshipContent: { type: "string", description: "One big anchor piece this month." },
                    supportingContent: { type: "array", items: { type: "string" }, description: "2-4 supporting pieces (articles, posts, newsletters, talks)." },
                    channelPushes: { type: "array", items: { type: "string" }, description: "2-3 channel-specific plays (LinkedIn, email, events, PR)." },
                    keyMoments: { type: "array", items: { type: "string" }, description: "0-3 dates or deadlines to align around." },
                  },
                  required: ["month", "tempo", "theme", "flagshipContent", "supportingContent", "channelPushes"],
                },
              },
            },
            required: ["annualTheme", "pillars", "months"],
          },
        },
      });
    } catch (e) {
      if (e instanceof ClaudeApiError) {
        return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw e;
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("workshop-calendar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
