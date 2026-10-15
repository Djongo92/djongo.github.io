// Endpoint-level regression for the workflow update authorization rules —
// above all: approval is gated in BOTH directions, so a commenter can neither
// approve nor quietly un-approve an item (found in code review).
import { describe, it, expect } from "vitest";
import { checkWorkflowUpdatePermission } from "./updatePermissions.ts";

describe("checkWorkflowUpdatePermission", () => {
  it("blocks a non-approver from moving an approved item to any other status", () => {
    for (const target of ["todo", "in_progress", "in_review", "done"]) {
      const verdict = checkWorkflowUpdatePermission({
        canComment: true,
        canApprove: false,
        currentStatus: "approved",
        patch: { status: target },
      });
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.httpStatus).toBe(403);
    }
  });

  it("blocks a non-approver from moving an item into approved", () => {
    const verdict = checkWorkflowUpdatePermission({
      canComment: true,
      canApprove: false,
      currentStatus: "in_review",
      patch: { status: "approved" },
    });
    expect(verdict).toEqual({
      ok: false,
      httpStatus: 403,
      error: "Your role can't approve or un-approve workflow items",
    });
  });

  it("lets an approver move items into and out of approved", () => {
    for (const [from, to] of [["in_review", "approved"], ["approved", "done"]] as const) {
      const verdict = checkWorkflowUpdatePermission({
        canComment: true,
        canApprove: true,
        currentStatus: from,
        patch: { status: to },
      });
      expect(verdict.ok).toBe(true);
    }
  });

  it("lets a commenter move between ordinary statuses", () => {
    const verdict = checkWorkflowUpdatePermission({
      canComment: true,
      canApprove: false,
      currentStatus: "todo",
      patch: { status: "in_progress" },
    });
    expect(verdict.ok).toBe(true);
  });

  it("404s a status change for an item the client doesn't own", () => {
    const verdict = checkWorkflowUpdatePermission({
      canComment: true,
      canApprove: true,
      currentStatus: null,
      patch: { status: "done" },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.httpStatus).toBe(404);
  });

  it("rejects an unknown status before any permission check", () => {
    const verdict = checkWorkflowUpdatePermission({
      canComment: false,
      canApprove: false,
      currentStatus: "todo",
      patch: { status: "archived" },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.httpStatus).toBe(400);
  });

  it("blocks a read-only role from editing non-status fields", () => {
    const verdict = checkWorkflowUpdatePermission({
      canComment: false,
      canApprove: false,
      currentStatus: null,
      patch: { title: "retitled" },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.httpStatus).toBe(403);
  });

  it("lets a commenter edit title, dates, and assignment", () => {
    const verdict = checkWorkflowUpdatePermission({
      canComment: true,
      canApprove: false,
      currentStatus: null,
      patch: { title: "new title", dueDate: "2026-09-01", assignedToLabel: "A. N" },
    });
    expect(verdict.ok).toBe(true);
  });
});
