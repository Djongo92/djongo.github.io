import { describe, it, expect } from "vitest";
import { challengeRecordValue, parseTxtAnswers, matchesChallenge, randomToken } from "./domainVerification";

describe("challengeRecordValue", () => {
  it("prefixes the token with the challenge marker", () => {
    expect(challengeRecordValue("abc123")).toBe("legalos-verify=abc123");
  });
});

describe("parseTxtAnswers", () => {
  it("strips the literal quotes Cloudflare's DoH API wraps TXT values in", () => {
    expect(parseTxtAnswers([{ data: '"legalos-verify=abc123"' }])).toEqual(["legalos-verify=abc123"]);
  });

  it("handles multiple answers, including unrelated TXT records", () => {
    const result = parseTxtAnswers([
      { data: '"v=spf1 include:_spf.example.com ~all"' },
      { data: '"legalos-verify=abc123"' },
    ]);
    expect(result).toEqual(["v=spf1 include:_spf.example.com ~all", "legalos-verify=abc123"]);
  });

  it("returns an empty array for no answers", () => {
    expect(parseTxtAnswers([])).toEqual([]);
  });

  it("tolerates a missing data field", () => {
    expect(parseTxtAnswers([{}])).toEqual([""]);
  });
});

describe("matchesChallenge", () => {
  it("matches when the exact challenge record is present", () => {
    expect(matchesChallenge(["legalos-verify=abc123"], "abc123")).toBe(true);
  });

  it("matches when the challenge record is present alongside unrelated records", () => {
    expect(matchesChallenge(["v=spf1 ~all", "legalos-verify=abc123", "google-site-verification=xyz"], "abc123")).toBe(true);
  });

  it("does not match a different token", () => {
    expect(matchesChallenge(["legalos-verify=abc123"], "different-token")).toBe(false);
  });

  it("does not match when no TXT records exist", () => {
    expect(matchesChallenge([], "abc123")).toBe(false);
  });

  it("does not match a record that merely contains the token without the challenge prefix", () => {
    expect(matchesChallenge(["abc123"], "abc123")).toBe(false);
  });
});

describe("randomToken", () => {
  it("generates a 20-character token with no hyphens", () => {
    const token = randomToken();
    expect(token).toHaveLength(20);
    expect(token).not.toContain("-");
  });

  it("generates different tokens on each call", () => {
    expect(randomToken()).not.toBe(randomToken());
  });
});
