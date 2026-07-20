// Batch K — cheap, trust-building site-health checks layered onto the
// Performance category's crawl. Not part of the 200-pt score (nothing here
// is peer-normalized or point-valued) — purely an informational panel:
// "your contact form has been down for six weeks" builds trust in
// everything else the dashboard says, and it's nearly free to add since
// we're already fetching the homepage for the audit.
import { safeFetch } from "./safeFetch.ts";
import { hasContactForm, extractCopyrightYear, isCopyrightStale, extractInternalLinks } from "./siteHealthFormula.ts";

export interface SiteHealthResult {
  hasContactForm: boolean;
  copyrightYear: number | null;
  copyrightStale: boolean;
  brokenLinks: string[];
  checkedLinks: number;
}

const MAX_LINKS_TO_CHECK = 6;

export async function checkSiteHealth(normalizedUrl: string): Promise<SiteHealthResult | null> {
  try {
    const res = await safeFetch(normalizedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LegalOS/1.0)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const copyrightYear = extractCopyrightYear(html);
    const internalLinks = extractInternalLinks(html, normalizedUrl, MAX_LINKS_TO_CHECK);

    const brokenLinks: string[] = [];
    await Promise.all(
      internalLinks.map(async (link) => {
        try {
          const linkRes = await safeFetch(link, { method: "HEAD", signal: AbortSignal.timeout(8000) });
          if (!linkRes.ok) brokenLinks.push(link);
        } catch {
          brokenLinks.push(link);
        }
      }),
    );

    return {
      hasContactForm: hasContactForm(html),
      copyrightYear,
      copyrightStale: isCopyrightStale(copyrightYear, new Date().getFullYear()),
      brokenLinks,
      checkedLinks: internalLinks.length,
    };
  } catch (e) {
    console.error("[siteHealth] crawl failed:", e);
    return null;
  }
}
