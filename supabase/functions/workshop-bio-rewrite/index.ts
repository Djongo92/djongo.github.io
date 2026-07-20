import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { currentBio, name, role, emphases, hookLine, firmContext } = await req.json();
    if (!currentBio || currentBio.trim().length < 30) {
      return new Response(JSON.stringify({ error: "Paste at least a few sentences of the current bio." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const emphasisMap: Record<string, string> = {
      trial: "Trial credibility — courtroom wins, verdicts, juries handled, high-stakes outcomes.",
      deals: "Deal credibility — transactions closed, deal value, named counterparties, board-level work.",
      human: "Human-first — accessible, plain language, what it's like to actually work with them, why they got into law.",
      thought: "Thought leadership — published work, speaking, frameworks, shaping how the field thinks.",
      industry: "Industry depth — specific sector or client type they understand better than generalists.",
    };
    const emphasisBlock = (emphases && Array.isArray(emphases) && emphases.length)
      ? `Emphases (weight the rewrite toward these):\n${emphases.map((k: string) => `- ${emphasisMap[k] || k}`).join("\n")}`
      : "";

    const firmBlock = firmContext
      ? `\nFirm context: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You rewrite attorney bios so they read like a sharp profile, not a CV dump. Strict rules:
- Sound like a human wrote it. Short sentences. Active voice. Specific over generic.
- Lead with a hook line that signals what makes this person actually different.
- No "passionate", "trusted advisor", "committed", "results-driven", "broad range of clients", "across a variety of industries".
- Preserve every concrete fact (firm names, schools, bar admissions, awards, deal/case names). Don't invent any.
- If the source bio is vague, NAME that gap as "[Add specific: …]" placeholders rather than fabricating.
${firmBlock}

${emphasisBlock}

${hookLine ? `Suggested hook line / angle: ${hookLine}` : ""}

Output format (markdown):

## Short Version (≈50 words)

[The bio for a directory card or LinkedIn intro.]

## Long Version (≈180 words)

[The bio for their firm website page. Three short paragraphs.]

## What Changed

- [3-4 bullets explaining the moves you made, tying back to the emphases.]

## Suggested Next Move

[1-2 sentences: one concrete thing this attorney could do this quarter to make the bio even sharper — proof to collect, signal to add, etc.]`;

    const user = `Name: ${name || "(not provided)"}\nRole: ${role || "(not provided)"}\n\nCURRENT BIO:\n${currentBio}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: user }],
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
    console.error("workshop-bio-rewrite error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});