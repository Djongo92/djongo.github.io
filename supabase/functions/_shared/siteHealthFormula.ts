// Pure parsing logic for Batch K's site-health checks, split out from
// siteHealth.ts (which does the actual network I/O) so it can be unit
// tested without a Deno runtime — same pattern as performanceFormula.ts,
// socialFormula.ts, thoughtLeadershipFormula.ts.

export function hasContactForm(html: string): boolean {
  return /<form\b/i.test(html);
}

/** Finds a 4-digit year near a "©" or "copyright" marker, e.g. a footer. */
export function extractCopyrightYear(html: string): number | null {
  const match = html.match(/(?:©|copyright)[^\d]{0,20}(\d{4})/i);
  return match ? parseInt(match[1], 10) : null;
}

export function isCopyrightStale(copyrightYear: number | null, currentYear: number): boolean {
  return copyrightYear !== null && currentYear - copyrightYear >= 2;
}

/** Extracts same-origin hrefs from a page, deduped, capped at `max`. */
export function extractInternalLinks(html: string, baseUrl: string, max: number): string[] {
  const origin = new URL(baseUrl).origin;
  const hrefMatches = Array.from(html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)).map((m) => m[1]);
  const internalLinks = new Set<string>();
  for (const href of hrefMatches) {
    if (internalLinks.size >= max) break;
    try {
      const abs = new URL(href, baseUrl);
      if (abs.origin === origin) internalLinks.add(abs.href);
    } catch {
      // Malformed href — skip it, not a broken-link signal.
    }
  }
  return Array.from(internalLinks);
}
