// Shared Claude API helpers, replacing Lovable's OpenAI-compatible AI
// gateway (which proxied to Gemini). Uses ANTHROPIC_API_KEY directly.
//
// Two entry points matching the two patterns every AI-calling function in
// this repo used under the old gateway:
//  - callClaudeTool: forced tool-use, returns the parsed tool input object
//    (replaces the old `tool_choice: { type: "function", ... }` pattern).
//  - streamClaudeText: streams plain text, re-emitted as OpenAI-style SSE
//    chunks so the existing client-side src/lib/streamSSE.ts parser needs
//    no changes at all.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 4096;

export class ClaudeApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface CallToolOpts {
  system: string;
  user: string;
  tool: ClaudeTool;
  model?: string;
  maxTokens?: number;
}

/** Forces Claude to call the given tool and returns its parsed input object. */
export async function callClaudeTool(opts: CallToolOpts): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      tools: [opts.tool],
      tool_choice: { type: "tool", name: opts.tool.name },
    }),
  });

  if (response.status === 429) throw new ClaudeApiError("Rate limit reached. Try again shortly.", 429);
  if (!response.ok) {
    const t = await response.text().catch(() => "");
    console.error("Claude API error:", response.status, t);
    throw new ClaudeApiError("AI service error", 500);
  }

  const data = await response.json();
  const toolUse = (data.content as Array<Record<string, unknown>> | undefined)?.find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error("No tool_use result from Claude");
  return toolUse.input as Record<string, unknown>;
}

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface StreamTextOpts {
  system: string;
  /** Single-turn convenience — mutually exclusive with `messages`. */
  user?: string;
  /** Full conversation history for multi-turn chat endpoints. */
  messages?: ClaudeMessage[];
  model?: string;
  maxTokens?: number;
}

/**
 * Streams plain text from Claude, re-emitted as OpenAI-style SSE chunks
 * (`data: {"choices":[{"delta":{"content": "..."}}]}`, ending with
 * `data: [DONE]`) so the existing client parser needs no changes.
 */
export async function streamClaudeText(opts: StreamTextOpts, corsHeaders: Record<string, string>): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: opts.system,
      messages: opts.messages ?? [{ role: "user", content: opts.user ?? "" }],
      stream: true,
    }),
  });

  if (upstream.status === 429) {
    return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => "");
    console.error("Claude stream error:", upstream.status, t);
    return new Response(JSON.stringify({ error: "AI service error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformed = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
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
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const evt = JSON.parse(jsonStr);
              if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                const chunk = { choices: [{ delta: { content: evt.delta.text as string } }] };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch {
              // Incomplete JSON on this line — wait for more data.
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Claude stream transform error:", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(transformed, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
