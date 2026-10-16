import { describe, it, expect } from "vitest";
import { isHoneypotFilled, matchDemoCode, normalizeEmail, parseDemoCodes } from "./showcaseCodes";

describe("parseDemoCodes", () => {
  it("returns nothing when unset or blank", () => {
    expect(parseDemoCodes(undefined)).toEqual([]);
    expect(parseDemoCodes("")).toEqual([]);
    expect(parseDemoCodes("  , ,  ")).toEqual([]);
  });

  it("reads bare codes and code:label pairs, trimming whitespace", () => {
    expect(parseDemoCodes(" ALPHA , BRAVO : Acme & Partners ,CHARLIE")).toEqual([
      { code: "ALPHA" },
      { code: "BRAVO", label: "Acme & Partners" },
      { code: "CHARLIE" },
    ]);
  });

  it("keeps a label containing a colon", () => {
    expect(parseDemoCodes("DELTA:Acme: the sequel")).toEqual([{ code: "DELTA", label: "Acme: the sequel" }]);
  });

  it("drops an entry with an empty code", () => {
    expect(parseDemoCodes(":Orphan label,ECHO")).toEqual([{ code: "ECHO" }]);
  });
});

describe("matchDemoCode", () => {
  const codes = [{ code: "ALPHA" }, { code: "BRAVO", label: "Acme" }];

  it("matches regardless of case and surrounding whitespace", async () => {
    expect((await matchDemoCode(codes, "  bravo "))?.label).toBe("Acme");
  });

  it("rejects an unknown code", async () => {
    expect(await matchDemoCode(codes, "ZULU")).toBeNull();
  });

  it("rejects a prefix of a real code", async () => {
    expect(await matchDemoCode(codes, "ALPH")).toBeNull();
  });

  it("has nothing to match when no codes are configured", async () => {
    expect(await matchDemoCode([], "ALPHA")).toBeNull();
  });
});

describe("normalizeEmail / isHoneypotFilled", () => {
  it("trims and lowercases a valid address, rejects junk", () => {
    expect(normalizeEmail("  Ana@Firm.RS ")).toBe("ana@firm.rs");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });

  it("flags only a non-empty honeypot", () => {
    expect(isHoneypotFilled({ website: "" })).toBe(false);
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled({ website: "http://spam" })).toBe(true);
  });
});
