// Deck Builder AI visual: generates one slide image via the Replit AI
// Integrations OpenAI proxy (gpt-image-1, landscape). Same access posture as
// every workshop tool: requireAccess "workshop" gates + meters anonymous
// callers. The user's brief enters the prompt newline-scrubbed via
// quotedLine; slide context is reference, not instructions.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { quotedLine } from "../_shared/crossToolContext.ts";

const corsHeaders = ACCESS_CORS_HEADERS;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "workshop");
  if (unauthorized) return unauthorized;

  try {
    const baseUrl = Deno.env.get("AI_INTEGRATIONS_OPENAI_BASE_URL");
    const apiKey = Deno.env.get("AI_INTEGRATIONS_OPENAI_API_KEY");
    if (!baseUrl || !apiKey) return json({ error: "Image generation isn't configured yet — try the upload option." }, 500);

    const { prompt, slideTitle, headline } = await req.json();
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return json({ error: "Describe the visual you want first." }, 400);
    }

    const fullPrompt = [
      "Editorial slide visual for an elite law firm's new-business pitch deck. Professional, understated, muted navy-and-gold palette. Absolutely no text, words, letters, or logos in the image.",
      typeof slideTitle === "string" && slideTitle.trim()
        ? `Context — the slide is titled "${quotedLine(slideTitle, 80)}"${typeof headline === "string" && headline.trim() ? ` with headline "${quotedLine(headline, 160)}"` : ""}.`
        : "",
      `Visual brief: ${quotedLine(prompt, 400)}.`,
    ].filter(Boolean).join("\n");

    const resp = await fetch(`${baseUrl.replace(/\/+$/, "")}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt: fullPrompt, size: "1536x1024", n: 1 }),
    });
    if (!resp.ok) {
      console.error("workshop-deck-image upstream error:", resp.status, (await resp.text()).slice(0, 300));
      return json({ error: "Image generation failed — try again in a moment." }, 502);
    }
    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64 || typeof b64 !== "string") {
      console.error("workshop-deck-image: no image in upstream response");
      return json({ error: "Image generation returned nothing — try rephrasing the brief." }, 502);
    }
    return json({ image: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error("workshop-deck-image error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
