import { describe, it, expect } from "vitest";
import { REGIONAL_TRADE_OUTLETS, buildOutletUrl, withOutletSource, type TradeOutlet } from "./regionalTradePressFormula";
import { parseRssItems, filterPressMentions } from "./pressMentionsFormula";

const wpOutlet: TradeOutlet = { id: "bizlife", domain: "bizlife.rs", strategy: "wp-search-rss" };
const gnOutlet: TradeOutlet = { id: "seenews", domain: "seenews.com", strategy: "google-news-site" };

describe("REGIONAL_TRADE_OUTLETS registry", () => {
  it("covers the regional trade outlets the press axis was undercounting", () => {
    const domains = REGIONAL_TRADE_OUTLETS.map((o) => o.domain);
    expect(domains).toContain("seenews.com");
    expect(domains).toContain("bizlife.rs");
    expect(domains).toContain("novaekonomija.rs");
    expect(domains).toContain("danas.rs");
    expect(domains).toContain("ekapija.com");
  });

  it("pins each new outlet to its probed strategy (WP feeds verified phrase-exact; eKapija is fetch-blocked)", () => {
    const byId = Object.fromEntries(REGIONAL_TRADE_OUTLETS.map((o) => [o.id, o.strategy]));
    expect(byId["novaekonomija"]).toBe("wp-search-rss");
    expect(byId["danas"]).toBe("wp-search-rss");
    expect(byId["ekapija"]).toBe("google-news-site");
  });

  it("has unique ids and domains", () => {
    expect(new Set(REGIONAL_TRADE_OUTLETS.map((o) => o.id)).size).toBe(REGIONAL_TRADE_OUTLETS.length);
    expect(new Set(REGIONAL_TRADE_OUTLETS.map((o) => o.domain)).size).toBe(REGIONAL_TRADE_OUTLETS.length);
  });

  it("builds a valid URL for every registered outlet — no strategy falls through", () => {
    for (const o of REGIONAL_TRADE_OUTLETS) {
      expect(buildOutletUrl(o, "BDK Advokati")).toMatch(/^https:\/\//);
    }
  });
});

describe("buildOutletUrl", () => {
  it("builds a quoted-phrase WordPress search RSS URL", () => {
    expect(buildOutletUrl(wpOutlet, "BDK Advokati")).toBe(
      `https://bizlife.rs/?s=${encodeURIComponent('"BDK Advokati"')}&feed=rss2`,
    );
  });

  it("builds a site-scoped Google News RSS query for fetch-blocked outlets", () => {
    const url = buildOutletUrl(gnOutlet, "BDK Advokati");
    expect(url.startsWith("https://news.google.com/rss/search?q=")).toBe(true);
    expect(url).toContain(encodeURIComponent('"BDK Advokati" site:seenews.com'));
  });

  it("trims whitespace around the firm name before quoting", () => {
    expect(buildOutletUrl(wpOutlet, "  BDK Advokati  ")).toBe(buildOutletUrl(wpOutlet, "BDK Advokati"));
  });
});

describe("withOutletSource", () => {
  const NOW = new Date("2026-07-22T00:00:00Z").getTime();
  const recent = new Date(NOW - 5 * 24 * 60 * 60 * 1000).toUTCString();

  it("stamps the outlet domain onto items with no per-item source (WP feeds)", () => {
    const xml = `<rss><channel><item>
      <title>Firma savetovala veliku transakciju</title>
      <link>https://bizlife.rs/vesti/firma-savetovala</link>
      <pubDate>${recent}</pubDate>
    </item></channel></rss>`;
    const items = withOutletSource(parseRssItems(xml), wpOutlet);
    expect(items[0].sourceUrl).toBe("https://bizlife.rs");
  });

  it("leaves an existing per-item source untouched (Google News feeds)", () => {
    const items = withOutletSource(
      [{ title: "t", link: "https://x.example/a", pubDate: recent, sourceUrl: "https://news-outlet.example" }],
      wpOutlet,
    );
    expect(items[0].sourceUrl).toBe("https://news-outlet.example");
  });

  it("outlet items flow through the shared filter with correct source attribution", () => {
    const xml = `<rss><channel><item>
      <title>Firm advises on deal</title>
      <link>https://bizlife.rs/vesti/deal</link>
      <pubDate>${recent}</pubDate>
    </item></channel></rss>`;
    const mentions = filterPressMentions(withOutletSource(parseRssItems(xml), wpOutlet), {
      windowDays: 60,
      targetDomain: "firm.com",
      now: NOW,
    });
    expect(mentions).toHaveLength(1);
    expect(mentions[0].source).toBe("bizlife.rs");
  });

  it("the shared filter still excludes the firm's own domain for outlet-stamped items", () => {
    const items = withOutletSource(
      [{ title: "self", link: "https://firm.com/press", pubDate: recent, sourceUrl: "" }],
      wpOutlet,
    );
    // own-domain link wins over stamped outlet source
    const mentions = filterPressMentions(items, { windowDays: 60, targetDomain: "firm.com", now: NOW });
    expect(mentions).toHaveLength(0);
  });
});
