// "Workshop remembers you" — Phase 1 is recency-based (getRecentStyleExamples,
// see the workshop_style_examples migration's comment for why that's a fine
// proxy at low volume); Phase 2 (getStyleExamples) layers real semantic
// similarity on top via Voyage AI when VOYAGE_API_KEY is configured, falling
// back to Phase 1 automatically otherwise — never a hard requirement.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getEmbedding } from "./embeddings.ts";

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

/**
 * The one function generation edge functions should call. Tries real
 * semantic similarity first (embeds queryText, matches against this
 * firm+tool's own embedded examples via match_workshop_style_examples);
 * falls back to Phase 1's recency ordering whenever Voyage isn't
 * configured, the embedding call fails, or no example in this firm+tool
 * pair has an embedding yet (e.g. it predates the Phase 2 migration).
 */
export async function getStyleExamples(
  serviceClient: SupabaseClient,
  clientId: string,
  toolId: StyleToolId,
  queryText: string,
  limit = 3,
): Promise<StyleExample[]> {
  const queryEmbedding = await getEmbedding(queryText, "query");
  if (queryEmbedding) {
    const { data, error } = await serviceClient.rpc("match_workshop_style_examples", {
      p_client_id: clientId,
      p_tool_id: toolId,
      p_query_embedding: queryEmbedding,
      p_limit: limit,
    });
    if (error) console.error("match_workshop_style_examples error:", error);
    else if (data && data.length > 0) return data as StyleExample[];
  }
  return getRecentStyleExamples(serviceClient, clientId, toolId, limit);
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
  // Only approved/edited rows are ever retrieved as examples (see
  // getRecentStyleExamples's verdict filter) — skip the embedding call for
  // a rejected draft, since it would never be read back.
  const embedding = verdict !== "rejected" ? await getEmbedding(finalText, "document") : null;

  const { error } = await serviceClient.from("workshop_style_examples").insert({
    client_id: clientId,
    tool_id: toolId,
    input_summary: inputSummary.slice(0, 2000),
    final_text: finalText.slice(0, 8000),
    verdict,
    embedding,
  });
  if (error) {
    console.error("recordStyleExample error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
