// The public guidebook excerpts are an SEO surface built from the canonical
// book — they must tease (hook + opening) without giving the product away
// (action items, artifacts, later sections), escape everything, and stay
// in lockstep with the canonical chapter list.
import { describe, it, expect } from "vitest";
// @ts-ignore — plain-JS module, no type declarations
import {
  excerptChapter,
  renderChapterPage,
  renderGuidebookIndex,
  renderSitemap,
  staleGuidebookPages,
  GUIDEBOOK_CTA_URL,
} from "../scripts/guidebookPageRender.mjs";
import { chapters } from "@/data/chapters";

const CHAPTER = {
  id: "ai-search-visibility",
  number: 19,
  title: "AI-Search <Visibility>",
  subtitle: "Being the answer when clients ask ChatGPT",
  hook: "The next referral question is typed into an AI.",
  content: [
    { heading: "Why AI answers matter", paragraphs: ["First paragraph.", "Second paragraph.", "Third paragraph — gated."] },
    { heading: "The checklist", paragraphs: ["Secret later section."] },
  ],
  actionItems: [{ text: "Run the check", priority: "quick-win" }, { text: "Reformat pages", priority: "strategic" }],
  artifacts: [{ type: "checklist", title: "The Monthly AI-Citation Check", body: "secret body" }],
};

describe("guidebook excerpt pages", () => {
  it("excerpt = hook + at most two opening paragraphs; action items and artifacts stay gated", () => {
    const html = renderChapterPage(CHAPTER);
    expect(html).toContain("First paragraph.");
    expect(html).toContain("Second paragraph.");
    expect(html).not.toContain("Third paragraph — gated.");
    expect(html).not.toContain("Secret later section.");
    expect(html).not.toContain("secret body");
    // ...but the gated teaser advertises what unlocks.
    expect(html).toContain("2 prioritised action items");
    expect(html).toContain("The Monthly AI-Citation Check");
  });

  it("every interpolated string is HTML-escaped", () => {
    expect(renderChapterPage(CHAPTER)).toContain("AI-Search &lt;Visibility&gt;");
    expect(renderChapterPage(CHAPTER)).not.toContain("<Visibility>");
  });

  it("every excerpt page CTAs into the teaser funnel", () => {
    expect(renderChapterPage(CHAPTER)).toContain(`href="${GUIDEBOOK_CTA_URL}"`);
    expect(GUIDEBOOK_CTA_URL).toContain("/app/teaser");
  });

  it("index lists every canonical chapter by number — count can never drift", () => {
    const html = renderGuidebookIndex(chapters);
    expect(chapters.length).toBe(21);
    for (const c of chapters) {
      expect(html).toContain(`/guidebook/${c.id}.html`);
    }
  });

  it("a chapter removed from the book has its page pruned", () => {
    const onDisk = ["index.html", "ai-search-visibility.html", "retired-chapter.html"];
    expect(staleGuidebookPages(onDisk, [CHAPTER])).toEqual(["retired-chapter.html"]);
  });

  it("sitemap merges benchmarks and guidebook, gated on SITE_URL", () => {
    expect(renderSitemap(["/guidebook/"], "")).toBeNull();
    const xml = renderSitemap(["/benchmarks/", "/guidebook/", "/guidebook/x.html"], "https://example.com/");
    expect(xml).toContain("<loc>https://example.com/benchmarks/</loc>");
    expect(xml).toContain("<loc>https://example.com/guidebook/x.html</loc>");
  });
});
