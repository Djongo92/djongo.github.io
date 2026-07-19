/** Reads an OpenAI-style SSE stream and invokes onChunk with appended content. */
export async function streamSSE(
  resp: Response,
  onChunk: (full: string) => void,
): Promise<string> {
  if (!resp.body) throw new Error("No response body");
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") return full;
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) {
          full += c;
          onChunk(full);
        }
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  return full;
}