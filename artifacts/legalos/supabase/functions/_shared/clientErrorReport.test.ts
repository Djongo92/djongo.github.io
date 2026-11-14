import { describe, expect, it } from "vitest";
import { CLIENT_ERROR_JOB, parseClientErrorReport, scrub } from "./clientErrorReport.ts";

describe("scrub", () => {
  it("removes emails, URL query strings and long tokens", () => {
    expect(scrub("failed for ana@firma.rs")).toBe("failed for [email]");
    expect(scrub("GET https://x.supabase.co/rest/v1/t?select=*&key=abc failed"))
      .toBe("GET https://x.supabase.co/rest/v1/t failed");
    expect(scrub("token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abc123 bad")).toBe("token [token] bad");
  });

  it("leaves ordinary error text alone", () => {
    const msg = "Cannot read properties of undefined (reading 'score')";
    expect(scrub(msg)).toBe(msg);
  });
});

describe("parseClientErrorReport", () => {
  it("rejects bodies without a message", () => {
    expect(parseClientErrorReport(null)).toBeNull();
    expect(parseClientErrorReport({})).toBeNull();
    expect(parseClientErrorReport({ message: "   " })).toBeNull();
    expect(parseClientErrorReport("boom")).toBeNull();
  });

  it("builds a cron_alerts row tagged with the source", () => {
    const row = parseClientErrorReport({
      message: "x is undefined",
      source: "boundary",
      route: "/app/share/9b2f7c1e?ref=mail",
      release: "abc123",
      stack: "at Foo (https://site/app/assets/index-1.js?v=2:1:2)",
    })!;
    expect(row.job).toBe(CLIENT_ERROR_JOB);
    expect(row.message).toBe("[boundary] x is undefined");
    const detail = JSON.parse(row.detail);
    expect(detail.route).toBe("/app/share/:id");
    expect(detail.release).toBe("abc123");
    expect(detail.stack).toBe("at Foo (https://site/app/assets/index-1.js:1:2)");
  });

  it("defaults an unknown source and clips long fields", () => {
    const row = parseClientErrorReport({ message: "m".repeat(1000), source: "nope" })!;
    expect(row.message.startsWith("[error] ")).toBe(true);
    expect(row.message.length).toBeLessThan(320);
  });
});
