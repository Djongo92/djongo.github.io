import { describe, it, expect } from "vitest";
import { hasContactForm, extractCopyrightYear, isCopyrightStale, extractInternalLinks } from "./siteHealthFormula";

describe("hasContactForm", () => {
  it("detects a form tag", () => {
    expect(hasContactForm("<html><body><form action='/contact'></form></body></html>")).toBe(true);
  });

  it("returns false when no form is present", () => {
    expect(hasContactForm("<html><body><p>No form here</p></body></html>")).toBe(false);
  });
});

describe("extractCopyrightYear", () => {
  it("finds a year after a © symbol", () => {
    expect(extractCopyrightYear("<footer>© 2024 Acme Law</footer>")).toBe(2024);
  });

  it("finds a year after the word 'copyright'", () => {
    expect(extractCopyrightYear("<footer>Copyright 2019 Acme Law LLP</footer>")).toBe(2019);
  });

  it("returns null when no copyright marker exists", () => {
    expect(extractCopyrightYear("<footer>Acme Law LLP, all rights reserved</footer>")).toBeNull();
  });
});

describe("isCopyrightStale", () => {
  it("flags a copyright year 2+ years behind current as stale", () => {
    expect(isCopyrightStale(2019, 2026)).toBe(true);
    expect(isCopyrightStale(2024, 2026)).toBe(true);
  });

  it("does not flag the current or previous year as stale", () => {
    expect(isCopyrightStale(2026, 2026)).toBe(false);
    expect(isCopyrightStale(2025, 2026)).toBe(false);
  });

  it("returns false when there's no copyright year to judge", () => {
    expect(isCopyrightStale(null, 2026)).toBe(false);
  });
});

describe("extractInternalLinks", () => {
  const html = `
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
    <a href="https://external.com/page">External</a>
    <a href="/about">About (duplicate)</a>
    <a href="#section">Anchor only</a>
  `;

  it("extracts only same-origin links, deduped", () => {
    const links = extractInternalLinks(html, "https://acmelaw.com", 10);
    expect(links).toEqual(["https://acmelaw.com/about", "https://acmelaw.com/contact"]);
  });

  it("respects the max cap", () => {
    const links = extractInternalLinks(html, "https://acmelaw.com", 1);
    expect(links).toHaveLength(1);
  });

  it("ignores anchor-only and cross-origin hrefs", () => {
    const links = extractInternalLinks(html, "https://acmelaw.com", 10);
    expect(links).not.toContain("https://external.com/page");
  });
});
