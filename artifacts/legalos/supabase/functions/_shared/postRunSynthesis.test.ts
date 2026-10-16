// Unit tests for the pure synthesis helpers: note append/prune, prompt
// shape, and note rendering. runSynthesis itself is impure (Claude + DB)
// and exercised end-to-end by the live smoke surface, not here.
import { describe, it, expect } from "vitest";
import {
  appendSynthesisNote,
  buildSynthesisPrompt,
  synthesisNoteLine,
  SYNTHESIS_NOTES_CAP,
  type SynthesisNote,
} from "./postRunSynthesis";

const note = (n: number): SynthesisNote => ({
  at: new Date(2026, 7, n).toISOString(),
  tool: "copywriter",
  toolLabel: "AI Copywriter",
  note: `Note ${n}`,
  tags: ["tone"],
});

describe("appendSynthesisNote", () => {
  it("prepends newest first and prunes to the cap", () => {
    const existing = Array.from({ length: SYNTHESIS_NOTES_CAP }, (_, i) => note(i + 1));
    const updated = appendSynthesisNote(existing, note(999));
    expect(updated).toHaveLength(SYNTHESIS_NOTES_CAP);
    expect(updated[0].note).toBe("Note 999");
    // Prepending + slicing to the cap evicts the OLDEST (last) entry.
    expect(updated.some((n) => n.note === "Note 50")).toBe(false);
    expect(updated.some((n) => n.note === "Note 1")).toBe(true);
  });

  it("tolerates a missing or malformed existing value", () => {
    expect(appendSynthesisNote(null, note(1))).toHaveLength(1);
    expect(appendSynthesisNote("garbage", note(1))).toHaveLength(1);
    expect(appendSynthesisNote(undefined, note(1))[0].note).toBe("Note 1");
  });
});

describe("buildSynthesisPrompt", () => {
  it("asks for durable learnings, not a content summary, and truncates huge outputs", () => {
    const { system, user } = buildSynthesisPrompt("Bio Rewriter", "x".repeat(10000));
    expect(system).toContain("REMEMBER");
    expect(system).toContain("Do NOT summarise the content itself");
    expect(user).toContain("Bio Rewriter");
    expect(user.length).toBeLessThan(4000); // 3500-char slice + wrapper text
  });
});

describe("synthesisNoteLine", () => {
  it("renders date, tool label, tags, and note", () => {
    const line = synthesisNoteLine({
      at: "2026-08-10T12:00:00Z",
      tool: "bio-rewrite",
      toolLabel: "Bio Rewriter",
      note: "Firm prefers first-person bios.",
      tags: ["tone", "format"],
    });
    expect(line).toContain("Aug 10");
    expect(line).toContain("Bio Rewriter");
    expect(line).toContain("[tone, format]");
    expect(line).toContain("first-person bios");
  });

  it("omits the tag bracket for the 'none' tag", () => {
    const line = synthesisNoteLine({
      at: "2026-08-10T12:00:00Z",
      tool: "autopsy",
      toolLabel: "Copy Autopsy",
      note: "Nothing durable.",
      tags: ["none"],
    });
    expect(line).not.toContain("[none]");
  });
});
