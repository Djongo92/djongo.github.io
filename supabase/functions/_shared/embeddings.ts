// Phase 2 of Workshop "memory" — real semantic similarity via Voyage AI.
// Every call here degrades to null rather than throwing when VOYAGE_API_KEY
// isn't configured or the request errors, so a generation never fails and
// retrieval just falls back to Phase 1's recency ordering (see
// styleMemory.ts's getStyleExamples) — the same "not_configured" posture
// this project already uses for AHREFS_API_KEY/MOZ_API_KEY.
const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-4-lite";

export async function getEmbedding(text: string, inputType: "query" | "document"): Promise<number[] | null> {
  const apiKey = Deno.env.get("VOYAGE_API_KEY");
  if (!apiKey) return null;

  try {
    const res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ input: text.slice(0, 8000), model: MODEL, input_type: inputType }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`Voyage embeddings error: HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    const embedding = json?.data?.[0]?.embedding;
    return Array.isArray(embedding) ? embedding : null;
  } catch (e) {
    console.error("Voyage embeddings request failed:", e);
    return null;
  }
}
