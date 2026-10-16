import { describe, it, expect } from "vitest";
import { decodeXmlEntities, extractDomain, parseRssItems, filterPressMentions, titleMentionsFirm, type RawRssItem } from "./pressMentionsFormula";

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

describe("titleMentionsFirm", () => {
  it("accepts a headline that names the firm, diacritics or not", () => {
    expect(titleMentionsFirm("Gecić Law advises on landmark energy deal", ["Gecić Law"])).toBe(true);
    expect(titleMentionsFirm("Gecic Law advises on landmark energy deal", ["Gecić Law"])).toBe(true);
  });

  it("rejects unrelated stories a loose search returned (real cases from the audit data)", () => {
    expect(titleMentionsFirm("Tepić odgovorila Vučiću na optužbe: Kontroliši se i spremi, novi dokazi stižu", ["ZSP"])).toBe(false);
    expect(titleMentionsFirm("A $150M contract for migrant kids' lawyers goes to a Trump-linked Texas firm", ["AP Legal"])).toBe(false);
  });

  it("rejects namesakes: a lone surname or acronym in non-legal news", () => {
    expect(titleMentionsFirm("Drasko Stanivukovic gave up his Candidacy for President of Republika Srpska", ["stanivukovic"])).toBe(false);
    expect(titleMentionsFirm("Electronic monitoring system is 'broken' and needs legislative fix, State's Attorney says - CWB Chicago", ["CWB"])).toBe(false);
  });

  it("accepts two distinctive name words without extra context", () => {
    expect(titleMentionsFirm("Ikonic Stikovic Opens Doors in Belgrade", ["Ikonic Stikovic"])).toBe(true);
  });

  it("requires a legal context for short names and acronyms", () => {
    expect(titleMentionsFirm("CWB reports quarterly earnings", ["CWB"])).toBe(false);
    expect(titleMentionsFirm("CWB law firm advises on trademark dispute", ["CWB"])).toBe(true);
  });

  it("never matches on generic words alone", () => {
    expect(titleMentionsFirm("Law office opens in Belgrade", ["Law Office"])).toBe(false);
  });
});

describe("filterPressMentions with firmNames", () => {
  it("drops items that are not about the firm", () => {
    const now = Date.parse("2026-08-24T00:00:00Z");
    const recent = new Date(now - 864e5).toUTCString();
    const items = [
      { title: "JPM & Partners advises on bond issue", link: "https://x.example/a", pubDate: recent, sourceUrl: "https://x.example" },
      { title: "Unrelated political news", link: "https://x.example/b", pubDate: recent, sourceUrl: "https://x.example" },
    ];
    const out = filterPressMentions(items, { windowDays: 90, targetDomain: "jpm.law", now, firmNames: ["JPM & Partners"] });
    expect(out.map((m) => m.title)).toEqual(["JPM & Partners advises on bond issue"]);
  });
});
