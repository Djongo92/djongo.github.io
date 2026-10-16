// The AI-grounding contract: chapterToText is what Ask-the-Book, per-chapter
// Q&A, and quizzes receive — a rubric field that doesn't serialize is
// invisible to every AI surface. Pin the serialization.
import { describe, it, expect } from "vitest";
import { chapters } from "@/data/chapters";
import { chapterToText, guidebookSummary } from "./chapterToText";

const pilot = chapters.find((c) => c.id === "what-gcs-want")!;

describe("chapterToText rubric serialization", () => {
  const text = chapterToText(pilot);

  it("includes artifacts with their type and body", () => {
    expect(text).toContain("Materials:");
    expect(text).toContain("[script] The Annual GC Listening Survey — 8 Questions");
    expect(text).toContain("Which firms are in your inner circle right now");
    expect(text).toContain("[scorecard] Pitch Deck Self-Audit — the 7 GC Priorities");
  });

  it("includes the proof metric", () => {
    expect(text).toContain("Proof it worked:");
    expect(text).toContain("Recognition and Thought Leadership");
  });

  it("includes stat sources", () => {
    expect(text).toContain("(source: interviews conducted by our founder)");
  });

  it("still serializes the classic sections (regression)", () => {
    expect(text).toContain("# Chapter 13: What General Counsel Really Want");
    expect(text).toContain("Action items:");
    expect(text).toContain("> The consistent verdict: reputation matters most");
  });
});

describe("guidebookSummary", () => {
  it("lists every chapter", () => {
    const summary = guidebookSummary(chapters);
    for (const c of chapters) expect(summary).toContain(`Ch ${c.number}. ${c.title}`);
  });
});
