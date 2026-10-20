import { describe, it, expect } from "vitest";
import { paletteFor, DEFAULT_DECK_THEME, luminance } from "./deckTheme";

describe("deckTheme", () => {
  it("default theme reproduces the original navy + gold palette", () => {
    const P = paletteFor();
    expect(P.navy).toBe("#121826");
    expect(P.gold).toBe("#B8893B");
    expect(P.paper).toBe("#F8F5EE");
    expect(P.hex.navy).toBe("121826");
  });

  it("darkens a too-light primary so white text stays readable", () => {
    const P = paletteFor({ ...DEFAULT_DECK_THEME, primary: "#FFFF99" });
    expect(luminance(P.navy)).toBeLessThanOrEqual(0.18);
  });

  it("falls back on invalid colours instead of emitting them", () => {
    const P = paletteFor({ primary: "red;}", accent: "<x>", paper: "nope", fonts: "classic" });
    expect(P.navy).toBe("#121826");
    expect(P.gold).toBe("#B8893B");
  });
});
