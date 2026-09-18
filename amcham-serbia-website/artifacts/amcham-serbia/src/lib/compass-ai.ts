// Proxies to a small Cloudflare Worker that holds the real Anthropic API key
// server-side — this static site can never hold that key itself. The Worker
// grounds every answer in whatever `context` the caller passes (never the
// full fixture set), per its own system prompt. See compass-worker/.
const COMPASS_WORKER_URL = 'https://amcham-compass-worker.andrija-amcham.workers.dev';

export class CompassAiError extends Error {}

export async function askCompassAI(query: string, context: unknown): Promise<string> {
  let response: Response;
  try {
    response = await fetch(COMPASS_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context }),
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
