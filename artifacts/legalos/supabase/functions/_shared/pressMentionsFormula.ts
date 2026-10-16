// Pure parsing/filtering logic for real, external press-mention detection.
// No Deno globals, no network — kept separate from pressMentions.ts (which
// does the actual fetch) so this is importable from a plain Vitest test,
// same split as thoughtLeadershipFormula.ts / thoughtLeadershipScore.ts.
//
// Why this exists: the Thought Leadership "news" sub-score previously came
// from an LLM classifying items scraped off the firm's OWN blog/news page —
// which means a firm could inflate it just by writing about itself. Google
// News' public RSS search is a genuinely external, uncontrolled source: the
// firm doesn't get to decide what shows up there. This module parses that
// feed and excludes anything published by the firm's own domain, so what's
// left is (as close as a free source gets to) real third-party coverage.
export interface RawRssItem {
  title: string;
  link: string;
  pubDate: string;
  sourceUrl: string;
}

export interface PressMention {
  title: string;
  source: string;
  link: string;
  date: string; // ISO 8601
}

export function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

export function extractDomain(input: string): string {
  if (!input) return "";
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    return new URL(withScheme).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function parseRssItems(xml: string): RawRssItem[] {
  const items: RawRssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = decodeXmlEntities(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const link = decodeXmlEntities(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
    const pubDate = decodeXmlEntities(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");
    const sourceUrl = block.match(/<source url="([^"]*)"/)?.[1] ?? "";
    if (title) items.push({ title, link, pubDate, sourceUrl });
  }
  return items;
}

const MAX_MENTIONS = 50;

// Words that appear in many firm names and so identify nobody on their own.
const GENERIC_NAME_WORDS = new Set([
  "law", "legal", "lawyers", "lawoffice", "office", "firm", "partners", "partner", "associates",
  "attorneys", "attorney", "advokati", "advokat", "advokatska", "kancelarija", "solicitors",
  "llp", "aod", "and", "the", "international", "serbia", "srbija", "belgrade", "beograd", "group",
]);

// A headline that names the firm by only ONE distinctive word (a surname,
// an acronym) also has to read as law-firm news: surnames and acronyms are
// shared with politicians, athletes and unrelated companies.
const LEGAL_CONTEXT = /\b(law|legal|lawyers?|advokat\w*|pravn\w*|kancelarij\w*|advis(e|es|ed|er|ers|or|ors|ory)|counsel|deal|deals|acqui\w*|merger\w*|transakc\w*|arbitra\w*)\b/;

/** Lowercase, strip diacritics (đ → dj), so "Gecić" matches "Gecic". */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** The distinctive words of a firm's names — what a headline must contain to be about it. */
export function distinctiveNameTokens(names: string[]): string[] {
  const tokens = new Set<string>();
  for (const name of names) {
    for (const t of normalizeForMatch(name).split(/[^a-z0-9]+/)) {
      if (t.length >= 3 && !GENERIC_NAME_WORDS.has(t)) tokens.add(t);
    }
  }
  return [...tokens];
}

/**
 * Whether a headline is plausibly ABOUT the firm. Search feeds match loosely,
 * so a mention only counts when the title names the firm by two of its
 * distinctive words, or by one alongside a law-firm context word.
 */
export function titleMentionsFirm(title: string, names: string[]): boolean {
  const tokens = distinctiveNameTokens(names);
  if (tokens.length === 0) return false;
  const t = normalizeForMatch(title);
  const words = new Set(t.split(/[^a-z0-9]+/));
  const hits = tokens.filter((tok) => words.has(tok)).length;
  return hits >= 2 || (hits === 1 && LEGAL_CONTEXT.test(t));
}

export function filterPressMentions(
  rawItems: RawRssItem[],
  opts: { windowDays: number; targetDomain: string; now?: number; firmNames?: string[] },
): PressMention[] {
  const now = opts.now ?? Date.now();
  const cutoff = now - opts.windowDays * 24 * 60 * 60 * 1000;
  const targetDomain = opts.targetDomain.toLowerCase();

  const seen = new Set<string>();
  const mentions: PressMention[] = [];

  for (const it of rawItems) {
    const t = Date.parse(it.pubDate);
    if (!Number.isFinite(t) || t < cutoff) continue;

    const linkDomain = extractDomain(it.link);
    const sourceDomain = extractDomain(it.sourceUrl);
    // Exclude the firm's own domain — this measures OTHER outlets covering
    // the firm, not the firm covering itself.
    if (targetDomain && (linkDomain === targetDomain || sourceDomain === targetDomain)) continue;

    // Only coverage that is actually about the firm counts (see titleMentionsFirm).
    if (opts.firmNames && !titleMentionsFirm(it.title, opts.firmNames)) continue;

    const dedupeKey = it.title.trim().toLowerCase();
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    mentions.push({
      title: it.title,
      source: sourceDomain || linkDomain || "unknown source",
      link: it.link,
      date: new Date(t).toISOString(),
    });

    if (mentions.length >= MAX_MENTIONS) break;
  }

  return mentions;
}
