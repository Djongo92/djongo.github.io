import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { streamClaudeText } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

// Mirrors src/components/pitchDeckSections.ts's keys/labels — kept as a
// small hand-synced pair rather than a cross-runtime shared module, since
// Deno (this function) and the Vite browser bundle don't share an import
// graph today and this catalog is small and stable.
const SECTION_CATALOG: Record<string, { label: string; guidance: string }> = {
  shift: { label: "The Shift", guidance: "Why the world they operate in has changed" },
  opportunity: { label: "The Opportunity", guidance: "What's now possible because of that shift" },
  problem: { label: "The Problem", guidance: "What's standing in their way today" },
  pov: { label: "Our Point of View", guidance: "The contrarian or sharper take we bring" },
  approach: { label: "Our Approach", guidance: "How we deliver — 3 phases or pillars" },
  proof: { label: "Proof", guidance: "Case studies, results, named credentials — use placeholders if not provided" },
  team: { label: "Team", guidance: "Positioning of the people who'd run it" },
  timeline: { label: "Process & Timeline", guidance: "What the engagement actually looks like week to week" },
  differentiators: { label: "Why Us vs. Alternatives", guidance: "Direct comparison to how they'd solve this without us" },
  investment: { label: "Investment", guidance: "Engagement model + pricing framing — placeholder if not provided" },
  faq: { label: "Anticipated Questions", guidance: "The 2-3 objections they're actually thinking, addressed before they're raised" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "workshop");
  if (unauthorized) return unauthorized;

  try {
    const { audience, opportunity, ourEdge, proof, ask, tone, sectionKeys, firmContext } = await req.json();
    if (!audience || !opportunity) {
      return new Response(JSON.stringify({ error: "Audience and opportunity are required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const firmBlock = firmContext
      ? `Firm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const chosenKeys: string[] = Array.isArray(sectionKeys) && sectionKeys.length > 0
      ? sectionKeys.filter((k: string) => SECTION_CATALOG[k])
      : ["shift", "opportunity", "problem", "pov", "approach", "proof", "team", "investment"];

    const middleSlides = chosenKeys.map((k, i) => `${i + 2}. ${SECTION_CATALOG[k].label} — ${SECTION_CATALOG[k].guidance}`).join("\n");
    const totalSlides = chosenKeys.length + 2;
    const askSlideNumber = totalSlides;

    const systemPrompt = `You build new-business pitch decks for elite law firms. Output a ${totalSlides}-slide deck outline in markdown. Each slide must be tight, specific, and persuasive — no fluff, no legal-marketing cliches.

Structure:
1. Title / first impression
${middleSlides}
${askSlideNumber}. The ask (next step — specific and small)

For each slide use this exact markdown shape:

## Slide N — [Slide Title]

**Headline:** [one-line headline, 8 words or fewer, that goes on the slide]

**Body:**
- [2-3 short bullets that go on the slide, each under 12 words — this is presented live, not read silently, so it must not be a wall of text]

**Speaker notes:** [2-3 sentences the presenter says, written like real spoken language — this is where the fuller explanation lives, NOT on the slide itself]

---

Be ruthless about specificity and about slide density — if a slide needs more than 3 bullets to make its point, the point is too complicated for one slide; split the idea into the speaker notes instead of cramming the slide. If proof is missing, write "[Insert proof: …]" as a clear placeholder.

${tone ? `Tone: ${tone}.` : ""}
${firmBlock}`;

    const userPrompt = `Audience: ${audience}
Opportunity: ${opportunity}
${ourEdge ? `Our edge: ${ourEdge}` : ""}
${proof ? `Proof we can use: ${proof}` : ""}
${ask ? `Desired ask: ${ask}` : ""}`;

    return await streamClaudeText({ system: systemPrompt, user: userPrompt }, corsHeaders);
  } catch (e) {
    console.error("workshop-pitch-deck error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
