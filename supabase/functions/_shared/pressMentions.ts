// Real, external verification for Thought Leadership's "news mentions"
// sub-score. See pressMentionsFormula.ts for why this exists and why the
// firm's own domain is excluded from the results.
import { safeFetch } from "./safeFetch.ts";
import { getCached, setCached } from "./cache.ts";
import { parseRssItems, filterPressMentions, extractDomain, type PressMention } from "./pressMentionsFormula.ts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function findPressMentions(
  firmName: string,
  auditedDomain: string,
  windowDays: number,
): Promise<PressMention[]> {
  const query = firmName.trim();
  if (!query) return [];

  const cacheKey = `${query}::${auditedDomain}`;
  const cached = await getCached("press-mentions", cacheKey);
  if (cached.hit) {
    return filterPressMentions((cached.hit as { raw: ReturnType<typeof parseRssItems> }).raw, {
      windowDays,
      targetDomain: extractDomain(auditedDomain),
    });
  }

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`"${query}"`)}&hl=en-US&gl=US&ceid=US:en`;

  let xml: string;
  try {
    const res = await safeFetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LegalOS/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    xml = await res.text();
  } catch (e) {
    console.error("[pressMentions] Google News RSS fetch failed:", e);
    return [];
  }

  const rawItems = parseRssItems(xml);
  await setCached(cached.key, "press-mentions", cacheKey, { raw: rawItems }, SEVEN_DAYS_MS);

  return filterPressMentions(rawItems, { windowDays, targetDomain: extractDomain(auditedDomain) });
}
