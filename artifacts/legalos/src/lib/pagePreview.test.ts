import { describe, it, expect } from "vitest";
import { extractHtml, sanitizeHtml, buildPageDocument } from "./pagePreview";

describe("pagePreview", () => {
  it("extracts the last html fence, including one that is still streaming", () => {
    expect(extractHtml("x\n```html\n<h1>Hi</h1>\n```\nmore")).toBe("<h1>Hi</h1>");
    expect(extractHtml("x\n```html\n<h1>Hi</h1>\n<p>par")).toBe("<h1>Hi</h1>\n<p>par");
    expect(extractHtml("no code here")).toBe("");
  });

  it("strips scripts, handlers, javascript: links and inline styles", () => {
    const out = sanitizeHtml('<h1 onclick="x()" style="color:red">T</h1><script>alert(1)</script><a href="javascript:alert(1)">l</a><iframe src="//e"></iframe><a href="#contact">ok</a>');
    expect(out).not.toMatch(/script|onclick|javascript|iframe|style/i);
    expect(out).toContain('href="#contact"');
  });

  it("wraps the body in a themed document and escapes the title", () => {
    const doc = buildPageDocument("<h1>T</h1>", { theme: "modern", accent: "#112233", title: "<b>x" });
    expect(doc).toContain("<title>&lt;b&gt;x</title>");
    expect(doc).toContain("#112233");
    expect(doc).toContain("<h1>T</h1>");
  });

  it("falls back to the default accent when given a non-hex colour", () => {
    expect(buildPageDocument("<p>x</p>", { theme: "classic", accent: "red;}</style><script>" })).not.toContain("<script>");
  });
});
