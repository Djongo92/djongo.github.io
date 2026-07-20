import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { audience, opportunity, ourEdge, proof, ask, firmContext } = await req.json();
    if (!audience || !opportunity) {
      return new Response(JSON.stringify({ error: "Audience and opportunity are required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const firmBlock = firmContext
      ? `Firm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You build new-business pitch decks for elite law firms. Output a 10-slide deck outline in markdown. Each slide must be tight, specific, and persuasive — no fluff, no legal-marketing cliches.

Structure:
1. Title / first impression
2. The shift (why the world they operate in has changed)
3. The opportunity (what's now possible because of #2)
4. The problem (what's standing in their way today)
5. Our point of view (the contrarian or sharper take we bring)
6. Our approach (how we deliver — 3 phases or pillars)
7. Proof (case studies, results, named credentials — use placeholders if not provided)
8. Team (positioning of the people who'd run it)
9. Investment (engagement model + pricing framing — placeholder if not provided)
10. The ask (next step — specific and small)

For each slide use this exact markdown shape:

## Slide N — [Slide Title]

**Headline:** [one-line headline that goes on the slide]

**Body:**
- [3-5 short bullets that go on the slide]

**Speaker notes:** [2-3 sentences the presenter says, written like real spoken language]

---

Be ruthless about specificity. If proof is missing, write "[Insert proof: …]" as a clear placeholder.

${firmBlock}`;

    const userPrompt = `Audience: ${audience}
Opportunity: ${opportunity}
${ourEdge ? `Our edge: ${ourEdge}` : ""}
${proof ? `Proof we can use: ${proof}` : ""}
${ask ? `Desired ask: ${ask}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        stream: true,
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) {
      console.error("AI error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("workshop-pitch-deck error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});