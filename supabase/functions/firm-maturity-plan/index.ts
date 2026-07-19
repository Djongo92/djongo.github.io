import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { scores, firmContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // scores: { dimension: string, score: 1..5 }[]
    const scoreBlock = (scores || [])
      .map((s: { dimension: string; score: number }) => `- ${s.dimension}: ${s.score}/5`)
      .join("\n");

    const firmBlock = firmContext
      ? `\nFirm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You are a senior law firm marketing strategist building a tailored 30-day action plan.

Firm self-assessment (1=non-existent, 5=best-in-class):
${scoreBlock}
${firmBlock}

Produce a precise, prescriptive 30-day plan in markdown:
1. Open with one paragraph diagnosing the firm's overall maturity profile (what's strong, what's weakest).
2. Then a "Week 1 / Week 2 / Week 3 / Week 4" structure. Each week has 2-3 concrete actions tied to the weakest dimensions. Use bold for action names.
3. For each action, name the relevant guidebook chapter when natural (e.g., "see Chapter 6 on Brand"). Available chapters: Event Marketing, Website Fundamentals, Brand Identity, Content Marketing, Thought Leadership, SEO, Email Marketing, Social Media, PR & Media, Client Experience, Data & Analytics, Reputation Management, Internal Marketing Culture, Marketing Technology.
4. End with a single "North Star Metric" the firm should track for the next 90 days.

Be specific to the scores. Do not give generic advice. Under 500 words.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Generate my plan." }],
        stream: true,
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("firm-maturity-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});