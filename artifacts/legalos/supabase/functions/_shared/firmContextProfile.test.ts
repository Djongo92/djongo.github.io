// Unit tests for buildFirmContextBlock — the per-firm context injection
// that precedes every workshop/narrative/planning system prompt. The
// critical guarantee is identity scoping: the block is assembled from rows
// keyed ONLY by the firmId the caller already verified upstream; these
// tests pin that the queries are scoped to that id and that empty data
// degrades to an empty block (never a cross-firm leak, never a throw).
import { describe, it, expect } from "vitest";
import { buildFirmContextBlock } from "./firmContextProfile";

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

/** Chainable supabase-js stub recording every table + eq() filter. */
function stubClient(tables: Record<string, Row[] | Row | null>) {
  const calls: { table: string; eqs: [string, unknown][] }[] = [];
  const make = (table: string) => {
    const eqs: [string, unknown][] = [];
    const record = () => calls.push({ table, eqs: [...eqs] });
    // deno-lint-ignore no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        eqs.push([col, val]);
        return chain;
      },
      order: () => chain,
      limit: () => {
        record();
        const rows = tables[table];
        return Promise.resolve({ data: Array.isArray(rows) ? rows : rows ? [rows] : [], error: null });
      },
      maybeSingle: () => {
        record();
        const rows = tables[table];
        return Promise.resolve({ data: Array.isArray(rows) ? (rows[0] ?? null) : rows, error: null });
      },
    };
    return chain;
  };
  return {
    calls,
    client: { from: (table: string) => make(table) },
  };
}

const PROFILE = {
  tone_of_voice: "Direct, no legalese",
  brand_rules: "Dark navy only",
  client_restrictions: null,
  practice_areas: ["Employment", "Commercial litigation"],
  jurisdictions: ["DC", "VA"],
  competitor_set: [{ name: "Smith & Gorman", domain: "sg.example" }],
  preferred_terminology: { prefer: ["clients", "matters"], avoid: ["customers"] },
  approved_content: [{ title: "Q3 bio", summary: "Results-first voice" }],
  lawyer_roster: [{ name: "A. Partner", title: "Managing Partner" }],
  synthesis_notes: [
    { at: "2026-08-08T12:00:00Z", tool: "bio-rewrite", toolLabel: "Bio Rewriter", note: "Firm approved first-person, results-first bios.", tags: ["tone", "approved-direction"] },
    { at: "2026-08-06T12:00:00Z", tool: "copywriter", toolLabel: "AI Copywriter", note: "Rejected sensationalist LinkedIn hooks.", tags: ["rejected-direction"] },
  ],
};

const AUDITS = [
  {
    total_score: 151, performance_score: 30, social_score: 24, seo_authority_score: 35,
    thought_leadership_score: 28, reputation_score: 34, market: "dc-metro", peer_group: "mid-size-litigation",
    confidence_score: 0.8, sample_size: 12, created_at: "2026-08-01T00:00:00Z",
  },
  {
    total_score: 142, performance_score: 28, social_score: 18, seo_authority_score: 33,
    thought_leadership_score: 27, reputation_score: 36, market: "dc-metro", peer_group: "mid-size-litigation",
    confidence_score: 0.75, sample_size: 11, created_at: "2026-07-01T00:00:00Z",
  },
];

const WORKSHOP_STATE = {
  value: [
    { toolId: "bio-rewrite", toolLabel: "Bio Rewriter", title: "Bio · A. Partner", preview: "Results-first", createdAt: Date.parse("2026-08-05T00:00:00Z") },
    { toolId: "calendar", toolLabel: "12-Month Calendar", title: "Calendar 2026", createdAt: Date.parse("2026-08-03T00:00:00Z") },
  ],
};

describe("buildFirmContextBlock", () => {
  it("includes the learned voice profile so every tool writes like the firm", async () => {
    const { client } = stubClient({
      firm_profiles: PROFILE,
      workshop_voice_profiles: { profile: "Register: plain, direct. Opens with the point." },
    });
    // deno-lint-ignore no-explicit-any
    const block = await buildFirmContextBlock(client as any, "firm-A");
    expect(block).toContain("VOICE PROFILE");
    expect(block).toContain("Opens with the point.");
  });

  it("scopes every query to the verified firm id — never another firm's rows", async () => {
    const { client, calls } = stubClient({
      firm_profiles: PROFILE,
      market_visibility_audits: AUDITS,
      user_app_state: WORKSHOP_STATE,
      workshop_voice_profiles: { profile: "Register: plain" },
    });
    // deno-lint-ignore no-explicit-any
    await buildFirmContextBlock(client as any, "firm-A");

    expect(calls.length).toBe(4);
    for (const c of calls) {
      const scoped = c.eqs.some(([col, val]) => (col === "firm_id" || col === "client_id") && val === "firm-A");
      expect(scoped, `query on ${c.table} must filter by the verified firm id`).toBe(true);
    }
  });

  it("includes profile, audit history with trend, and workshop activity", async () => {
    const { client } = stubClient({
      firm_profiles: PROFILE,
      market_visibility_audits: AUDITS,
      user_app_state: WORKSHOP_STATE,
    });
    // deno-lint-ignore no-explicit-any
    const block = await buildFirmContextBlock(client as any, "firm-A");

    expect(block).toContain("FIRM CONTEXT");
    expect(block).toContain("Employment, Commercial litigation");
    expect(block).toContain("Tone of voice: Direct, no legalese");
    expect(block).toContain("Smith & Gorman");
    expect(block).toContain("AUDIT HISTORY");
    expect(block).toContain("378/500");
    expect(block).toContain("Trend: up 23 pts");
    expect(block).toContain("RECENT WORKSHOP ACTIVITY");
    expect(block).toContain("Bio Rewriter");
    expect(block).toContain("APPROVED CONTENT");
    expect(block).toContain("TEAM");
    expect(block).toContain("A. Partner (Managing Partner)");
    // Synthesis notes — the growing-memory section
    expect(block).toContain("LEARNED FROM PAST SESSIONS");
    expect(block).toContain("first-person, results-first bios");
    expect(block).toContain("Rejected sensationalist LinkedIn hooks");
  });

  it("returns an empty string when the firm has no data at all", async () => {
    const { client } = stubClient({});
    // deno-lint-ignore no-explicit-any
    const block = await buildFirmContextBlock(client as any, "firm-new");
    expect(block).toBe("");
  });

  it("omits sections with no data rather than emitting empty headers", async () => {
    const { client } = stubClient({ firm_profiles: { ...PROFILE, approved_content: [], lawyer_roster: [], synthesis_notes: [] } });
    // deno-lint-ignore no-explicit-any
    const block = await buildFirmContextBlock(client as any, "firm-A");

    expect(block).toContain("FIRM PROFILE");
    expect(block).not.toContain("AUDIT HISTORY");
    expect(block).not.toContain("RECENT WORKSHOP ACTIVITY");
    expect(block).not.toContain("APPROVED CONTENT");
    expect(block).not.toContain("TEAM");
    expect(block).not.toContain("LEARNED FROM PAST SESSIONS");
  });

  it("never throws — a lookup failure degrades to an empty block so the AI call still runs", async () => {
    const broken = {
      from: () => {
        throw new Error("connection reset");
      },
    };
    // deno-lint-ignore no-explicit-any
    const block = await buildFirmContextBlock(broken as any, "firm-A");
    expect(block).toBe("");
  });
});
