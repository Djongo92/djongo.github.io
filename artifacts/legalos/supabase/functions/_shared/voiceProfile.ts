// The firm's distilled voice. Everything a firm keeps or edits in the
// Workshop becomes an example (workshop_style_examples); every few new
// examples we boil the lot down into one short style guide and store it.
// buildFirmContext injects that guide into EVERY tool's prompt, so the whole
// Workshop drifts toward how this firm actually writes — not just the tool
// that produced the example.
import { callClaudeTool } from "./anthropic.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

/** Rebuild once this many NEW kept/edited examples have arrived since the last build. */
export const REBUILD_EVERY = 3;
/** Don't build a profile from fewer examples than this — too little signal to generalise. */
export const MIN_EXAMPLES = 3;
const SAMPLE_SIZE = 14;

export async function getVoiceProfileBlock(serviceClient: SupabaseClient, clientId: string): Promise<string> {
  const { data, error } = await serviceClient
    .from("workshop_voice_profiles")
    .select("profile")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error || !data?.profile) return "";
  return `VOICE PROFILE (learned from what this firm has kept and edited — write like this firm, in every tool)\n${data.profile}`;
}

/** Pure: should a rebuild run, given the counts? */
export function shouldRebuild(keptCount: number, builtFromCount: number | null): boolean {
  if (keptCount < MIN_EXAMPLES) return false;
  return builtFromCount === null || keptCount - builtFromCount >= REBUILD_EVERY;
}

export async function maybeRefreshVoiceProfile(serviceClient: SupabaseClient, clientId: string): Promise<void> {
  try {
    const { count } = await serviceClient
      .from("workshop_style_examples")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .in("verdict", ["approved", "edited"]);
    const kept = count ?? 0;

    const { data: existing } = await serviceClient
      .from("workshop_voice_profiles")
      .select("example_count")
      .eq("client_id", clientId)
      .maybeSingle();
    if (!shouldRebuild(kept, existing ? existing.example_count : null)) return;

    // Edited examples carry the strongest signal (the firm rewrote it into
    // its own words), so they're sampled first, then approved ones.
    const { data: rows } = await serviceClient
      .from("workshop_style_examples")
      .select("tool_id, final_text, verdict")
      .eq("client_id", clientId)
      .in("verdict", ["approved", "edited"])
      .order("created_at", { ascending: false })
      .limit(40);
    const sample = ((rows ?? []) as { tool_id: string; final_text: string; verdict: string }[])
      .sort((a, b) => (a.verdict === "edited" ? 0 : 1) - (b.verdict === "edited" ? 0 : 1))
      .slice(0, SAMPLE_SIZE);
    if (sample.length < MIN_EXAMPLES) return;

    const result = await callClaudeTool({
      system: `You are a house-style editor. From samples of writing a law firm chose to keep (some edited by the firm itself, which is the strongest signal), write a compact style guide another writer could follow to sound exactly like this firm. Be concrete and observational, never generic. Describe only what the samples actually show.`,
      user: sample.map((s, i) => `Sample ${i + 1} (${s.tool_id}, ${s.verdict}):\n${s.final_text.slice(0, 1200)}`).join("\n\n---\n\n"),
      tool: {
        name: "voice_profile",
        description: "Return the firm's style guide.",
        input_schema: {
          type: "object",
          properties: {
            profile: {
              type: "string",
              description:
                "A style guide of at most 180 words, as short labelled lines: Register (formal/plain/warm…), Sentence rhythm (typical length, fragments?), Vocabulary it favours, Words/phrases it avoids, How it opens and closes pieces, Structural habits (headings, lists, questions), Point of view (we/you, first person?), One line on what makes it distinct.",
            },
          },
          required: ["profile"],
        },
      },
      maxTokens: 700,
    });
    const profile = typeof result.profile === "string" ? result.profile.trim().slice(0, 1600) : "";
    if (!profile) return;

    await serviceClient.from("workshop_voice_profiles").upsert(
      { client_id: clientId, profile, example_count: kept, updated_at: new Date().toISOString() },
      { onConflict: "client_id" },
    );
  } catch (e) {
    // Learning is best-effort — it must never break saving feedback.
    console.error("maybeRefreshVoiceProfile error:", e);
  }
}
