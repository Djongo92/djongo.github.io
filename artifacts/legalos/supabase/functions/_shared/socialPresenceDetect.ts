// Social presence detection: when an audit arrives without intake-supplied
// social metrics (census batch, teaser runs), the homepage tells us which
// platforms the firm publicly links to. Detected presence scores only the
// 4-point platform dimension — followers, posting cadence and engagement
// genuinely require intake or platform APIs, so those stay zero and the
// provenance is labeled "detected", never "self_reported".
import { safeFetch, SELF_IDENTIFYING_UA, BROWSER_FALLBACK_UA } from "./safeFetch.ts";
import { homepageVariants } from "./hostVariants.ts";
import type { SocialInput } from "./socialScore.ts";

type Platforms = SocialInput["platforms"];

// Share widgets link to the platform domains too — a "share this on
// Facebook" button is not a firm presence.
const SHARE_JUNK = /(sharer|share\.php|intent\/|dialog\/|plugins\/|\/share[?/=])/i;

export function extractSocialPlatforms(html: string): Platforms {
  const hrefs = html.match(/href=["'][^"']+["']/gi) ?? [];
  const has = (re: RegExp) => hrefs.some((h) => re.test(h) && !SHARE_JUNK.test(h));
  return {
    linkedin: has(/linkedin\.com\/(company|in)\//i),
    instagram: has(/instagram\.com\//i),
    twitter: has(/(?:twitter\.com|x\.com)\//i),
    facebook: has(/facebook\.com\//i),
  };
}

export async function detectSocialPlatforms(normalizedUrl: string): Promise<Platforms | null> {
  // Self-identify first across both host variants; some firm sites 403 bot
  // UAs under bot protection but serve the same public homepage to a browser
  // UA, so retry with one before declaring the site undetectable.
  for (const ua of [SELF_IDENTIFYING_UA, BROWSER_FALLBACK_UA]) {
    for (const candidate of homepageVariants(normalizedUrl)) {
      try {
        const res = await safeFetch(candidate, {
          headers: { "User-Agent": ua },
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) continue;
        return extractSocialPlatforms(await res.text());
      } catch { /* try the next host variant / UA */ }
    }
  }
  // An unfetchable site must not flip Social from "missing" to a guess.
  return null;
}
