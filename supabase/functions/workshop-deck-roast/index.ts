import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";

const corsHeaders = ACCESS_CORS_HEADERS;

interface SlideInput {
  index: number;
  title: string;
  bodyText: string;
  notes: string;
}

const MAX_SLIDES = 40;
const MAX_CHARS_PER_FIELD = 800;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "workshop");
  if (unauthorized) return unauthorized;

  try {
    const { slides, firmContext } = await req.json();
    if (!Array.isArray(slides) || slides.length === 0) {
      return new Response(JSON.stringify({ error: "No slides were found in that file." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmed = (slides as SlideInput[]).slice(0, MAX_SLIDES).map((s) => ({
      index: Number(s.index) || 0,
      title: String(s.title ?? "").slice(0, MAX_CHARS_PER_FIELD),
      bodyText: String(s.bodyText ?? "").slice(0, MAX_CHARS_PER_FIELD),
      notes: String(s.notes ?? "").slice(0, MAX_CHARS_PER_FIELD),
    }));

    const deckText = trimmed
      .map((s) => `SLIDE ${s.index}${s.title ? ` — ${s.title}` : ""}\n${s.bodyText || "(no body text)"}${s.notes ? `\nSpeaker notes: ${s.notes}` : ""}`)
      .join("\n\n---\n\n");

    const firmBlock = firmContext
      ? `\n\nThe reader's firm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}. Tailor suggestions to a firm of this profile.`
      : "";

    const systemPrompt = `You are the most ruthlessly honest pitch-deck critic alive — someone who has sat through a thousand law firm new-business pitches and watched most of them lose. You don't sugarcoat generic positioning, buried asks, or a wall of bullet points nobody will read off a slide.

But you are FAIR. If a slide genuinely earns its place, say so.${firmBlock}

You're grading this deck on:
- STRUCTURE: Does it build a case (shift → opportunity → why us → proof → ask), or just list capabilities?
- SPECIFICITY: Named numbers, named clients, named outcomes — or vague claims any firm could make?
- THE ASK: Is there one clear, small next step, or does the deck fizzle out?
- SLIDE DISCIPLINE: Is each slide one idea, or a dense wall of text nobody will read while someone's talking?
- OPENING: Does slide one earn attention in the first ten seconds?

Be specific — reference actual slide numbers and quote what's actually there.`;

    const userPrompt = `Roast this pitch deck (${trimmed.length} slides).\n\n${deckText}`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: userPrompt,
        tool: {
          name: "roast_deck",
          description: "Return a brutal but constructive critique of the pitch deck",
          input_schema: {
            type: "object",
            properties: {
              verdict: { type: "string", description: "One-sentence verdict — punchy and quotable" },
              grade: { type: "string", enum: ["A", "B", "C", "D", "F"], description: "School-style letter grade. Most decks get C or D." },
              burn: { type: "string", description: "2-3 sentences of brutally honest, witty criticism — the line they'll quote to their team" },
              slideNotes: {
                type: "array",
                description: "3-6 specific slides with an issue and a concrete fix",
                items: {
                  type: "object",
                  properties: {
                    slideNumber: { type: "number" },
                    issue: { type: "string", description: "What's actually wrong with this slide, quoting it where useful" },
                    fix: { type: "string", description: "A specific, better version of this slide" },
                  },
                  required: ["slideNumber", "issue", "fix"],
                },
              },
              topThreeFixes: {
                type: "array",
                description: "The 3 highest-impact changes ranked by what would move the needle most",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
              redemption: { type: "string", description: "1-2 things the deck genuinely does WELL. Be honest — if there's nothing, say so." },
            },
            required: ["verdict", "grade", "burn", "slideNotes", "topThreeFixes", "redemption"],
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

    return new Response(JSON.stringify({ ...result, slideCount: trimmed.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("workshop-deck-roast error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
