// The guidebook rubric as code. The guidebook is the doctrine layer the
// whole Workshop grounds on, so "every chapter is complete" must be a build
// guard, not a hope.
//
// Ratchet design (stateless-test-proof, per code review):
//  - ORIGINAL_LEGACY_IDS is the FROZEN roster of the 14 pre-program chapters.
//  - LEGACY_ALLOWLIST = roster chapters not yet rewritten; it may only contain
//    roster ids, so a NEW chapter can never hide in it. EMPTY since the
//    Phase 2 rewrite completed — kept as the mechanism for any future legacy.
//  - RUBRIC_DONE = chapters verified at full rubric; it only grows.
//  - Every chapter must sit in EXACTLY ONE of the two sets (partition): a new
//    chapter that touches neither set fails the build loudly.
import { describe, it, expect } from "vitest";
import { chapters, type AuditCategory, type Chapter } from "./chapters";

/** The 14 chapters that predate the guidebook program — frozen forever. */
const ORIGINAL_LEGACY_IDS = new Set([
  "event-marketing",
  "google-search-console",
  "summer-marketing",
  "marketer-leadership-gap",
  "thought-leadership",
  "writing-that-resonates",
  "website-checklist",
  "practice-area-pages",
  "website-ownership",
  "messaging-positioning",
  "marketing-as-strategy",
  "building-credibility",
  "what-gcs-want",
  "common-mistakes",
]);

/** Roster chapters not yet rewritten to the rubric. Shrinks as rewrites land. */
const LEGACY_ALLOWLIST = new Set<string>([
  // Phase 2 complete — empty. Add an id here only to grandfather a regression
  // temporarily, with a dated comment and a follow-up task.
]);

/** Chapters verified at full rubric. Only grows. */
const RUBRIC_DONE = new Set([
  "event-marketing",
  "google-search-console",
  "summer-marketing",
  "marketer-leadership-gap",
  "thought-leadership",
  "writing-that-resonates",
  "website-checklist",
  "practice-area-pages",
  "website-ownership",
  "messaging-positioning",
  "marketing-as-strategy",
  "building-credibility",
  "what-gcs-want",
  "common-mistakes",
  // Phase 3 — new gap chapters, rubric from birth:
  "reputation-reviews",
  "referrals-alumni",
  "intake-conversion",
  "email-nurture",
  "ai-search-visibility",
  "pricing-packaging",
  "measurement",
]);

const VALID_CATEGORIES: AuditCategory[] = ["performance", "social", "seoAuthority", "thoughtLeadership", "reputation"];
const PRIORITIES = ["quick-win", "strategic", "long-term"] as const;

const doneChapters: Chapter[] = chapters.filter((c) => RUBRIC_DONE.has(c.id));

describe("guidebook data sanity (all chapters)", () => {
  it("ids and numbers are unique", () => {
    expect(new Set(chapters.map((c) => c.id)).size).toBe(chapters.length);
    expect(new Set(chapters.map((c) => c.number)).size).toBe(chapters.length);
  });

  it("every chapter sits in exactly one of LEGACY_ALLOWLIST / RUBRIC_DONE (partition)", () => {
    for (const c of chapters) {
      const inLegacy = LEGACY_ALLOWLIST.has(c.id);
      const inDone = RUBRIC_DONE.has(c.id);
      expect(inLegacy !== inDone, `${c.id}: must be in exactly one set`).toBe(true);
    }
  });

  it("the allowlist may only contain original roster ids — new chapters can never hide there", () => {
    for (const id of LEGACY_ALLOWLIST) {
      expect(ORIGINAL_LEGACY_IDS.has(id), `allowlist id "${id}" is not an original roster chapter`).toBe(true);
    }
  });

  it("the pilot chapter is pinned in RUBRIC_DONE", () => {
    expect(RUBRIC_DONE.has("what-gcs-want")).toBe(true);
  });
});

describe("guidebook rubric (RUBRIC_DONE chapters)", () => {
  it("declares the audit categories it moves", () => {
    for (const c of doneChapters) {
      expect(c.categories?.length, `${c.id}: categories`).toBeGreaterThan(0);
      for (const cat of c.categories ?? []) expect(VALID_CATEGORIES, `${c.id}: ${cat}`).toContain(cat);
    }
  });

  it("names a proof metric — the number to watch at the next audit", () => {
    for (const c of doneChapters) expect(c.proofMetric?.trim().length, `${c.id}: proofMetric`).toBeGreaterThan(10);
  });

  it("ships at least one copyable artifact", () => {
    for (const c of doneChapters) {
      expect(c.artifacts?.length, `${c.id}: artifacts`).toBeGreaterThan(0);
      for (const a of c.artifacts ?? []) {
        expect(a.title.trim(), `${c.id}: artifact title`).toBeTruthy();
        expect(a.body.trim().length, `${c.id}: artifact "${a.title}" body`).toBeGreaterThan(50);
      }
    }
  });

  it("carries action items across all three priorities", () => {
    for (const c of doneChapters) {
      const have = new Set((c.actionItems ?? []).map((a) => a.priority));
      for (const p of PRIORITIES) expect(have.has(p), `${c.id}: missing ${p} action item`).toBe(true);
    }
  });

  it("cites a source for every stat — cite it or cut it", () => {
    for (const c of doneChapters) {
      for (const s of c.content) {
        if (s.stat) expect(s.stat.source?.trim(), `${c.id}: unsourced stat "${s.stat.value}"`).toBeTruthy();
      }
    }
  });

  // Factual-benchmark guard (per code review): statistics-shaped claims must
  // not hide in prose, callouts, deep dives, or artifact bodies. Any sentence
  // asserting a market-wide number must carry an attribution — a source with a
  // year, a named study, or first-party framing ("our reviews", "we").
  const CLAIM = /\bthe average\b|\b\d+(?:\.\d+)?%\s+of\s+(?:users|firms|clients|buyers|visitors|pages|companies|prospects)\b|\bstudies show\b|\bresearch shows\b/i;
  const ATTRIBUTION = /\bsource:|\(\D*\d{4}\D*\)|\bstudy\b|\bour\b|\bwe\b|\bUvid\b/i;
  const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter((s) => CLAIM.test(s));

  it("attributes every factual benchmark, wherever it appears — not just stat elements", () => {
    for (const c of doneChapters) {
      const pools: string[] = [];
      for (const s of c.content) {
        pools.push(...(s.paragraphs ?? []), ...(s.bullets ?? []), ...(s.numbered ?? []));
        if (s.pullQuote) pools.push(s.pullQuote);
        if (s.callout) pools.push(s.callout.content);
        if (s.deepDive) pools.push(s.deepDive.content);
      }
      for (const a of c.artifacts ?? []) pools.push(a.body);
      for (const text of pools) {
        for (const sentence of sentences(text)) {
          expect(ATTRIBUTION.test(sentence), `${c.id}: unattributed benchmark — "${sentence.trim().slice(0, 90)}…"`).toBe(true);
        }
      }
    }
  });
});
