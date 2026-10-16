import { edgeHeaders, supabase } from './supabase';
import { parseSSEText } from './sse';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type ApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function callEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<ApiResult<T>> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { ok: false, error: 'AI tools require the full platform. Sign in at the web app to activate.' };
  }
  try {
    // The session JWT has to ride along in its own header: Authorization
    // always carries the anon key, so without this a signed-in user reads as
    // anonymous server-side and every AI tool here returns 401.
    const { data: sessionData } = await supabase.auth.getSession();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: edgeHeaders(sessionData.session?.access_token),
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      if (resp.status === 429) return { ok: false, error: 'Rate limit reached. Try again in a moment.' };
      if (resp.status === 402) return { ok: false, error: 'AI credits exhausted. Add credits in the web app.' };
      if (resp.status === 401 || resp.status === 403) {
        return { ok: false, error: 'Authentication required. Sign in via the web app first.' };
      }
      // Read the body as text first so a malformed/non-JSON response (e.g. an
      // HTML error page from a proxy) is distinguishable from a legitimate
      // empty body — both used to collapse into the same silent `{}`.
      const text = await resp.text().catch(() => '');
      let parsed: Record<string, unknown> | undefined;
      try {
        parsed = text ? JSON.parse(text) as Record<string, unknown> : undefined;
      } catch {
        parsed = undefined;
      }
      if (parsed && typeof parsed.error === 'string') {
        return { ok: false, error: parsed.error };
      }
      if (text && !parsed) {
        return { ok: false, error: `Server error ${resp.status}: ${text.slice(0, 200)}` };
      }
      return { ok: false, error: `Server error ${resp.status}` };
    }
    // Success answers come in two shapes: JSON (ranked lists like
    // workshop-headlines) or an OpenAI-style SSE stream (long-form rewrites
    // like workshop-bio-rewrite, which has no JSON envelope at all).
    // Normalized before matching — an intermediary may re-case the MIME.
    const contentType = (resp.headers.get('content-type') ?? '').toLowerCase();
    if (contentType.includes('text/event-stream')) {
      const sseBody = await resp.text();
      return { ok: true, data: parseSSEText(sseBody) as T };
    }
    const data = await resp.json() as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
}

/** Format edge function output for display */
export function formatOutput(data: unknown, outputKey?: string): string {
  if (!data) return '';
  const val = outputKey && typeof data === 'object' && data !== null
    ? (data as Record<string, unknown>)[outputKey]
    : data;

  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val.map((item, i) => {
      if (typeof item === 'string') return `${i + 1}. ${item}`;
      if (typeof item === 'object' && item !== null) {
        const o = item as Record<string, unknown>;
        // Headlines format
        if (o.text && o.score !== undefined) {
          return `[${o.score}/10 · ${o.angle}]\n${o.text}\n${o.why ? `↳ ${o.why}` : ''}`;
        }
        // Generic key-value
        return Object.entries(o)
          .filter(([k]) => !['id', 'index'].includes(k))
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
      }
      return String(item);
    }).join('\n\n');
  }
  if (typeof val === 'object' && val !== null) {
    // Calendar or complex object — pretty-print sections
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => {
        if (Array.isArray(v)) return `## ${k}\n${(v as string[]).map((x, i) => `${i + 1}. ${x}`).join('\n')}`;
        return `## ${k}\n${v}`;
      })
      .join('\n\n');
  }
  return JSON.stringify(val, null, 2);
}
