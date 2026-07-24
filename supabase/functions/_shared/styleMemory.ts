// Phase 1 "Workshop remembers you" — see the workshop_style_examples
// migration's comment for why this is recency-based, not embeddings-based.
// Deliberately pure data-access, no AI calls here — the actual injection
// into a prompt happens in each generation function, which decides its own
// wording around this block.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type StyleToolId = "bio" | "headlines" | "copywriter" | "rewrite";
export type StyleVerdict = "approved" | "edited" | "rejected";

export interface StyleExample {
  input_summary: string;
  final_text: string;
  verdict: StyleVerdict;
  created_at: string;
}

export async function getRecentStyleExamples(
  serviceClient: SupabaseClient,
  clientId: string,
  toolId: StyleToolId,
  limit = 3,
): Promise<StyleExample[]> {
  // Rejected drafts are still useful signal (see recordStyleExample), but a
  // rejected draft's own text is the last thing worth feeding back in as an
  // example to imitate — only approved/edited ones ever become few-shot
  // examples of the voice to match.
  const { data, error } = await serviceClient
    .from("workshop_style_examples")
    .select("input_summary, final_text, verdict, created_at")
    .eq("client_id", clientId)
    .eq("tool_id", toolId)
    .in("verdict", ["approved", "edited"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentStyleExamples error:", error);
    return [];
  }
  return (data ?? []) as StyleExample[];
}

/** Formats retrieved examples into a system-prompt block. Empty string if there's nothing to inject. */
export function buildStyleMemoryBlock(examples: StyleExample[]): string {
  if (examples.length === 0) return "";
  const body = examples
    .map((e, i) => `Example ${i + 1}${e.verdict === "edited" ? " (this firm's own edit — match this exactly)" : " (kept as generated)"}:\n${e.final_text}`)
    .join("\n\n");
  return `\nThis firm's established voice, from what they've kept before — match tone, structure, and word choice, don't just copy verbatim:\n\n${body}\n`;
}

export async function recordStyleExample(
  serviceClient: SupabaseClient,
  clientId: string,
  toolId: StyleToolId,
  inputSummary: string,
  finalText: string,
  verdict: StyleVerdict,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await serviceClient.from("workshop_style_examples").insert({
    client_id: clientId,
    tool_id: toolId,
    input_summary: inputSummary.slice(0, 2000),
    final_text: finalText.slice(0, 8000),
    verdict,
  });
  if (error) {
    console.error("recordStyleExample error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
