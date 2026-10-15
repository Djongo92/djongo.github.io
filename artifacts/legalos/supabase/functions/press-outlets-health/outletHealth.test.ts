import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  probeError,
  probeFromItems,
  probeHttpFailure,
  summarizeOutletHealth,
  usableItems,
} from "./outletHealth.ts";
import type { RawRssItem } from "../_shared/pressMentionsFormula.ts";

const item = (over: Partial<RawRssItem> = {}): RawRssItem => ({
  title: "BDK advises on deal",
  link: "https://bizlife.rs/123",
  pubDate: "Mon, 01 Jan 2026 00:00:00 GMT",
  sourceUrl: "https://bizlife.rs",
  ...over,
});

Deno.test("usableItems drops shells missing title, link, or sourceUrl", () => {
  const items = [item(), item({ title: "" }), item({ link: "" }), item({ sourceUrl: "" })];
  assertEquals(usableItems(items).length, 1);
});

Deno.test("probeFromItems is ok only when at least one usable item survives", () => {
  assertEquals(probeFromItems("bizlife", 200, [item()]).ok, true);
  const dead = probeFromItems("bizlife", 200, [item({ title: "" })]);
  assertEquals(dead.ok, false);
  assertEquals(dead.itemCount, 0);
  assertEquals(typeof dead.error, "string");
});

Deno.test("probeHttpFailure records the status; probeError records the message", () => {
  const http = probeHttpFailure("danas", 403);
  assertEquals([http.ok, http.httpStatus, http.error], [false, 403, "HTTP 403"]);
  const boom = probeError("seenews", new Error("timed out"));
  assertEquals([boom.ok, boom.httpStatus, boom.error], [false, null, "timed out"]);
});

Deno.test("summarizeOutletHealth fails the run if ANY outlet failed", () => {
  const good = probeFromItems("bizlife", 200, [item()]);
  const bad = probeHttpFailure("danas", 500);
  assertEquals(summarizeOutletHealth([good]), { ok: true, failed: [] });
  assertEquals(summarizeOutletHealth([good, bad]), { ok: false, failed: ["danas"] });
});
