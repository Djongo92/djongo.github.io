// Proxies to a small Cloudflare Worker that holds the real Anthropic API key
// server-side — this static site can never hold that key itself. The Worker
// grounds every answer in whatever `context` the caller passes (never the
// full fixture set), per its own system prompt. See compass-worker/.
const COMPASS_WORKER_URL = 'https://amcham-compass-worker.andrija-amcham.workers.dev';

export class CompassAiError extends Error {}

export interface CompassHistoryTurn {
  role: 'user' | 'assistant';
  text: string;
}

const MAX_HISTORY_TURNS = 6; // ~3 exchanges — enough for a natural follow-up, small enough to stay cheap
const MAX_HISTORY_CHARS = 280;

// Both FABs keep a flat transcript of {id, role, text|answer.text, pending}.
// This turns the last few *resolved* turns into the short history the Worker
// threads back into the Anthropic call, so a follow-up like "why?" has a
// referent instead of starting from zero every time. Excludes the proactive
// "nudge" message specifically: it's the one assistant-only entry that can
// appear before any user turn, and Anthropic requires history to open on a
// user turn — dropping it also keeps this to turns the person actually asked.
export function buildCompassHistory(
  messages: Array<{ id: string; role: 'user' | 'assistant'; text?: string; answer?: { text: string }; pending?: boolean }>,
): CompassHistoryTurn[] {
  return messages
    .filter((m) => m.id !== 'nudge' && !m.pending && (m.text || m.answer?.text))
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role, text: (m.text ?? m.answer?.text ?? '').slice(0, MAX_HISTORY_CHARS) }));
}

export async function askCompassAI(query: string, context: unknown, history: CompassHistoryTurn[] = []): Promise<string> {
  let response: Response;
  try {
    response = await fetch(COMPASS_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context, history }),
    });
  } catch {
    throw new CompassAiError('Could not reach Compass right now.');
  }

  if (!response.ok) {
    throw new CompassAiError('Compass could not answer that just now.');
  }

  const data = (await response.json().catch(() => null)) as { text?: string } | null;
  if (!data?.text) {
    throw new CompassAiError('Compass did not return an answer.');
  }
  return data.text;
}
