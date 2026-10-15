/**
 * De-frames an OpenAI-style SSE body ("data: {...delta...}" lines ending in
 * "data: [DONE]") into plain text. The long-form workshop endpoints (e.g.
 * workshop-bio-rewrite) stream this shape; native fetch can't read streams
 * incrementally, so api.ts reads the body to completion and passes it here.
 * Mirrors the web's streamSSE.ts — keep the parsing rules identical.
 */
export function parseSSEText(text: string): string {
  let full = '';
  for (const rawLine of text.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!line.startsWith('data: ')) continue;
    const json = line.slice(6).trim();
    if (json === '[DONE]') break;
    try {
      const content = JSON.parse(json)?.choices?.[0]?.delta?.content;
      if (typeof content === 'string') full += content;
    } catch {
      // A partial/keepalive line carries no content — skip it.
    }
  }
  return full;
}
