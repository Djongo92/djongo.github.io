// Post-run synthesis — the loop that makes the Firm Context Profile GROW.
// After every workshop run completes, the client fires workshop-synthesis
// (fire-and-forget), which lands here: one cheap Haiku call reads the run's
// output and distils a structured note (what direction was chosen, what was
// rejected, tone decisions, insights). The note is prepended to
// firm_profiles.synthesis_notes (capped at 50, newest first), and
// buildFirmContextBlock folds the last 10 into every future prompt.
//
// This module is deliberately split: the pure helpers (note shaping,
// pruning, prompt building) are unit-testable in vitest without Deno or the
// network; runSynthesis is the only impure piece and never throws — a failed
// synthesis must never surface to the user or block anything.
import { callClaudeTool } from "./anthropic.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface SynthesisNote {
  at: string;        // ISO timestamp
  tool: string;      // tool id, e.g. "copywriter"
  toolLabel: string; // human label, e.g. "AI Copywriter"
  note: string;      // one structured paragraph (≤ ~60 words)
  tags: string[];    // e.g. ["tone", "approved-direction", "format"]
}

/**
 * Cap on stored notes per firm — pruned on every write. Reference
 * implementation of the append+prune semantics; the PRODUCTION write path
 * is the append_synthesis_note SQL RPC (migration
 * 20260810020000_synthesis_note_atomic_append.sql), which mirrors this
 * exactly inside one row-locked UPDATE so concurrent syntheses can't lose
 * notes. Keep the two in sync — the unit tests exercise this function as
 * the executable spec.
 */
export const SYNTHESIS_NOTES_CAP = 50;

/** How many notes the context block folds into prompts. */
export const SYNTHESIS_NOTES_IN_CONTEXT = 10;

/** Prepends a note and prunes to the cap. Pure — the write path is the caller's job. */
export function appendSynthesisNote(
  existing: unknown,
  note: SynthesisNote,
  cap: number = SYNTHESIS_NOTES_CAP,
): SynthesisNote[] {
  const list = Array.isArray(existing) ? (existing as SynthesisNote[]) : [];
  return [note, ...list].slice(0, cap);
}

/** Builds the synthesis prompt. Pure. */
export function buildSynthesisPrompt(
  toolLabel: string,
  output: string,
): { system: string; user: string } {
  return {
    system: `You are the memory keeper for a law-firm marketing platform. After each tool run, you distil ONE short note about what this run reveals about the firm — durable facts worth injecting into future AI calls: tone decisions, approved or rejected directions, format preferences, positioning choices, surfaced insights about their clients or market. Do NOT summarise the content itself; extract what a future AI assistant should REMEMBER about this firm. If the run reveals nothing durable (e.g. a generic output), say so plainly in one sentence.`,
    user: `Tool: ${toolLabel}\n\nOutput (truncated):\n${output.slice(0, 3500)}`,
  };
}

/** The tool schema Claude is forced to answer with. Pure. */
export const SYNTHESIS_TOOL = {
  name: "record_synthesis",
  description: "Record one structured note about what this run reveals about the firm.",
  input_schema: {
    type: "object",
    properties: {
      note: { type: "string", description: "One paragraph (max ~60 words) of durable firm-specific learnings." },
      tags: {
        type: "array",
        items: { type: "string", enum: ["tone", "approved-direction", "rejected-direction", "format", "positioning", "insight", "none"] },
        description: "What kinds of learning this note carries.",
      },
    },
    required: ["note", "tags"],
  },
} as const;

/** Renders one note as a context-block line. Pure. */
export function synthesisNoteLine(n: SynthesisNote): string {
  const date = new Date(n.at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const tags = n.tags?.length && !n.tags.includes("none") ? ` [${n.tags.join(", ")}]` : "";
  return `- ${date} — ${n.toolLabel ?? n.tool}:${tags} ${n.note}`;
}

/**
 * Runs the synthesis: one Haiku call + one read-modify-write on
 * firm_profiles.synthesis_notes. NEVER throws — every failure is logged and
 * swallowed, because this runs in the background after the user's response.
 *
 * firmId is already verified by the caller (fail-closed session resolution);
 * this function does no auth of its own.
 */
export async function runSynthesis(
  serviceClient: SupabaseClient,
  firmId: string,
  toolId: string,
  toolLabel: string,
  output: string,
): Promise<void> {
  try {
    const { system, user } = buildSynthesisPrompt(toolLabel, output);
    const result = await callClaudeTool({ system, user, tool: SYNTHESIS_TOOL, maxTokens: 400 });
    const noteText = typeof result.note === "string" ? result.note.trim() : "";
    if (!noteText) return;

    const note: SynthesisNote = {
      at: new Date().toISOString(),
      tool: toolId,
      toolLabel,
      note: noteText.slice(0, 500),
      tags: Array.isArray(result.tags) ? result.tags.filter((t) => typeof t === "string").slice(0, 4) : [],
    };

    // Atomic append+prune via RPC — a single row-locked UPDATE, so a burst
    // of concurrent runs can never read the same array and clobber each
    // other's notes. (Read-modify-write here lost notes under concurrency;
    // caught in review.) No profile row → the UPDATE matches nothing →
    // silently nothing to grow, same as before.
    const { error } = await serviceClient.rpc("append_synthesis_note", {
      p_firm_id: firmId,
      p_note: note,
      p_cap: SYNTHESIS_NOTES_CAP,
    });
    if (error) console.error("runSynthesis write error:", error.message);
  } catch (e) {
    console.error("runSynthesis failed (silent by design):", e);
  }
}
