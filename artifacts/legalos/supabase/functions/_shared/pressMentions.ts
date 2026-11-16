// Real, external verification for Thought Leadership's "news mentions"
// sub-score. See pressMentionsFormula.ts for why this exists and why the
// firm's own domain is excluded from the results.
import { safeFetch } from "./safeFetch.ts";
import { getCached, setCached } from "./cache.ts";
import { parseRssItems, filterPressMentions, extractDomain, type PressCoverage, type PressMention, type RawRssItem } from "./pressMentionsFormula.ts";
import type { MarketConfig } from "./marketVisibilityConfig.ts";
import { REGIONAL_TRADE_OUTLETS, buildOutletUrl, withOutletSource } from "./regionalTradePressFormula.ts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface PressLookup {
  mentions: PressMention[];
  coverage: PressCoverage;
}

export async function findPressMentions(
  firmName: string,
  auditedDomain: string,
  windowDays: number,
  localEdition?: MarketConfig["newsEdition"],
): Promise<PressLookup> {
  const query = firmName.trim();
  if (!query) return { mentions: [], coverage: { checked: [], unavailable: [] } };

  // v4: Nova Ekonomija, Danas, and eKapija added to the regional outlet
  // registry (coverage change — a v3 hit would serve a 7-day-stale
  // undercount, so the namespace bumps in lockstep).
  const cacheKey = `${query}::${auditedDomain}`;
  // v5: only complete lookups are cached (every source answered), and the
  // entry carries its coverage. A v4 entry may hide a source that failed.
  const cached = await getCached("press-mentions-v5", cacheKey);
  if (cached.hit) {
    const hit = cached.hit as { raw: RawRssItem[]; coverage: PressCoverage };
    return {
      mentions: filterPressMentions(hit.raw, { windowDays, targetDomain: extractDomain(auditedDomain), firmNames: [query] }),
      coverage: hit.coverage,
    };
  }
  const checked: string[] = [];
  const unavailable: string[] = [];

  // Google News is edition-partitioned: regional trade press (bizlife.rs,
  // Nova Ekonomija, …) often surfaces only in the market-local edition, so a
  // US-edition-only query undercounts real coverage. Query the US edition
  // plus the market's local edition (when configured) and merge; failures of
  // one edition don't forfeit the other. Every source that doesn't answer is
  // recorded in the coverage, and only a lookup where all answered is cached
  // (advisory-negative-cache rule), so the next audit retries.
  const editions = [{ hl: "en-US", gl: "US", ceid: "US:en" }, ...(localEdition ? [localEdition] : [])];
  const rawItems: RawRssItem[] = [];
  for (const ed of editions) {
    const source = `google-news:${ed.gl}`;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`"${query}"`)}&hl=${ed.hl}&gl=${ed.gl}&ceid=${ed.ceid}`;
    try {
      const res = await safeFetch(rssUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Uvid/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        console.warn(`[pressMentions] ${source} answered HTTP ${res.status}`);
        unavailable.push(source);
        continue;
      }
      rawItems.push(...parseRssItems(await res.text()));
      checked.push(source);
    } catch (e) {
      console.error("[pressMentions] Google News RSS fetch failed:", e);
      unavailable.push(source);
    }
  }

  // Regional trade press (SeeNews, bizlife.rs, and others) is
  // barely indexed by the plain Google News query above, so each outlet is
  // queried through its own structured strategy (see
  // regionalTradePressFormula.ts). Same failure posture as editions: one
  // outlet failing doesn't forfeit the others, and results flow through the
  // same date-window / own-domain / dedupe filter below.
  for (const outlet of REGIONAL_TRADE_OUTLETS) {
    const url = buildOutletUrl(outlet, query);
    try {
      const res = await safeFetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Uvid/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        console.warn(`[pressMentions] ${outlet.id} answered HTTP ${res.status}`);
        unavailable.push(outlet.id);
        continue;
      }
      rawItems.push(...withOutletSource(parseRssItems(await res.text()), outlet));
      checked.push(outlet.id);
    } catch (e) {
      console.error(`[pressMentions] regional outlet fetch failed (${outlet.id}):`, e);
      unavailable.push(outlet.id);
    }
  }

  const coverage: PressCoverage = { checked, unavailable };
  if (unavailable.length === 0) {
    await setCached(cached.key, "press-mentions-v5", cacheKey, { raw: rawItems, coverage }, SEVEN_DAYS_MS);
  }

  return {
    mentions: filterPressMentions(rawItems, { windowDays, targetDomain: extractDomain(auditedDomain), firmNames: [query] }),
    coverage,
  };
}
