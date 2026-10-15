// The demo board store keeps the showcase's workflow tool fully local: the
// real board UI runs on it, so a visitor can try the PM-lite workflow without
// the demo ever touching Supabase.
import { describe, it, expect, beforeEach } from "vitest";
import { seedDemoData, clearDemoData, buildDemoWorkflowBoard } from "@/data/demoData";
import {
  listBoard,
  createItem,
  updateItem,
  removeItem,
  addBoardComment,
  createDemoPartnerLink,
} from "./demoWorkflowStore";

const KEY = "demo_workflow_board";

describe("demo workflow board", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("seeds one item per status so the demo shows the whole board, and clears cleanly", () => {
    seedDemoData();
    const { items, comments } = listBoard();
    const statuses = items.map((i) => i.status);
    for (const s of ["todo", "in_progress", "in_review", "approved", "done"]) {
      expect(statuses).toContain(s);
    }
    expect(comments.length).toBeGreaterThan(0);
    // No orphaned fixture comments — each belongs to a fixture item.
    expect(comments.every((c) => items.some((i) => i.id === c.item_id))).toBe(true);

    clearDemoData();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("creates items as todo and keeps them local", () => {
    const item = createItem({ title: "Try the board", dueDate: "2026-08-10" });
    expect(item.status).toBe("todo");
    const { items } = listBoard();
    expect(items.some((i) => i.id === item.id && i.title === "Try the board")).toBe(true);
  });

  it("applies patches with the server's field mapping", () => {
    const item = createItem({ title: "Move me" });
    updateItem(item.id, { status: "in_review", assignedToLabel: "A. Nikolić", dueDate: "2026-08-20" });
    const updated = listBoard().items.find((i) => i.id === item.id)!;
    expect(updated.status).toBe("in_review");
    expect(updated.assigned_to_label).toBe("A. Nikolić");
    expect(updated.due_date).toBe("2026-08-20");
  });

  it("deletes an item together with its comments", () => {
    const item = createItem({ title: "Delete me" });
    addBoardComment(item.id, "a note");
    removeItem(item.id);
    const board = listBoard();
    expect(board.items.some((i) => i.id === item.id)).toBe(false);
    expect(board.comments.some((c) => c.item_id === item.id)).toBe(false);
  });

  it("attributes new comments to the visitor, not a fabricated teammate", () => {
    const item = createItem({ title: "Comment here" });
    const comment = addBoardComment(item.id, "Does this work?", undefined, undefined, "internal");
    expect(comment.author_label).toBe("You (demo)");
    expect(comment.visibility).toBe("internal");
    expect(listBoard().comments).toHaveLength(1);
  });

  it("returns a clearly-fake partner link with a real expiry", () => {
    const link = createDemoPartnerLink(7);
    expect(link.linkId).toBe("demo-sample-link");
    expect(new Date(link.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("builds fixtures whose dates always read as current", () => {
    const { items } = buildDemoWorkflowBoard();
    expect(items.every((i) => !i.due_date || new Date(i.due_date).getTime() > Date.now())).toBe(true);
  });
});
