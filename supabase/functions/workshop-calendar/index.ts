import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "calendar",
            parameters: {
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
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "calendar" } },
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
    return new Response(args, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("workshop-calendar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});