import { describe, it, expect, vi, afterEach } from "vitest";
import { extractSocialPlatforms, detectSocialPlatforms } from "./socialPresenceDetect";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("extractSocialPlatforms", () => {
  it("detects linked profile URLs", () => {
    const html = `<footer><a href="https://www.linkedin.com/company/bdk-advokati/">LI</a><a href="https://instagram.com/bdkadvokati">IG</a></footer>`;
    expect(extractSocialPlatforms(html)).toEqual({ linkedin: true, instagram: true, twitter: false, facebook: false });
  });

  it("ignores share widgets — a share button is not a presence", () => {
    const html = `<a href="https://www.facebook.com/sharer/sharer.php?u=https://firm.rs">Share</a><a href="https://twitter.com/intent/tweet?text=x">Tweet</a>`;
    expect(extractSocialPlatforms(html).facebook).toBe(false);
    expect(extractSocialPlatforms(html).twitter).toBe(false);
  });

  it("accepts x.com as twitter", () => {
    expect(extractSocialPlatforms(`<a href="https://x.com/firm">X</a>`).twitter).toBe(true);
  });

  it("returns all false when no profiles are linked", () => {
    const p = extractSocialPlatforms("<html><body>no links here</html>");
    expect(Object.values(p).every((v) => v === false)).toBe(true);
  });
});

describe("detectSocialPlatforms fetch fallback", () => {
  const page = (hrefs: string) => `<html><body>${hrefs}</body></html>`;
  const linkedIn = '<a href="https://www.linkedin.com/company/firm/">LI</a>';

  it("self-identifies first and only falls back to the browser UA after bot-UAs fail on every host", async () => {
    const calls: { url: string; ua: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      const ua = new Headers(init?.headers).get("user-agent") ?? "";
      calls.push({ url, ua });
      // Bot UA is 403 everywhere; browser UA succeeds on the bare host.
      if (ua.includes("Uvid")) return new Response("blocked", { status: 403 });
      return new Response(page(linkedIn), { status: 200 });
    }));

    const result = await detectSocialPlatforms("https://firm.rs");

    expect(result?.linkedin).toBe(true);
    // Bot UA tried on both host variants before the browser UA appears.
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(calls[0].ua).toContain("Uvid");
    expect(calls[1].ua).toContain("Uvid");
    expect(calls[2].ua).not.toContain("Uvid");
  });

  it("returns null when every UA and host variant fails — an unfetchable site stays missing, never a guess", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("blocked", { status: 403 })));
    const result = await detectSocialPlatforms("https://blocked.rs");
    expect(result).toBeNull();
  });
});
