// The update path's permission decision, extracted pure so the authorization
// rules are directly testable (the Deno.serve handler itself isn't vitest-
// importable). The rule that matters: moving INTO or OUT OF "approved" is the
// same decision in both directions and needs canApproveWorkflow — checking
// only the *target* status lets a commenter un-approve an item by setting
// any other status (found in code review).

export const VALID_STATUSES = new Set(["todo", "in_progress", "in_review", "approved", "done"]);
const OTHER_FIELDS = ["title", "description", "dueDate", "assignedToUserId", "assignedToLabel"];

export interface UpdatePermissionInput {
  canComment: boolean;
  canApprove: boolean;
  /** The row's current status, or null when no such item exists for this client. */
  currentStatus: string | null;
  patch: Record<string, unknown>;
}

export type UpdatePermission = { ok: true } | { ok: false; httpStatus: number; error: string };

export function checkWorkflowUpdatePermission(input: UpdatePermissionInput): UpdatePermission {
  const { canComment, canApprove, currentStatus, patch } = input;

  if (patch.status !== undefined) {
    if (typeof patch.status !== "string" || !VALID_STATUSES.has(patch.status)) {
      return { ok: false, httpStatus: 400, error: "Invalid status" };
    }
    if (currentStatus === null) {
      return { ok: false, httpStatus: 404, error: "Workflow item not found" };
    }
    const touchesApproval = currentStatus === "approved" || patch.status === "approved";
    if (touchesApproval && !canApprove) {
      return { ok: false, httpStatus: 403, error: "Your role can't approve or un-approve workflow items" };
    }
    if (!touchesApproval && !canComment) {
      return { ok: false, httpStatus: 403, error: "Your role can't update workflow items" };
    }
  }

  // Non-status edits (title, dates, assignment) are ordinary work —
  // canComment, same as create/delete.
  const editsOtherFields = OTHER_FIELDS.some((f) => patch[f] !== undefined);
  if (editsOtherFields && !canComment) {
    return { ok: false, httpStatus: 403, error: "Your role can't update workflow items" };
  }

  return { ok: true };
}
