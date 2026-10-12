import type { CompassHistoryTurn } from './compass-ai';

// "This laptop" mode for Compass: answers come from a model running locally in
// Ollama (https://ollama.com), so nothing leaves the machine. The demo uses it
// to show the private tier working with the network switched off. Setup notes:
// compass-local/README.md.

export type CompassProvider = 'cloud' | 'local';

const PROVIDER_KEY = 'amcham_compass_provider';
const MODEL_KEY = 'amcham_compass_local_model';
const URL_KEY = 'amcham_compass_local_url';
export const DEFAULT_LOCAL_URL = 'http://localhost:11434';

// Preferred families, in order, when several models are installed.
const PREFERRED = ['qwen2.5', 'qwen3', 'llama3.1', 'llama3.2', 'gemma3', 'gemma2', 'mistral'];

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

export const getProvider = (): CompassProvider => (read(PROVIDER_KEY) === 'local' ? 'local' : 'cloud');
export const setProvider = (p: CompassProvider) => write(PROVIDER_KEY, p);
export const getLocalUrl = () => read(URL_KEY) || DEFAULT_LOCAL_URL;

export interface LocalStatus {
  state: 'checking' | 'ready' | 'offline';
  model?: string;
}

export async function checkLocal(): Promise<LocalStatus> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch(`${getLocalUrl()}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) return { state: 'offline' };
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = (data.models ?? []).map((m) => m.name);
    if (!names.length) return { state: 'offline' };
    const saved = read(MODEL_KEY);
    const model = (saved && names.includes(saved) ? saved : null)
      ?? PREFERRED.map((p) => names.find((n) => n.startsWith(p))).find(Boolean)
      ?? names[0];
    return { state: 'ready', model };
  } catch {
    return { state: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

// Mirrors the Worker's system prompt (compass-worker/src/index.ts) so the
// local and cloud tiers answer in the same voice.
const LOCAL_SYSTEM_PROMPT = `You are Compass, the assistant built into AmCham Serbia's staff console. If asked what you are, say you're Compass, AmCham's assistant, running privately on this computer; never name the underlying model. Answer using ONLY the JSON data provided with the question; never invent numbers, names or facts. If the data doesn't cover the question, say the closest useful thing in one short sentence. The data may include a "currentPage" field naming what the person is looking at. Sound like a sharp, plainspoken colleague. Plain prose only: no markdown, no lists, no headers. Keep answers to 2-3 sentences. Earlier turns may be included for context; stay consistent with them.`;

export class CompassLocalError extends Error {}

export async function askLocal(query: string, context: unknown, history: CompassHistoryTurn[], model: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${getLocalUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: 0.3, num_predict: 320 },
        messages: [
          { role: 'system', content: LOCAL_SYSTEM_PROMPT },
          ...history.map((h) => ({ role: h.role, content: h.text })),
          { role: 'user', content: `Data:\n${JSON.stringify(context)}\n\nQuestion: ${query}` },
        ],
      }),
    });
    if (!res.ok) throw new CompassLocalError('The private model could not answer that just now.');
    const data = (await res.json()) as { message?: { content?: string } };
    const text = data.message?.content?.trim();
    if (!text) throw new CompassLocalError('The private model returned an empty answer.');
    return text;
  } catch (err) {
    if (err instanceof CompassLocalError) throw err;
    throw new CompassLocalError('The private model on this laptop is not responding.');
  } finally {
    clearTimeout(timer);
  }
}
