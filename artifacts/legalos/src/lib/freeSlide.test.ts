import { describe, it, expect } from "vitest";
import { slideToFree, resolveColor, snap, isSafeImage } from "./freeSlide";
import { paletteFor } from "./deckTheme";
import { classifySlideLayout, type ParsedSlide } from "@/components/pitchDeckParser";

const mk = (bullets: string[], extra: Partial<ParsedSlide> = {}): ParsedSlide => {
  const s = { title: "Team", headline: "The people who run it", bullets, notes: "", layout: "bullets" as const, ...extra };
  return { ...s, layout: extra.layout ?? classifySlideLayout(s, 3) };
};

describe("freeSlide", () => {
  it("converts every layout into items with unique ids inside the canvas", () => {
    for (const layout of ["title", "section", "quote", "stats", "process", "cards", "split", "bullets"] as const) {
      const s = mk(["Banking: twelve lawyers", "Disputes: eight lawyers", "Tax: five lawyers"], { layout });
      const free = slideToFree(s, 3, 8, "Acme");
      expect(free.items.length).toBeGreaterThan(1);
      expect(new Set(free.items.map((i) => i.id)).size).toBe(free.items.length);
      for (const it of free.items) {
        expect(it.x).toBeGreaterThanOrEqual(-1);
        expect(it.x + it.w).toBeLessThanOrEqual(1601);
      }
    }
  });

  it("carries per-item pictures into the free layout", () => {
    const img = "data:image/png;base64,AAAA";
    const s = mk(["Banking: x", "Disputes: y", "Tax: z"], { layout: "cards", itemImages: [img, undefined, img] });
    const imgs = slideToFree(s, 3, 8).items.filter((i) => i.kind === "image");
    expect(imgs).toHaveLength(2);
  });

  it("resolves theme tokens, passes through hex, and rejects junk", () => {
    const P = paletteFor();
    expect(resolveColor("primary", P)).toBe(P.navy);
    expect(resolveColor("#112233", P)).toBe("#112233");
    expect(resolveColor("red;}", P)).toBe(P.ink);
  });

  it("snaps to the grid and only trusts data-URL images", () => {
    expect(snap(23)).toBe(20);
    expect(isSafeImage("data:image/png;base64,AA")).toBe(true);
    expect(isSafeImage("https://evil.example/x.png")).toBe(false);
  });
});
