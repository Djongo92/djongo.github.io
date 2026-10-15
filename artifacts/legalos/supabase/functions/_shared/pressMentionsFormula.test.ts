import { describe, it, expect } from "vitest";
import { decodeXmlEntities, extractDomain, parseRssItems, filterPressMentions, type RawRssItem } from "./pressMentionsFormula";

const NOW = new Date("2026-07-22T00:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toUTCString();

describe("decodeXmlEntities", () => {
  it("decodes standard XML entities", () => {
    expect(decodeXmlEntities("Smith &amp; Jones &lt;LLP&gt;")).toBe("Smith & Jones <LLP>");
  });

  it("strips a CDATA wrapper", () => {
    expect(decodeXmlEntities("<![CDATA[Firm wins big case]]>")).toBe("Firm wins big case");
  });

  it("decodes the named apostrophe entity, not just the numeric &#39;", () => {
    expect(decodeXmlEntities("Firm&apos;s biggest deal yet")).toBe("Firm's biggest deal yet");
  });
});

describe("extractDomain", () => {
  it("extracts a bare hostname from a full URL", () => {
    expect(extractDomain("https://www.example.com/path/to/article")).toBe("example.com");
  });

  it("adds a scheme when missing so the URL parser doesn't choke", () => {
    expect(extractDomain("example.rs")).toBe("example.rs");
  });

  it("returns an empty string for garbage input rather than throwing", () => {
    expect(extractDomain("not a url at all ///")).toBe("");
  });

  it("returns an empty string for empty input", () => {
    expect(extractDomain("")).toBe("");
  });
});

describe("parseRssItems", () => {
  it("parses title, link, pubDate, and source url out of RSS <item> blocks", () => {
    const xml = `<rss><channel>
      <item>
        <title><![CDATA[Firm advises on major cross-border deal - Legal News Daily]]></title>
        <link>https://legalnewsdaily.com/firm-advises-deal</link>
        <pubDate>${daysAgo(5)}</pubDate>
        <source url="https://legalnewsdaily.com">Legal News Daily</source>
      </item>
      <item>
        <title>Another mention</title>
        <link>https://otheroutlet.example/article</link>
        <pubDate>${daysAgo(10)}</pubDate>
        <source url="https://otheroutlet.example">Other Outlet</source>
      </item>
    </channel></rss>`;

    const items = parseRssItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Firm advises on major cross-border deal - Legal News Daily");
    expect(items[0].link).toBe("https://legalnewsdaily.com/firm-advises-deal");
    expect(items[0].sourceUrl).toBe("https://legalnewsdaily.com");
  });

  it("returns an empty array when there are no items", () => {
    expect(parseRssItems("<rss><channel></channel></rss>")).toEqual([]);
  });

  it("skips items with no title", () => {
    const xml = `<rss><channel><item><link>https://x.com/a</link><pubDate>${daysAgo(1)}</pubDate></item></channel></rss>`;
    expect(parseRssItems(xml)).toEqual([]);
  });
});

describe("filterPressMentions", () => {
  const raw = (overrides: Partial<RawRssItem>): RawRssItem => ({
    title: "t", link: "https://outlet.example/a", pubDate: daysAgo(5), sourceUrl: "https://outlet.example", ...overrides,
  });

  it("keeps third-party mentions within the window", () => {
    const items = [raw({ title: "a" })];
    const result = filterPressMentions(items, { windowDays: 60, targetDomain: "firm.com", now: NOW });
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("outlet.example");
  });

  it("drops mentions outside the content window", () => {
    const items = [raw({ title: "old", pubDate: daysAgo(90) })];
    const result = filterPressMentions(items, { windowDays: 60, targetDomain: "firm.com", now: NOW });
    expect(result).toHaveLength(0);
  });

  it("drops items with unparseable dates rather than guessing", () => {
    const items = [raw({ title: "bad-date", pubDate: "not a date" })];
    const result = filterPressMentions(items, { windowDays: 60, targetDomain: "firm.com", now: NOW });
    expect(result).toHaveLength(0);
  });

  it("excludes the firm's own domain from its own results — this is the whole point", () => {
    const items = [
      raw({ title: "self-published", link: "https://firm.com/blog/we-won", sourceUrl: "https://firm.com" }),
      raw({ title: "real coverage", link: "https://outlet.example/b", sourceUrl: "https://outlet.example" }),
    ];
    const result = filterPressMentions(items, { windowDays: 60, targetDomain: "firm.com", now: NOW });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("real coverage");
  });

  it("excludes the firm's own domain matched via the link even if source url is missing", () => {
    const items = [raw({ title: "self via link", link: "https://www.firm.com/press", sourceUrl: "" })];
    const result = filterPressMentions(items, { windowDays: 60, targetDomain: "firm.com", now: NOW });
    expect(result).toHaveLength(0);
  });

  it("dedupes items with identical titles", () => {
    const items = [raw({ title: "same headline" }), raw({ title: "same headline" })];
    const result = filterPressMentions(items, { windowDays: 60, targetDomain: "firm.com", now: NOW });
    expect(result).toHaveLength(1);
  });

  it("caps the number of mentions returned", () => {
    const items = Array.from({ length: 80 }, (_, i) => raw({ title: `headline ${i}` }));
    const result = filterPressMentions(items, { windowDays: 60, targetDomain: "firm.com", now: NOW });
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("returns an empty array when there are no items", () => {
    expect(filterPressMentions([], { windowDays: 60, targetDomain: "firm.com", now: NOW })).toEqual([]);
  });
});
