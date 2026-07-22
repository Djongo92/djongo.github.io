import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError, type DataUrlImage } from "../_shared/anthropic.ts";

const corsHeaders = ACCESS_CORS_HEADERS;

interface SlideInput {
  index: number;
  title: string;
  bodyText: string;
  notes: string;
}

const MAX_SLIDES = 40;
const MAX_CHARS_PER_FIELD = 800;
const MAX_PAGE_IMAGES = 20;

const FIRM_BLOCK = (firmContext: Record<string, unknown> | undefined) =>
  firmContext
    ? `\n\nThe reader's firm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}. Tailor suggestions to a firm of this profile.`
    : "";

const CRITIC_PERSONA = `You are the most ruthlessly honest pitch-deck critic alive — someone who has sat through a thousand law firm new-business pitches and watched most of them lose. You don't sugarcoat generic positioning, buried asks, dense slides, or bad visual design.

But you are FAIR. If a slide genuinely earns its place, say so.`;

// Two schemas: the .pptx path only has extracted text (no layout renderer
// available client-side for that format), so it can only critique
// structure/copy. The PDF path gets actual rendered page images (any tool —
// Canva, Keynote, Google Slides, PowerPoint — exports PDF reliably, and
// pdf.js rasterizes it in-browser with no server upload) so Claude can see
// real layout, whitespace, contrast, and image quality — split design and
// copy feedback per slide instead of one blended "issue/fix".
const TEXT_TOOL_SCHEMA = {
  name: "roast_deck",
  description: "Return a brutal but constructive critique of the pitch deck's structure and copy",
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
      topThreeFixes: { type: "array", description: "The 3 highest-impact changes ranked by what would move the needle most", items: { type: "string" }, minItems: 3, maxItems: 3 },
      redemption: { type: "string", description: "1-2 things the deck genuinely does WELL. Be honest — if there's nothing, say so." },
    },
    required: ["verdict", "grade", "burn", "slideNotes", "topThreeFixes", "redemption"],
  },
} as const;

const VISUAL_TOOL_SCHEMA = {
  name: "roast_deck_visual",
  description: "Return a brutal but constructive critique of the pitch deck's design AND copy, from actual rendered slide images",
  input_schema: {
    type: "object",
    properties: {
      verdict: { type: "string", description: "One-sentence verdict — punchy and quotable" },
      grade: { type: "string", enum: ["A", "B", "C", "D", "F"], description: "School-style letter grade. Most decks get C or D." },
      burn: { type: "string", description: "2-3 sentences of brutally honest, witty criticism — the line they'll quote to their team" },
      designSummary: { type: "string", description: "2-3 sentences on the overall visual design: layout consistency, typography, color/contrast, whitespace, image quality, brand cohesion across slides" },
      slideNotes: {
        type: "array",
        description: "3-8 specific slides, each with a design critique AND a copy critique",
        items: {
          type: "object",
          properties: {
            slideNumber: { type: "number" },
            designIssue: { type: "string", description: "What's visually wrong — layout, density, contrast, whitespace, hierarchy, image quality" },
            designFix: { type: "string", description: "A specific, concrete visual fix" },
            copyIssue: { type: "string", description: "What's wrong with the words on the slide, quoting it where useful" },
            copyFix: { type: "string", description: "A specific, better version of the copy" },
          },
          required: ["slideNumber", "designIssue", "designFix", "copyIssue", "copyFix"],
        },
      },
      topThreeFixes: { type: "array", description: "The 3 highest-impact changes (design or copy) ranked by what would move the needle most", items: { type: "string" }, minItems: 3, maxItems: 3 },
      redemption: { type: "string", description: "1-2 things the deck genuinely does WELL, design or copy. Be honest — if there's nothing, say so." },
    },
    required: ["verdict", "grade", "burn", "designSummary", "slideNotes", "topThreeFixes", "redemption"],
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "workshop");
  if (unauthorized) return unauthorized;

  try {
    const { slides, pageImages, firmContext } = await req.json();
    const hasImages = Array.isArray(pageImages) && pageImages.length > 0;
    const hasSlides = Array.isArray(slides) && slides.length > 0;

    if (!hasImages && !hasSlides) {
      return new Response(JSON.stringify({ error: "No slides were found in that file." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firmBlock = FIRM_BLOCK(firmContext);
    let result: Record<string, unknown>;
    let slideCount: number;
    let mode: "visual" | "text";

    try {
      if (hasImages) {
        mode = "visual";
        const images = (pageImages as DataUrlImage[]).slice(0, MAX_PAGE_IMAGES);
        slideCount = images.length;
        const systemPrompt = `${CRITIC_PERSONA}${firmBlock}

You're grading this deck on:
- VISUAL DESIGN: layout consistency, whitespace, typography hierarchy, color/contrast, image quality, whether it looks like one deck or several stitched together
- STRUCTURE: Does it build a case (shift → opportunity → why us → proof → ask), or just list capabilities?
- SPECIFICITY: Named numbers, named clients, named outcomes — or vague claims any firm could make?
- SLIDE DENSITY: Is each slide one idea a viewer can absorb in seconds, or a dense wall of text?
- OPENING: Does slide one earn attention in the first ten seconds — visually and verbally?

You are looking at the ACTUAL rendered slide images, in order, slide 1 first. Reference real slide numbers and quote/describe what's actually on them.`;
        const userPrompt = `Roast this pitch deck (${images.length} slides, shown as images in order).`;
        result = await callClaudeTool({ system: systemPrompt, user: userPrompt, images, tool: VISUAL_TOOL_SCHEMA, maxTokens: 6000 });
      } else {
        mode = "text";
        const trimmed = (slides as SlideInput[]).slice(0, MAX_SLIDES).map((s) => ({
          index: Number(s.index) || 0,
          title: String(s.title ?? "").slice(0, MAX_CHARS_PER_FIELD),
          bodyText: String(s.bodyText ?? "").slice(0, MAX_CHARS_PER_FIELD),
          notes: String(s.notes ?? "").slice(0, MAX_CHARS_PER_FIELD),
        }));
        slideCount = trimmed.length;
        const deckText = trimmed
          .map((s) => `SLIDE ${s.index}${s.title ? ` — ${s.title}` : ""}\n${s.bodyText || "(no body text)"}${s.notes ? `\nSpeaker notes: ${s.notes}` : ""}`)
          .join("\n\n---\n\n");
        const systemPrompt = `${CRITIC_PERSONA}${firmBlock}

You're grading this deck on:
- STRUCTURE: Does it build a case (shift → opportunity → why us → proof → ask), or just list capabilities?
- SPECIFICITY: Named numbers, named clients, named outcomes — or vague claims any firm could make?
- THE ASK: Is there one clear, small next step, or does the deck fizzle out?
- SLIDE DISCIPLINE: Is each slide one idea, or a dense wall of text nobody will read while someone's talking?
- OPENING: Does slide one earn attention in the first ten seconds?

You only have the extracted text — no visual layout is available for this file format, so don't comment on design; focus on structure and copy. Be specific — reference actual slide numbers and quote what's actually there.`;
        const userPrompt = `Roast this pitch deck (${trimmed.length} slides).\n\n${deckText}`;
        result = await callClaudeTool({ system: systemPrompt, user: userPrompt, tool: TEXT_TOOL_SCHEMA });
      }
    } catch (e) {
      if (e instanceof ClaudeApiError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    return new Response(JSON.stringify({ ...result, slideCount, mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("workshop-deck-roast error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
