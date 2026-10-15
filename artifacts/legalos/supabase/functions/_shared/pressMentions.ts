// Real, external verification for Thought Leadership's "news mentions"
// sub-score. See pressMentionsFormula.ts for why this exists and why the
// firm's own domain is excluded from the results.
import { safeFetch } from "./safeFetch.ts";
import { getCached, setCached } from "./cache.ts";
import { parseRssItems, filterPressMentions, extractDomain, type PressMention, type RawRssItem } from "./pressMentionsFormula.ts";
import type { MarketConfig } from "./marketVisibilityConfig.ts";
import { REGIONAL_TRADE_OUTLETS, buildOutletUrl, withOutletSource } from "./regionalTradePressFormula.ts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function findPressMentions(
  firmName: string,
  auditedDomain: string,
  windowDays: number,
  localEdition?: MarketConfig["newsEdition"],
): Promise<PressMention[]> {
  const query = firmName.trim();
  if (!query) return [];

  // v4: Nova Ekonomija, Danas, and eKapija added to the regional outlet
  // registry (coverage change — a v3 hit would serve a 7-day-stale
  // undercount, so the namespace bumps in lockstep).
  const cacheKey = `${query}::${auditedDomain}`;
  const cached = await getCached("press-mentions-v4", cacheKey);
  if (cached.hit) {
    return filterPressMentions((cached.hit as { raw: ReturnType<typeof parseRssItems> }).raw, {
      windowDays,
      targetDomain: extractDomain(auditedDomain),
    });
  }

  // Google News is edition-partitioned: regional trade press (bizlife.rs,
  // Nova Ekonomija, …) often surfaces only in the market-local edition, so a
  // US-edition-only query undercounts real coverage. Query the US edition
  // plus the market's local edition (when configured) and merge; failures of
  // one edition don't forfeit the other, and an all-fail run caches nothing
  // (advisory-negative-cache rule).
  const editions = [{ hl: "en-US", gl: "US", ceid: "US:en" }, ...(localEdition ? [localEdition] : [])];
  const rawItems: RawRssItem[] = [];
  let anyEditionOk = false;
  for (const ed of editions) {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`"${query}"`)}&hl=${ed.hl}&gl=${ed.gl}&ceid=${ed.ceid}`;
    try {
      const res = await safeFetch(rssUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Uvid/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      anyEditionOk = true;
      rawItems.push(...parseRssItems(await res.text()));
    } catch (e) {
      console.error("[pressMentions] Google News RSS fetch failed:", e);
    }
  }

  // Regional trade press (SeeNews, bizlife.rs, and others) is
  // barely indexed by the plain Google News query above, so each outlet is
  // queried through its own structured strategy (see
  // regionalTradePressFormula.ts). Same failure posture as editions: one
  // outlet failing doesn't forfeit the others, and results flow through the
  // same date-window / own-domain / dedupe filter below.
  let anySourceOk = anyEditionOk;
  for (const outlet of REGIONAL_TRADE_OUTLETS) {
    const url = buildOutletUrl(outlet, query);
    try {
      const res = await safeFetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Uvid/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      anySourceOk = true;
      rawItems.push(...withOutletSource(parseRssItems(await res.text()), outlet));
    } catch (e) {
      console.error(`[pressMentions] regional outlet fetch failed (${outlet.id}):`, e);
    }
  }

  if (anySourceOk) {
    await setCached(cached.key, "press-mentions-v4", cacheKey, { raw: rawItems }, SEVEN_DAYS_MS);
  }

  return filterPressMentions(rawItems, { windowDays, targetDomain: extractDomain(auditedDomain) });
}
