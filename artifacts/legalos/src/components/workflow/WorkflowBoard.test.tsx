// The workflow board renders as a kanban: one column per status, demo
// fixtures dealt into their columns, drag-and-drop with a dragStart fallback,
// and the approval gate enforced on the drag affordance itself. Runs against
// the local demo store (no network) with auth/team hooks stubbed.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import WorkflowBoard from "./WorkflowBoard";
import { seedDemoData } from "@/data/demoData";
import { listBoard } from "@/lib/demoWorkflowStore";

const mocks = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null },
  team: null as null | { members: { user_id: string; role: string }[] },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/hooks/useFirmTeam", () => ({ useFirmTeam: () => ({ team: mocks.team }) }));

/** Column headers are <p>; status selects repeat the same words as <option> text. */
const columnOf = (label: string) =>
  screen.getAllByText(label).find((el) => el.tagName === "P")!.closest("div")!.parentElement!;

describe("WorkflowBoard kanban", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("legalos_demo_mode", "1");
    seedDemoData();
    mocks.auth = { user: null };
    mocks.team = null;
  });

  it("deals the demo fixtures into five status columns", async () => {
    render(<WorkflowBoard />);

    await waitFor(() => expect(screen.getByText("Rewrite Corporate/M&A practice page")).toBeTruthy());
    for (const label of ["To do", "In progress", "In review", "Approved", "Done"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Fix the stale 2023 copyright year and broken team-page link")).toBeTruthy();
    expect(screen.getByText("Publish a tombstone wall of the last 10 closed deals")).toBeTruthy();
    expect(screen.getByText("Claim and complete the Google Business Profile")).toBeTruthy();
    expect(screen.getByText("Re-run the visibility audit after Phase 1 ships")).toBeTruthy();
    // The old demo cop-out is gone for good.
    expect(screen.queryByText(/Workflow isn't available in demo mode/)).toBeNull();
  });

  it("moves a card between columns via its status select", async () => {
    render(<WorkflowBoard />);
    await waitFor(() => expect(screen.getByText("Re-run the visibility audit after Phase 1 ships")).toBeTruthy());

    // The only fixture sitting in Done.
    const doneSelect = Array.from(document.querySelectorAll("select")).find(
      (s) => (s as HTMLSelectElement).value === "done",
    ) as HTMLSelectElement;
    fireEvent.change(doneSelect, { target: { value: "todo" } });

    await waitFor(() => {
      expect(listBoard().items.find((i) => i.id === "demo-wf-5")?.status).toBe("todo");
    });
    expect(columnOf("To do").textContent).toContain("Re-run the visibility audit after Phase 1 ships");
  });

  it("moves a card via drag-and-drop even when the drop carries no transfer data", async () => {
    render(<WorkflowBoard />);
    await waitFor(() => expect(screen.getByText("Fix the stale 2023 copyright year and broken team-page link")).toBeTruthy());

    const card = screen
      .getByText("Fix the stale 2023 copyright year and broken team-page link")
      .closest("[draggable]")!;
    fireEvent.dragStart(card, {
      dataTransfer: { setData: vi.fn(), getData: () => "", effectAllowed: "" },
    });
    // An empty/odd drop must fall back to the id captured at drag start.
    fireEvent.drop(columnOf("In progress"), { dataTransfer: { getData: () => "" } });

    await waitFor(() => {
      expect(listBoard().items.find((i) => i.id === "demo-wf-2")?.status).toBe("in_progress");
    });
    expect(columnOf("In progress").textContent).toContain(
      "Fix the stale 2023 copyright year and broken team-page link",
    );
  });

  it("locks approved cards for members without approval rights", async () => {
    mocks.auth = { user: { id: "u1" } };
    mocks.team = { members: [{ user_id: "u1", role: "member" }] };
    render(<WorkflowBoard />);
    await waitFor(() => expect(screen.getByText("Claim and complete the Google Business Profile")).toBeTruthy());

    const approvedCard = screen
      .getByText("Claim and complete the Google Business Profile")
      .closest("[draggable]")!;
    expect(approvedCard.getAttribute("draggable")).toBe("false");
    expect((approvedCard.querySelector("select") as HTMLSelectElement).disabled).toBe(true);

    // Ordinary cards stay movable — the gate is only about approval.
    const todoCard = screen
      .getByText("Fix the stale 2023 copyright year and broken team-page link")
      .closest("[draggable]")!;
    expect(todoCard.getAttribute("draggable")).toBe("true");
  });
});
